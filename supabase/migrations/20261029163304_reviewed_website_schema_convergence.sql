-- Reviewed forward delivery of the 25 explicitly rehearsed missing/forward versions.
-- Historical sources are unchanged. Existing ledger rows are neither deleted nor invented.
-- ONE DO statement makes DDL plus its original-version records all-or-nothing.
-- The hosting migration runner records this wrapper's own actual delivery version.
-- No provider capability, operational switch, paid allowance or approved worker is enabled.
do $xoot_convergence$
declare v_sql text;
begin
  perform pg_advisory_xact_lock(20261029, 101);
  perform set_config('lock_timeout','5s',true);
  -- 20260903000000_referral_base_prerequisite_convergence.sql; original SHA256 ad1f6bf78702c2e53ce9111580e08938c5c2586770092321b784cb56ed620852
  if not exists (select from supabase_migrations.schema_migrations where version='20260903000000') then
    v_sql := $xoot_body_20260903000000$-- Production prerequisite for ZD-035/036.
-- Staging retains the April referral tables. Production's historical migration
-- ledger says April ran but its actual schema has neither table or code generator.
-- Intentionally sorts BEFORE 20260903120000_zd035_crew_and_zd036_referrals.sql.
-- Do not repair-mark this file: prove both table shapes, roles, trigger and ledger.
-- No historical booking, balance, customer or referral data is rewritten.
do $preflight$
declare
  v_codes boolean := to_regclass('public.referrals') is not null;
  v_uses boolean := to_regclass('public.referral_redemptions') is not null;
begin
  if v_codes is distinct from v_uses then
    raise exception 'Partial referral baseline: investigate before creating or changing either table';
  end if;
  if not v_codes then
    create table public.referrals (
      user_id uuid primary key,
      code text not null unique,
      total_invited integer not null default 0,
      total_rewarded integer not null default 0,
      created_at timestamptz not null default now()
    );
    create table public.referral_redemptions (
      id uuid primary key default gen_random_uuid(),
      referrer_user_id uuid not null,
      referred_user_id uuid not null unique,
      rewarded boolean not null default false,
      rewarded_at timestamptz,
      created_at timestamptz not null default now()
    );
  end if;
end;
$preflight$;

-- Check exact canonical base columns even when pre-existing. ZD035 later
-- adds booking_id and credit_cents to referral_redemptions, and those extra
-- columns are allowed on a previously migrated staging database.
do $shape$
declare v_table text; v_column text; v_type text; v_required boolean;
begin
  for v_table,v_column,v_type,v_required in
    select * from (values
      ('referrals','user_id','uuid',true),
      ('referrals','code','text',true),
      ('referrals','total_invited','integer',true),
      ('referrals','total_rewarded','integer',true),
      ('referrals','created_at','timestamp with time zone',true),
      ('referral_redemptions','id','uuid',true),
      ('referral_redemptions','referrer_user_id','uuid',true),
      ('referral_redemptions','referred_user_id','uuid',true),
      ('referral_redemptions','rewarded','boolean',true),
      ('referral_redemptions','rewarded_at','timestamp with time zone',false),
      ('referral_redemptions','created_at','timestamp with time zone',true)
    ) x(t,c,typ,required)
  loop
    if not exists (
      select 1 from pg_class t join pg_namespace n on n.oid=t.relnamespace
      join pg_attribute a on a.attrelid=t.oid and a.attnum>0 and not a.attisdropped
      where n.nspname='public' and t.relname=v_table and a.attname=v_column
        and format_type(a.atttypid,a.atttypmod)=v_type and a.attnotnull=v_required
    ) then
      raise exception 'Referral schema differs from canonical base: %.%',v_table,v_column;
    end if;
  end loop;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.referrals'::regclass and c.contype='p'
      and pg_get_constraintdef(c.oid)='PRIMARY KEY (user_id)'
  ) or not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.referrals'::regclass and c.contype='u'
      and pg_get_constraintdef(c.oid)='UNIQUE (code)'
  ) or not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.referral_redemptions'::regclass and c.contype='p'
      and pg_get_constraintdef(c.oid)='PRIMARY KEY (id)'
  ) or not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.referral_redemptions'::regclass and c.contype='u'
      and pg_get_constraintdef(c.oid)='UNIQUE (referred_user_id)'
  ) then
    raise exception 'Canonical referral primary/unique constraints absent';
  end if;
end;
$shape$;

alter table public.referrals enable row level security;
alter table public.referral_redemptions enable row level security;

do $policies$
begin
  -- The legacy April "view by code USING(true)" was over-permissive. Never
  -- recreate it. The lookup in get-booking-quote uses service_role.
  if exists (select 1 from pg_policies where schemaname='public'
    and tablename in ('referrals','referral_redemptions')
    and policyname not in ('referrals_select_owner_or_admin','view own redemptions')) then
    raise exception 'Unexpected referral policy: manual RLS review required';
  end if;
  if not exists (select 1 from pg_policies where schemaname='public'
    and tablename='referrals' and policyname='referrals_select_owner_or_admin') then
    create policy referrals_select_owner_or_admin on public.referrals
      for select to authenticated using (
        user_id=(select auth.uid()) or
        private.has_role((select auth.uid()), 'admin'::public.app_role)
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public'
    and tablename='referral_redemptions' and policyname='view own redemptions') then
    create policy "view own redemptions" on public.referral_redemptions
      for select to authenticated using (
        (select auth.uid())=referrer_user_id or
        (select auth.uid())=referred_user_id
      );
  end if;
end;
$policies$;

-- Writes are handled only by the Edge service role. Revoke bypass-capable
-- TRUNCATE even though owner-only RLS is on. The subsequent 20261015102137
-- grant migration asserts these exact end-state privileges again.
revoke all privileges on public.referrals, public.referral_redemptions
  from public, anon, authenticated;
grant select on public.referrals, public.referral_redemptions to authenticated;
grant all privileges on public.referrals, public.referral_redemptions to service_role;

-- Staging's April generator is preserved byte-for-byte; production receives
-- its missing function. Never replace an existing operational function silently.
do $create_code$
begin
  if to_regprocedure('public.gen_referral_code()') is null then
    execute $definition$
      create function public.gen_referral_code() returns text
      language plpgsql security definer set search_path=public as $generator$
      declare
        chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        result text;
        i integer;
      begin
        loop
          result := '';
          for i in 1..6 loop
            result := result || substr(chars, floor(random()*length(chars))::integer + 1, 1);
          end loop;
          exit when not exists (select 1 from public.referrals where code=result);
        end loop;
        return result;
      end;
      $generator$;
    $definition$;
  end if;
end;
$create_code$;

revoke all on function public.gen_referral_code() from public, anon, authenticated;
grant execute on function public.gen_referral_code() to service_role;

do $postconditions$
begin
  if exists (select 1 from pg_class c where c.oid in
    ('public.referrals'::regclass,'public.referral_redemptions'::regclass)
    and not c.relrowsecurity) then
    raise exception 'RLS disabled on reconstructed referral table';
  end if;
  if not exists (select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='gen_referral_code'
      and pg_get_function_identity_arguments(p.oid)='' and p.prosecdef) then
    raise exception 'Referral code generator is absent or not SECURITY DEFINER';
  end if;
  if has_function_privilege('anon','public.gen_referral_code()','EXECUTE')
    or has_function_privilege('authenticated','public.gen_referral_code()','EXECUTE')
    or not has_function_privilege('service_role','public.gen_referral_code()','EXECUTE') then
    raise exception 'Referral generator has unsafe execution grants';
  end if;
  if has_table_privilege('anon','public.referrals','TRUNCATE')
    or has_table_privilege('anon','public.referral_redemptions','TRUNCATE')
    or has_table_privilege('authenticated','public.referrals','TRUNCATE')
    or has_table_privilege('authenticated','public.referral_redemptions','TRUNCATE')
    or has_table_privilege('authenticated','public.referrals','INSERT')
    or has_table_privilege('authenticated','public.referral_redemptions','INSERT')
    or not has_table_privilege('authenticated','public.referrals','SELECT')
    or not has_table_privilege('authenticated','public.referral_redemptions','SELECT') then
    raise exception 'Unsafe referral table ACLs remain';
  end if;
end;
$postconditions$;$xoot_body_20260903000000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20260903000000','referral_base_prerequisite_convergence',array[v_sql]);
  end if;
  -- 20260903120000_zd035_crew_and_zd036_referrals.sql; original SHA256 7f31c083833a5e5133c98b3d2f9e0834d0121307d3836497e881a437b92073f5
  if not exists (select from supabase_migrations.schema_migrations where version='20260903120000') then
    v_sql := $xoot_body_20260903120000$-- ZD-035 crew bookings, and ZD-036's missing referral columns.
--
-- ── ⚠️ THIS FILE'S FIRST DRAFT WAS WRONG, AND STAGING IS WHAT CAUGHT IT ─────────────────
--
-- The first version created `public.referrals` from scratch with an `owner_id`. Applying it to
-- staging failed at statement 11:
--
--     ERROR: column "owner_id" does not exist (SQLSTATE 42703)
--     create index if not exists referrals_owner_id_idx on public.referrals (owner_id)
--
-- `create table if not exists` had silently done nothing, because **`public.referrals` has
-- existed since 2026-04-23** with `user_id` as its primary key, a unique `code`, and a signup
-- trigger that already issues every user a code. `referral_redemptions` exists beside it, and
-- its `referred_user_id UNIQUE` **is** the single-use burn ZD-036 asked for.
--
-- So ZD-036 needs no new tables. It needed two columns. Had the index name not collided, this
-- migration would have bolted new RLS policies and grants onto a live table with a different
-- shape and real rows in it — which is a considerably worse outcome than a failed apply.
--
-- ⚠️ **`if not exists` is why the collision was silent.** It is the right default for a table
-- this migration owns and the wrong one for a table it does not, because it converts "this
-- already exists and is not what you think" into "fine, carry on".
--
-- ── ZD-035, and why this half is a migration rather than a constant change ───────────────
--
-- `create-booking` builds `bookingTargets = selectedXooterIds.length ? selectedXooterIds :
-- [null]` and inserts ONE `bookings` ROW PER XOOTER, each priced as a whole job with its own
-- commission rate. The data model IS the old commercial model: "two Xooters" means two jobs.
--
-- ZD-035 makes it one job a crew finishes sooner. Under the old shape, changing only the
-- multiplier would emit N rows at the coordination overhead each — 2.3× the intended price for
-- a crew of two, in the UNDER-stating direction against what the customer was shown.
--
-- ⚠️ NOTHING IS BACKFILLED AND NOTHING IS DROPPED. Existing multi-Xooter bookings keep their
-- row-per-Xooter shape and their prices. Rewriting historical money to a model that did not
-- exist when it was charged would make every past invoice disagree with what was taken.
-- `bookings.crew_size` defaults to 1, so every existing row reads as the solo booking it was.
-- ── ZD-035 ──────────────────────────────────────────────────────────────────────────────

alter table public.bookings
  add column if not exists crew_size smallint not null default 1,
  -- Elapsed hours differ from booked labour once a crew is involved, and the customer is told
  -- the elapsed figure. Stored rather than derived so an invoice re-read years later does not
  -- depend on today's overhead curve.
  add column if not exists crew_elapsed_hours numeric(4, 1);

-- ZD-035 caps at 4. The check is here as well as in the resolver because a hand-built request
-- that reaches the table directly must not be able to record a crew nobody priced.
alter table public.bookings
  drop constraint if exists bookings_crew_size_range;
alter table public.bookings
  add constraint bookings_crew_size_range check (crew_size between 1 and 4);

create table if not exists public.booking_assignees (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings (id) on delete cascade,
  xooter_id uuid not null references public.xooters (id),
  -- Each Xooter is ranked separately, so each carries their own rate on the job they worked.
  -- Copied at assignment, never joined at read time: a Xooter whose band moves next month must
  -- not retroactively change what they were paid for this booking.
  commission_rate_bps integer not null,
  assigned_at timestamptz not null default now(),
  -- One row per Xooter per booking. Without this a retry double-assigns and the payout splits
  -- into more shares than there are people.
  unique (booking_id, xooter_id)
);

create index if not exists booking_assignees_booking_id_idx
  on public.booking_assignees (booking_id);
create index if not exists booking_assignees_xooter_id_idx
  on public.booking_assignees (xooter_id);

alter table public.booking_assignees enable row level security;

-- No anon or authenticated policy is created, deliberately. Assignment is decided by the
-- server; a customer reads their crew through the booking they already own, and a Xooter reads
-- their jobs through the existing card RPCs. Granting a direct select here would widen the
-- surface for no gain.
revoke all on public.booking_assignees from anon, authenticated;
grant select, insert, update, delete on public.booking_assignees to service_role;

-- ── ZD-036 — two columns on the redemption ledger that already exists ────────────────────
--
-- `public.referrals` and `public.referral_redemptions` are left exactly as they are. Their
-- RLS was already tightened by `20260627113000_performance_advisor_cleanup`, and the signup
-- trigger that issues codes already works. Adding to them, not replacing them.

alter table public.referral_redemptions
  -- Which booking burned the code. Without it a redemption cannot be reconciled against the
  -- money it discounted, and "was this credit actually applied?" has no answer.
  add column if not exists booking_id uuid references public.bookings (id) on delete set null,
  -- What was actually taken off, in cents. Stored rather than assumed from today's constant:
  -- ZD-036 records R100 as provisional, and a redemption from before a change must still
  -- report the number that was really applied.
  add column if not exists credit_cents integer;

-- Never negative, and never invented. A null means the redemption predates this column.
alter table public.referral_redemptions
  drop constraint if exists referral_redemptions_credit_cents_non_negative;
alter table public.referral_redemptions
  add constraint referral_redemptions_credit_cents_non_negative
  check (credit_cents is null or credit_cents >= 0);

create index if not exists referral_redemptions_booking_id_idx
  on public.referral_redemptions (booking_id);$xoot_body_20260903120000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20260903120000','zd035_crew_and_zd036_referrals',array[v_sql]);
  end if;
  -- 20260920200000_gift_order_contract.sql; original SHA256 2fb12ec9f7a09f8e78f29adcb81d11a258496b2e5a24be95eaad1ce2264c2728
  if not exists (select from supabase_migrations.schema_migrations where version='20260920200000') then
    v_sql := $xoot_body_20260920200000$-- A reviewed gift is one atomic order, payment record and operations entry.
-- Keep old single-visit records unchanged. New gift definitions snapshot quantity and artwork.
alter table public.gift_clean_orders
  add column request_key uuid,
  add column definition jsonb,
  add column accepted_quote jsonb;

create unique index gift_order_request_key on public.gift_clean_orders(purchaser_user_id, request_key)
  where request_key is not null;

-- Gift price, recipient and fulfilment details become immutable once reviewed. The edge
-- contract owns creation; allowing inserts/column updates would bypass quote acceptance.
revoke insert, update, delete on public.gift_clean_orders from authenticated;
do $$
declare column_name text;
begin
  for column_name in select a.attname from pg_catalog.pg_attribute a
    where a.attrelid = 'public.gift_clean_orders'::regclass and a.attnum > 0 and not a.attisdropped
  loop
    execute format('revoke update (%I), insert (%I) on public.gift_clean_orders from authenticated', column_name, column_name);
  end loop;
end $$;

create function public.create_reviewed_gift_order(
  p_user_id uuid, p_request_key uuid, p_definition jsonb, p_current_quote jsonb, p_accepted_quote jsonb
) returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  existing public.gift_clean_orders%rowtype;
  gift_id uuid := gen_random_uuid();
  payment_id uuid := gen_random_uuid();
  total numeric;
begin
  if p_user_id is null or p_request_key is null then raise exception 'gift identity required'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text || ':' || p_request_key::text, 0));
  select * into existing from public.gift_clean_orders
    where purchaser_user_id = p_user_id and request_key = p_request_key;
  if found then
    if existing.definition is distinct from p_definition then
      return jsonb_build_object('error', 'request_key_reused');
    end if;
    return jsonb_build_object('order_id', existing.id, 'payment_record_id', existing.payment_record_id,
      'status', existing.status, 'quote', existing.accepted_quote, 'replayed', true);
  end if;
  if p_accepted_quote is null or p_accepted_quote is distinct from p_current_quote then
    return jsonb_build_object('error', 'quote_changed', 'quote', p_current_quote);
  end if;
  if p_current_quote->>'currency' is distinct from 'ZAR'
    or p_current_quote->>'service' is distinct from p_definition->>'service'
    or p_current_quote->>'count' is distinct from p_definition->>'count'
    or (p_current_quote->>'count')::integer not in (1,3,4,6,12)
    or (p_current_quote->>'totalCents')::bigint is distinct from
       (p_current_quote->>'perVisitCents')::bigint * (p_current_quote->>'count')::integer
  then raise exception 'invalid gift quote'; end if;
  total := (p_current_quote->>'totalCents')::bigint / 100.0;
  if total is null or total <= 0 then raise exception 'invalid gift amount'; end if;

  insert into public.payment_records(id, user_id, amount, currency, status, provider, provider_reference, payment_kind, meta)
    values(payment_id, p_user_id, total, 'ZAR', 'pending', 'manual_pending', gen_random_uuid()::text, 'gift_clean',
      jsonb_build_object('gift_clean_order_id', gift_id, 'quote', p_current_quote, 'fulfilment_ready', false));
  insert into public.gift_clean_orders(id, purchaser_user_id, recipient_name, recipient_email, occasion, message,
    service_type, amount, status, payment_record_id, request_key, definition, accepted_quote)
    values(gift_id, p_user_id, coalesce(nullif(p_definition->>'recipientName', ''), 'Shareable gift'),
      nullif(p_definition->>'recipientEmail', ''), nullif(p_definition->>'occasion', ''), nullif(p_definition->>'note', ''),
      p_definition->>'service', total, 'pending_payment', payment_id, p_request_key, p_definition, p_current_quote);
  insert into public.admin_review_queue(queue_type, subject_table, subject_id, user_id, priority, summary)
    values('payment', 'gift_clean_orders', gift_id, p_user_id, 'normal', 'Gift clean request awaiting checkout');
  insert into public.integration_outbox(source_table, source_id, event_type, channel, owner, stack_tool, payload, created_by)
    values('gift_clean_orders', gift_id, 'gift_clean_request_created', 'in_app', 'Retention & Loyalty Agent',
      'Xoot in-app notification', jsonb_build_object('gift_clean_order_id', gift_id, 'amount', total, 'status', 'pending_payment'), p_user_id);
  return jsonb_build_object('order_id', gift_id, 'payment_record_id', payment_id, 'status', 'pending_payment', 'quote', p_current_quote, 'replayed', false);
