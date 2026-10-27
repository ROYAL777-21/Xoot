-- A total, non-renewing allowance for the server's Permanent Geocoding route.
-- Zero by default: geography approval never implies authorisation for provider charges.
-- This does not control map loads, Directions or calls outside this server route.
create table public.xoot_mapbox_geocoding_budget (
  budget_key text primary key check (budget_key = 'permanent_geocoding'),
  authorized_queries integer not null default 0 check (authorized_queries between 0 and 100000),
  consumed_queries integer not null default 0 check (consumed_queries >= 0 and consumed_queries <= authorized_queries),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.xoot_mapbox_geocoding_budget enable row level security;
revoke all on public.xoot_mapbox_geocoding_budget from public, anon, authenticated, service_role;
grant select, update on public.xoot_mapbox_geocoding_budget to service_role;
insert into public.xoot_mapbox_geocoding_budget(budget_key) values('permanent_geocoding');

-- Preserve the existing importer contract. Hold the global row lock while deciding both
-- limits, so many new accounts cannot each spend a separate provider allowance.
create or replace function public.xoot_consume_coverage_query(p_user_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_limit integer; v_used integer; v_rows integer; v_now timestamptz;
begin
  if p_user_id is null then return false; end if;
  select authorized_queries, consumed_queries into v_limit,v_used
    from public.xoot_mapbox_geocoding_budget where budget_key='permanent_geocoding' for update;
  if not found or v_used >= v_limit then return false; end if;
  v_now := clock_timestamp();
  insert into public.xoot_coverage_query_budget(user_id,requests,resets_at,updated_at)
  values(p_user_id,1,v_now+interval '1 hour',v_now)
  on conflict(user_id) do update
    set requests=case when public.xoot_coverage_query_budget.resets_at <= v_now then 1
      else public.xoot_coverage_query_budget.requests+1 end,
    resets_at=case when public.xoot_coverage_query_budget.resets_at <= v_now then v_now+interval '1 hour'
      else public.xoot_coverage_query_budget.resets_at end, updated_at=v_now
  where public.xoot_coverage_query_budget.resets_at <= v_now
    or public.xoot_coverage_query_budget.requests < 12;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then return false; end if;
  update public.xoot_mapbox_geocoding_budget
    set consumed_queries=consumed_queries+1,updated_at=v_now where budget_key='permanent_geocoding';
  return true;
end;
$$;
revoke all on function public.xoot_consume_coverage_query(uuid) from public, anon, authenticated;
grant execute on function public.xoot_consume_coverage_query(uuid) to service_role;
comment on table public.xoot_mapbox_geocoding_budget is
  'Owner-authorised total Permanent Geocoding attempts, zero by default, never auto-renewed. Each allowed attempt counts even if the provider fails. Other Mapbox products/routes are separate.';
comment on function public.xoot_consume_coverage_query(uuid) is
  'Service-only atomic global non-renewing allowance AND 12/hour/user. Missing or exhausted allowance denies before Mapbox fetch.';
