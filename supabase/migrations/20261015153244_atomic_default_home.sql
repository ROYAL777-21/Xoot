-- Canonical places are household_profiles. Never infer identity from address text.
-- Minimum compatible clients must be delivered after this migration: old writers fail closed.
begin;
do $$ begin
  if to_regclass('public.household_profiles_one_default_per_user') is null
    or to_regclass('public.saved_addresses_one_default_per_user') is null then
    raise exception 'Apply the reviewed 20261003140000 defaults migration first';
  end if;
end $$;
lock table public.household_profiles, public.saved_addresses in access exclusive mode;
-- Production historically defaulted this column to true; ordinary creation must not
-- silently choose a home or compete with the explicit atomic selection.
alter table public.household_profiles alter column is_default set default false;
alter table public.household_profiles
  add column source_saved_address_id uuid unique references public.saved_addresses(id) on delete no action deferrable initially immediate,
  add column archived_at timestamptz,
  add column has_access_notes boolean generated always as (nullif(btrim(access_notes),'') is not null) stored,
  add column city text,
  add column postal_code text;
alter table public.saved_addresses add column legacy_default_at_cutover boolean;
update public.saved_addresses set legacy_default_at_cutover = is_default;
insert into public.household_profiles(user_id,label,address,city,postal_code,created_at,source_saved_address_id,is_default)
select a.user_id,a.label,a.address,a.city,a.postal_code,a.created_at,a.id,
  a.is_default and not exists(select 1 from public.household_profiles h where h.user_id=a.user_id and h.is_default)
from public.saved_addresses a;
-- Retain the exact old flag for operational rollback, but never advertise a second default.
update public.saved_addresses set is_default=false;
comment on table public.saved_addresses is 'Read-only legacy address history. Active places/defaults are household_profiles; source_saved_address_id preserves identity.';
create unique index if not exists household_profiles_one_default_per_user
  on public.household_profiles(user_id) where is_default;

alter table public.household_profiles add constraint archived_home_not_default check (archived_at is null or not is_default);
create schema if not exists private;
create or replace function private.guard_legacy_places() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='DELETE' and pg_trigger_depth()>1 then return old; end if;
  raise exception 'Legacy places are read-only; use household_profiles' using errcode='42501';
