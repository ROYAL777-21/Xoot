-- Phase 3 backend action layer support.
-- Adds the minimum schema support required for trusted Edge Function writes.

do $$
begin
  alter type public.booking_status add value if not exists 'draft';
  alter type public.booking_status add value if not exists 'pending_payment';
  alter type public.booking_status add value if not exists 'payment_confirmed';
  alter type public.booking_status add value if not exists 'awaiting_assignment';
  alter type public.booking_status add value if not exists 'assigned';
  alter type public.booking_status add value if not exists 'contractor_accepted';
  alter type public.booking_status add value if not exists 'replacement_required';
  alter type public.booking_status add value if not exists 'replacement_offered';
exception
  when duplicate_object then null;
end $$;

alter table public.bookings
  add column if not exists sensitive_data_revoked_at timestamptz;

alter table public.payment_records
  add column if not exists paid_at timestamptz;

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  payment_record_id uuid references public.payment_records(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  currency text not null default 'ZAR',
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'processed', 'cancelled')),
  requested_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.refund_requests enable row level security;
grant select on table public.refund_requests to authenticated;

drop policy if exists "refund_requests_own_read" on public.refund_requests;
create policy "refund_requests_own_read"
  on public.refund_requests for select
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));
comment on policy "refund_requests_own_read" on public.refund_requests
  is 'Clients can read their own refund requests; admins can inspect all refund operations.';

create index if not exists idx_refund_requests_booking on public.refund_requests(booking_id, created_at desc);
create index if not exists idx_refund_requests_status on public.refund_requests(status, created_at desc);

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
      allowed := now() <= coalesce(booking_row.job_completed_at, booking_row.updated_at, now()) + interval '30 minutes';
      reason := case when allowed then 'completion_wind_down' else 'after_completion_wind_down' end;
    else
      allowed := booking_row.status::text in (
        'pending',
        'confirmed',
        'enroute',
        'arrived',
        'in_progress',
        'payment_confirmed',
        'awaiting_assignment',
        'assigned',
        'contractor_accepted',
        'replacement_offered'
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
  is 'Allows clients to see their own booking data and contractors to see sensitive household data only during active booking windows that have not been revoked.';

grant execute on function public.can_access_sensitive_data(uuid, uuid) to authenticated;