end $$;
revoke all on function public.create_reviewed_gift_order(uuid, uuid, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_reviewed_gift_order(uuid, uuid, jsonb, jsonb, jsonb) to service_role;
$xoot_body_20260920200000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20260920200000','gift_order_contract',array[v_sql]);
  end if;
  -- 20260928003000_booking_quote_calculator.sql; original SHA256 f80d7b87d94750ba1325c4f7b9e6da4cd4adb6f76a99c61d092ed555a31a3f92
  if not exists (select from supabase_migrations.schema_migrations where version='20260928003000') then
    v_sql := $xoot_body_20260928003000$-- Pure calculator for the later locked booking transaction. No booking writes or enablement.
-- p_input is the canonical output of parseBookingQuoteInput, not a raw client payload.
-- p_facts must be loaded by the future transaction under its account/eligibility locks.
-- This function neither proves identity/eligibility nor checks future time against a clock.
-- Its caller must do those checks and compare the full returned quote before writing.
-- Mirror booking-zd038-v1 in _shared/booking-quote.ts; differential tests pin the complete JSON.
create schema if not exists private;

create function private.calculate_booking_quote_v1(p_input jsonb, p_facts jsonb)
returns jsonb
language plpgsql immutable security invoker
set search_path = ''
as $function$
declare
  requested_service text;
  actual_service text;
  property_type text;
  home_size text;
  hours numeric;
  crew integer;
  crew_cap integer;
  overhead double precision;
  solo_base_cents bigint;
  base_cents bigint;
  addons_cents bigint;
  linen_cents bigint;
  work_cents bigint;
  high_demand_cents bigint;
  fee_cents bigint;
  cover_cents bigint;
  care_discount_cents bigint;
  referral_discount_cents bigint := 0;
  credit_cents bigint;
  before_credit_cents bigint;
  solo_hours double precision;
  elapsed_hours double precision;
  member boolean;
  cover_available boolean;
  referral_status text := 'not_requested';
  referral_code text;
  correction jsonb := 'null'::jsonb;
  lines jsonb;
  item jsonb;
  key text;
  parsed_date date;
  date_parts text[];
  start_minutes integer;
  sorted_addons jsonb;
  sorted_days jsonb;
  labels constant jsonb := '{
    "inside_fridge":"Inside fridge", "inside_oven":"Inside oven", "inside_cabinets":"Inside cabinets",
    "interior_windows":"Interior windows", "interior_walls":"Interior walls", "water_plants":"Water plants",
    "ironing":"Ironing", "laundry":"Laundry", "small_flatlet":"Small flatlet",
    "balcony_patio":"Balcony/patio", "clean_windows":"Clean windows", "clean_appliances":"Clean appliances",
    "wipe_furniture":"Wipe furniture", "unpack_boxes":"Unpack boxes", "pack_boxes":"Pack boxes",
    "restock_supplies":"Restock supplies", "restock_toiletries":"Restock toiletries"}';
  ladders constant jsonb := '{
    "regular":{"3.5":236,"4":250,"4.5":266,"5":280,"5.5":296,"6":310,"6.5":326,"7":340,"7.5":356,"8":376,"8.5":400,"9":423,"9.5":447,"10":470},
    "office":{"2":324,"2.5":324,"3":324,"3.5":374,"4":424,"4.5":442,"5":452,"5.5":476,"6":504,"6.5":518,"7":540,"7.5":558,"8":592,"8.5":618,"9":638,"9.5":646,"10":660},
    "express":{"1":220,"1.5":220,"2":220,"2.5":220,"3":220},
    "airbnb":{"3":304,"3.5":304,"4":304,"4.5":318,"5":324,"5.5":342,"6":362,"6.5":362,"7":372,"7.5":400,"8":426},
    "moving":{"4.5":320,"5":330,"5.5":344,"6":364,"6.5":376,"7":390,"7.5":404,"8":430,"8.5":448,"9":462,"9.5":468,"10":478}}';
begin
  -- Reject missing, additional and wrongly typed canonical fields rather than allowing
  -- casts/defaults to silently manufacture a quote from a malformed internal call.
  if jsonb_typeof(p_input) is distinct from 'object'
    or jsonb_typeof(p_facts) is distinct from 'object'
    or (select array_agg(k order by k collate "C") from jsonb_object_keys(p_input) k) is distinct from
       array['addOns','contractVersion','coverRequested','crewSize','date','frequency','homeSize','hours','linen','propertyType','referralCode','repeatDays','requestedCreditCents','service','time']::text[]
    or p_input->'contractVersion' is distinct from '1'::jsonb
  then raise exception 'invalid canonical booking input' using errcode = '22023'; end if;

  foreach key in array array['service','propertyType','homeSize','date','time','frequency','referralCode'] loop
    if jsonb_typeof(p_input->key) is distinct from 'string' then
      raise exception 'invalid canonical booking field: %', key using errcode = '22023';
    end if;
  end loop;
  foreach key in array array['hours','crewSize','requestedCreditCents'] loop
    if jsonb_typeof(p_input->key) is distinct from 'number' then
      raise exception 'invalid canonical booking field: %', key using errcode = '22023';
    end if;
  end loop;
  if jsonb_typeof(p_input->'coverRequested') is distinct from 'boolean'
    or jsonb_typeof(p_input->'addOns') is distinct from 'array'
    or jsonb_typeof(p_input->'repeatDays') is distinct from 'array'
  then raise exception 'invalid canonical booking collections or cover' using errcode = '22023'; end if;

  requested_service := p_input->>'service';
  property_type := p_input->>'propertyType';
  home_size := p_input->>'homeSize';
  hours := (p_input->>'hours')::numeric;
  if requested_service not in ('regular','express','airbnb','office','moving')
    or property_type not in ('flat','house','townhouse','airbnb','office','empty')
    or home_size not in ('small','medium','large')
    or hours < 1 or hours > 10 or hours * 2 <> trunc(hours * 2)
    or (p_input->>'crewSize')::numeric not between 1 and 4
    or (p_input->>'crewSize')::numeric <> trunc((p_input->>'crewSize')::numeric)
    or (p_input->>'requestedCreditCents')::numeric not between 0 and 100000000
    or (p_input->>'requestedCreditCents')::numeric <> trunc((p_input->>'requestedCreditCents')::numeric)
  then raise exception 'invalid canonical booking values' using errcode = '22023'; end if;
  crew := (p_input->>'crewSize')::numeric::integer;
  actual_service := case property_type when 'office' then 'office' when 'airbnb' then 'airbnb'
    when 'empty' then 'moving' else requested_service end;
  if property_type in ('flat','house','townhouse') and requested_service not in ('regular','express') then
    raise exception 'incompatible property and service' using errcode = '22023';
  end if;
  if actual_service <> requested_service then
    if hours <> (case actual_service when 'office' then 5 when 'airbnb' then 4 when 'moving' then 8 end) then
      raise exception 'service correction hours are not normalized' using errcode = '22023';
    end if;
    correction := jsonb_build_object('from', requested_service, 'to', actual_service, 'reason',
      property_type || ' properties use ' || actual_service || ' cleaning; hours were reset to the ' || actual_service || ' default');
  end if;
  crew_cap := greatest(case home_size when 'small' then 2 when 'medium' then 3 else 4 end,
    case actual_service when 'express' then 3 when 'airbnb' then 3 when 'office' then 4 when 'moving' then 4 else 0 end);
  if crew > crew_cap then raise exception 'crew exceeds service and size cap' using errcode = '22023'; end if;
  -- trim_scale matches String(hours) even when a JSON number was serialized as 4.0.
  solo_base_cents := (ladders->actual_service->>trim_scale(hours)::text)::bigint * 100;
  if solo_base_cents is null then raise exception 'hours are not on service ladder' using errcode = '22023'; end if;

  if jsonb_array_length(p_input->'addOns') > 17 then
    raise exception 'too many booking extras' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_input->'addOns') loop
    key := item #>> '{}';
    if jsonb_typeof(item) is distinct from 'string' or not (labels ? key) or not (
      (key in ('inside_fridge','inside_oven','inside_cabinets','interior_windows','interior_walls','water_plants','ironing','laundry') and actual_service in ('regular','express'))
      or (key = 'small_flatlet' and actual_service = 'regular')
      or (key in ('balcony_patio','clean_windows','wipe_furniture','unpack_boxes','pack_boxes') and actual_service = 'moving')
      or (key = 'clean_appliances' and actual_service in ('moving','airbnb'))
      or (key in ('restock_supplies','restock_toiletries') and actual_service = 'airbnb')
    ) then raise exception 'invalid service extra' using errcode = '22023'; end if;
  end loop;
  select coalesce(jsonb_agg(value order by value collate "C"), '[]'::jsonb) into sorted_addons
    from (select distinct value from jsonb_array_elements_text(p_input->'addOns')) extras;
  if sorted_addons is distinct from p_input->'addOns' then
    raise exception 'booking extras are not canonical' using errcode = '22023';
  end if;
  if actual_service = 'airbnb' then
    if jsonb_typeof(p_input->'linen') is distinct from 'string'
      or p_input->>'linen' not in ('none','replace','wash_hang','wash_dry_repack')
      or (p_input->>'linen' = 'wash_dry_repack' and hours < 5)
    then raise exception 'invalid Airbnb linen choice' using errcode = '22023'; end if;
  elsif p_input->'linen' is distinct from 'null'::jsonb then
    raise exception 'linen requires Airbnb service' using errcode = '22023';
  end if;

  if jsonb_typeof(p_facts->'buyerId') is distinct from 'string' or p_facts->>'buyerId' = '' then
    raise exception 'buyer identity required' using errcode = '22023';
  end if;
  foreach key in array array['carePlusMember','hasPriorRedemption','coverAvailable'] loop
    if jsonb_typeof(p_facts->key) is distinct from 'boolean' then
      raise exception 'invalid verified fact: %', key using errcode = '22023';
    end if;
  end loop;
  foreach key in array array['availableCreditCents','completedBookingCount'] loop
    if jsonb_typeof(p_facts->key) is distinct from 'number' then
      raise exception 'invalid verified fact: %', key using errcode = '22023';
    end if;
    if (p_facts->>key)::numeric not between 0 and 9007199254740991
      or (p_facts->>key)::numeric <> trunc((p_facts->>key)::numeric)
    then raise exception 'invalid verified fact: %', key using errcode = '22023'; end if;
  end loop;
  if p_facts->'referralRecord' is distinct from 'null'::jsonb then
    if jsonb_typeof(p_facts->'referralRecord') is distinct from 'object'
      or jsonb_typeof(p_facts->'referralRecord'->'code') is distinct from 'string'
      or jsonb_typeof(p_facts->'referralRecord'->'userId') is distinct from 'string'
      or p_facts->'referralRecord'->>'userId' = ''
    then raise exception 'invalid referral fact' using errcode = '22023'; end if;
  end if;
  member := (p_facts->>'carePlusMember')::boolean;
  cover_available := (p_facts->>'coverAvailable')::boolean;
  if (p_input->>'coverRequested')::boolean and not cover_available then
    raise exception 'Booking cover is unavailable' using errcode = '22023';
  end if;
  referral_code := p_input->>'referralCode';
  if referral_code <> '' and referral_code !~ '^[A-Z0-9_-]{4,32}$' then
    raise exception 'referral code is not normalized' using errcode = '22023';
  end if;

  -- Deliberately use IEEE doubles and floor(x + .5) in the same operation order as
  -- positive JS Math.round. Decimal numeric/round(float8) changes boundary results.
  overhead := (array[1,1.15,1.25,1.4]::double precision[])[crew];
  base_cents := floor((solo_base_cents::double precision / 100) * overhead + 0.5)::bigint * 100;
  linen_cents := case when p_input->>'linen' = 'wash_dry_repack' then 2000 else 0 end;
  addons_cents := jsonb_array_length(p_input->'addOns') * 3000 + linen_cents;
  work_cents := base_cents + addons_cents;
  solo_hours := hours::double precision + jsonb_array_length(p_input->'addOns');
  elapsed_hours := case when crew = 1 then solo_hours
    else greatest(1.5, floor((solo_hours * overhead / crew) * 2 + 0.5) / 2) end;

  -- Validate the static canonical schedule, but leave future-time and availability
  -- checks to the caller's transaction timestamp. This pure function never reads now().
  if p_input->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid booking date' using errcode = '22023';
  end if;
  date_parts := string_to_array(p_input->>'date', '-');
  if date_parts[1]::integer not between 2020 and 2100 then
    raise exception 'invalid booking year' using errcode = '22023';
  end if;
  parsed_date := make_date(date_parts[1]::integer,date_parts[2]::integer,date_parts[3]::integer);
  if p_input->>'time' !~ '^(0[7-9]|1[0-7]):(00|30)$' or p_input->>'time' = '17:30'
    or (actual_service = 'airbnb' and p_input->>'time' > '14:00')
  then raise exception 'invalid booking start' using errcode = '22023'; end if;
  start_minutes := split_part(p_input->>'time', ':', 1)::integer * 60 + split_part(p_input->>'time', ':', 2)::integer;
  if start_minutes + elapsed_hours * 60 > 17 * 60 then
    raise exception 'visit must finish by 17:00' using errcode = '22023';
  end if;
  if p_input->>'frequency' not in ('once','weekly','fortnightly') or jsonb_array_length(p_input->'repeatDays') > 7 then
    raise exception 'invalid booking frequency' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_input->'repeatDays') loop
    if jsonb_typeof(item) is distinct from 'number' then
      raise exception 'invalid repeat day' using errcode = '22023';
    end if;
    if item::numeric not between 0 and 6 or item::numeric <> trunc(item::numeric) then
      raise exception 'invalid repeat day' using errcode = '22023';
    end if;
  end loop;
  select coalesce(jsonb_agg(day order by day), '[]'::jsonb) into sorted_days
    from (select distinct value::integer as day from jsonb_array_elements(p_input->'repeatDays')) days;
  if sorted_days is distinct from p_input->'repeatDays'
    or (p_input->>'frequency' = 'once' and sorted_days <> '[]'::jsonb)
    or (p_input->>'frequency' <> 'once' and not (sorted_days @> jsonb_build_array(extract(dow from parsed_date)::integer)))
  then raise exception 'repeat days are not canonical' using errcode = '22023'; end if;

  high_demand_cents := case when p_input->>'time' >= '16:00'
    then floor((work_cents::double precision / 100) * 0.15 + 0.5)::bigint * 100 else 0 end;
  fee_cents := case when member then 0 else 3900 end;
  cover_cents := case when (p_input->>'coverRequested')::boolean then 2200 else 0 end;
  care_discount_cents := case when member
    then floor((work_cents::double precision / 100) * 0.1 + 0.5)::bigint * 100 else 0 end;
  if referral_code <> '' then
    referral_status := case
      when p_facts->'referralRecord'->>'code' is distinct from referral_code then 'unknown_code'
      when p_facts->'referralRecord'->>'userId' = p_facts->>'buyerId' then 'own_code'
      when (p_facts->>'hasPriorRedemption')::boolean then 'already_used'
      when (p_facts->>'completedBookingCount')::numeric > 0 then 'not_a_first_booking'
      else 'eligible' end;
    if referral_status = 'eligible' then referral_discount_cents := least(10000, work_cents); end if;
  end if;
  before_credit_cents := work_cents + high_demand_cents + fee_cents + cover_cents - care_discount_cents - referral_discount_cents;
  credit_cents := least((p_input->>'requestedCreditCents')::numeric::bigint,
    (p_facts->>'availableCreditCents')::numeric::bigint, greatest(0, before_credit_cents - 5000));

  lines := jsonb_build_array(jsonb_build_object('id','base','label',
    upper(left(actual_service,1)) || substr(actual_service,2) || ' cleaning','amountCents',base_cents));
  for key in select value from jsonb_array_elements_text(p_input->'addOns') loop
    lines := lines || jsonb_build_array(jsonb_build_object('id','add_on_' || key,'label',labels->>key,'amountCents',3000));
  end loop;
  if linen_cents > 0 then
    lines := lines || jsonb_build_array(jsonb_build_object('id','linen','label','Wash, dry and repack linen','amountCents',linen_cents));
  end if;
  lines := lines || jsonb_build_array(
    jsonb_build_object('id','high_demand','label','High-demand start','amountCents',high_demand_cents),
    jsonb_build_object('id','booking_fee','label','Booking fee','amountCents',fee_cents),
    jsonb_build_object('id','cover','label','Booking cover','amountCents',cover_cents),
    jsonb_build_object('id','care_plus','label','Care+ discount','amountCents',-care_discount_cents),
    jsonb_build_object('id','referral','label','Referral discount','amountCents',-referral_discount_cents),
    jsonb_build_object('id','credit','label','Xoot credit','amountCents',-credit_cents));
  return jsonb_build_object(
    'contractVersion',1,'pricingVersion','booking-zd038-v1','currency','ZAR','input',p_input,
    'requestedService',requested_service,'service',actual_service,'serviceCorrection',correction,
    'crewSize',crew,'soloHours',solo_hours,'estimatedDurationHours',elapsed_hours,'lines',lines,
    'baseCents',base_cents,'addOnsCents',addons_cents,'highDemandCents',high_demand_cents,
    'bookingFeeCents',fee_cents,'coverCents',cover_cents,'carePlusDiscountCents',care_discount_cents,
    'referralDiscountCents',referral_discount_cents,'creditUsedCents',credit_cents,
    'totalCents',before_credit_cents-credit_cents,
    'referral',jsonb_build_object('code',referral_code,'status',referral_status),
    'carePlusMember',member,'coverAvailable',cover_available);
end;
$function$;

revoke all on function private.calculate_booking_quote_v1(jsonb,jsonb) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.calculate_booking_quote_v1(jsonb,jsonb) to service_role;
comment on function private.calculate_booking_quote_v1(jsonb,jsonb) is
  'Pure booking-zd038-v1 calculator for canonical parsed input and independently verified facts. '
  'Service only; no fact reads, identity proof, time-of-use checks, writes or submission enablement. '
  'The future locked transaction must load facts, recheck future start/availability and compare the full quote.';
$xoot_body_20260928003000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20260928003000','booking_quote_calculator',array[v_sql]);
  end if;
  -- 20260929055022_booking_benefit_account_guards.sql; original SHA256 28fb4a53fb55e261b50d1638ee6018cdf8eabc1cc40a26a65e9cc69aa4360cdc
  if not exists (select from supabase_migrations.schema_migrations where version='20260929055022') then
    v_sql := $xoot_body_20260929055022$-- Transaction foundation only: no booking writer, backfill, payment or enablement.
-- Future RPCs MUST pre-acquire the complete account set, sorted by UUID, before
-- reading benefit facts or taking booking/assignment/worker locks. These row
-- triggers are backstops for old writers; multi-row/multi-account legacy writes
-- can deadlock after taking their source-row locks. Retry the WHOLE transaction
-- on 40P01/40001. Never continue with facts read before acquiring these guards.
create schema if not exists private;

create table private.booking_account_guards (
  user_id uuid primary key,
  version bigint not null default 1 check (version > 0)
);
-- No FK/cascade: guard identity survives account deletion and also covers empty
-- ledgers and the auth signup transaction before other account rows exist.
alter table private.booking_account_guards enable row level security;
revoke all on private.booking_account_guards from public, anon, authenticated, service_role;
grant select, insert, update on private.booking_account_guards to service_role;
create policy booking_account_guards_service on private.booking_account_guards
  for all to service_role using (true) with check (true);
grant usage on schema private to service_role;

create function private.lock_booking_accounts(p_user_ids uuid[])
returns void
language plpgsql volatile security invoker
set search_path = ''
as $function$
declare
  v_user_id uuid;
begin
  for v_user_id in
    select distinct account_id from pg_catalog.unnest(p_user_ids) as accounts(account_id)
    where account_id is not null order by account_id
  loop
    -- A real version change is essential. SELECT FOR UPDATE alone leaves an old
    -- REPEATABLE READ snapshot usable; this upsert instead raises 40001 when a
    -- competing transaction has changed the guard since that snapshot.
    insert into private.booking_account_guards as guards (user_id) values (v_user_id)
    on conflict (user_id) do update set version = guards.version + 1;
  end loop;
end;
$function$;
revoke all on function private.lock_booking_accounts(uuid[]) from public, anon, authenticated, service_role;
grant execute on function private.lock_booking_accounts(uuid[]) to service_role;
comment on function private.lock_booking_accounts(uuid[]) is
  'Service transaction entry: acquire complete distinct sorted account set before reading benefits or locking source rows; retry whole transactions on 40001/40P01.';

create function private.booking_credit_effect(
  p_amount numeric, p_direction text, p_status text, p_expires_at timestamptz, p_at timestamptz
) returns numeric
language plpgsql immutable security invoker
set search_path = ''
as $function$
begin
  if coalesce(p_status, 'available') in ('pending', 'expired', 'cancelled')
    or p_expires_at <= p_at then return 0; end if;
  -- PostgreSQL numeric NaN compares above ordinary numbers, so a naive
  -- balance < 0 check would silently permit spending against corrupt credit.
  if p_amount is null or p_amount in ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric) then
    raise exception using errcode = '23514', message = 'Invalid active XootCred amount';
  end if;
  return case
    when p_direction = 'debit' then -abs(p_amount)
    -- Typed redeemed credits cannot fund new spending: matches quote facts.
    -- The older display summary counts these; this migration does not rewrite
    -- historical rows or the UI. Null-direction signed legacy rows retain their
    -- prior meaning and inactive/expiry rules.
    when p_direction = 'credit' and coalesce(p_status, 'available') = 'redeemed' then 0
    when p_direction = 'credit' then abs(p_amount)
    else p_amount
  end;
end;
$function$;
revoke all on function private.booking_credit_effect(numeric,text,text,timestamptz,timestamptz)
  from public, anon, authenticated, service_role;

