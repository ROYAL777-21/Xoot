-- Focused follow-up for Supabase helper-function advisor warnings.
-- Public RPC wrappers remain callable where product behavior requires it, but
-- privileged table reads live in the unexposed private schema.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create or replace function private.has_role(
  _user_id uuid,
  _role public.app_role
) returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

comment on function private.has_role(uuid, public.app_role)
  is 'Unexposed role lookup used by the self-scoped public RLS helper.';

revoke all on function private.has_role(uuid, public.app_role) from public;
grant execute on function private.has_role(uuid, public.app_role)
  to anon, authenticated, service_role;

create or replace function public.has_role(
  _user_id uuid,
  _role public.app_role
) returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select case
    when _user_id is null or _role is null then false
    when _user_id <> auth.uid() then false
    else private.has_role(_user_id, _role)
  end
$$;

comment on function public.has_role(uuid, public.app_role)
  is 'Self-scoped RLS role helper. Direct callers cannot enumerate roles for another user.';

revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role)
  to anon, authenticated, service_role;

create or replace function private.lookup_referral_code(
  p_code text
) returns table(code text)
language sql
stable
security definer
set search_path = ''
as $$
  select r.code
  from public.referrals r
  where r.code = p_code
  limit 1
$$;

comment on function private.lookup_referral_code(text)
  is 'Unexposed referral lookup that returns only the matching public-safe code.';

revoke all on function private.lookup_referral_code(text) from public;
grant execute on function private.lookup_referral_code(text)
  to anon, authenticated, service_role;

create or replace function public.lookup_referral_code(
  p_code text
) returns table(code text)
language sql
stable
security invoker
set search_path = ''
as $$
  select result.code
  from private.lookup_referral_code(upper(trim(p_code))) result
  where p_code is not null
    and upper(trim(p_code)) ~ '^[A-Z0-9_-]{4,32}$'
$$;

comment on function public.lookup_referral_code(text)
  is 'Public-safe referral lookup. It validates syntax and returns only an exact matching code.';

revoke all on function public.lookup_referral_code(text) from public;
grant execute on function public.lookup_referral_code(text)
  to anon, authenticated, service_role;

-- Preserve the active staging booking-window rules while preventing direct
-- browser/mobile RPC execution. The get-sensitive-access Edge Function calls
-- this helper with the service role after authenticating the assigned Zooter.
create or replace function public.can_access_sensitive_data(
  p_zooter_id uuid,
  p_booking_id uuid
) returns boolean
language plpgsql
security definer
set search_path = ''
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
    status::text
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

  if not found or v_start is null or v_revoked is not null then
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

  return now() between
    (v_start - interval '45 minutes')
    and (v_end + interval '30 minutes');
end;
$$;

comment on function public.can_access_sensitive_data(uuid, uuid)
  is 'Service-role-only booking access-window check. Clients must use get-sensitive-access for authorization and reveal logging.';

revoke all on function public.can_access_sensitive_data(uuid, uuid) from public;
revoke all on function public.can_access_sensitive_data(uuid, uuid) from anon;
revoke all on function public.can_access_sensitive_data(uuid, uuid) from authenticated;
grant execute on function public.can_access_sensitive_data(uuid, uuid) to service_role;

revoke all on table public.booking_sensitive_access from public;
revoke all on table public.booking_sensitive_access from anon;
revoke all on table public.booking_sensitive_access from authenticated;

comment on view public.booking_sensitive_access
  is 'Database-internal compatibility view. Clients must use get-sensitive-access.';

drop policy if exists "authenticated users read active public encryption keys"
  on public.user_encryption_keys;

comment on table public.user_encryption_keys
  is 'Device public keys for booking chat. Counterpart lookup must use get-booking-public-keys so booking participation is verified server-side.';
