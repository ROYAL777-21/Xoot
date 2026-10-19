begin;

-- Zones remain EMPTY until the founder/operator supplies approved boundaries.
-- No centroid buffer, suburb string or generated placeholder may be silently
-- interpreted as confirmed service coverage. PostGIS is not installed on
-- either existing Xoot project, so GeoJSON validation occurs server-side.
create table public.xoot_service_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  geometry jsonb not null check (jsonb_typeof(geometry) = 'object'),
  service_types text[] not null check (array_length(service_types, 1) between 1 and 12),
  active boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  boundary_source text not null check (char_length(boundary_source) between 3 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint xoot_active_zone_has_authorised_approval
    check (not active or (approved_at is not null and approved_by is not null))
);

create index xoot_service_zones_active on public.xoot_service_zones(active)
  where active = true;

alter table public.xoot_service_zones enable row level security;
-- No public polygons API: approved boundaries are read only by an authenticated
-- Edge service using service_role after bounding the data volume.
revoke all on table public.xoot_service_zones from public, anon, authenticated;
grant select, insert, update, delete on table public.xoot_service_zones to service_role;

create table public.xoot_coverage_query_budget (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requests integer not null default 0 check (requests between 0 and 12),
  resets_at timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table public.xoot_coverage_query_budget enable row level security;
revoke all on table public.xoot_coverage_query_budget from public, anon, authenticated;
grant select, insert, update, delete on table public.xoot_coverage_query_budget to service_role;

-- A server-only atomic budget. Concurrency serialises on user_id's unique index.
-- 12 requests per hour/user avoid uncontrolled billable geocoding loops.
create or replace function public.xoot_consume_coverage_query(p_user_id uuid)
returns boolean language plpgsql security invoker set search_path = ''
as $$
declare
  v_rows integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_user_id is null then return false; end if;
  insert into public.xoot_coverage_query_budget(user_id, requests, resets_at, updated_at)
  values (p_user_id, 1, v_now + interval '1 hour', v_now)
  on conflict (user_id) do update
    set requests = case
        when public.xoot_coverage_query_budget.resets_at <= v_now then 1
        else public.xoot_coverage_query_budget.requests + 1
      end,
      resets_at = case
        when public.xoot_coverage_query_budget.resets_at <= v_now then v_now + interval '1 hour'
        else public.xoot_coverage_query_budget.resets_at
      end,
      updated_at = v_now
  where public.xoot_coverage_query_budget.resets_at <= v_now
    or public.xoot_coverage_query_budget.requests < 12;
  get diagnostics v_rows = row_count;
  return v_rows = 1;
end;
$$;
revoke all on function public.xoot_consume_coverage_query(uuid) from public, anon, authenticated;
grant execute on function public.xoot_consume_coverage_query(uuid) to service_role;

comment on table public.xoot_service_zones is
  'Admin-approved GeoJSON service polygons. Empty until real verified operating boundaries have been supplied.';
comment on function public.xoot_consume_coverage_query(uuid) is
  'Service-only atomic 12/hour geocoding request budget. Signed JWT actor supplied by Edge, never client user_id.';

commit;