create function private.guard_booking_benefit_write()
returns trigger
language plpgsql volatile security definer
set search_path = ''
as $function$
declare
  v_accounts uuid[] := '{}'::uuid[];
  v_new_effect numeric;
  v_old_effect numeric := 0;
  v_balance numeric;
  v_old_id uuid;
  v_old_user_id uuid;
  v_at timestamptz;
begin
  -- No caller-selected table lookup or dynamic SQL. The outer table privileges
  -- and RLS authorize the original write. This restricted definer only changes
  -- internal guards and checks balance, so harmless customer booking updates and
  -- owner-context auth referral seeding need no private-table/function grants.
  if tg_table_schema <> 'public' or tg_when <> 'BEFORE' or tg_level <> 'ROW'
    or tg_op not in ('INSERT', 'UPDATE', 'DELETE')
    or tg_table_name not in ('xootcred_ledger', 'user_subscriptions',
      'referral_redemptions', 'referrals', 'bookings') then
    raise exception using errcode = '42501', message = 'Unsupported benefit guard context';
  end if;
  if tg_table_name = 'referral_redemptions' then
    if tg_op <> 'INSERT' then
      v_accounts := v_accounts || array[old.referrer_user_id, old.referred_user_id];
    end if;
    if tg_op <> 'DELETE' then
      v_accounts := v_accounts || array[new.referrer_user_id, new.referred_user_id];
    end if;
  else
    if tg_op <> 'INSERT' then v_accounts := v_accounts || array[old.user_id]; end if;
    if tg_op <> 'DELETE' then v_accounts := v_accounts || array[new.user_id]; end if;
  end if;
  perform private.lock_booking_accounts(v_accounts);
  -- A request can wait across an expiry boundary. Freeze one fresh timestamp
  -- only AFTER its guards are acquired, for both the new spend and ledger sum.
  v_at := pg_catalog.clock_timestamp();

  if tg_table_name = 'xootcred_ledger' and tg_op <> 'DELETE' then
    v_new_effect := private.booking_credit_effect(new.amount, new.direction, new.status, new.expires_at, v_at);
    if tg_op = 'UPDATE' then
      v_old_id := old.id;
      v_old_user_id := old.user_id;
      if v_new_effect < 0 then
        v_old_effect := private.booking_credit_effect(old.amount, old.direction, old.status, old.expires_at, v_at);
      end if;
    end if;
    -- Check only newly activated, enlarged, or moved active spending. Do not
    -- reject reductions/inactive cleanup just because historical credit expiry
    -- has left an account negative. No new expiry/reversal policy is introduced.
    if v_new_effect < 0 and (tg_op = 'INSERT'
      or new.user_id is distinct from v_old_user_id or v_new_effect < v_old_effect) then
      -- Separate volatile PL/pgSQL statement AFTER the blocking upsert obtains a
      -- fresh READ COMMITTED snapshot. Higher isolation aborts at the upsert.
      select coalesce(sum(private.booking_credit_effect(
        ledger.amount, ledger.direction, ledger.status, ledger.expires_at, v_at)), 0)
      into v_balance from public.xootcred_ledger as ledger
      where ledger.user_id = new.user_id
        and (v_old_id is null or ledger.id <> v_old_id);
      if v_balance + v_new_effect < 0 then
        raise exception using errcode = '23514', message = 'Insufficient available XootCred';
      end if;
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$function$;
revoke all on function private.guard_booking_benefit_write() from public, anon, authenticated, service_role;

-- Retire the old INSERT-only, unlocked check. Leave its historical function in
-- place for schema compatibility, with no application execution grant or trigger.
drop trigger zootcred_balance_check on public.xootcred_ledger;
revoke all on function public.check_xootcred_balance() from public, anon, authenticated, service_role;

create trigger a00_booking_benefit_guard before insert or update or delete on public.xootcred_ledger
  for each row execute function private.guard_booking_benefit_write();
create trigger a00_booking_benefit_guard before insert or update or delete on public.user_subscriptions
  for each row execute function private.guard_booking_benefit_write();
create trigger a00_booking_benefit_guard before insert or update or delete on public.referral_redemptions
  for each row execute function private.guard_booking_benefit_write();
create trigger a00_booking_benefit_guard before insert or update or delete on public.referrals
  for each row execute function private.guard_booking_benefit_write();
create trigger a00_booking_benefit_guard before insert or update or delete on public.bookings
  for each row execute function private.guard_booking_benefit_write();

-- TRUNCATE skips row triggers and RLS. Intentional cleanup must use guarded
-- DELETE. Staging metadata on 2026-09-29 showed these legacy bulk/trigger grants
-- on anon/authenticated; neither is a legitimate customer application operation.
revoke truncate, trigger on public.xootcred_ledger, public.user_subscriptions,
  public.referral_redemptions, public.referrals, public.bookings from anon, authenticated;
create function private.reject_booking_benefit_truncate()
returns trigger language plpgsql security invoker set search_path = ''
as $function$
begin
  raise exception using errcode = '42501', message = 'Benefit tables require guarded DELETE, not TRUNCATE';
end;
$function$;
revoke all on function private.reject_booking_benefit_truncate() from public, anon, authenticated, service_role;
create trigger booking_benefit_no_truncate before truncate on public.xootcred_ledger
  for each statement execute function private.reject_booking_benefit_truncate();
create trigger booking_benefit_no_truncate before truncate on public.user_subscriptions
  for each statement execute function private.reject_booking_benefit_truncate();
create trigger booking_benefit_no_truncate before truncate on public.referral_redemptions
  for each statement execute function private.reject_booking_benefit_truncate();
create trigger booking_benefit_no_truncate before truncate on public.referrals
  for each statement execute function private.reject_booking_benefit_truncate();
create trigger booking_benefit_no_truncate before truncate on public.bookings
  for each statement execute function private.reject_booking_benefit_truncate();
$xoot_body_20260929055022$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20260929055022','booking_benefit_account_guards',array[v_sql]);
  end if;
  -- 20261002000000_notifications_realtime_permissions.sql; original SHA256 36eea312c9ad23b885009f6e63389a38a6c03ae66fa533e6cf89134e88344c88
  if not exists (select from supabase_migrations.schema_migrations where version='20261002000000') then
    v_sql := $xoot_body_20261002000000$-- Keep owner RLS, read-column updates, push CRUD and primary-key replica identity.
-- Client TRUNCATE bypasses RLS; client TRIGGER is unnecessary for either table.
-- One atomic block fails closed if publication or effective privilege checks fail.
do $notifications_permissions$
declare
  client_role text;
  target_table text;
  forbidden_privilege text;
begin
  if not exists (
    select 1 from pg_catalog.pg_publication where pubname = 'supabase_realtime'
  ) then
    raise exception 'Required publication supabase_realtime is missing; notifications were not enabled'
      using errcode = '55000';
  end if;

  revoke truncate, trigger on table public.notifications, public.push_tokens
    from anon, authenticated, public;

  -- Direct revocations do not remove inherited grants or owner/superuser rights.
  -- Require remediation of that configuration rather than silently retaining them.
  foreach client_role in array array['anon', 'authenticated'] loop
    foreach target_table in array array['public.notifications', 'public.push_tokens'] loop
      foreach forbidden_privilege in array array['TRUNCATE', 'TRIGGER'] loop
        if pg_catalog.has_table_privilege(client_role, target_table, forbidden_privilege) then
          raise exception 'Effective % privilege remains for % on %; remediate inherited or owner grants before retrying',
            forbidden_privilege, client_role, target_table
            using errcode = '42501';
        end if;
      end loop;
    end loop;
  end loop;

  if not exists (
    select 1 from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table only public.notifications;
  end if;
end
$notifications_permissions$;
$xoot_body_20261002000000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261002000000','notifications_realtime_permissions',array[v_sql]);
  end if;
  -- 20261003140000_company_wide_defaults_and_xooter_checklists.sql; original SHA256 b00157c43121b9f23b36b3cffc0fe854d8215fb8d8da26dba41a2edd45c32734
  if not exists (select from supabase_migrations.schema_migrations where version='20261003140000') then
    v_sql := $xoot_body_20261003140000$-- Company-wide integrity additions: one default home/address per user and an auditable
-- Xooter job checklist that customers can read while only the assigned Xooter can act through
-- the Edge Function.

-- Repair historical duplicates deterministically before adding the unique indexes.
with ranked as (
  select id, row_number() over (partition by user_id order by updated_at desc nulls last, created_at asc, id) as rn
  from public.household_profiles
  where is_default
)
update public.household_profiles h
set is_default = false, updated_at = now()
from ranked r
where h.id = r.id and r.rn > 1;

with ranked as (
  select id, row_number() over (partition by user_id order by created_at asc, id) as rn
  from public.saved_addresses
  where is_default
)
update public.saved_addresses a
set is_default = false
from ranked r
where a.id = r.id and r.rn > 1;

create unique index if not exists household_profiles_one_default_per_user
  on public.household_profiles(user_id) where is_default;
create unique index if not exists saved_addresses_one_default_per_user
  on public.saved_addresses(user_id) where is_default;

create table if not exists public.xooter_job_checklist (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.xooter_jobs(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  task_key text not null check (task_key in ('confirm_arrival','start_work','final_walkthrough','completion_photos')),
  label text not null,
  position integer not null check (position > 0),
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_id, task_key)
);
create index if not exists xooter_job_checklist_booking_idx on public.xooter_job_checklist(booking_id, position);
create index if not exists xooter_job_checklist_job_idx on public.xooter_job_checklist(job_id, position);

insert into public.xooter_job_checklist(job_id, booking_id, task_key, label, position)
select j.id, j.booking_id, v.task_key, v.label, v.position
from public.xooter_jobs j
cross join (values
  ('confirm_arrival', 'Confirm arrival plan', 1),
  ('start_work', 'Start the visit', 2),
  ('final_walkthrough', 'Complete the final walkthrough', 3),
  ('completion_photos', 'Add completion photos', 4)
) as v(task_key, label, position)
on conflict (job_id, task_key) do nothing;

create or replace function public.seed_xooter_job_checklist()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.xooter_job_checklist(job_id, booking_id, task_key, label, position)
  values
    (new.id, new.booking_id, 'confirm_arrival', 'Confirm arrival plan', 1),
    (new.id, new.booking_id, 'start_work', 'Start the visit', 2),
    (new.id, new.booking_id, 'final_walkthrough', 'Complete the final walkthrough', 3),
    (new.id, new.booking_id, 'completion_photos', 'Add completion photos', 4)
  on conflict (job_id, task_key) do nothing;
  return new;
end;
$$;
revoke all on function public.seed_xooter_job_checklist() from public, anon, authenticated;
drop trigger if exists seed_xooter_job_checklist_after_insert on public.xooter_jobs;
create trigger seed_xooter_job_checklist_after_insert
after insert on public.xooter_jobs
for each row execute function public.seed_xooter_job_checklist();

alter table public.xooter_job_checklist enable row level security;
drop policy if exists xooter_job_checklist_participants_read on public.xooter_job_checklist;
create policy xooter_job_checklist_participants_read on public.xooter_job_checklist
for select to authenticated using (
  exists (select 1 from public.xooter_jobs j join public.xooters x on x.id = j.xooter_id where j.id = xooter_job_checklist.job_id and x.user_id = auth.uid())
  or exists (select 1 from public.bookings b where b.id = xooter_job_checklist.booking_id and b.user_id = auth.uid())
  or public.has_role(auth.uid(), 'admin')
);
revoke insert, update, delete on public.xooter_job_checklist from anon, authenticated;
grant select on public.xooter_job_checklist to authenticated;

comment on table public.xooter_job_checklist is 'Server-seeded, auditable Xooter job tasks. Mutations go through xooter-job-checklist Edge Function.';
$xoot_body_20261003140000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261003140000','company_wide_defaults_and_xooter_checklists',array[v_sql]);
  end if;
  -- 20261004160000_backend_rls_and_storage_hardening.sql; original SHA256 6eae2c5081d6c5d7f5cb258314b6f168e57a0f15c8185e644c80d14ef4ff969f
  if not exists (select from supabase_migrations.schema_migrations where version='20261004160000') then
    v_sql := $xoot_body_20261004160000$-- Backend security hardening: explicit client write boundaries and storage constraints.
--
-- This migration is intentionally deny-by-default for tables that have no authenticated
-- row policy for a write operation. Server-side Edge Functions use service_role and are
-- unaffected by these client-role revocations.

-- ---------------------------------------------------------------------------
-- 1. Revoke client writes where the repository's RLS baseline has no policy.
-- ---------------------------------------------------------------------------
revoke insert, update, delete on table public.automation_skills from anon, authenticated;
revoke delete on table public.booking_chat_typing_indicators from anon, authenticated;
revoke insert, update, delete on table public.contractor_screening_questions from anon, authenticated;
revoke insert, update, delete on table public.notification_templates from anon, authenticated;
revoke delete on table public.profiles from anon, authenticated;
revoke insert, update, delete on table public.subscription_plans from anon, authenticated;
revoke insert, update, delete on table public.training_modules from anon, authenticated;
revoke insert, update, delete on table public.xooter_earnings from anon, authenticated;
revoke insert, update, delete on table public.xooter_training_progress from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Review requests must always identify their requester unless an admin
--    creates an operational row. A NULL user_id was an avoidable ambiguity.
-- ---------------------------------------------------------------------------
alter table if exists public.admin_review_queue enable row level security;
drop policy if exists "admin_review_queue_insert_user_or_admin" on public.admin_review_queue;
create policy "admin_review_queue_insert_user_or_admin"
  on public.admin_review_queue for insert
  to authenticated
  with check (
    public.has_role((select auth.uid()), 'admin'::public.app_role)
    or user_id = (select auth.uid())
  );

-- Keep auth lookups stable and avoid repeated auth.uid() evaluation per row.
drop policy if exists "customers view own tips" on public.booking_tips;
create policy "customers view own tips"
  on public.booking_tips for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "customers add tip to own completed booking" on public.booking_tips;
create policy "customers add tip to own completed booking"
  on public.booking_tips for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.bookings b
      where b.id = booking_tips.booking_id
        and b.user_id = (select auth.uid())
        and b.status = 'completed'::public.booking_status
    )
  );

drop policy if exists "customers change own unsettled tip" on public.booking_tips;
create policy "customers change own unsettled tip"
  on public.booking_tips for update
  to authenticated
  using (user_id = (select auth.uid()) and settled_at is null)
  with check (user_id = (select auth.uid()) and settled_at is null);

-- ---------------------------------------------------------------------------
-- 3. Normalize bucket controls. These limits are defense in depth; application
--    validation remains useful for user feedback, while Storage enforces them.
-- ---------------------------------------------------------------------------
update storage.buckets
set public = false,
    file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id = 'kyc-docs';

update storage.buckets
set public = true,
    file_size_limit = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'xooter-avatars';

update storage.buckets
set public = false,
    file_size_limit = 6 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'booking-completion-photos';

update storage.buckets
set public = false,
    file_size_limit = 2 * 1024 * 1024,
    allowed_mime_types = array['application/pdf']
where id = 'booking-invoices';

update storage.buckets
set public = false,
    file_size_limit = 8 * 1024 * 1024,
    allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
where id in ('support-attachments', 'kie-prompts', 'kie-outputs');

update storage.buckets
set public = false,
    file_size_limit = 2 * 1024 * 1024,
    allowed_mime_types = array['application/pdf']
where id = 'zoot-black-certificates';

-- ---------------------------------------------------------------------------
-- 4. Replace avatar policies with a two-segment owner path and MIME guard.
--    Public read is intentional because avatars are product-facing profile art.
-- ---------------------------------------------------------------------------
drop policy if exists "xooter_avatars_owner_write" on storage.objects;
drop policy if exists "xooter_avatars_owner_update" on storage.objects;
drop policy if exists "zooter_avatars_owner_write" on storage.objects;
drop policy if exists "zooter_avatars_owner_update" on storage.objects;
create policy "xooter_avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'xooter-avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );
create policy "xooter_avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'xooter-avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'xooter-avatars'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  );

-- ---------------------------------------------------------------------------
-- 5. KYC: private, owner upload/update/delete, admin read only. Keep the
--    two-segment {user_id}/{document} path used by the current client.
-- ---------------------------------------------------------------------------
drop policy if exists "kyc_docs_owner_insert" on storage.objects;
drop policy if exists "kyc_docs_owner_admin_read" on storage.objects;
drop policy if exists "kyc_docs_owner_update_delete" on storage.objects;
create policy "kyc_docs_owner_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'kyc-docs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
  );
create policy "kyc_docs_owner_admin_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'kyc-docs'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.has_role((select auth.uid()), 'admin'::public.app_role)
    )
  );
create policy "kyc_docs_owner_update_delete"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'kyc-docs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'kyc-docs'
    and (select auth.uid())::text = (storage.foldername(name))[1]
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
  );
create policy "kyc_docs_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'kyc-docs'
    and (
      (select auth.uid())::text = (storage.foldername(name))[1]
      or public.has_role((select auth.uid()), 'admin'::public.app_role)
    )
  );

-- ---------------------------------------------------------------------------
-- 6. Completion photos: participants may insert and read their booking's
--    photos, but authenticated clients cannot overwrite or delete evidence.
--    Server/admin workflows retain management via service_role/admin paths.
-- ---------------------------------------------------------------------------
drop policy if exists "booking_completion_photos_booking_participant_insert" on storage.objects;
drop policy if exists "booking_completion_photos_booking_participant_read" on storage.objects;
drop policy if exists "booking_completion_photos_booking_participant_update" on storage.objects;
drop policy if exists "booking participants upload completion photos" on storage.objects;
drop policy if exists "booking participants read completion photos" on storage.objects;
drop policy if exists "booking participants update completion photos" on storage.objects;
create policy "booking_completion_photos_booking_participant_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'booking-completion-photos'
    and coalesce(array_length(storage.foldername(name), 1), 0) = 2
    and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
    and exists (
      select 1
      from public.bookings b
      left join public.xooters x on x.id = b.xooter_id
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = (select auth.uid()) or x.user_id = (select auth.uid()))
    )
  );
create policy "booking_completion_photos_booking_participant_read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'booking-completion-photos'
    and exists (
      select 1
      from public.bookings b
      left join public.xooters x on x.id = b.xooter_id
      where b.id::text = (storage.foldername(name))[1]
        and (b.user_id = (select auth.uid()) or x.user_id = (select auth.uid())
             or public.has_role((select auth.uid()), 'admin'::public.app_role))
    )
  );

-- ---------------------------------------------------------------------------
-- 7. Keep every storage-object policy from being callable anonymously.
-- ---------------------------------------------------------------------------
revoke all on table storage.objects from anon;
revoke all on table storage.buckets from anon;

comment on table public.admin_review_queue is
  'Client inserts must identify auth.uid(); admin/service workflows may create operational rows.';
comment on table storage.objects is
  'Private-by-default object access. Bucket limits and owner/path/MIME policies are enforced by migration 20261004160000.';
$xoot_body_20261004160000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261004160000','backend_rls_and_storage_hardening',array[v_sql]);
  end if;
  -- 20261007140000_storage_upload_path_contract.sql; original SHA256 3be07756574bf371347871ae3cf26d11ee601142642047b4b0c3a78d0b11d660
  if not exists (select from supabase_migrations.schema_migrations where version='20261007140000') then
    v_sql := $xoot_body_20261007140000$-- Preserve the October hardening while admitting the existing {owner-or-booking}/{file}
