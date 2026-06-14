-- Phase 6: contractor sensitive data access control.
-- Contractors only receive sensitive household access details during the booking window.

alter table public.household_profiles
  add column if not exists alarm_code text,
  add column if not exists access_instructions text;

update public.household_profiles
set access_instructions = access_notes
where access_instructions is null
  and access_notes is not null;

create or replace function public.can_access_sensitive_data(
  p_zooter_id uuid,
  p_booking_id uuid
) returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_start timestamptz;
  v_duration_hours numeric;
  v_completed_at timestamptz;
  v_job_completed_at timestamptz;
  v_revoked timestamptz;
  v_status text;
  v_end timestamptz;
begin
  select
    scheduled_at,
    duration_hours,
    completed_at,
    job_completed_at,
    sensitive_data_revoked_at,
    status
  into
    v_start,
    v_duration_hours,
    v_completed_at,
    v_job_completed_at,
    v_revoked,
    v_status
  from public.bookings
  where id = p_booking_id
    and zooter_id = p_zooter_id;

  if not found then
    return false;
  end if;

  if v_start is null then
    return false;
  end if;

  if v_revoked is not null then
    return false;
  end if;

  if v_status in ('cancelled', 'rated') then
    return false;
  end if;

  if v_status = 'completed' then
    v_end := coalesce(
      v_completed_at,
      v_job_completed_at,
      v_start + (coalesce(v_duration_hours, 0) * interval '1 hour')
    );
  else
    if v_status not in (
      'assigned',
      'contractor_accepted',
      'en_route',
      'in_progress',
      'replacement_offered',
      'reassigned'
    ) then
      return false;
    end if;

    v_end := v_start + (coalesce(v_duration_hours, 0) * interval '1 hour');
  end if;

  return now() between (v_start - interval '45 minutes') and (v_end + interval '30 minutes');
end;
$$;

comment on function public.can_access_sensitive_data(uuid, uuid)
  is 'Returns true only when the assigned Zooter is inside the sensitive household data access window for a booking.';

revoke all on function public.can_access_sensitive_data(uuid, uuid) from public;
revoke all on function public.can_access_sensitive_data(uuid, uuid) from anon;
grant execute on function public.can_access_sensitive_data(uuid, uuid) to authenticated, service_role;

create or replace view public.booking_sensitive_access
with (security_invoker = true)
as
  select
    b.id as booking_id,
    b.zooter_id,
    h.gate_code,
    h.alarm_code,
    h.access_instructions,
    h.parking_instructions,
    h.pet_notes
  from public.bookings b
  join public.household_profiles h on h.id = b.household_profile_id
  where exists (
    select 1
    from public.zooters z
    where z.id = b.zooter_id
      and z.user_id = auth.uid()
  )
    and public.can_access_sensitive_data(b.zooter_id, b.id) = true;

comment on view public.booking_sensitive_access
  is 'Returns sensitive household fields only to the assigned Zooter during the permitted booking access window.';

revoke all on table public.booking_sensitive_access from anon;
grant select on table public.booking_sensitive_access to authenticated;

create table if not exists public.sensitive_data_access_log (
  id uuid primary key default gen_random_uuid(),
  zooter_id uuid not null,
  booking_id uuid not null,
  field_accessed text not null,
  accessed_at timestamptz not null default now(),
  device_info text,
  was_within_window boolean not null
);

alter table public.sensitive_data_access_log enable row level security;

revoke all on table public.sensitive_data_access_log from anon, authenticated;
grant select on table public.sensitive_data_access_log to authenticated;

drop policy if exists "sensitive_data_access_log_admin_read" on public.sensitive_data_access_log;
create policy "sensitive_data_access_log_admin_read"
  on public.sensitive_data_access_log for select
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

comment on policy "sensitive_data_access_log_admin_read" on public.sensitive_data_access_log
  is 'Admins can audit sensitive field reveal attempts; clients and contractors cannot browse reveal logs.';

comment on table public.sensitive_data_access_log
  is 'Append-only service-role audit trail for every contractor sensitive-field reveal attempt.';

create index if not exists idx_sensitive_data_access_log_booking
  on public.sensitive_data_access_log(booking_id, accessed_at desc);

create index if not exists idx_sensitive_data_access_log_zooter
  on public.sensitive_data_access_log(zooter_id, accessed_at desc);
