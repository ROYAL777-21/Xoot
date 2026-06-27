-- Converge legacy helper functions and high-noise RLS policies across staging
-- and production without depending on identical historical migration chains.

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
  is 'Private RLS helper for role lookup. Public callers must use the self-scoped public wrapper.';

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
  is 'Self-scoped role helper for RLS policies. Direct callers cannot enumerate roles for another user.';

revoke all on function public.has_role(uuid, public.app_role) from public;
grant execute on function public.has_role(uuid, public.app_role)
  to anon, authenticated, service_role;

do $$
begin
  if to_regclass('public.referrals') is not null then
    execute $function$
      create or replace function private.lookup_referral_code(
        p_code text
      ) returns table(code text)
      language sql
      stable
      security definer
      set search_path = ''
      as $inner$
        select r.code
        from public.referrals r
        where r.code = p_code
        limit 1
      $inner$
    $function$;

    comment on function private.lookup_referral_code(text)
      is 'Private referral lookup that returns only a matching public-safe code.';

    revoke all on function private.lookup_referral_code(text) from public;
    grant execute on function private.lookup_referral_code(text)
      to anon, authenticated, service_role;

    execute $function$
      create or replace function public.lookup_referral_code(
        p_code text
      ) returns table(code text)
      language sql
      stable
      security invoker
      set search_path = ''
      as $inner$
        select result.code
        from private.lookup_referral_code(upper(trim(p_code))) result
        where p_code is not null
          and upper(trim(p_code)) ~ '^[A-Z0-9_-]{4,32}$'
      $inner$
    $function$;

    comment on function public.lookup_referral_code(text)
      is 'Public-safe referral lookup. It validates syntax and returns only an exact matching code.';

    revoke all on function public.lookup_referral_code(text) from public;
    grant execute on function public.lookup_referral_code(text)
      to anon, authenticated, service_role;
  end if;
end;
$$;

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
  is 'Service-role-only booking access-window check. Clients must use get-sensitive-access so authorization and reveal logging happen server-side.';

revoke all on function public.can_access_sensitive_data(uuid, uuid) from public;
revoke all on function public.can_access_sensitive_data(uuid, uuid) from anon;
revoke all on function public.can_access_sensitive_data(uuid, uuid) from authenticated;
grant execute on function public.can_access_sensitive_data(uuid, uuid) to service_role;

-- Support tickets: users can create/read their own tickets; admins can manage.
alter table public.support_tickets enable row level security;
revoke all on table public.support_tickets from anon;
revoke all on table public.support_tickets from authenticated;
grant select, insert, update, delete on table public.support_tickets to authenticated;

drop policy if exists "view own tickets" on public.support_tickets;
drop policy if exists "create own tickets" on public.support_tickets;
drop policy if exists "support_tickets_own" on public.support_tickets;
drop policy if exists "support_tickets_insert_own" on public.support_tickets;
drop policy if exists "support_tickets_admin" on public.support_tickets;
drop policy if exists "own support tickets" on public.support_tickets;
drop policy if exists "support_tickets_select_owner_or_admin" on public.support_tickets;
drop policy if exists "support_tickets_insert_owner" on public.support_tickets;
drop policy if exists "support_tickets_update_admin" on public.support_tickets;
drop policy if exists "support_tickets_delete_admin" on public.support_tickets;

create policy "support_tickets_select_owner_or_admin"
  on public.support_tickets for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "support_tickets_select_owner_or_admin" on public.support_tickets
  is 'Ticket owners can read their own cases; admins can read all cases for support operations.';

create policy "support_tickets_insert_owner"
  on public.support_tickets for insert
  to authenticated
  with check (user_id = (select auth.uid()));
comment on policy "support_tickets_insert_owner" on public.support_tickets
  is 'Signed-in users can create support tickets only for their own account.';

create policy "support_tickets_update_admin"
  on public.support_tickets for update
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "support_tickets_update_admin" on public.support_tickets
  is 'Only admins can update support tickets directly; service Edge Functions handle automated support workflows.';

create policy "support_tickets_delete_admin"
  on public.support_tickets for delete
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "support_tickets_delete_admin" on public.support_tickets
  is 'Only admins can delete support tickets when retention policy permits.';

-- User roles: owners can inspect their own roles; admin writes are explicit.
alter table public.user_roles enable row level security;
revoke all on table public.user_roles from anon;
revoke all on table public.user_roles from authenticated;
grant select, insert, update, delete on table public.user_roles to authenticated;

drop policy if exists "view own roles" on public.user_roles;
drop policy if exists "admins manage roles" on public.user_roles;
drop policy if exists "roles select own or admin" on public.user_roles;
drop policy if exists "roles admin insert" on public.user_roles;
drop policy if exists "roles admin update" on public.user_roles;
drop policy if exists "roles admin delete" on public.user_roles;
drop policy if exists "user_roles_select_owner_or_admin" on public.user_roles;
drop policy if exists "user_roles_insert_admin" on public.user_roles;
drop policy if exists "user_roles_update_admin" on public.user_roles;
drop policy if exists "user_roles_delete_admin" on public.user_roles;

create policy "user_roles_select_owner_or_admin"
  on public.user_roles for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "user_roles_select_owner_or_admin" on public.user_roles
  is 'Users can view their own role assignments; admins can audit role assignments.';

create policy "user_roles_insert_admin"
  on public.user_roles for insert
  to authenticated
  with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "user_roles_insert_admin" on public.user_roles
  is 'Only admins can add role assignments.';

create policy "user_roles_update_admin"
  on public.user_roles for update
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "user_roles_update_admin" on public.user_roles
  is 'Only admins can change role assignments.';

