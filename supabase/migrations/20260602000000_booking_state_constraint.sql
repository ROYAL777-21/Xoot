-- Phase 4 booking state machine enforcement.
-- Keeps future booking rows inside the server-enforced lifecycle.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name = 'cancelled_by'
      and data_type <> 'uuid'
  ) then
    alter table public.bookings
      alter column cancelled_by type uuid
      using case
        when cancelled_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          then cancelled_by::uuid
        else null
      end;
  end if;
end $$;

alter table public.bookings
  add column if not exists sensitive_data_revoked_at timestamptz,
  add column if not exists payment_confirmed_at timestamptz,
  add column if not exists assigned_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid,
  add column if not exists replacement_count integer not null default 0;

update public.bookings
set status = 'pending_payment'::public.booking_status
where status::text = 'pending';

update public.bookings
set status = 'contractor_accepted'::public.booking_status
where status::text = 'confirmed';

update public.bookings
set status = 'en_route'::public.booking_status
where status::text = 'enroute';

update public.bookings
set completed_at = coalesce(completed_at, job_completed_at)
where completed_at is null
  and job_completed_at is not null;

update public.bookings
set replacement_count = 0
where replacement_count is null;

alter table public.bookings
  alter column replacement_count set default 0,
  alter column replacement_count set not null;

alter table public.bookings
  drop constraint if exists booking_status_valid;

alter table public.bookings
  add constraint booking_status_valid check (
    status::text in (
      'draft','pending_payment','payment_confirmed','awaiting_assignment',
      'assigned','contractor_accepted','en_route','in_progress','completed',
      'rated','cancelled','replacement_required','replacement_offered','reassigned'
    )
  );

comment on constraint booking_status_valid on public.bookings
  is 'Restricts bookings to the Phase 4 state-machine statuses; all transitions are enforced by trusted Edge Functions.';

create or replace function public.can_access_sensitive_data(p_booking_id uuid, p_actor_id uuid default auth.uid())
returns boolean
language plpgsql
set search_path = public
as $$
declare
  booking_row record;
  allowed boolean := false;
  reason text := 'denied';
begin
  select b.*, z.user_id as zooter_user_id
    into booking_row
  from public.bookings b
  left join public.zooters z on z.id = b.zooter_id
  where b.id = p_booking_id;

  if not found then
    return false;
  end if;

  if booking_row.user_id = p_actor_id then
    allowed := true;
    reason := 'client_owner';
  elsif booking_row.zooter_user_id = p_actor_id then
    if booking_row.sensitive_data_revoked_at is not null then
      allowed := false;
      reason := 'sensitive_access_revoked';
    elsif booking_row.status::text = 'cancelled' or booking_row.cancelled_at is not null then
      allowed := false;
      reason := 'booking_cancelled';
    elsif now() < booking_row.scheduled_at - interval '45 minutes' then
      allowed := false;
      reason := 'before_access_window';
    elsif booking_row.status::text = 'completed' then
      allowed := now() <= coalesce(booking_row.completed_at, booking_row.job_completed_at, booking_row.updated_at, now()) + interval '30 minutes';
      reason := case when allowed then 'completion_wind_down' else 'after_completion_wind_down' end;
    else
      allowed := booking_row.status::text in (
        'assigned',
        'contractor_accepted',
        'en_route',
        'in_progress',
        'replacement_offered',
        'reassigned'
      );
      reason := case when allowed then 'active_booking_window' else 'inactive_status' end;
    end if;
  else
    reason := 'not_booking_participant';
  end if;

  insert into public.sensitive_access_logs (actor_id, booking_id, access_granted, reason)
  values (p_actor_id, p_booking_id, allowed, reason);

  return allowed;
end;
$$;

comment on function public.can_access_sensitive_data(uuid, uuid)
  is 'Allows clients to see their own booking data and contractors to see sensitive household data only during canonical active booking states that have not been revoked.';
