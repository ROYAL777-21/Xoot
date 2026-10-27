-- Public address discovery is independent of operational coverage and worker availability.
-- Finite, non-renewing owner allowances: no provider request can start at the default zero.
begin;
create table public.xoot_address_lookup_allowances (
  mode text primary key check(mode in ('suggest','confirm')),
  authorized_queries integer not null default 0 check(authorized_queries between 0 and 100000),
  consumed_queries integer not null default 0 check(consumed_queries between 0 and authorized_queries),
  updated_at timestamptz not null default clock_timestamp()
);
alter table public.xoot_address_lookup_allowances enable row level security;
revoke all on public.xoot_address_lookup_allowances from public,anon,authenticated,service_role;
grant select,update on public.xoot_address_lookup_allowances to service_role;
insert into public.xoot_address_lookup_allowances(mode) values('suggest'),('confirm');

create function public.xoot_consume_address_lookup(p_mode text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare allowance integer; used integer; permanent_allowance integer; permanent_used integer;
begin
  if p_mode is null or p_mode not in ('suggest','confirm') then return false;end if;
  select authorized_queries,consumed_queries into allowance,used
    from public.xoot_address_lookup_allowances where mode=p_mode for update;
  if not found or used>=allowance then return false;end if;
  if p_mode='confirm' then
    -- Share the SAME Permanent Geocoding ceiling used by precise coverage checks.
    -- Anonymous browsing cannot receive a second independent paid allowance.
    select authorized_queries,consumed_queries into permanent_allowance,permanent_used
      from public.xoot_mapbox_geocoding_budget where budget_key='permanent_geocoding' for update;
    if not found or permanent_used>=permanent_allowance then return false;end if;
    update public.xoot_mapbox_geocoding_budget set consumed_queries=consumed_queries+1,updated_at=clock_timestamp()
      where budget_key='permanent_geocoding';
  end if;
  update public.xoot_address_lookup_allowances set consumed_queries=consumed_queries+1,updated_at=clock_timestamp()
    where mode=p_mode;
  return true;
end $$;
revoke all on function public.xoot_consume_address_lookup(text) from public,anon,authenticated;
grant execute on function public.xoot_consume_address_lookup(text) to service_role;
comment on table public.xoot_address_lookup_allowances is
  'Owner-approved total attempts for address suggestions/confirmation, zero by default, no automatic reset. Confirmation also consumes the existing global Permanent Geocoding ceiling. Not a universal Mapbox invoice cap.';
commit;