create policy "user_roles_delete_admin"
  on public.user_roles for delete
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "user_roles_delete_admin" on public.user_roles
  is 'Only admins can remove role assignments.';

-- Reliability metrics: Zooters can read their own metrics; admin writes only.
alter table public.zooter_reliability_metrics enable row level security;
revoke all on table public.zooter_reliability_metrics from anon;
revoke all on table public.zooter_reliability_metrics from authenticated;
grant select, insert, update, delete on table public.zooter_reliability_metrics to authenticated;

drop policy if exists "zooters and admins view reliability metrics" on public.zooter_reliability_metrics;
drop policy if exists "admins manage reliability metrics" on public.zooter_reliability_metrics;
drop policy if exists "reliability own zooter or admin" on public.zooter_reliability_metrics;
drop policy if exists "zooter_reliability_metrics_select_owner_or_admin" on public.zooter_reliability_metrics;
drop policy if exists "zooter_reliability_metrics_insert_admin" on public.zooter_reliability_metrics;
drop policy if exists "zooter_reliability_metrics_update_admin" on public.zooter_reliability_metrics;
drop policy if exists "zooter_reliability_metrics_delete_admin" on public.zooter_reliability_metrics;

create policy "zooter_reliability_metrics_select_owner_or_admin"
  on public.zooter_reliability_metrics for select
  to authenticated
  using (
    exists (
      select 1
      from public.zooters z
      where z.id = zooter_reliability_metrics.zooter_id
        and z.user_id = (select auth.uid())
    )
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "zooter_reliability_metrics_select_owner_or_admin" on public.zooter_reliability_metrics
  is 'Contractors can read their own reliability metrics; admins can audit all reliability records.';

create policy "zooter_reliability_metrics_insert_admin"
  on public.zooter_reliability_metrics for insert
  to authenticated
  with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zooter_reliability_metrics_insert_admin" on public.zooter_reliability_metrics
  is 'Only admins can create reliability metric rows outside service-role automation.';

create policy "zooter_reliability_metrics_update_admin"
  on public.zooter_reliability_metrics for update
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role))
  with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zooter_reliability_metrics_update_admin" on public.zooter_reliability_metrics
  is 'Only admins can update reliability metrics outside service-role automation.';

create policy "zooter_reliability_metrics_delete_admin"
  on public.zooter_reliability_metrics for delete
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zooter_reliability_metrics_delete_admin" on public.zooter_reliability_metrics
  is 'Only admins can delete reliability metric rows when retention policy permits.';

-- Zooters: public marketplace reads use zooters_public; base table is self/admin.
alter table public.zooters enable row level security;
revoke all on table public.zooters from anon;
revoke all on table public.zooters from authenticated;
grant select, insert, delete on table public.zooters to authenticated;

do $$
declare
  v_columns text;
begin
  select string_agg(format('%I', column_name), ', ')
    into v_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'zooters'
    and column_name in (
      'name',
      'bio',
      'hourly_rate',
      'photo_url',
      'tags',
      'years_experience',
      'suburb_coverage',
      'transport',
      'supplies_owned',
      'languages',
      'languages_spoken',
      'pet_comfort'
    );

  if v_columns is not null then
    execute format('grant update (%s) on table public.zooters to authenticated', v_columns);
  end if;
end;
$$;

drop policy if exists "anyone views zooters" on public.zooters;
drop policy if exists "active zooters visible" on public.zooters;
drop policy if exists "zooters_self_select" on public.zooters;
drop policy if exists "zooters_self_update" on public.zooters;
drop policy if exists "zooters update own profile" on public.zooters;
drop policy if exists "admins manage zooters" on public.zooters;
drop policy if exists "admins insert zooters" on public.zooters;
drop policy if exists "zooters update own" on public.zooters;
drop policy if exists "zooters_select_self_or_admin" on public.zooters;
drop policy if exists "zooters_insert_admin" on public.zooters;
drop policy if exists "zooters_update_self_or_admin" on public.zooters;
drop policy if exists "zooters_delete_admin" on public.zooters;

create policy "zooters_select_self_or_admin"
  on public.zooters for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "zooters_select_self_or_admin" on public.zooters
  is 'Contractors can read their own full Zooter profile; admins can review full operational records.';

create policy "zooters_insert_admin"
  on public.zooters for insert
  to authenticated
  with check (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zooters_insert_admin" on public.zooters
  is 'Only admins can create Zooter rows outside service-role onboarding approval.';

create policy "zooters_update_self_or_admin"
  on public.zooters for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
  )
  with check (
    user_id = (select auth.uid())
    or private.has_role((select auth.uid()), 'admin'::public.app_role)
  );
comment on policy "zooters_update_self_or_admin" on public.zooters
  is 'Contractors can update only granted public profile columns on their own row; admins can update operational records.';

create policy "zooters_delete_admin"
  on public.zooters for delete
  to authenticated
  using (private.has_role((select auth.uid()), 'admin'::public.app_role));
comment on policy "zooters_delete_admin" on public.zooters
  is 'Only admins can delete Zooter rows when offboarding policy permits.';

do $$
begin
  if to_regclass('public.zooters_public') is not null then
    revoke all on table public.zooters_public from public;
    revoke all on table public.zooters_public from anon;
    revoke all on table public.zooters_public from authenticated;
    grant select on table public.zooters_public to anon, authenticated;
  end if;

  if to_regclass('public.booking_zooter_profiles') is not null then
    revoke all on table public.booking_zooter_profiles from public;
    revoke all on table public.booking_zooter_profiles from anon;
    revoke all on table public.booking_zooter_profiles from authenticated;
    grant select on table public.booking_zooter_profiles to authenticated;
  end if;
end;
$$;