-- upload contract. storage.foldername excludes the filename: this path has ONE folder.
-- A second folder must remain denied. No table grants, read/delete policies, MIME limits,
-- completion-evidence overwrite rules or service-role capabilities change here.
alter policy "xooter_avatars_owner_write" on storage.objects
with check (
  bucket_id = 'xooter-avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

alter policy "xooter_avatars_owner_update" on storage.objects
with check (
  bucket_id = 'xooter-avatars'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
);

alter policy "kyc_docs_owner_insert" on storage.objects
with check (
  bucket_id = 'kyc-docs'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
);

alter policy "kyc_docs_owner_update_delete" on storage.objects
with check (
  bucket_id = 'kyc-docs'
  and (select auth.uid())::text = (storage.foldername(name))[1]
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('pdf', 'jpg', 'jpeg', 'png', 'webp')
);

alter policy "booking_completion_photos_booking_participant_insert" on storage.objects
with check (
  bucket_id = 'booking-completion-photos'
  and coalesce(array_length(storage.foldername(name), 1), 0) = 1
  and lower(storage.extension(name)) in ('jpg', 'jpeg', 'png', 'webp')
  and exists (
    select 1 from public.bookings b
    left join public.xooters x on x.id = b.xooter_id
    where b.id::text = (storage.foldername(name))[1]
      and (b.user_id = (select auth.uid()) or x.user_id = (select auth.uid()))
  )
);$xoot_body_20261007140000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261007140000','storage_upload_path_contract',array[v_sql]);
  end if;
  -- 20261007150000_checklist_active_job_mutation.sql; original SHA256 1fe81bae0303e81f6a60ca4e7b9caecb1d0c6da591ed28446f4c2fa3f050ba5c
  if not exists (select from supabase_migrations.schema_migrations where version='20261007150000') then
    v_sql := $xoot_body_20261007150000$
-- Edge authentication supplies p_actor_id; callers cannot invoke this RPC directly.
-- No corrections after completion. Booking cancellation and checklist writes serialize
-- on the booking first, then the job; existing Edge job-response writes are separate
-- PostgREST transactions and hold no booking lock while updating a job.
create or replace function public.update_active_xooter_checklist(
  p_actor_id uuid, p_job_id uuid, p_task_key text, p_complete boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_booking_id uuid;
  v_booking public.bookings%rowtype;
  v_job public.xooter_jobs%rowtype;
  v_owner uuid;
  v_task public.xooter_job_checklist%rowtype;
begin
  if p_actor_id is null or p_job_id is null or p_complete is null
    or p_task_key is null or p_task_key not in ('confirm_arrival','start_work','final_walkthrough','completion_photos') then
    return jsonb_build_object('ok',false,'code','invalid_request');
  end if;
  select booking_id into v_booking_id from public.xooter_jobs where id = p_job_id;
  select * into v_booking from public.bookings where id = v_booking_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select * into v_job from public.xooter_jobs where id = p_job_id for update;
  if not found or v_job.booking_id is distinct from v_booking.id then
    return jsonb_build_object('ok',false,'code','not_found');
  end if;
  select user_id into v_owner from public.xooters where id = v_job.xooter_id for share;
  if v_owner is distinct from p_actor_id then return jsonb_build_object('ok',false,'code','not_found'); end if;
  if v_job.state is distinct from 'accepted' or v_booking.cancelled_at is not null
    or v_booking.status::text not in ('contractor_accepted','en_route','in_progress','confirmed','enroute','arrived')
    or v_booking.status is null then
    return jsonb_build_object('ok',false,'code','not_active');
  end if;
  update public.xooter_job_checklist set
    completed_at = case when p_complete then now() else null end,
    completed_by = case when p_complete then p_actor_id else null end,
    updated_at = now()
  where job_id = v_job.id and booking_id = v_booking.id and task_key = p_task_key
  returning * into v_task;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'bookingId',v_booking.id,'task',
    jsonb_build_object('id',v_task.id,'task_key',v_task.task_key,'label',v_task.label,'completed_at',v_task.completed_at));
end;
$$;
revoke all on function public.update_active_xooter_checklist(uuid,uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.update_active_xooter_checklist(uuid,uuid,text,boolean) to service_role;
comment on function public.update_active_xooter_checklist(uuid,uuid,text,boolean) is
  'Service-only active accepted-job checklist mutation. Verified Edge actor; booking/job/owner locks; no completed-job corrections.';$xoot_body_20261007150000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261007150000','checklist_active_job_mutation',array[v_sql]);
  end if;
  -- 20261015102137_referral_client_grants_least_privilege.sql; original SHA256 0461e279a7e8626dd81fec74d9525559636e40a4a6d170821e1ed40e29c0d805
  if not exists (select from supabase_migrations.schema_migrations where version='20261015102137') then
    v_sql := $xoot_body_20261015102137$-- Recorded as 20261015102137_referral_client_grants_least_privilege in
-- staging (fxmxyabdjqviqbcxmvlp) after a read-only permissions audit.
-- ZD-036 redemption is server-authored. Clients may only READ their own records
-- through RLS. TRUNCATE is not protected by RLS and must never be client-granted.
--
-- Production is missing both legacy referral tables. Refuse to silently succeed
-- until its April referral schema is reconstructed and checked against staging.
do $block$
begin
  if to_regclass('public.referrals') is null
     or to_regclass('public.referral_redemptions') is null then
    raise exception 'Referral tables absent: reconcile canonical base schema before privilege hardening'
      using errcode = '42P01';
  end if;
end
$block$;

revoke all privileges on table public.referrals, public.referral_redemptions
  from public, anon, authenticated;
grant select on table public.referrals, public.referral_redemptions
  to authenticated;

do $block$
declare v_table text;
begin
  foreach v_table in array array['public.referrals','public.referral_redemptions'] loop
    if has_table_privilege('anon', v_table, 'SELECT')
      or has_table_privilege('anon', v_table, 'TRUNCATE')
      or has_table_privilege('authenticated', v_table, 'INSERT')
      or has_table_privilege('authenticated', v_table, 'UPDATE')
      or has_table_privilege('authenticated', v_table, 'DELETE')
      or has_table_privilege('authenticated', v_table, 'TRUNCATE')
      or not has_table_privilege('authenticated', v_table, 'SELECT')
      or not has_table_privilege('service_role', v_table, 'INSERT')
      or not has_table_privilege('service_role', v_table, 'SELECT') then
      raise exception 'Referral privileges not least-privilege on %', v_table;
    end if;
  end loop;
end
$block$;$xoot_body_20261015102137$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261015102137','referral_client_grants_least_privilege',array[v_sql]);
  end if;
  -- 20261016234838_xoot_job_live_positions_private.sql; original SHA256 fef799561ab7d4588fe85dbf321f658e1878f90a48437243729a8374eb7947d5
  if not exists (select from supabase_migrations.schema_migrations where version='20261016234838') then
    v_sql := $xoot_body_20261016234838$-- Applied to staging as 20261016234838; preserve this version in repo migration history.
-- Active job-scoped position only: no historical GPS trail, no public client access.
-- Coordinates are intentionally NOT published to Supabase Realtime.
-- Edge function xoot-job-location is the sole read/write boundary and rechecks job ownership.
create table public.xoot_job_live_positions (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  xooter_id uuid not null references public.xooters(id) on delete cascade,
  latitude numeric(9,6) not null check (latitude between -90 and 90),
  longitude numeric(9,6) not null check (longitude between -180 and 180),
  accuracy_m numeric(6,1) not null check (accuracy_m > 0 and accuracy_m <= 200),
  recorded_at timestamptz not null default now(),
  expires_at timestamptz not null,
  updated_at timestamptz not null default now(),
  constraint xoot_job_live_positions_finite_lifetime
    check (expires_at > recorded_at and expires_at <= recorded_at + interval '90 seconds')
);

create index if not exists xoot_job_live_positions_expiry
  on public.xoot_job_live_positions (expires_at);

alter table public.xoot_job_live_positions enable row level security;

-- RLS intentionally has NO policies for anon/authenticated. Only the Edge service
-- key may access the row, after verifying Supabase JWT, worker ownership, accepted
-- job, matching booking assignment, active en-route status and explicit consent.
revoke all on table public.xoot_job_live_positions from public, anon, authenticated;
grant select, insert, update, delete on table public.xoot_job_live_positions to service_role;

comment on table public.xoot_job_live_positions is
  'Live active-job Xooter GPS only. Service-only, no direct client/RLS policies. '
  'Expiry <=90 seconds, never in Realtime publication. Clear upon stop/cancel/reassignment; '
  'authorised reads additionally reject stale/cancelled jobs. Retention cleared every minute.';

-- Cancelled, reassigned and completed bookings must clear positions immediately, not
-- rely only on the TTL. This trigger runs with DB privileges after the protected
-- booking status change, never with arbitrary client-supplied actor IDs.
create or replace function private.xoot_clear_live_location_on_booking_update()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status::text not in ('en_route','enroute')
    or new.xooter_id is distinct from old.xooter_id
    or new.cancelled_at is not null
    or new.completed_at is not null
    or new.sensitive_data_revoked_at is not null
  then
    delete from public.xoot_job_live_positions where booking_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.xoot_clear_live_location_on_booking_update() from public, anon, authenticated;
create trigger xoot_remove_location_on_booking_change
after update of status,xooter_id,cancelled_at,completed_at,sensitive_data_revoked_at
on public.bookings for each row
execute function private.xoot_clear_live_location_on_booking_update();

-- A worker unassignment may be represented in xooter_jobs before bookings is
-- updated. Remove the old job's position at that point as well.
create or replace function private.xoot_clear_live_location_on_job_change()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'DELETE' then
    if old.state = 'accepted' then
      delete from public.xoot_job_live_positions
        where booking_id = old.booking_id and xooter_id = old.xooter_id;
    end if;
    return old;
  end if;
  if old.state = 'accepted' and (
    new.state is distinct from old.state
    or new.xooter_id is distinct from old.xooter_id
    or new.booking_id is distinct from old.booking_id
  ) then
    delete from public.xoot_job_live_positions
      where booking_id = old.booking_id and xooter_id = old.xooter_id;
  end if;
  return new;
end;
$$;
revoke all on function private.xoot_clear_live_location_on_job_change() from public, anon, authenticated;
create trigger xoot_remove_location_on_job_change
after update or delete on public.xooter_jobs for each row
execute function private.xoot_clear_live_location_on_job_change();

-- The only service-role publish path. Atomic ON CONFLICT protects against simultaneous
-- reports bypassing an Edge read-then-write throttle. Lock both lifecycle rows
-- to serialize writes against booking cancellation, reassignment and job completion.
-- This function remains unreachable to anon/authenticated PostgREST clients.
create or replace function public.xoot_publish_private_job_location(
  p_booking_id uuid,
  p_xooter_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_m numeric,
  p_captured_at timestamptz
) returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  wrote integer;
  v_now timestamptz := clock_timestamp();
begin
  if p_captured_at is null or p_captured_at < v_now - interval '30 seconds'
    or p_captured_at > v_now + interval '30 seconds'
    or p_latitude is null or p_latitude not between -90 and 90
    or p_longitude is null or p_longitude not between -180 and 180
    or p_accuracy_m is null or p_accuracy_m <= 0 or p_accuracy_m > 100
  then
    return false;
  end if;

  with allowed as materialized (
    select b.id
    from public.bookings b
    join public.xooter_jobs j on j.booking_id = b.id
      and j.xooter_id = b.xooter_id and j.state = 'accepted'
    join public.xooters x on x.id = j.xooter_id
      and x.active is true and x.background_check_status = 'approved'
    where b.id = p_booking_id and b.xooter_id = p_xooter_id
      and b.status::text in ('en_route','enroute')
      and b.cancelled_at is null and b.completed_at is null
      and b.sensitive_data_revoked_at is null
    for update of b, j
  ),
  saved as (
    insert into public.xoot_job_live_positions
      (booking_id,xooter_id,latitude,longitude,accuracy_m,recorded_at,expires_at,updated_at)
    select id,p_xooter_id,p_latitude,p_longitude,p_accuracy_m,p_captured_at,
      least(p_captured_at,v_now) + interval '60 seconds', v_now
    from allowed
    on conflict (booking_id) do update
      set xooter_id = excluded.xooter_id,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          accuracy_m = excluded.accuracy_m,
          recorded_at = excluded.recorded_at,
          expires_at = excluded.expires_at,
          updated_at = excluded.updated_at
      where public.xoot_job_live_positions.updated_at <= v_now - interval '10 seconds'
    returning booking_id
  )
  select count(*) into wrote from saved;
  return wrote = 1;
end;
$$;
revoke all on function public.xoot_publish_private_job_location(
  uuid,uuid,numeric,numeric,numeric,timestamptz
) from public, anon, authenticated;
grant execute on function public.xoot_publish_private_job_location(
  uuid,uuid,numeric,numeric,numeric,timestamptz
) to service_role;

comment on function public.xoot_publish_private_job_location(
  uuid,uuid,numeric,numeric,numeric,timestamptz
) is 'Atomic service-only verified active-job GPS publish; row-lock lifecycle and 10-second throttle.';

-- Physical deletion, not merely filtering stale rows at read time. Both existing Xoot
-- projects have pg_cron installed. Abort the migration on a fresh project without it.
do $xoot_cleanup$
begin
  if not exists (select 1 from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron must be installed for short-lived GPS retention';
  end if;
  if not exists (select 1 from cron.job where jobname = 'xoot-live-location-expiry') then
    perform cron.schedule(
      'xoot-live-location-expiry',
      '* * * * *',
      $job$delete from public.xoot_job_live_positions where expires_at <= now()$job$
    );
  end if;
end;
$xoot_cleanup$;$xoot_body_20261016234838$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261016234838','xoot_job_live_positions_private',array[v_sql]);
  end if;
  -- 20261019185331_xoot_approved_service_zones.sql; original SHA256 951209391a042d1646e5465fe9f4075b8605e6e653ed74bc71859622ad33d8f0
  if not exists (select from supabase_migrations.schema_migrations where version='20261019185331') then
    v_sql := $xoot_body_20261019185331$
-- Zones remain EMPTY until the founder/operator supplies approved boundaries.
-- No centroid buffer, suburb string or generated placeholder may be silently
-- interpreted as confirmed service coverage. PostGIS is not installed on
-- either existing Xoot project, so GeoJSON validation occurs server-side.
create table public.xoot_service_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(name) between 2 and 80),
  geometry jsonb not null check (jsonb_typeof(geometry) = 'object'),
  service_types text[] not null check (
    cardinality(service_types) between 1 and 12
    and array_position(service_types, null) is null
  ),
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
  'Service-only atomic 12/hour geocoding request budget. Signed JWT actor supplied by Edge, never client user_id.';$xoot_body_20261019185331$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261019185331','xoot_approved_service_zones',array[v_sql]);
  end if;
  -- 20261025080000_in_app_voice_control.sql; original SHA256 1cf9e4ae1112f407a0e69cb7c6011b54029cb6be5d90f10e925ea8da5105233b
  if not exists (select from supabase_migrations.schema_migrations where version='20261025080000') then
    v_sql := $xoot_body_20261025080000$-- A WebRTC access token was previously unaffected by the PSTN-specific switches.
-- Keep in-app voice disabled independently until real signed/device acceptance and cost approval.
-- This adds configuration only; it does not grant client writes or enable any existing control.
insert into public.operational_controls (
  control_key, control_type, environment, enabled, description, owner, metadata
) values (
  'twilio.in_app_voice', 'provider_gate', 'all', false,
  'Allows booking-bound in-app voice only after signed webhook, two-party device, privacy and cost acceptance. No phone-number rental is needed; provider usage is billable.',
  'operations-security',
  '{"provider":"twilio","recording":false,"transcription":false,"max_call_seconds":300,"requires":["signed_webhook_acceptance","authorised_customer_and_xooter","native_signed_builds","status_correlation_and_retention","cost_approval"]}'::jsonb
) on conflict (control_key, environment) do nothing;
$xoot_body_20261025080000$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261025080000','in_app_voice_control',array[v_sql]);
  end if;
  -- 20261025191835_in_app_voice_ephemeral_sessions.sql; original SHA256 855a801d48b2621423a73aee74cea9d29eb238b0c02ca054cb6a441be3622dda
  if not exists (select from supabase_migrations.schema_migrations where version='20261025191835') then
    v_sql := $xoot_body_20261025191835$-- Short-lived in-app call correlation only. No raw callbacks, telephone numbers,
-- message content or recordings. All participants share one immutable room expiry.
do $$ begin
  if not exists (select from pg_extension where extname = 'pg_cron') then
    raise exception 'pg_cron must be present before delivering in-app call correlation';
  end if;
end $$;

create table public.xoot_in_app_voice_rooms (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  account_sid text not null check (account_sid ~ '^AC[0-9a-fA-F]{32}$'),
  conference_sid text check (conference_sid ~ '^CF[0-9a-fA-F]{32}$'),
  status text not null default 'open' check (status in ('open','completed')),
  sequence_number bigint not null default -1 check (sequence_number >= -1),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  unique(id, expires_at),
  check (expires_at > created_at and expires_at <= created_at + interval '5 minutes'),
  check (status <> 'completed' or finished_at is not null)
);
create unique index xoot_in_app_voice_open_booking_idx
  on public.xoot_in_app_voice_rooms(booking_id) where status = 'open';
create index xoot_in_app_voice_expiry_idx on public.xoot_in_app_voice_rooms(expires_at);
create table public.xoot_in_app_voice_sessions (
  call_sid text primary key check (call_sid ~ '^CA[0-9a-fA-F]{32}$'),
  room_id uuid not null,
  actor_id uuid not null references auth.users(id) on delete cascade,
  voice_role text not null check (voice_role in ('client','contractor')),
  status text not null default 'queued' check (status in ('queued','active','completed')),
  created_at timestamptz not null default clock_timestamp(),
  expires_at timestamptz not null,
  finished_at timestamptz,
  foreign key (room_id, expires_at) references public.xoot_in_app_voice_rooms(id, expires_at) on delete cascade,
  unique (room_id, voice_role),
  check (expires_at > created_at and expires_at <= created_at + interval '5 minutes'),
  check (status <> 'completed' or finished_at is not null)
);
alter table public.xoot_in_app_voice_rooms enable row level security;
alter table public.xoot_in_app_voice_sessions enable row level security;
revoke all on public.xoot_in_app_voice_rooms from public, anon, authenticated, service_role;
revoke all on public.xoot_in_app_voice_sessions from public, anon, authenticated, service_role;
grant select, insert, update, delete on public.xoot_in_app_voice_rooms to service_role;
grant select, insert, update, delete on public.xoot_in_app_voice_sessions to service_role;

-- Registration and callbacks lock the same room. The booking lock serialises room creation.
-- Replays cannot renew a live lease. These RPCs are invokers, callable only by service_role.
create function public.xoot_register_in_app_voice_join(
  p_booking_id uuid, p_actor_id uuid, p_account_sid text, p_call_sid text,
  p_voice_role text, p_lease_seconds integer
) returns table(room_id uuid, seconds integer)
language plpgsql security invoker set search_path = '' as $$
declare
  v_room public.xoot_in_app_voice_rooms%rowtype;
  v_call public.xoot_in_app_voice_sessions%rowtype;
  v_now timestamptz;
  v_seconds integer;
begin
  if p_booking_id is null or p_actor_id is null or p_account_sid is null or p_call_sid is null
    or p_account_sid !~ '^AC[0-9a-fA-F]{32}$' or p_call_sid !~ '^CA[0-9a-fA-F]{32}$'
    or p_voice_role is null or p_voice_role not in ('client','contractor')
    or p_lease_seconds is null or p_lease_seconds not between 1 and 300 then return; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('xoot-inapp:' || p_booking_id::text, 0));
  delete from public.xoot_in_app_voice_rooms r where r.booking_id = p_booking_id and r.expires_at <= clock_timestamp();
  select * into v_call from public.xoot_in_app_voice_sessions s where s.call_sid = p_call_sid;
  if found then
    select * into v_room from public.xoot_in_app_voice_rooms r where r.id = v_call.room_id for update;
    v_now := clock_timestamp();
    if v_room.id is null or v_room.booking_id <> p_booking_id or v_room.account_sid <> p_account_sid
      or v_call.actor_id <> p_actor_id or v_call.voice_role <> p_voice_role
      or v_room.status <> 'open' or v_call.status = 'completed' or v_room.expires_at <= v_now then return; end if;
  else
    select * into v_room from public.xoot_in_app_voice_rooms r
      where r.booking_id = p_booking_id and r.status = 'open' for update;
    v_now := clock_timestamp();
    if v_room.id is not null and v_room.expires_at <= v_now then
      delete from public.xoot_in_app_voice_rooms r where r.id = v_room.id;
      v_room.id := null;
    end if;
    if v_room.id is null then
      insert into public.xoot_in_app_voice_rooms(booking_id,account_sid,created_at,expires_at)
        values (p_booking_id,p_account_sid,v_now,v_now + pg_catalog.make_interval(secs => p_lease_seconds)) returning * into v_room;
    end if;
    if v_room.status <> 'open' or v_room.account_sid <> p_account_sid then return; end if;
    if exists(select from public.xoot_in_app_voice_sessions s where s.room_id = v_room.id and s.voice_role = p_voice_role) then return; end if;
    insert into public.xoot_in_app_voice_sessions(call_sid,room_id,actor_id,voice_role,created_at,expires_at)
      values(p_call_sid,v_room.id,p_actor_id,p_voice_role,v_now,v_room.expires_at);
  end if;
  v_seconds := least(p_lease_seconds, floor(extract(epoch from (v_room.expires_at - clock_timestamp())))::integer);
  if v_seconds > 0 then return query select v_room.id,v_seconds; end if;
end;
$$;

-- One transaction orders the room and every participant. Terminal callbacks win even when
-- delivered after a newer non-terminal event. A queued/unbound second leg is completed too.
create function public.xoot_apply_in_app_voice_event(
  p_room_id uuid, p_account_sid text, p_conference_sid text, p_sequence bigint,
  p_event text, p_call_sid text default null
) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_room public.xoot_in_app_voice_rooms%rowtype; v_now timestamptz;
begin
  if p_room_id is null or p_account_sid is null or p_conference_sid is null
    or p_account_sid !~ '^AC[0-9a-fA-F]{32}$' or p_conference_sid !~ '^CF[0-9a-fA-F]{32}$'
    or p_sequence is null or p_sequence not between 0 and 2147483647
    or p_event is null or p_event not in ('conference-start','conference-end','participant-join','participant-leave') then return false; end if;
  select * into v_room from public.xoot_in_app_voice_rooms r where r.id = p_room_id for update;
  v_now := clock_timestamp();
  if v_room.id is null or v_room.account_sid <> p_account_sid or v_room.expires_at <= v_now
    or v_room.status = 'completed' or (v_room.conference_sid is not null and v_room.conference_sid <> p_conference_sid) then return false; end if;
  if p_event in ('participant-join','participant-leave') and (p_call_sid is null
    or not exists(select from public.xoot_in_app_voice_sessions s where s.call_sid = p_call_sid and s.room_id = p_room_id)) then return false; end if;
  if p_event in ('conference-end','participant-leave') then
    -- endConferenceOnExit=true means a registered participant's leave ends this room.
    update public.xoot_in_app_voice_rooms set status='completed', finished_at=v_now,
      conference_sid=p_conference_sid, sequence_number=greatest(sequence_number,p_sequence) where id=p_room_id;
    update public.xoot_in_app_voice_sessions set status='completed',finished_at=coalesce(finished_at,v_now) where room_id=p_room_id;
  else
    if p_sequence <= v_room.sequence_number then return false; end if;
    update public.xoot_in_app_voice_rooms set conference_sid=p_conference_sid,sequence_number=p_sequence where id=p_room_id;
    if p_event = 'participant-join' then
      update public.xoot_in_app_voice_sessions set status='active' where room_id=p_room_id and call_sid=p_call_sid and status <> 'completed';
    end if;
  end if;
  return true;
end;
$$;
revoke all on function public.xoot_register_in_app_voice_join(uuid,uuid,text,text,text,integer) from public, anon, authenticated;
revoke all on function public.xoot_apply_in_app_voice_event(uuid,text,text,bigint,text,text) from public, anon, authenticated;
grant execute on function public.xoot_register_in_app_voice_join(uuid,uuid,text,text,text,integer) to service_role;
grant execute on function public.xoot_apply_in_app_voice_event(uuid,text,text,bigint,text,text) to service_role;
comment on table public.xoot_in_app_voice_rooms is
  'Service-only ephemeral in-app room; all legs share its at-most-five-minute expiry. Provider retention is separate.';
comment on table public.xoot_in_app_voice_sessions is
  'Service-only ephemeral call correlation, deleted with the room; no client policy, raw payload or recordings.';
select cron.schedule('purge-xoot-in-app-voice-sessions', '* * * * *',
  $$delete from public.xoot_in_app_voice_rooms where expires_at <= clock_timestamp()$$);

-- RLS does not restrict TRUNCATE. Preserve legacy data/SELECT policy and the PSTN implementation.
revoke truncate, references, trigger on public.masked_call_sessions from anon, authenticated;
$xoot_body_20261025191835$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261025191835','in_app_voice_ephemeral_sessions',array[v_sql]);
  end if;
  -- 20261025195100_mapbox_geocoding_global_budget.sql; original SHA256 3c760a54714ef65bff8a9c4770445c5fb826e7d111afd3b37086bcd64574f946
  if not exists (select from supabase_migrations.schema_migrations where version='20261025195100') then
    v_sql := $xoot_body_20261025195100$-- A total, non-renewing allowance for the server's Permanent Geocoding route.
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
$xoot_body_20261025195100$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261025195100','mapbox_geocoding_global_budget',array[v_sql]);
  end if;
  -- 20261026024032_booking_chat_nonrecursive_read.sql; original SHA256 e0dceadb0362098e0b41e1f97a46f984972baee3b5a433d3fe911f0c71d22936
  if not exists (select from supabase_migrations.schema_migrations where version='20261026024032') then
    v_sql := $xoot_body_20261026024032$-- The existing messages policy expands bookings -> xooter_jobs -> bookings and
-- fails every normal client read with 42P17. Break the cycle at its root without broadening private booking rows.
do $preflight$
begin
  if to_regclass('public.messages') is null
    or to_regclass('public.bookings') is null
    or to_regclass('public.xooters') is null
    or to_regclass('public.xooter_jobs') is null
    or to_regprocedure('private.has_role(uuid,public.app_role)') is null then
    raise exception 'Canonical booking/chat and private role prerequisites required';
  end if;
  if not (select relrowsecurity from pg_class where oid='public.bookings'::regclass)
    or not exists(select 1 from pg_policies where schemaname='public' and tablename='bookings'
      and policyname='bookings_participant_read' and cmd='SELECT' and roles=array['authenticated']::name[])
    or exists(select 1 from pg_policies where schemaname='public' and tablename='bookings'
      and cmd in('ALL','SELECT') and policyname<>'bookings_participant_read') then
    raise exception 'Unexpected booking read policies; review before replacement';
  end if;
end;
$preflight$;

-- A private boolean policy predicate, not a public data/actor RPC. Its definer
-- context breaks the policy cycle; the caller's verified auth.uid() still decides
-- access. It returns no account, booking, address, document or message content.
create function private.xoot_can_read_booking(p_booking_id uuid)
returns boolean language sql stable security definer set search_path = '' as $predicate$
  select auth.uid() is not null and exists (
    select 1 from public.bookings b
    where b.id=p_booking_id and (
      b.user_id=auth.uid()
      or exists (
        select 1 from public.xooters x join public.xooter_jobs j
          on j.xooter_id=x.id and j.booking_id=b.id
        where x.id=b.xooter_id and x.user_id=auth.uid() and j.state = 'accepted'
      )
      or private.has_role(auth.uid(),'admin'::public.app_role)
    )
  );
$predicate$;
revoke all on function private.xoot_can_read_booking(uuid) from public,anon,authenticated,service_role;
grant execute on function private.xoot_can_read_booking(uuid) to authenticated;
comment on function private.xoot_can_read_booking(uuid) is
  'RLS-only ciphertext read predicate: verified current uid must own the booking, be its current assigned Xooter with an accepted matching job, or have the existing authoritative admin role. No caller-supplied actor or data output.';

drop policy bookings_participant_read on public.bookings;
create policy bookings_participant_read on public.bookings for select to authenticated
  using (private.xoot_can_read_booking(id));
comment on policy bookings_participant_read on public.bookings is
  'Owner/admin/current accepted Xooter rows without recursive booking/job RLS. Message and job policies, private columns and all write grants unchanged.';
$xoot_body_20261026024032$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261026024032','booking_chat_nonrecursive_read',array[v_sql]);
  end if;
  -- 20261026153738_address_lookup_server_allowances.sql; original SHA256 ea9bf06be8eb1d969ca313c53051be1a848b8f763c98c7e5593ca3c7d4cc7dfa
  if not exists (select from supabase_migrations.schema_migrations where version='20261026153738') then
    v_sql := $xoot_body_20261026153738$-- Public address discovery is independent of operational coverage and worker availability.
-- Finite, non-renewing owner allowances: no provider request can start at the default zero.
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
  'Owner-approved total attempts for address suggestions/confirmation, zero by default, no automatic reset. Confirmation also consumes the existing global Permanent Geocoding ceiling. Not a universal Mapbox invoice cap.';$xoot_body_20261026153738$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261026153738','address_lookup_server_allowances',array[v_sql]);
  end if;
  -- 20261026203430_private_calendar_subscription.sql; original SHA256 cbea3c9225e1d9fd034966090a88fd540c69a61c32caa71ccb944c236be09a4c
  if not exists (select from supabase_migrations.schema_migrations where version='20261026203430') then
    v_sql := $xoot_body_20261026203430$-- One revocable, read-only calendar capability per customer. Raw links are never stored here.
-- Row-lock serialisation supplies monotone revisions even for changes in the same second.
alter table public.bookings add column calendar_revision integer not null default 0
  check (calendar_revision>=0);
create function private.xoot_advance_calendar_revision() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_op='INSERT' then new.calendar_revision=0;
  elsif row(new.service,new.scheduled_at,new.duration_hours,new.status)
    is distinct from row(old.service,old.scheduled_at,old.duration_hours,old.status) then
    new.calendar_revision=old.calendar_revision+1;
  else new.calendar_revision=old.calendar_revision;
  end if;
  return new;
end $$;
revoke all on function private.xoot_advance_calendar_revision() from public,anon,authenticated;
grant execute on function private.xoot_advance_calendar_revision() to service_role;
create trigger xoot_calendar_revision before insert or update on public.bookings
  for each row execute function private.xoot_advance_calendar_revision();

create table public.xoot_calendar_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  token_hash text unique check (token_hash ~ '^[0-9a-f]{64}$'),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  fetch_window timestamptz not null default now(),
  fetch_count integer not null default 0 check (fetch_count >= 0),
  check (expires_at > issued_at and expires_at <= issued_at + interval '366 days'),
  check (token_hash is not null or revoked_at is not null)
);
alter table public.xoot_calendar_subscriptions enable row level security;
revoke all on public.xoot_calendar_subscriptions from public, anon, authenticated;
grant select, insert, update, delete on public.xoot_calendar_subscriptions to service_role;