end $$;
create trigger saved_addresses_read_only before insert or update or delete on public.saved_addresses
for each row execute function private.guard_legacy_places();
create or replace function private.lock_home_owner(p_expected_owner uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_owner uuid := auth.uid();
begin
  if v_owner is null or p_expected_owner is distinct from v_owner then
    raise exception 'Account changed. Reload your places.' using errcode='42501';
  end if;
  -- Stable owner lock exists before the first home. No table-wide lock or browser authority.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xoot-home:'||v_owner::text,0));
  return v_owner;
end $$;

create or replace function private.guard_home_identity() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='UPDATE' and (new.id is distinct from old.id or new.user_id is distinct from old.user_id
     or new.source_saved_address_id is distinct from old.source_saved_address_id) then
    raise exception 'Place identity is immutable' using errcode='42501';
  end if;
  -- Only table-owner RPCs may mutate defaults. A service-role direct write also fails closed.
  if (tg_op='INSERT' and (new.is_default or new.archived_at is not null or new.source_saved_address_id is not null)) or (tg_op='UPDATE' and (new.is_default is distinct from old.is_default or new.archived_at is distinct from old.archived_at)) then
    if current_user <> pg_catalog.pg_get_userbyid((select relowner from pg_catalog.pg_class where oid=tg_relid)) then
      raise exception 'Use the atomic home RPC' using errcode='42501';
    end if;
  end if;
  if tg_op='DELETE' then
    if pg_trigger_depth() < 2 then
      raise exception 'Archive places through delete_home' using errcode='42501';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xoot-home:'||old.user_id::text,0));
    return old;
  end if;
  if tg_op='INSERT' then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xoot-home:'||new.user_id::text,0));
  end if;
  return new;
end $$;
create trigger household_identity_guard before insert or update or delete on public.household_profiles
for each row execute function private.guard_home_identity();

create or replace function public.set_default_home(p_expected_owner uuid,p_home_id uuid,p_selected boolean default true)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_home public.household_profiles;
begin
  v_owner := private.lock_home_owner(p_expected_owner);
  select * into v_home from public.household_profiles where id=p_home_id and user_id=v_owner and archived_at is null for update;
  if not found or p_selected is null then raise exception 'Place unavailable' using errcode='22023'; end if;
  if p_selected then
    update public.household_profiles set is_default=false where user_id=v_owner and is_default and id<>p_home_id;
  end if;
  update public.household_profiles set is_default=p_selected where id=p_home_id;
  return jsonb_build_object('id',p_home_id,'is_default',p_selected);
end $$;

-- Details and an explicitly changed selection commit together. NULL selection preserves a
-- concurrent default switch. A caller-stable UUID makes retry after a lost creation reply safe.
create or replace function public.save_home(p_expected_owner uuid,p_home_id uuid,p_details jsonb,p_selected boolean default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_owner uuid; v_row public.household_profiles; v_key text; v_value jsonb; v_max int;
begin
  v_owner := private.lock_home_owner(p_expected_owner);
  if p_home_id is null or jsonb_typeof(p_details) is distinct from 'object' then
    raise exception 'Invalid place details' using errcode='22023';
  end if;
  for v_key,v_value in select * from jsonb_each(p_details) loop
    v_max := case v_key when 'label' then 120 when 'address' then 500 when 'city' then 120 when 'postal_code' then 30
      when 'gate_code' then 100 when 'alarm_code' then 100 when 'pet_notes' then 1000
      when 'parking_instructions' then 1000 when 'access_instructions' then 1000 when 'access_notes' then 1000
      when 'cleaning_preferences' then 1000 when 'fragile_areas' then 1000 when 'favourite_products' then 1000 else null end;
    if v_max is null or jsonb_typeof(v_value) not in ('string','null') or length(p_details->>v_key)>v_max then
      raise exception 'Invalid place details' using errcode='22023';
    end if;
  end loop;
  select * into v_row from public.household_profiles where id=p_home_id for update;
  if found and (v_row.user_id<>v_owner or v_row.archived_at is not null) then raise exception 'Place unavailable' using errcode='42501'; end if;
  if not found then
    insert into public.household_profiles(id,user_id,label,is_default) values(p_home_id,v_owner,'Home',false) returning * into v_row;
  end if;
  v_row := jsonb_populate_record(v_row,p_details);
  if length(btrim(v_row.label))<1 or coalesce(length(btrim(v_row.address)),0)<10 then
    raise exception 'Name this place and enter a complete address' using errcode='22023';
  end if;
  update public.household_profiles set label=v_row.label,address=v_row.address,city=v_row.city,postal_code=v_row.postal_code,
    pet_notes=v_row.pet_notes,parking_instructions=v_row.parking_instructions,gate_code=v_row.gate_code,alarm_code=v_row.alarm_code,
    access_instructions=v_row.access_instructions,access_notes=v_row.access_notes,cleaning_preferences=v_row.cleaning_preferences,
    fragile_areas=v_row.fragile_areas,favourite_products=v_row.favourite_products,updated_at=now() where id=p_home_id;
  if p_selected is not null then perform public.set_default_home(v_owner,p_home_id,p_selected); end if;
  return (select jsonb_build_object('id',id,'is_default',is_default) from public.household_profiles where id=p_home_id);
end $$;

create or replace function public.delete_home(p_expected_owner uuid,p_home_id uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare v_owner uuid;
begin
  v_owner := private.lock_home_owner(p_expected_owner);
  -- Archive instead of deleting: bookings and their household context keep their IDs.
  update public.household_profiles set archived_at=now(),is_default=false
    where id=p_home_id and user_id=v_owner and archived_at is null;
  if not found then raise exception 'Place unavailable' using errcode='22023'; end if;
  return jsonb_build_object('id',p_home_id,'deleted',true);
end $$;

-- Remove table AND any historical column grants. Keep existing owner RLS for reads.
revoke select on public.saved_addresses from public,anon,authenticated;
revoke insert,update,delete,truncate,references,trigger on public.household_profiles,public.saved_addresses from public,anon,authenticated;
do $$ declare t text; c text; begin
  foreach t in array array['household_profiles','saved_addresses'] loop
    select string_agg(quote_ident(column_name),',') into c from information_schema.columns where table_schema='public' and table_name=t;
    execute format('revoke insert (%s),update (%s),references (%s) on public.%I from public,anon,authenticated',c,c,c,t);
    if t='saved_addresses' then execute format('revoke select (%s) on public.%I from public,anon,authenticated',c,t); end if;
  end loop;
end $$;
revoke all on function private.lock_home_owner(uuid),private.guard_home_identity(),private.guard_legacy_places() from public,anon,authenticated,service_role;
revoke all on function public.set_default_home(uuid,uuid,boolean),public.save_home(uuid,uuid,jsonb,boolean),public.delete_home(uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.set_default_home(uuid,uuid,boolean),public.save_home(uuid,uuid,jsonb,boolean),public.delete_home(uuid,uuid) to authenticated;
commit;
