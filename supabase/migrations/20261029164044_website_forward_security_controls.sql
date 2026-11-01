-- Staging forward security fixes only; no replay/repair of old superseded contracts.
do $xoot_forward_security$
declare v_sql text;
begin
perform pg_advisory_xact_lock(20261029,101);
perform set_config('lock_timeout','5s',true);
if not exists(select from supabase_migrations.schema_migrations where version='20261029111657') then
v_sql:=$xoot_body_20261029111657$-- Supabase defaults may grant TRUNCATE, REFERENCES and TRIGGER as well as DML.
-- RLS only filters row operations; it cannot protect TRUNCATE. Keep participant
-- reads and the existing service-only mutation RPC; remove all client writes.

revoke all privileges on table public.xooter_job_checklist from public, anon, authenticated;
grant select on table public.xooter_job_checklist to authenticated;

do $checklist_acl$
begin
  if not has_table_privilege('authenticated', 'public.xooter_job_checklist', 'SELECT')
    or has_table_privilege('anon', 'public.xooter_job_checklist', 'SELECT')
    or exists (
      select from unnest(array['anon','authenticated']) r(role_name)
      cross join unnest(array['INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p(privilege_name)
      where has_table_privilege(r.role_name, 'public.xooter_job_checklist', p.privilege_name)
    ) then
    raise exception 'Checklist client privileges must be participant SELECT only';
  end if;
end;
$checklist_acl$;
$xoot_body_20261029111657$;
execute v_sql;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261029111657','checklist_select_only_acl',array[v_sql]);
end if;
if not exists(select from supabase_migrations.schema_migrations where version='20261029112730') then
v_sql:=$xoot_body_20261029112730$-- Separate trust boundaries within the EXISTING finite Permanent Geocoding cap.
-- Up to ten remaining attempts belong to signed-in coverage checks. Public
-- confirmations cannot debit that reserve, even with a syntactically valid but
-- unissued provider selection. No allowance is funded, renewed or refunded here.

create table private.xoot_coverage_allowance_reserve (
  budget_key text primary key check (budget_key = 'permanent_geocoding'),
  protected_remaining integer not null default 10 check (protected_remaining between 0 and 10)
);
alter table private.xoot_coverage_allowance_reserve enable row level security;
revoke all on private.xoot_coverage_allowance_reserve from public, anon, authenticated, service_role;
grant select, update on private.xoot_coverage_allowance_reserve to service_role;
grant usage on schema private to service_role;
insert into private.xoot_coverage_allowance_reserve(budget_key) values ('permanent_geocoding');

create or replace function public.xoot_consume_address_lookup(p_mode text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare allowance integer; used integer; permanent_allowance integer; permanent_used integer; protected integer;
begin
  if p_mode is null or p_mode not in ('suggest','confirm') then return false; end if;
  if p_mode = 'confirm' then
    -- Both spending paths lock global -> reserve. A missing reserve fails closed.
    select authorized_queries, consumed_queries into permanent_allowance, permanent_used
      from public.xoot_mapbox_geocoding_budget where budget_key = 'permanent_geocoding' for update;
    if not found or permanent_used >= permanent_allowance then return false; end if;
    select protected_remaining into protected from private.xoot_coverage_allowance_reserve
      where budget_key = 'permanent_geocoding' for update;
    if not found or permanent_allowance - permanent_used <= protected then return false; end if;
  end if;
  select authorized_queries, consumed_queries into allowance, used
    from public.xoot_address_lookup_allowances where mode = p_mode for update;
  if not found or used >= allowance then return false; end if;
  if p_mode = 'confirm' then
    update public.xoot_mapbox_geocoding_budget set consumed_queries = consumed_queries + 1, updated_at = clock_timestamp()
      where budget_key = 'permanent_geocoding';
  end if;
  update public.xoot_address_lookup_allowances set consumed_queries = consumed_queries + 1, updated_at = clock_timestamp()
    where mode = p_mode;
  return true;
end;
$$;
revoke all on function public.xoot_consume_address_lookup(text) from public, anon, authenticated;
grant execute on function public.xoot_consume_address_lookup(text) to service_role;

create or replace function public.xoot_consume_coverage_query(p_user_id uuid) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_limit integer; v_used integer; v_rows integer; v_now timestamptz; v_protected integer;
begin
  if p_user_id is null then return false; end if;
  select authorized_queries, consumed_queries into v_limit, v_used
    from public.xoot_mapbox_geocoding_budget where budget_key = 'permanent_geocoding' for update;
  if not found or v_used >= v_limit then return false; end if;
  select protected_remaining into v_protected from private.xoot_coverage_allowance_reserve
    where budget_key = 'permanent_geocoding' for update;
  if not found then return false; end if;
  v_now := clock_timestamp();
  insert into public.xoot_coverage_query_budget(user_id,requests,resets_at,updated_at)
  values(p_user_id,1,v_now + interval '1 hour',v_now)
  on conflict(user_id) do update
    set requests = case when public.xoot_coverage_query_budget.resets_at <= v_now then 1
      else public.xoot_coverage_query_budget.requests + 1 end,
    resets_at = case when public.xoot_coverage_query_budget.resets_at <= v_now then v_now + interval '1 hour'
      else public.xoot_coverage_query_budget.resets_at end, updated_at = v_now
  where public.xoot_coverage_query_budget.resets_at <= v_now
    or public.xoot_coverage_query_budget.requests < 12;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then return false; end if;
  update public.xoot_mapbox_geocoding_budget set consumed_queries = consumed_queries + 1, updated_at = v_now
    where budget_key = 'permanent_geocoding';
  update private.xoot_coverage_allowance_reserve set protected_remaining = greatest(protected_remaining - 1, 0)
    where budget_key = 'permanent_geocoding';
  return true;
end;
$$;
revoke all on function public.xoot_consume_coverage_query(uuid) from public, anon, authenticated;
grant execute on function public.xoot_consume_coverage_query(uuid) to service_role;
comment on table private.xoot_coverage_allowance_reserve is
  'Up to ten EXISTING global attempts reserved for verified-actor coverage. Not an additional allowance, per-IP identity proof or renewable provider budget.';
$xoot_body_20261029112730$;
execute v_sql;
insert into supabase_migrations.schema_migrations(version,name,statements) values('20261029112730','protect_authenticated_coverage_allowance',array[v_sql]);
end if;
end;
$xoot_forward_security$;