-- The service role still has to present the capability hash. A single transaction binds the
-- lookup, revocation/expiry checks, per-link allowance and owner-specific minimal event read.
create function public.xoot_read_calendar_feed(p_hash text) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare subscription public.xoot_calendar_subscriptions%rowtype; visits jsonb;
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    return jsonb_build_object('state','missing');
  end if;
  select * into subscription from public.xoot_calendar_subscriptions
    where token_hash=p_hash and revoked_at is null and expires_at>now() for update;
  if not found then return jsonb_build_object('state','missing'); end if;
  if subscription.fetch_window>now()-interval '1 minute' and subscription.fetch_count>=6 then
    return jsonb_build_object('state','limited');
  end if;
  update public.xoot_calendar_subscriptions set
    fetch_count=case when fetch_window<=now()-interval '1 minute' then 1 else fetch_count+1 end,
    fetch_window=case when fetch_window<=now()-interval '1 minute' then now() else fetch_window end
    where user_id=subscription.user_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',b.id,'service',b.service,
    'scheduled_at',b.scheduled_at,'duration_hours',b.duration_hours,'status',b.status,
    'updated_at',b.updated_at,'calendar_revision',b.calendar_revision) order by b.scheduled_at,b.id),'[]'::jsonb) into visits
  from (select id,service,scheduled_at,duration_hours,status,updated_at,calendar_revision from public.bookings
    where user_id=subscription.user_id and status<>'draft'
      and scheduled_at>=now()-interval '90 days' and scheduled_at<=now()+interval '366 days'
    order by scheduled_at,id limit 1001) b;
  if jsonb_array_length(visits)>1000 then return jsonb_build_object('state','unavailable'); end if;
  return jsonb_build_object('state','ready','visits',visits);
end $$;
revoke all on function public.xoot_read_calendar_feed(text) from public, anon, authenticated;
grant execute on function public.xoot_read_calendar_feed(text) to service_role;
$xoot_body_20261026203430$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261026203430','private_calendar_subscription',array[v_sql]);
  end if;
  -- 20261027032349_kyc_private_quarantine_interlock.sql; original SHA256 c4f99aa7e511945a95ed2284c978437ab70568d67fbca272a25c43604bf91665
  if not exists (select from supabase_migrations.schema_migrations where version='20261027032349') then
    v_sql := $xoot_body_20261027032349$-- Containment only. No antivirus or identity-authenticity verdict is manufactured here.
-- Unblocking requires a reviewed immutable scan/read path and atomic approval migration.
create table private.kyc_quarantine_receipts (
  document_id uuid primary key references public.xooter_documents(id) on delete restrict,
  application_id uuid not null references public.xooter_applications(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete restrict,
  storage_path text not null unique,
  object_id uuid not null,
  object_updated_at timestamptz not null,
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  byte_length integer not null check (byte_length between 1 and 8388608),
  registered_at timestamptz not null default now()
);
alter table private.kyc_quarantine_receipts enable row level security;
revoke all on private.kyc_quarantine_receipts from public, anon, authenticated;
grant select, insert on private.kyc_quarantine_receipts to service_role;
grant usage on schema private to service_role;

-- Small, non-renewing containment limits. Raising them needs a reviewed migration.
create table private.kyc_quarantine_limits (
  kind text primary key check(kind in ('upload','inspection')),
  maximum integer not null default 32 check(maximum between 0 and 32),
  used integer not null default 0 check(used between 0 and maximum)
);
create table private.kyc_owner_quarantine_limits (
  user_id uuid not null references auth.users(id), kind text not null,
  used integer not null check(used between 1 and 8),primary key(user_id,kind)
);
create table private.kyc_inspection_attempts (
  storage_path text primary key,user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
alter table private.kyc_quarantine_limits enable row level security;
alter table private.kyc_owner_quarantine_limits enable row level security;
alter table private.kyc_inspection_attempts enable row level security;
revoke all on private.kyc_quarantine_limits,private.kyc_owner_quarantine_limits,private.kyc_inspection_attempts
  from public,anon,authenticated;
grant select,insert,update on private.kyc_quarantine_limits,private.kyc_owner_quarantine_limits,private.kyc_inspection_attempts to service_role;
insert into private.kyc_quarantine_limits(kind) values('upload'),('inspection');

create function private.consume_kyc_quarantine_limit(p_user_id uuid,p_kind text) returns boolean
language plpgsql security invoker set search_path='' as $$
declare cap integer; spent integer; affected integer;
begin
  if p_user_id is null or p_kind not in ('upload','inspection') then return false;end if;
  select maximum,used into cap,spent from private.kyc_quarantine_limits where kind=p_kind for update;
  if not found or spent>=cap then return false;end if;
  insert into private.kyc_owner_quarantine_limits(user_id,kind,used) values(p_user_id,p_kind,1)
    on conflict(user_id,kind) do update set used=private.kyc_owner_quarantine_limits.used+1
    where private.kyc_owner_quarantine_limits.used<8;
  get diagnostics affected=row_count;
  if affected<>1 then return false;end if;
  update private.kyc_quarantine_limits set used=used+1 where kind=p_kind;
  return true;
end $$;
revoke all on function private.consume_kyc_quarantine_limit(uuid,text) from public,anon,authenticated;
grant execute on function private.consume_kyc_quarantine_limit(uuid,text) to service_role;

create function private.enforce_kyc_upload_quarantine_limit() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.bucket_id='kyc-docs' and not private.consume_kyc_quarantine_limit(split_part(new.name,'/',1)::uuid,'upload') then
    raise exception 'Document upload limit reached; contact Xoot support' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function private.enforce_kyc_upload_quarantine_limit() from public,anon,authenticated;
create trigger kyc_quarantine_upload_limit before insert on storage.objects
  for each row execute function private.enforce_kyc_upload_quarantine_limit();

-- The earlier lockdown granted individual columns. Revoking the table alone is insufficient.
do $$ declare t text; cols text; begin
  foreach t in array array['xooter_documents','xooter_applications'] loop
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    select string_agg(quote_ident(column_name), ',') into cols
      from information_schema.columns where table_schema='public' and table_name=t;
    execute format('revoke all (%s) on public.%I from public, anon, authenticated', cols,t);
    execute format('grant select on public.%I to authenticated',t);
  end loop;
end $$;

-- All legacy permissive KYC policies remain fenced by these restrictive policies.
create policy kyc_raw_reads_closed on storage.objects as restrictive for select
  to anon, authenticated using (bucket_id <> 'kyc-docs');
create policy kyc_raw_updates_closed on storage.objects as restrictive for update
  to anon, authenticated using (bucket_id <> 'kyc-docs') with check (bucket_id <> 'kyc-docs');

create function private.kyc_unregistered_owner_path(p_path text) returns boolean
language sql stable security definer set search_path='' as $$
  select auth.uid() is not null
    and split_part(p_path,'/',1)=auth.uid()::text
    and not exists(select 1 from public.xooter_documents d where d.storage_path=p_path)
    and not exists(select 1 from private.kyc_quarantine_receipts r where r.storage_path=p_path)
$$;
revoke all on function private.kyc_unregistered_owner_path(text) from public, anon;
grant execute on function private.kyc_unregistered_owner_path(text) to authenticated;
create policy kyc_registered_paths_no_reuse on storage.objects as restrictive for insert
  to anon, authenticated with check (bucket_id <> 'kyc-docs' or private.kyc_unregistered_owner_path(name));
-- Raw SELECT is closed, so browser deletion cannot reliably clean up a failed upload.
-- Retention/orphan cleanup must use a reviewed privileged worker, not a client exception.
create policy kyc_raw_deletes_closed on storage.objects as restrictive for delete
  to anon, authenticated using (bucket_id <> 'kyc-docs');

-- Storage stays outside the exposed API schemas. This narrow service-only RPC reads metadata.
create function public.inspect_quarantined_kyc_object(p_user_id uuid, p_application_id uuid, p_storage_path text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb; existing jsonb; affected integer;
begin
  -- Idempotent retry: acknowledge the exact still-current quarantined receipt without a download.
  select jsonb_build_object('document',jsonb_build_object('id',d.id,'user_id',d.user_id,
    'application_id',d.application_id,'doc_type',d.doc_type,'storage_path',d.storage_path,
    'status',d.status,'safety_status','quarantined')) into existing
  from public.xooter_documents d join private.kyc_quarantine_receipts r on r.document_id=d.id
    join storage.objects o on o.bucket_id='kyc-docs' and o.name=r.storage_path
  where d.user_id=p_user_id and d.application_id=p_application_id and d.storage_path=p_storage_path
    and r.user_id=d.user_id and r.application_id=d.application_id
    and o.id=r.object_id and o.updated_at=r.object_updated_at;
  if existing is not null then return existing;end if;
  -- Any other registered/foreign/legacy path is rejected cheaply, never re-downloaded.
  if exists(select 1 from public.xooter_documents where storage_path=p_storage_path)
    or exists(select 1 from private.kyc_quarantine_receipts where storage_path=p_storage_path) then return null;end if;
  select jsonb_build_object('id',o.id,'updated_at',o.updated_at,'metadata',
    jsonb_build_object('size',o.metadata->'size','mimetype',o.metadata->'mimetype'))
  into result from storage.objects o
  where o.bucket_id='kyc-docs' and o.name=p_storage_path
    and p_storage_path ~ ('^'||p_user_id::text||'/[A-Za-z0-9][A-Za-z0-9._-]*$')
    and exists(select 1 from public.xooter_applications a where a.id=p_application_id
      and a.user_id=p_user_id and a.status in ('draft','rejected'));
  if result is null then return null;end if;
  insert into private.kyc_inspection_attempts(storage_path,user_id) values(p_storage_path,p_user_id)
    on conflict(storage_path) do nothing;
  get diagnostics affected=row_count;
  if affected<>1 or not private.consume_kyc_quarantine_limit(p_user_id,'inspection') then return null;end if;
  return result;
end
$$;
revoke all on function public.inspect_quarantined_kyc_object(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.inspect_quarantined_kyc_object(uuid,uuid,text) to service_role;

create function public.register_quarantined_kyc_document(
  p_user_id uuid, p_application_id uuid, p_doc_type text, p_storage_path text,
  p_object_id uuid, p_object_updated_at timestamptz, p_sha256 text,
  p_content_type text, p_byte_length integer
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare a public.xooter_applications%rowtype; o storage.objects%rowtype;
  d public.xooter_documents%rowtype;
begin
  if p_doc_type not in ('id','proof_of_residence','bank_statement','selfie')
     or p_storage_path !~ ('^'||p_user_id::text||'/[A-Za-z0-9][A-Za-z0-9._-]*$') then
    raise exception 'invalid document registration' using errcode='22023';
  end if;
  select * into a from public.xooter_applications
    where id=p_application_id and user_id=p_user_id for update;
  if not found or a.status not in ('draft','rejected') then
    raise exception 'editable applicant application required' using errcode='42501';
  end if;
  select * into o from storage.objects where bucket_id='kyc-docs' and name=p_storage_path for share;
  if not found or o.id is distinct from p_object_id or o.updated_at is distinct from p_object_updated_at
    or (o.metadata->>'size')::bigint is distinct from p_byte_length::bigint
    or o.metadata->>'mimetype' is distinct from p_content_type then
    raise exception 'uploaded object changed or missing' using errcode='40001';
  end if;
  if exists(select 1 from public.xooter_documents where storage_path=p_storage_path) then
    raise exception 'registered document paths cannot be reused' using errcode='23505';
  end if;
  insert into public.xooter_documents(user_id,application_id,doc_type,storage_path,status)
    values(p_user_id,p_application_id,p_doc_type,p_storage_path,'pending') returning * into d;
  insert into private.kyc_quarantine_receipts(document_id,application_id,user_id,storage_path,
    object_id,object_updated_at,sha256,content_type,byte_length)
    values(d.id,a.id,p_user_id,p_storage_path,o.id,o.updated_at,p_sha256,p_content_type,p_byte_length);
  if p_doc_type='selfie' then
    update public.xooter_applications set selfie_storage_path=p_storage_path where id=a.id;
  end if;
  return jsonb_build_object('id',d.id,'user_id',d.user_id,'application_id',d.application_id,
    'doc_type',d.doc_type,'storage_path',d.storage_path,'status',d.status,'safety_status','quarantined');
end $$;
revoke all on function public.register_quarantined_kyc_document(uuid,uuid,text,text,uuid,timestamptz,text,text,integer)
  from public, anon, authenticated;
grant execute on function public.register_quarantined_kyc_document(uuid,uuid,text,text,uuid,timestamptz,text,text,integer)
  to service_role;

-- A draft request that started before submission cannot undo the review lock afterwards.
create function private.kyc_application_edit_lock() returns trigger
language plpgsql security invoker set search_path='' as $$
declare review_fields text[] := array['status','updated_at','reviewer_notes','reviewed_at','reviewed_by',
  'activation_locked_reason','verification_notes','id_verification_status','selfie_verification_status',
  'address_verification_status','banking_verification_status','reference_verification_status',
  'background_check_status','third_party_verification_status'];
begin
  if old.status not in ('draft','rejected') and
    (new.status='draft' or (to_jsonb(new)-review_fields) is distinct from (to_jsonb(old)-review_fields)) then
    raise exception 'Application is locked for review' using errcode='23514';
  end if;
  return new;
end $$;
revoke all on function private.kyc_application_edit_lock() from public,anon,authenticated;
create trigger kyc_application_edit_locked before update on public.xooter_applications
  for each row execute function private.kyc_application_edit_lock();

-- This is deliberately not a configurable boolean. No unscanned file can be approved.
create function private.kyc_quarantine_activation_interlock() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if tg_table_name='xooter_applications' then
    if new.status='approved' and (tg_op='INSERT' or old.status is distinct from 'approved') then
      raise exception 'KYC activation unavailable: private malware scan and authenticity clearance are pending' using errcode='23514';
    end if;
  elsif tg_table_name='xooters' then
    if new.active and (tg_op='INSERT' or not old.active or old.user_id is distinct from new.user_id) then
      raise exception 'KYC activation unavailable: private malware scan and authenticity clearance are pending' using errcode='23514';
    end if;
  elsif tg_table_name='user_roles' then
    if new.role::text='xooter' and (tg_op='INSERT' or old.role::text is distinct from 'xooter' or old.user_id is distinct from new.user_id) then
      raise exception 'KYC role grant unavailable: private malware scan and authenticity clearance are pending' using errcode='23514';
    end if;
  end if;
  return new;
end $$;
revoke all on function private.kyc_quarantine_activation_interlock() from public, anon, authenticated;
create trigger kyc_application_clearance_required before insert or update on public.xooter_applications
  for each row execute function private.kyc_quarantine_activation_interlock();
create trigger kyc_contractor_clearance_required before insert or update on public.xooters
  for each row execute function private.kyc_quarantine_activation_interlock();
create trigger kyc_role_clearance_required before insert or update on public.user_roles
  for each row execute function private.kyc_quarantine_activation_interlock();

comment on table private.kyc_quarantine_receipts is
  'Server-inspected upload fingerprints only. Not malware-free, genuine identity, consent or eligibility proof.';$xoot_body_20261027032349$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261027032349','kyc_private_quarantine_interlock',array[v_sql]);
  end if;
  -- 20261027201017_atomic_booking_payment_settlement.sql; original SHA256 6f571834c666652870cd680140ea5ee80909b01b45ccc6f41e160c688c96db5a
  if not exists (select from supabase_migrations.schema_migrations where version='20261027201017') then
    v_sql := $xoot_body_20261027201017$-- A verified callback is not a completed booking until all consequences commit together.
-- Additive, service-only. No provider controls, evidence flags or historical rows are changed.
create table private.booking_payment_settlements (
  payment_record_id uuid primary key references public.payment_records(id) on delete cascade,
  booking_id uuid not null unique references public.bookings(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  source text not null check (source in ('payfast', 'admin')),
  settled_status text not null check (settled_status in ('paid', 'admin_confirmed')),
  provider_reference text not null,
  provider_transaction_id text,
  provider_event_id uuid references public.provider_events(id) on delete set null,
  provider_confirmed_at timestamptz,
  confirmed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index booking_payment_provider_transaction_once
  on private.booking_payment_settlements(provider_transaction_id)
  where provider_transaction_id is not null;
alter table private.booking_payment_settlements enable row level security;
revoke all on private.booking_payment_settlements from public, anon, authenticated, service_role;
grant select on private.booking_payment_settlements to service_role;
comment on table private.booking_payment_settlements is
  'Atomic booking-payment receipt. Absence on an already-paid legacy payment requires reconciliation; it is never inferred from status alone.';

create function private.settle_booking_payment(
  p_payment_id uuid, p_source text, p_amount_cents bigint, p_reference text,
  p_provider_event_id uuid, p_payload_hash text, p_provider_transaction_id text,
  p_admin_id uuid, p_reason text, p_admin_session_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_payment public.payment_records%rowtype;
  v_booking public.bookings%rowtype;
  v_event public.provider_events%rowtype;
  v_receipt private.booking_payment_settlements%rowtype;
  v_status text;
  v_provider text;
  v_label text;
  v_job_state text;
  v_job_count integer;
  v_reference text;
  v_now timestamptz := now();
begin
  if p_source is null or p_source not in ('payfast', 'admin') then
    raise exception 'unsupported settlement source' using errcode = '22023';
  end if;
  -- One lock order for callbacks and admin confirmations. Never trust an Edge snapshot.
  select * into v_payment from public.payment_records where id = p_payment_id for update;
  if not found then raise exception 'payment record not found' using errcode = 'P0002'; end if;
  if v_payment.payment_kind <> 'booking' or v_payment.booking_id is null then
    raise exception 'this payment kind needs its own fulfilment contract' using errcode = '22023';
  end if;
  -- Legacy manual_pending booking payments legitimately have no external provider reference.
  -- Bind those admin receipts to the immutable payment ID; PayFast references stay mandatory.
  v_reference := case when p_source = 'admin' and v_payment.provider in ('manual_pending','manual_eft')
    and nullif(v_payment.provider_reference,'') is null then 'manual_eft:' || v_payment.id else v_payment.provider_reference end;
  if v_payment.currency <> 'ZAR' or p_amount_cents is null or p_amount_cents <= 0
     or v_payment.amount * 100 <> p_amount_cents
     or nullif(p_reference, '') is null or v_reference is distinct from p_reference then
    raise exception 'payment identity or amount mismatch' using errcode = '22023';
  end if;

  if p_source = 'payfast' then
    if v_payment.provider <> 'payfast' or p_provider_event_id is null
       or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
       or p_provider_transaction_id is null or length(p_provider_transaction_id) not between 1 and 120
       or p_admin_id is not null or p_admin_session_id is not null then
      raise exception 'verified PayFast event required' using errcode = '22023';
    end if;
    select * into v_event from public.provider_events where id = p_provider_event_id for update;
    if not found or v_event.provider <> 'payfast' or v_event.event_type <> 'payment_confirmed'
       or v_event.subject_table is distinct from 'payment_records'
       or v_event.subject_id is distinct from v_payment.id
       or v_event.payload_hash is distinct from p_payload_hash then
      raise exception 'provider event is not bound to this payment and payload' using errcode = '22023';
    end if;
    v_status := 'paid'; v_provider := 'payfast'; v_label := 'Payment received';
  else
    if p_admin_id is null or not public.has_role(p_admin_id, 'admin'::public.app_role)
       or p_admin_session_id is null or not exists (
         select from auth.sessions where id = p_admin_session_id and user_id = p_admin_id
           and aal::text = 'aal2' and (not_after is null or not_after > v_now)
       )
       or length(trim(coalesce(p_reason, ''))) not between 10 and 1200
       or p_provider_event_id is not null or p_payload_hash is not null or p_provider_transaction_id is not null then
      raise exception 'verified admin and reason required' using errcode = '42501';
    end if;
    v_status := 'admin_confirmed';
    v_provider := case when v_payment.provider = 'manual_pending' then 'manual_eft' else v_payment.provider end;
    v_label := 'Payment confirmed by admin';
  end if;

  select * into v_receipt from private.booking_payment_settlements where payment_record_id = v_payment.id;
  if found then
    if v_receipt.booking_id <> v_payment.booking_id or v_receipt.user_id <> v_payment.user_id
       or v_receipt.amount_cents <> p_amount_cents or v_receipt.provider_reference <> p_reference
       or v_payment.status not in ('paid', 'admin_confirmed', 'refunded', 'cancelled') then
      raise exception 'settlement receipt mismatch; reconciliation required' using errcode = '22023';
    end if;
    if p_source = 'payfast' then
      if v_receipt.provider_transaction_id is null and v_receipt.source = 'admin' then
        -- A genuine late ITN may corroborate an admin's earlier PayFast dashboard check.
        -- Bind its first transaction once; another transaction is a second-charge exception.
        update private.booking_payment_settlements set provider_transaction_id = p_provider_transaction_id,
          provider_event_id = p_provider_event_id, provider_confirmed_at = v_now where payment_record_id = v_payment.id;
        insert into public.admin_audit_log(admin_id,action,target_table,target_id,changes,reason)
          values(v_payment.user_id,'payfast_admin_settlement_reconciled','payment_records',v_payment.id,
            jsonb_build_object('provider_transaction_id',p_provider_transaction_id), 'Verified late provider callback bound to existing admin settlement');
      elsif v_receipt.provider_transaction_id is distinct from p_provider_transaction_id then
        raise exception 'different provider transaction; reconciliation required' using errcode = '22023';
      end if;
    end if;
    -- A receipt, not a paid flag, proves all side effects committed. Never regress a later booking.
    if p_source = 'payfast' then
      update public.provider_events set status = 'processed', processed_at = v_now, error_message = null where id = p_provider_event_id;
    end if;
    return jsonb_build_object('payment_record_id', v_payment.id, 'booking_id', v_payment.booking_id,
      'status', v_payment.status, 'idempotent', true);
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'paid or non-pending payment has no receipt; reconciliation required' using errcode = '22023';
  end if;
  select * into v_booking from public.bookings where id = v_payment.booking_id for update;
  if not found or v_booking.user_id <> v_payment.user_id then
    raise exception 'booking owner mismatch' using errcode = '22023';
  end if;
  if v_booking.status::text not in ('draft', 'pending', 'pending_payment') or v_booking.payment_status <> 'pending' then
    raise exception 'booking cannot accept payment; reconciliation required' using errcode = '22023';
  end if;
  -- The reviewed crew contract has a separate assignment model. Do not silently fulfil only one member.
  if v_booking.crew_size <> 1 then
    raise exception 'crew fulfilment contract is required before settlement' using errcode = '22023';
  end if;

  update public.payment_records set status = v_status, provider = v_provider, paid_at = v_now, updated_at = v_now,
    meta = meta || jsonb_build_object('settlement_version', 1, 'confirmed_at', v_now)
      || case when p_source = 'payfast' then jsonb_build_object('pf_payment_id', p_provider_transaction_id) else '{}'::jsonb end
    where id = v_payment.id;
  update public.bookings set status = 'payment_confirmed', payment_status = 'paid', payment_confirmed_at = v_now, updated_at = v_now
    where id = v_booking.id;
  insert into public.booking_status_events(booking_id, actor_id, status, label, meta)
    values(v_booking.id, coalesce(p_admin_id, v_payment.user_id), 'payment_confirmed', v_label,
      jsonb_build_object('payment_record_id', v_payment.id));

  if v_booking.xooter_id is not null and exists (
    select from public.xooters where id = v_booking.xooter_id and active = true
      and background_check_status = 'approved' and reliability_flagged = false
  ) then
    -- Settlement locks serialise this initial offer. Replacement history can contain later
    -- offers to the same worker, so do not add a global uniqueness rule to that shared table.
    select count(*) into v_job_count from public.xooter_jobs where booking_id=v_booking.id and xooter_id=v_booking.xooter_id;
    if v_job_count > 1 then raise exception 'job history needs reconciliation' using errcode = '22023'; end if;
    if v_job_count = 0 then
      insert into public.xooter_jobs(booking_id, xooter_id, state) values(v_booking.id, v_booking.xooter_id, 'offered');
    end if;
    select state into v_job_state from public.xooter_jobs where booking_id = v_booking.id and xooter_id = v_booking.xooter_id for update;
    if v_job_state <> 'offered' then
      raise exception 'job offer needs reconciliation' using errcode = '22023';
    end if;
  end if;
  insert into public.notifications(user_id, kind, title, body, link)
    values(v_payment.user_id, 'payment_confirmed', 'Payment confirmed',
      'Your Xoot payment is confirmed. We are now finalising the booking assignment.', '/app/bookings/' || v_booking.id);
  insert into public.integration_outbox(source_table, source_id, event_type, channel, owner, stack_tool, payload, status, approval_required, created_by)
    values('bookings', v_booking.id, 'payment_confirmed_assignment_search', 'in_app',
      'Scheduling & Allocation Agent', 'Xoot assignment queue', jsonb_build_object('booking_id', v_booking.id, 'payment_record_id', v_payment.id),
      'queued', false, v_payment.user_id);
  insert into public.admin_audit_log(admin_id, action, target_table, target_id, changes, reason)
    values(coalesce(p_admin_id, v_payment.user_id), case when p_source = 'admin' then 'admin_confirm_payment' else 'confirm_payment_webhook' end,
      'payment_records', v_payment.id, jsonb_build_object('from', v_payment.status, 'to', v_status, 'provider', v_provider, 'amount_cents', p_amount_cents),
      case when p_source = 'admin' then trim(p_reason) else 'PayFast signature, merchant, amount and server postback verified' end);
  insert into private.booking_payment_settlements(payment_record_id, booking_id, user_id, amount_cents, source, settled_status,
    provider_reference, provider_transaction_id, provider_event_id, confirmed_by, provider_confirmed_at)
    values(v_payment.id, v_booking.id, v_payment.user_id, p_amount_cents, p_source, v_status, p_reference,
      p_provider_transaction_id, p_provider_event_id, p_admin_id, case when p_source = 'payfast' then v_now else null end);
  if p_source = 'payfast' then
    update public.provider_events set status = 'processed', processed_at = v_now, error_message = null where id = p_provider_event_id;
  end if;
  return jsonb_build_object('payment_record_id', v_payment.id, 'booking_id', v_booking.id, 'status', v_status, 'idempotent', false);
end;
$$;
revoke all on function private.settle_booking_payment(uuid,text,bigint,text,uuid,text,text,uuid,text,uuid) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.settle_booking_payment(uuid,text,bigint,text,uuid,text,text,uuid,text,uuid) to service_role;

create function public.settle_booking_payment(
  p_payment_id uuid, p_source text, p_amount_cents bigint, p_reference text,
  p_provider_event_id uuid, p_payload_hash text, p_provider_transaction_id text,
  p_admin_id uuid, p_reason text, p_admin_session_id uuid
) returns jsonb language sql security invoker set search_path = '' as $$
  select private.settle_booking_payment(p_payment_id,p_source,p_amount_cents,p_reference,
    p_provider_event_id,p_payload_hash,p_provider_transaction_id,p_admin_id,p_reason,p_admin_session_id);
$$;
revoke all on function public.settle_booking_payment(uuid,text,bigint,text,uuid,text,text,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.settle_booking_payment(uuid,text,bigint,text,uuid,text,text,uuid,text,uuid) to service_role;
-- Checkout must not hand a customer to PayFast while only the legacy partial writer exists.
create function public.booking_payment_settlement_ready() returns integer
  language sql stable security invoker set search_path = '' as $$
  select 1 where to_regprocedure('private.settle_booking_payment(uuid,text,bigint,text,uuid,text,text,uuid,text,uuid)') is not null;
$$;
revoke all on function public.booking_payment_settlement_ready() from public, anon, authenticated;
grant execute on function public.booking_payment_settlement_ready() to service_role;
notify pgrst, 'reload schema';
$xoot_body_20261027201017$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261027201017','atomic_booking_payment_settlement',array[v_sql]);
  end if;
  -- 20261028125915_atomic_booking_cancellation.sql; original SHA256 7fc61fd4a7935cc1a511c5b9858c15d4f5d9cc57c4abdb00c8f01d7672679458
  if not exists (select from supabase_migrations.schema_migrations where version='20261028125915') then
    v_sql := $xoot_body_20261028125915$-- Coordinate with the optional account-guard foundation without stamping missing history.
-- This identity-only read is not a financial/benefit fact. Re-read owners under source locks.
create function private.lock_payment_booking_accounts(p_booking_id uuid,p_payment_id uuid)
returns uuid[] language plpgsql security invoker set search_path = '' as $$
declare v_accounts uuid[]; v_guards boolean; v_trigger_count integer;
begin
  if (p_booking_id is null) = (p_payment_id is null) then
    raise exception 'one booking or payment identity required' using errcode='22023';
  end if;
  select array_agg(distinct user_id order by user_id) into v_accounts from (
    select b.user_id from public.bookings b where b.id=coalesce(p_booking_id,
      (select p.booking_id from public.payment_records p where p.id=p_payment_id))
    union
    select p.user_id from public.payment_records p
      where (p_payment_id is not null and p.id=p_payment_id)
        or (p_payment_id is null and p.booking_id=p_booking_id)
  ) identities;
  if coalesce(cardinality(v_accounts),0)=0 then raise exception 'booking or payment not found' using errcode='P0002'; end if;
  v_guards:=to_regprocedure('private.lock_booking_accounts(uuid[])') is not null;
  if v_guards is distinct from (to_regclass('private.booking_account_guards') is not null) then
    raise exception 'account guard foundation is inconsistent' using errcode='55000';
  end if;
  select count(*) into v_trigger_count from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and t.tgname='a00_booking_benefit_guard' and t.tgenabled='O'
      and n.nspname='public' and c.relname in ('bookings','xootcred_ledger','user_subscriptions','referrals','referral_redemptions');
  if (v_guards and v_trigger_count<>5) or (not v_guards and v_trigger_count<>0) then
    raise exception 'account guard triggers are inconsistent' using errcode='55000';
  end if;
  if v_guards then perform private.lock_booking_accounts(v_accounts); end if;
  return v_accounts;
end;
$$;
revoke all on function private.lock_payment_booking_accounts(uuid,uuid) from public,anon,authenticated;
grant execute on function private.lock_payment_booking_accounts(uuid,uuid) to service_role;

create or replace function private.settle_booking_payment(
  p_payment_id uuid, p_source text, p_amount_cents bigint, p_reference text,
  p_provider_event_id uuid, p_payload_hash text, p_provider_transaction_id text,
  p_admin_id uuid, p_reason text, p_admin_session_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_accounts uuid[];
  v_payment public.payment_records%rowtype;
  v_booking public.bookings%rowtype;
  v_event public.provider_events%rowtype;
  v_receipt private.booking_payment_settlements%rowtype;
  v_status text;
  v_provider text;
  v_label text;
  v_job_state text;
  v_job_count integer;
  v_reference text;
  v_now timestamptz := now();
begin
  if p_source is null or p_source not in ('payfast', 'admin') then
    raise exception 'unsupported settlement source' using errcode = '22023';
  end if;
  -- Complete account guards (if that foundation is installed) precede every source-row lock.
  v_accounts := private.lock_payment_booking_accounts(null,p_payment_id);
  -- One lock order for callbacks and admin confirmations. Never trust an Edge snapshot.
  select * into v_payment from public.payment_records where id = p_payment_id for update;
  if not found then raise exception 'payment record not found' using errcode = 'P0002'; end if;
  if not (v_payment.user_id=any(v_accounts)) then
    raise exception 'payment owner changed; retry transaction' using errcode = '40001';
  end if;
  if v_payment.payment_kind <> 'booking' or v_payment.booking_id is null then
    raise exception 'this payment kind needs its own fulfilment contract' using errcode = '22023';
  end if;
  -- Legacy manual_pending booking payments legitimately have no external provider reference.
  -- Bind those admin receipts to the immutable payment ID; PayFast references stay mandatory.
  v_reference := case when p_source = 'admin' and v_payment.provider in ('manual_pending','manual_eft')
    and nullif(v_payment.provider_reference,'') is null then 'manual_eft:' || v_payment.id else v_payment.provider_reference end;
  if v_payment.currency <> 'ZAR' or p_amount_cents is null or p_amount_cents <= 0
     or v_payment.amount * 100 <> p_amount_cents
     or nullif(p_reference, '') is null or v_reference is distinct from p_reference then
    raise exception 'payment identity or amount mismatch' using errcode = '22023';
  end if;

  if p_source = 'payfast' then
    if v_payment.provider <> 'payfast' or p_provider_event_id is null
       or p_payload_hash is null or p_payload_hash !~ '^[a-f0-9]{64}$'
       or p_provider_transaction_id is null or length(p_provider_transaction_id) not between 1 and 120
       or p_admin_id is not null or p_admin_session_id is not null then
      raise exception 'verified PayFast event required' using errcode = '22023';
    end if;
    select * into v_event from public.provider_events where id = p_provider_event_id for update;
    if not found or v_event.provider <> 'payfast' or v_event.event_type <> 'payment_confirmed'
       or v_event.subject_table is distinct from 'payment_records'
       or v_event.subject_id is distinct from v_payment.id
       or v_event.payload_hash is distinct from p_payload_hash then
      raise exception 'provider event is not bound to this payment and payload' using errcode = '22023';
    end if;
    v_status := 'paid'; v_provider := 'payfast'; v_label := 'Payment received';
  else
    if p_admin_id is null or not public.has_role(p_admin_id, 'admin'::public.app_role)
       or p_admin_session_id is null or not exists (
         select from auth.sessions where id = p_admin_session_id and user_id = p_admin_id
           and aal::text = 'aal2' and (not_after is null or not_after > v_now)
       )
       or length(trim(coalesce(p_reason, ''))) not between 10 and 1200
       or p_provider_event_id is not null or p_payload_hash is not null or p_provider_transaction_id is not null then
      raise exception 'verified admin and reason required' using errcode = '42501';
    end if;
    v_status := 'admin_confirmed';
    v_provider := case when v_payment.provider = 'manual_pending' then 'manual_eft' else v_payment.provider end;
    v_label := 'Payment confirmed by admin';
  end if;

  select * into v_receipt from private.booking_payment_settlements where payment_record_id = v_payment.id;
  if found then
    if v_receipt.booking_id <> v_payment.booking_id or v_receipt.user_id <> v_payment.user_id
       or v_receipt.amount_cents <> p_amount_cents or v_receipt.provider_reference <> p_reference
       or v_payment.status not in ('paid', 'admin_confirmed', 'refunded', 'cancelled') then
      raise exception 'settlement receipt mismatch; reconciliation required' using errcode = '22023';
    end if;
    if p_source = 'payfast' then
      if v_receipt.provider_transaction_id is null and v_receipt.source = 'admin' then
        -- A genuine late ITN may corroborate an admin's earlier PayFast dashboard check.
        -- Bind its first transaction once; another transaction is a second-charge exception.
        update private.booking_payment_settlements set provider_transaction_id = p_provider_transaction_id,
          provider_event_id = p_provider_event_id, provider_confirmed_at = v_now where payment_record_id = v_payment.id;
        insert into public.admin_audit_log(admin_id,action,target_table,target_id,changes,reason)
          values(v_payment.user_id,'payfast_admin_settlement_reconciled','payment_records',v_payment.id,
            jsonb_build_object('provider_transaction_id',p_provider_transaction_id), 'Verified late provider callback bound to existing admin settlement');
      elsif v_receipt.provider_transaction_id is distinct from p_provider_transaction_id then
        raise exception 'different provider transaction; reconciliation required' using errcode = '22023';
      end if;
    end if;
    -- A receipt, not a paid flag, proves all side effects committed. Never regress a later booking.
    if p_source = 'payfast' then
      update public.provider_events set status = 'processed', processed_at = v_now, error_message = null where id = p_provider_event_id;
    end if;
    return jsonb_build_object('payment_record_id', v_payment.id, 'booking_id', v_payment.booking_id,
      'status', v_payment.status, 'idempotent', true);
  end if;
  if v_payment.status <> 'pending' then
    raise exception 'paid or non-pending payment has no receipt; reconciliation required' using errcode = '22023';
  end if;
  select * into v_booking from public.bookings where id = v_payment.booking_id for update;
  if found and not (v_booking.user_id=any(v_accounts)) then
    raise exception 'booking owner changed; retry transaction' using errcode = '40001';
  end if;
  if not found or v_booking.user_id <> v_payment.user_id then
    raise exception 'booking owner mismatch' using errcode = '22023';
  end if;
  if v_booking.status::text not in ('draft', 'pending', 'pending_payment') or v_booking.payment_status <> 'pending' then
    raise exception 'booking cannot accept payment; reconciliation required' using errcode = '22023';
  end if;
  -- The reviewed crew contract has a separate assignment model. Do not silently fulfil only one member.
  if v_booking.crew_size <> 1 then
    raise exception 'crew fulfilment contract is required before settlement' using errcode = '22023';
  end if;

  update public.payment_records set status = v_status, provider = v_provider, paid_at = v_now, updated_at = v_now,
    meta = meta || jsonb_build_object('settlement_version', 1, 'confirmed_at', v_now)
      || case when p_source = 'payfast' then jsonb_build_object('pf_payment_id', p_provider_transaction_id) else '{}'::jsonb end
    where id = v_payment.id;
  update public.bookings set status = 'payment_confirmed', payment_status = 'paid', payment_confirmed_at = v_now, updated_at = v_now
    where id = v_booking.id;
  insert into public.booking_status_events(booking_id, actor_id, status, label, meta)
    values(v_booking.id, coalesce(p_admin_id, v_payment.user_id), 'payment_confirmed', v_label,
      jsonb_build_object('payment_record_id', v_payment.id));

  if v_booking.xooter_id is not null and exists (
    select from public.xooters where id = v_booking.xooter_id and active = true
      and background_check_status = 'approved' and reliability_flagged = false
  ) then
    -- Settlement locks serialise this initial offer. Replacement history can contain later
    -- offers to the same worker, so do not add a global uniqueness rule to that shared table.
    select count(*) into v_job_count from public.xooter_jobs where booking_id=v_booking.id and xooter_id=v_booking.xooter_id;
    if v_job_count > 1 then raise exception 'job history needs reconciliation' using errcode = '22023'; end if;
    if v_job_count = 0 then
      insert into public.xooter_jobs(booking_id, xooter_id, state) values(v_booking.id, v_booking.xooter_id, 'offered');
    end if;
    select state into v_job_state from public.xooter_jobs where booking_id = v_booking.id and xooter_id = v_booking.xooter_id for update;
    if v_job_state <> 'offered' then
      raise exception 'job offer needs reconciliation' using errcode = '22023';
    end if;
  end if;
  insert into public.notifications(user_id, kind, title, body, link)
    values(v_payment.user_id, 'payment_confirmed', 'Payment confirmed',
      'Your Xoot payment is confirmed. We are now finalising the booking assignment.', '/app/bookings/' || v_booking.id);
  insert into public.integration_outbox(source_table, source_id, event_type, channel, owner, stack_tool, payload, status, approval_required, created_by)
    values('bookings', v_booking.id, 'payment_confirmed_assignment_search', 'in_app',
      'Scheduling & Allocation Agent', 'Xoot assignment queue', jsonb_build_object('booking_id', v_booking.id, 'payment_record_id', v_payment.id),
      'queued', false, v_payment.user_id);
  insert into public.admin_audit_log(admin_id, action, target_table, target_id, changes, reason)
    values(coalesce(p_admin_id, v_payment.user_id), case when p_source = 'admin' then 'admin_confirm_payment' else 'confirm_payment_webhook' end,
      'payment_records', v_payment.id, jsonb_build_object('from', v_payment.status, 'to', v_status, 'provider', v_provider, 'amount_cents', p_amount_cents),
      case when p_source = 'admin' then trim(p_reason) else 'PayFast signature, merchant, amount and server postback verified' end);
  insert into private.booking_payment_settlements(payment_record_id, booking_id, user_id, amount_cents, source, settled_status,
    provider_reference, provider_transaction_id, provider_event_id, confirmed_by, provider_confirmed_at)
    values(v_payment.id, v_booking.id, v_payment.user_id, p_amount_cents, p_source, v_status, p_reference,
      p_provider_transaction_id, p_provider_event_id, p_admin_id, case when p_source = 'payfast' then v_now else null end);
  if p_source = 'payfast' then
    update public.provider_events set status = 'processed', processed_at = v_now, error_message = null where id = p_provider_event_id;
  end if;
  return jsonb_build_object('payment_record_id', v_payment.id, 'booking_id', v_booking.id, 'status', v_status, 'idempotent', false);
end;
$$;

-- Cancellation and settlement share account -> payment -> booking lock order.
-- No refund is issued here: the existing policy produces a pending review only.
create table private.booking_cancellations (
  booking_id uuid primary key references public.bookings(id) on delete cascade,
  payment_record_id uuid not null unique references public.payment_records(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  cancelled_by uuid not null references auth.users(id),
  payment_status text not null check (payment_status in ('pending','paid','admin_confirmed')),
  refund_cents bigint not null check (refund_cents >= 0),
  refund_reason text not null,
  refund_request_id uuid references public.refund_requests(id),
  created_at timestamptz not null,
  check ((refund_cents > 0) = (refund_request_id is not null))
);
alter table private.booking_cancellations enable row level security;
revoke all on private.booking_cancellations from public, anon, authenticated, service_role;
grant select on private.booking_cancellations to service_role;
comment on table private.booking_cancellations is
  'Committed cancellation and original refund-review receipt; retries never recalculate time windows or issue money.';

create function private.cancel_booking_atomically(
  p_booking_id uuid, p_actor_id uuid, p_reason text, p_admin_session_id uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_accounts uuid[];
  v_payment public.payment_records%rowtype;
  v_booking public.bookings%rowtype;
  v_settlement private.booking_payment_settlements%rowtype;
  v_receipt private.booking_cancellations%rowtype;
  v_count integer;
  v_now timestamptz;
  v_amount_cents bigint;
  v_refund_cents bigint := 0;
  v_refund_reason text := 'not_paid';
  v_refund_id uuid;
  v_worker_user uuid;
begin
  if p_booking_id is null or p_actor_id is null or length(trim(coalesce(p_reason,''))) not between 1 and 500 then
    raise exception 'valid cancellation identity and reason required' using errcode = '22023';
  end if;
  v_accounts := private.lock_payment_booking_accounts(p_booking_id,null);
  -- Lock every candidate before the booking, like settlement. Never guess the latest payment.
  perform id from public.payment_records where booking_id=p_booking_id order by id for update;
  select count(*) into v_count from public.payment_records where booking_id=p_booking_id;
  if v_count <> 1 then raise exception 'one canonical booking payment required' using errcode = '22023'; end if;
  select * into v_payment from public.payment_records where booking_id=p_booking_id;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
  if not (v_payment.user_id=any(v_accounts)) or not (v_booking.user_id=any(v_accounts)) then
    raise exception 'booking or payment owner changed; retry transaction' using errcode='40001';
  end if;
  -- A concurrent FK insert may have committed while we waited for the booking lock.
  if (select count(*) from public.payment_records where booking_id=p_booking_id) <> 1 then
    raise exception 'booking payment changed; reconciliation required' using errcode = '22023';
  end if;
  v_now := clock_timestamp();
  if v_booking.user_id <> p_actor_id then
    if not public.has_role(p_actor_id,'admin'::public.app_role) or p_admin_session_id is null
      or not exists(select from auth.sessions where id=p_admin_session_id and user_id=p_actor_id
        and aal::text='aal2' and (not_after is null or not_after > v_now))
      or length(trim(p_reason)) < 10 then
      raise exception 'verified owner or current MFA admin required' using errcode = '42501';
    end if;
  end if;
  if v_payment.user_id <> v_booking.user_id or v_payment.payment_kind <> 'booking'
    or v_payment.currency <> 'ZAR' or v_payment.amount <= 0 or v_payment.amount*100 <> trunc(v_payment.amount*100)
    or v_booking.crew_size <> 1 then
    raise exception 'canonical owner, amount and single-worker booking required' using errcode = '22023';
  end if;
  select * into v_receipt from private.booking_cancellations where booking_id=p_booking_id;
  if found then
    if v_receipt.payment_record_id <> v_payment.id or v_receipt.user_id <> v_booking.user_id
      or v_booking.status::text <> 'cancelled' or v_booking.cancelled_at is null then
      raise exception 'cancellation receipt mismatch; reconciliation required' using errcode = '22023';
    end if;
    return jsonb_build_object('booking_id',p_booking_id,'status','cancelled','idempotent',true,
      'refund',jsonb_build_object('eligible',v_receipt.refund_cents>0,'amount',v_receipt.refund_cents/100.0,'reason',v_receipt.refund_reason),
      'refund_request_id',v_receipt.refund_request_id);
  end if;
  -- Post-start reversals require a separate accounting workflow, including for admins.
  if v_booking.cancelled_at is not null or v_booking.status::text not in (
    'draft','pending','pending_payment','payment_confirmed','awaiting_assignment','assigned',
    'confirmed','contractor_accepted','replacement_required','replacement_offered','reassigned') then
    raise exception 'booking cannot be cancelled in its current state' using errcode = '22023';
  end if;
  if v_payment.status in ('paid','admin_confirmed') then
    select * into v_settlement from private.booking_payment_settlements where payment_record_id=v_payment.id;
    if not found or v_settlement.booking_id <> p_booking_id or v_settlement.user_id <> v_booking.user_id
      or v_settlement.amount_cents <> v_payment.amount*100 or v_booking.payment_status <> 'paid' then
      raise exception 'settled money requires its original receipt' using errcode = '22023';
    end if;
    v_amount_cents := v_settlement.amount_cents;
    if v_booking.scheduled_at >= v_now + interval '12 hours' then
      v_refund_cents := v_amount_cents; v_refund_reason := 'full_refund_12h_window';
    elsif v_booking.scheduled_at >= v_now + interval '2 hours' then
      v_refund_cents := (v_amount_cents+1)/2; v_refund_reason := 'partial_refund_2h_window';
    else
      v_refund_reason := 'late_cancellation_no_auto_refund';
    end if;
  elsif v_payment.status <> 'pending' or v_booking.payment_status <> 'pending'
    or v_booking.status::text not in ('draft','pending','pending_payment')
    or exists(select from private.booking_payment_settlements where payment_record_id=v_payment.id) then
    raise exception 'payment state requires reconciliation' using errcode = '22023';
  end if;
  if exists(select from public.refund_requests where booking_id=p_booking_id) then
    raise exception 'existing refund needs reconciliation' using errcode = '22023';
  end if;
  perform id from public.integration_outbox where source_table='bookings' and source_id=p_booking_id
    and event_type='payment_confirmed_assignment_search' order by id for update;
  if exists(select from public.integration_outbox where source_table='bookings' and source_id=p_booking_id
    and event_type='payment_confirmed_assignment_search' and status='processing') then
    raise exception 'assignment is processing; retry after reconciliation' using errcode = '22023';
  end if;
  perform id from public.xooter_jobs where booking_id=p_booking_id order by id for update;
  if exists(select from public.xooter_jobs where booking_id=p_booking_id
    and state not in ('offered','accepted','declined','expired','cancelled','replaced')) then
    raise exception 'job state requires reconciliation' using errcode = '22023';
  end if;

  update public.bookings set status='cancelled',cancelled_at=v_now,cancelled_by=p_actor_id,
    payment_status=case when v_payment.status in ('paid','admin_confirmed') then 'paid' else 'cancelled' end,
    sensitive_data_revoked_at=v_now,updated_at=v_now where id=p_booking_id;
  if v_payment.status='pending' then
    -- Keep the provider reference for late-charge reconciliation; never acknowledge it as paid.
    update public.payment_records set status='cancelled',updated_at=v_now where id=v_payment.id;
  end if;
  update public.xooter_jobs set state=case when state='accepted' then 'cancelled' else 'expired' end,
    responded_at=coalesce(responded_at,v_now) where booking_id=p_booking_id and state in ('offered','accepted');
  update public.integration_outbox set status='cancelled'
    where source_table='bookings' and source_id=p_booking_id
      and event_type='payment_confirmed_assignment_search' and status in ('queued','needs_approval');
  if v_refund_cents > 0 then
    insert into public.refund_requests(booking_id,payment_record_id,user_id,amount,currency,reason,requested_by)
      values(p_booking_id,v_payment.id,v_booking.user_id,v_refund_cents/100.0,'ZAR',v_refund_reason,p_actor_id) returning id into v_refund_id;
    insert into public.admin_review_queue(queue_type,subject_table,subject_id,user_id,xooter_id,booking_id,priority,summary)
      values('payment','refund_requests',v_refund_id,v_booking.user_id,v_booking.xooter_id,p_booking_id,'normal',
        'Refund review queued for cancelled booking ('||v_refund_reason||')');
  end if;
  insert into public.booking_status_events(booking_id,actor_id,status,label,meta)
    values(p_booking_id,p_actor_id,'cancelled','Booking cancelled',jsonb_build_object('previous_status',v_booking.status,
      'refund_cents',v_refund_cents,'refund_reason',v_refund_reason,'refund_request_id',v_refund_id));
  insert into public.notifications(user_id,kind,title,body,link)
    values(v_booking.user_id,'booking_cancelled','Booking cancelled',case when v_refund_cents>0
      then 'Your booking was cancelled and a refund review has been queued.'
      else 'Your booking was cancelled. Support will review any follow-up if needed.' end,'/app/bookings/'||p_booking_id);
  if v_booking.xooter_id is not null then
    select user_id into v_worker_user from public.xooters where id=v_booking.xooter_id;
    if v_worker_user is not null then
      insert into public.notifications(user_id,kind,title,body,link) values(v_worker_user,'booking_cancelled','Booking cancelled',
        'A booking assigned to you has been cancelled and removed from your active jobs.','/xooter/jobs');
    end if;
  end if;
  insert into public.admin_audit_log(admin_id,action,target_table,target_id,changes,reason)
    values(p_actor_id,'cancel_booking','bookings',p_booking_id,jsonb_build_object('from',v_booking.status,'to','cancelled',
      'payment_record_id',v_payment.id,'refund_cents',v_refund_cents,'refund_request_id',v_refund_id),trim(p_reason));
  insert into private.booking_cancellations(booking_id,payment_record_id,user_id,cancelled_by,payment_status,refund_cents,refund_reason,refund_request_id,created_at)
    values(p_booking_id,v_payment.id,v_booking.user_id,p_actor_id,v_payment.status,v_refund_cents,v_refund_reason,v_refund_id,v_now);
  return jsonb_build_object('booking_id',p_booking_id,'status','cancelled','idempotent',false,
    'refund',jsonb_build_object('eligible',v_refund_cents>0,'amount',v_refund_cents/100.0,'reason',v_refund_reason),'refund_request_id',v_refund_id);
end;
$$;
revoke all on function private.cancel_booking_atomically(uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function private.cancel_booking_atomically(uuid,uuid,text,uuid) to service_role;
create function public.cancel_booking_atomically(p_booking_id uuid,p_actor_id uuid,p_reason text,p_admin_session_id uuid)
  returns jsonb language sql security invoker set search_path = '' as $$
  select private.cancel_booking_atomically(p_booking_id,p_actor_id,p_reason,p_admin_session_id);
$$;
revoke all on function public.cancel_booking_atomically(uuid,uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.cancel_booking_atomically(uuid,uuid,text,uuid) to service_role;
notify pgrst, 'reload schema';
$xoot_body_20261028125915$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261028125915','atomic_booking_cancellation',array[v_sql]);
  end if;
  -- 20261029003043_airbnb_office_crew_quote_policy.sql; original SHA256 8797e41013e5a19f4016623804db882d86101f3667f3655275e3e12f263e1225
  if not exists (select from supabase_migrations.schema_migrations where version='20261029003043') then
    v_sql := $xoot_body_20261029003043$-- ZD-039 forward policy update: only Airbnb and office may have more than one Xooter.
-- Pure calculator for the later locked booking transaction. No booking writes or enablement.
-- p_input is the canonical output of parseBookingQuoteInput, not a raw client payload.
-- p_facts must be loaded by the future transaction under its account/eligibility locks.
-- This function neither proves identity/eligibility nor checks future time against a clock.
-- Its caller must do those checks and compare the full returned quote before writing.
-- Mirror booking-zd039-v1 in _shared/booking-quote.ts; differential tests pin the complete JSON.
create schema if not exists private;

create or replace function private.calculate_booking_quote_v1(p_input jsonb, p_facts jsonb)
returns jsonb
language plpgsql immutable security invoker
set search_path = ''
as $function$
declare
  requested_service text;
  actual_service text;
  property_type text;
  home_size text;
  hours numeric;
  crew integer;
  crew_cap integer;
  overhead double precision;
  solo_base_cents bigint;
  base_cents bigint;
  addons_cents bigint;
  linen_cents bigint;
  work_cents bigint;
  high_demand_cents bigint;
  fee_cents bigint;
  cover_cents bigint;
  care_discount_cents bigint;
  referral_discount_cents bigint := 0;
  credit_cents bigint;
  before_credit_cents bigint;
  solo_hours double precision;
  elapsed_hours double precision;
  member boolean;
  cover_available boolean;
  referral_status text := 'not_requested';
  referral_code text;
  correction jsonb := 'null'::jsonb;
  lines jsonb;
  item jsonb;
  key text;
  parsed_date date;
  date_parts text[];
  start_minutes integer;
  sorted_addons jsonb;
  sorted_days jsonb;
  labels constant jsonb := '{
    "inside_fridge":"Inside fridge", "inside_oven":"Inside oven", "inside_cabinets":"Inside cabinets",
    "interior_windows":"Interior windows", "interior_walls":"Interior walls", "water_plants":"Water plants",
    "ironing":"Ironing", "laundry":"Laundry", "small_flatlet":"Small flatlet",
    "balcony_patio":"Balcony/patio", "clean_windows":"Clean windows", "clean_appliances":"Clean appliances",
    "wipe_furniture":"Wipe furniture", "unpack_boxes":"Unpack boxes", "pack_boxes":"Pack boxes",
    "restock_supplies":"Restock supplies", "restock_toiletries":"Restock toiletries"}';
  ladders constant jsonb := '{
    "regular":{"3.5":236,"4":250,"4.5":266,"5":280,"5.5":296,"6":310,"6.5":326,"7":340,"7.5":356,"8":376,"8.5":400,"9":423,"9.5":447,"10":470},
    "office":{"2":324,"2.5":324,"3":324,"3.5":374,"4":424,"4.5":442,"5":452,"5.5":476,"6":504,"6.5":518,"7":540,"7.5":558,"8":592,"8.5":618,"9":638,"9.5":646,"10":660},
    "express":{"1":220,"1.5":220,"2":220,"2.5":220,"3":220},
    "airbnb":{"3":304,"3.5":304,"4":304,"4.5":318,"5":324,"5.5":342,"6":362,"6.5":362,"7":372,"7.5":400,"8":426},
    "moving":{"4.5":320,"5":330,"5.5":344,"6":364,"6.5":376,"7":390,"7.5":404,"8":430,"8.5":448,"9":462,"9.5":468,"10":478}}';
begin
  -- Reject missing, additional and wrongly typed canonical fields rather than allowing
  -- casts/defaults to silently manufacture a quote from a malformed internal call.
  if jsonb_typeof(p_input) is distinct from 'object'
    or jsonb_typeof(p_facts) is distinct from 'object'
    or (select array_agg(k order by k collate "C") from jsonb_object_keys(p_input) k) is distinct from
       array['addOns','contractVersion','coverRequested','crewSize','date','frequency','homeSize','hours','linen','propertyType','referralCode','repeatDays','requestedCreditCents','service','time']::text[]
    or p_input->'contractVersion' is distinct from '1'::jsonb
  then raise exception 'invalid canonical booking input' using errcode = '22023'; end if;

  foreach key in array array['service','propertyType','homeSize','date','time','frequency','referralCode'] loop
    if jsonb_typeof(p_input->key) is distinct from 'string' then
      raise exception 'invalid canonical booking field: %', key using errcode = '22023';
    end if;
  end loop;
  foreach key in array array['hours','crewSize','requestedCreditCents'] loop
    if jsonb_typeof(p_input->key) is distinct from 'number' then
      raise exception 'invalid canonical booking field: %', key using errcode = '22023';
    end if;
  end loop;
  if jsonb_typeof(p_input->'coverRequested') is distinct from 'boolean'
    or jsonb_typeof(p_input->'addOns') is distinct from 'array'
    or jsonb_typeof(p_input->'repeatDays') is distinct from 'array'
  then raise exception 'invalid canonical booking collections or cover' using errcode = '22023'; end if;

  requested_service := p_input->>'service';
  property_type := p_input->>'propertyType';
  home_size := p_input->>'homeSize';
  hours := (p_input->>'hours')::numeric;
  if requested_service not in ('regular','express','airbnb','office','moving')
    or property_type not in ('flat','house','townhouse','airbnb','office','empty')
    or home_size not in ('small','medium','large')
    or hours < 1 or hours > 10 or hours * 2 <> trunc(hours * 2)
    or (p_input->>'crewSize')::numeric not between 1 and 4
    or (p_input->>'crewSize')::numeric <> trunc((p_input->>'crewSize')::numeric)
    or (p_input->>'requestedCreditCents')::numeric not between 0 and 100000000
    or (p_input->>'requestedCreditCents')::numeric <> trunc((p_input->>'requestedCreditCents')::numeric)
  then raise exception 'invalid canonical booking values' using errcode = '22023'; end if;
  crew := (p_input->>'crewSize')::numeric::integer;
  actual_service := case property_type when 'office' then 'office' when 'airbnb' then 'airbnb'
    when 'empty' then 'moving' else requested_service end;
  if property_type in ('flat','house','townhouse') and requested_service not in ('regular','express') then
    raise exception 'incompatible property and service' using errcode = '22023';
  end if;
  if actual_service <> requested_service then
    if hours <> (case actual_service when 'office' then 5 when 'airbnb' then 4 when 'moving' then 8 end) then
      raise exception 'service correction hours are not normalized' using errcode = '22023';
    end if;
    correction := jsonb_build_object('from', requested_service, 'to', actual_service, 'reason',
      property_type || ' properties use ' || actual_service || ' cleaning; hours were reset to the ' || actual_service || ' default');
  end if;
  crew_cap := case when actual_service in ('airbnb','office') then
    greatest(case home_size when 'small' then 2 when 'medium' then 3 else 4 end,
      case actual_service when 'airbnb' then 3 when 'office' then 4 end)
    else 1 end;
  if crew > crew_cap then raise exception 'crew exceeds service and size cap' using errcode = '22023'; end if;
  -- trim_scale matches String(hours) even when a JSON number was serialized as 4.0.
  solo_base_cents := (ladders->actual_service->>trim_scale(hours)::text)::bigint * 100;
  if solo_base_cents is null then raise exception 'hours are not on service ladder' using errcode = '22023'; end if;

  if jsonb_array_length(p_input->'addOns') > 17 then
    raise exception 'too many booking extras' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_input->'addOns') loop
    key := item #>> '{}';
    if jsonb_typeof(item) is distinct from 'string' or not (labels ? key) or not (
      (key in ('inside_fridge','inside_oven','inside_cabinets','interior_windows','interior_walls','water_plants','ironing','laundry') and actual_service in ('regular','express'))
      or (key = 'small_flatlet' and actual_service = 'regular')
      or (key in ('balcony_patio','clean_windows','wipe_furniture','unpack_boxes','pack_boxes') and actual_service = 'moving')
      or (key = 'clean_appliances' and actual_service in ('moving','airbnb'))
      or (key in ('restock_supplies','restock_toiletries') and actual_service = 'airbnb')
    ) then raise exception 'invalid service extra' using errcode = '22023'; end if;
  end loop;
  select coalesce(jsonb_agg(value order by value collate "C"), '[]'::jsonb) into sorted_addons
    from (select distinct value from jsonb_array_elements_text(p_input->'addOns')) extras;
  if sorted_addons is distinct from p_input->'addOns' then
    raise exception 'booking extras are not canonical' using errcode = '22023';
  end if;
  if actual_service = 'airbnb' then
    if jsonb_typeof(p_input->'linen') is distinct from 'string'
      or p_input->>'linen' not in ('none','replace','wash_hang','wash_dry_repack')
      or (p_input->>'linen' = 'wash_dry_repack' and hours < 5)
    then raise exception 'invalid Airbnb linen choice' using errcode = '22023'; end if;
  elsif p_input->'linen' is distinct from 'null'::jsonb then
    raise exception 'linen requires Airbnb service' using errcode = '22023';
  end if;

  if jsonb_typeof(p_facts->'buyerId') is distinct from 'string' or p_facts->>'buyerId' = '' then
    raise exception 'buyer identity required' using errcode = '22023';
  end if;
  foreach key in array array['carePlusMember','hasPriorRedemption','coverAvailable'] loop
    if jsonb_typeof(p_facts->key) is distinct from 'boolean' then
      raise exception 'invalid verified fact: %', key using errcode = '22023';
    end if;
  end loop;
  foreach key in array array['availableCreditCents','completedBookingCount'] loop
    if jsonb_typeof(p_facts->key) is distinct from 'number' then
      raise exception 'invalid verified fact: %', key using errcode = '22023';
    end if;
    if (p_facts->>key)::numeric not between 0 and 9007199254740991
      or (p_facts->>key)::numeric <> trunc((p_facts->>key)::numeric)
    then raise exception 'invalid verified fact: %', key using errcode = '22023'; end if;
  end loop;
  if p_facts->'referralRecord' is distinct from 'null'::jsonb then
    if jsonb_typeof(p_facts->'referralRecord') is distinct from 'object'
      or jsonb_typeof(p_facts->'referralRecord'->'code') is distinct from 'string'
      or jsonb_typeof(p_facts->'referralRecord'->'userId') is distinct from 'string'
      or p_facts->'referralRecord'->>'userId' = ''
    then raise exception 'invalid referral fact' using errcode = '22023'; end if;
  end if;
  member := (p_facts->>'carePlusMember')::boolean;
  cover_available := (p_facts->>'coverAvailable')::boolean;
  if (p_input->>'coverRequested')::boolean and not cover_available then
    raise exception 'Booking cover is unavailable' using errcode = '22023';
  end if;
  referral_code := p_input->>'referralCode';
  if referral_code <> '' and referral_code !~ '^[A-Z0-9_-]{4,32}$' then
    raise exception 'referral code is not normalized' using errcode = '22023';
  end if;

  -- Deliberately use IEEE doubles and floor(x + .5) in the same operation order as
  -- positive JS Math.round. Decimal numeric/round(float8) changes boundary results.
  overhead := (array[1,1.15,1.25,1.4]::double precision[])[crew];
  base_cents := floor((solo_base_cents::double precision / 100) * overhead + 0.5)::bigint * 100;
  linen_cents := case when p_input->>'linen' = 'wash_dry_repack' then 2000 else 0 end;
  addons_cents := jsonb_array_length(p_input->'addOns') * 3000 + linen_cents;
  work_cents := base_cents + addons_cents;
  solo_hours := hours::double precision + jsonb_array_length(p_input->'addOns');
  elapsed_hours := case when crew = 1 then solo_hours
    else greatest(1.5, floor((solo_hours * overhead / crew) * 2 + 0.5) / 2) end;

  -- Validate the static canonical schedule, but leave future-time and availability
  -- checks to the caller's transaction timestamp. This pure function never reads now().
  if p_input->>'date' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid booking date' using errcode = '22023';
  end if;
  date_parts := string_to_array(p_input->>'date', '-');
  if date_parts[1]::integer not between 2020 and 2100 then
    raise exception 'invalid booking year' using errcode = '22023';
  end if;
  parsed_date := make_date(date_parts[1]::integer,date_parts[2]::integer,date_parts[3]::integer);
  if p_input->>'time' !~ '^(0[7-9]|1[0-7]):(00|30)$' or p_input->>'time' = '17:30'
    or (actual_service = 'airbnb' and p_input->>'time' > '14:00')
  then raise exception 'invalid booking start' using errcode = '22023'; end if;
  start_minutes := split_part(p_input->>'time', ':', 1)::integer * 60 + split_part(p_input->>'time', ':', 2)::integer;
  if start_minutes + elapsed_hours * 60 > 17 * 60 then
    raise exception 'visit must finish by 17:00' using errcode = '22023';
  end if;
  if p_input->>'frequency' not in ('once','weekly','fortnightly') or jsonb_array_length(p_input->'repeatDays') > 7 then
    raise exception 'invalid booking frequency' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(p_input->'repeatDays') loop
    if jsonb_typeof(item) is distinct from 'number' then
      raise exception 'invalid repeat day' using errcode = '22023';
    end if;
    if item::numeric not between 0 and 6 or item::numeric <> trunc(item::numeric) then
      raise exception 'invalid repeat day' using errcode = '22023';
    end if;
  end loop;
  select coalesce(jsonb_agg(day order by day), '[]'::jsonb) into sorted_days
    from (select distinct value::integer as day from jsonb_array_elements(p_input->'repeatDays')) days;
  if sorted_days is distinct from p_input->'repeatDays'
    or (p_input->>'frequency' = 'once' and sorted_days <> '[]'::jsonb)
    or (p_input->>'frequency' <> 'once' and not (sorted_days @> jsonb_build_array(extract(dow from parsed_date)::integer)))
  then raise exception 'repeat days are not canonical' using errcode = '22023'; end if;

  high_demand_cents := case when p_input->>'time' >= '16:00'
    then floor((work_cents::double precision / 100) * 0.15 + 0.5)::bigint * 100 else 0 end;
  fee_cents := case when member then 0 else 3900 end;
  cover_cents := case when (p_input->>'coverRequested')::boolean then 2200 else 0 end;
  care_discount_cents := case when member
    then floor((work_cents::double precision / 100) * 0.1 + 0.5)::bigint * 100 else 0 end;
  if referral_code <> '' then
    referral_status := case
      when p_facts->'referralRecord'->>'code' is distinct from referral_code then 'unknown_code'
      when p_facts->'referralRecord'->>'userId' = p_facts->>'buyerId' then 'own_code'
      when (p_facts->>'hasPriorRedemption')::boolean then 'already_used'
      when (p_facts->>'completedBookingCount')::numeric > 0 then 'not_a_first_booking'
      else 'eligible' end;
    if referral_status = 'eligible' then referral_discount_cents := least(10000, work_cents); end if;
  end if;
  before_credit_cents := work_cents + high_demand_cents + fee_cents + cover_cents - care_discount_cents - referral_discount_cents;
  credit_cents := least((p_input->>'requestedCreditCents')::numeric::bigint,
    (p_facts->>'availableCreditCents')::numeric::bigint, greatest(0, before_credit_cents - 5000));

  lines := jsonb_build_array(jsonb_build_object('id','base','label',
    upper(left(actual_service,1)) || substr(actual_service,2) || ' cleaning','amountCents',base_cents));
  for key in select value from jsonb_array_elements_text(p_input->'addOns') loop
    lines := lines || jsonb_build_array(jsonb_build_object('id','add_on_' || key,'label',labels->>key,'amountCents',3000));
  end loop;
  if linen_cents > 0 then
    lines := lines || jsonb_build_array(jsonb_build_object('id','linen','label','Wash, dry and repack linen','amountCents',linen_cents));
  end if;
  lines := lines || jsonb_build_array(
    jsonb_build_object('id','high_demand','label','High-demand start','amountCents',high_demand_cents),
    jsonb_build_object('id','booking_fee','label','Booking fee','amountCents',fee_cents),
    jsonb_build_object('id','cover','label','Booking cover','amountCents',cover_cents),
    jsonb_build_object('id','care_plus','label','Care+ discount','amountCents',-care_discount_cents),
    jsonb_build_object('id','referral','label','Referral discount','amountCents',-referral_discount_cents),
    jsonb_build_object('id','credit','label','Xoot credit','amountCents',-credit_cents));
  return jsonb_build_object(
    'contractVersion',1,'pricingVersion','booking-zd039-v1','currency','ZAR','input',p_input,
    'requestedService',requested_service,'service',actual_service,'serviceCorrection',correction,
    'crewSize',crew,'soloHours',solo_hours,'estimatedDurationHours',elapsed_hours,'lines',lines,
    'baseCents',base_cents,'addOnsCents',addons_cents,'highDemandCents',high_demand_cents,
    'bookingFeeCents',fee_cents,'coverCents',cover_cents,'carePlusDiscountCents',care_discount_cents,
    'referralDiscountCents',referral_discount_cents,'creditUsedCents',credit_cents,
    'totalCents',before_credit_cents-credit_cents,
    'referral',jsonb_build_object('code',referral_code,'status',referral_status),
    'carePlusMember',member,'coverAvailable',cover_available);
end;
$function$;

revoke all on function private.calculate_booking_quote_v1(jsonb,jsonb) from public, anon, authenticated;
grant usage on schema private to service_role;
grant execute on function private.calculate_booking_quote_v1(jsonb,jsonb) to service_role;
comment on function private.calculate_booking_quote_v1(jsonb,jsonb) is
  'Pure booking-zd039-v1 calculator for canonical parsed input and independently verified facts. '
  'Service only; no fact reads, identity proof, time-of-use checks, writes or submission enablement. '
  'The future locked transaction must load facts, recheck future start/availability and compare the full quote.';
$xoot_body_20261029003043$;
    execute v_sql;
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261029003043','airbnb_office_crew_quote_policy',array[v_sql]);
  end if;
  -- 20261029111657_checklist_select_only_acl.sql; original SHA256 d1fff4677fda18440c9a14adae8a8b1cffc8282d3183967fd795febbdb4843e7
  if not exists (select from supabase_migrations.schema_migrations where version='20261029111657') then
    v_sql := $xoot_body_20261029111657$-- Supabase defaults may grant TRUNCATE, REFERENCES and TRIGGER as well as DML.
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
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261029111657','checklist_select_only_acl',array[v_sql]);
  end if;
  -- 20261029112730_protect_authenticated_coverage_allowance.sql; original SHA256 bd428375247172aac90a4d5f164bfb6ab8e054a9caae7efbef9eee4abe29062a
  if not exists (select from supabase_migrations.schema_migrations where version='20261029112730') then
    v_sql := $xoot_body_20261029112730$-- Separate trust boundaries within the EXISTING finite Permanent Geocoding cap.
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
    -- Record only SQL that has JUST executed in this SAME transaction.
    insert into supabase_migrations.schema_migrations(version,name,statements)
      values('20261029112730','protect_authenticated_coverage_allowance',array[v_sql]);
  end if;
end;
$xoot_convergence$;
