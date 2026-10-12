-- Disabled creation foundation. Selected rosters fail closed until an approved
-- unpaid reservation/release policy exists. No dispatch offers or external I/O.
begin;

alter table public.bookings
  add column contract_version smallint,
  add column pricing_version text,
  add column request_key uuid,
  add column definition jsonb,
  add column accepted_quote jsonb,
  add column total_cents bigint,
  add column solo_hours numeric(4,1),
  add column primary_payment_record_id uuid references public.payment_records(id) deferrable initially deferred;
create unique index bookings_reviewed_request_key on public.bookings(user_id,request_key)
  where contract_version is not null;
alter table public.bookings add constraint bookings_reviewed_contract check (
  contract_version is null or (contract_version=1 and pricing_version is not null and request_key is not null
    and definition is not null and accepted_quote is not null and total_cents >= 0
    and total_cents is not null and solo_hours > 0 and solo_hours is not null
    and primary_payment_record_id is not null and crew_elapsed_hours is not null
    and xooter_id is null and original_xooter_id is null and commission_rate_bps is null
    and jsonb_typeof(definition)='object' and jsonb_typeof(accepted_quote)='object'
    and accepted_quote->>'pricingVersion' is not null and accepted_quote->>'pricingVersion'=pricing_version
    and accepted_quote->>'totalCents' is not null and (accepted_quote->>'totalCents')::bigint=total_cents));

-- Empty slots have allocation identity, never a fictitious assignment/worker.
create table public.booking_crew_slots (
  booking_id uuid not null references public.bookings(id) on delete cascade,
  slot_no smallint not null check(slot_no between 1 and 4),
  gross_cents bigint not null check(gross_cents >= 0),
  allocation_version smallint not null check(allocation_version=1),
  primary key(booking_id,slot_no)
);
alter table public.booking_crew_slots enable row level security;
revoke all on public.booking_crew_slots from public,anon,authenticated,service_role;
grant select,insert on public.booking_crew_slots to service_role;
create policy booking_crew_slots_service on public.booking_crew_slots for all to service_role using(true) with check(true);

alter table public.payment_records add column booking_contract_version smallint
  check(booking_contract_version is null or booking_contract_version=1);
create unique index payment_records_reviewed_obligation on public.payment_records(booking_id)
  where booking_contract_version=1;
alter table public.xootcred_ledger add column booking_operation_key text;
create unique index xootcred_booking_operation on public.xootcred_ledger(booking_operation_key)
  where booking_operation_key is not null;
alter table public.recurring_schedules
  add column source_booking_id uuid references public.bookings(id),
  add column repeat_days smallint[];
create unique index recurring_schedules_source_booking on public.recurring_schedules(source_booking_id)
  where source_booking_id is not null;

create table private.booking_creation_attempts (
  user_id uuid not null,
  request_key uuid not null,
  definition jsonb not null,
  accepted_quote jsonb not null,
  confirmed_service text not null,
  booking_id uuid not null unique references public.bookings(id),
  payment_record_id uuid not null unique references public.payment_records(id),
  result jsonb not null,
  primary key(user_id,request_key)
);
alter table private.booking_creation_attempts enable row level security;
revoke all on private.booking_creation_attempts from public,anon,authenticated,service_role;
grant select,insert on private.booking_creation_attempts to service_role;
create policy booking_creation_attempts_service on private.booking_creation_attempts
  for all to service_role using(true) with check(true);

create function private.booking_slot_gross_v1(p_work_cents bigint,p_crew integer,p_slot integer)
returns bigint language plpgsql immutable security invoker set search_path='' as $$
begin
  if p_work_cents is null or p_work_cents < 0 or p_crew is null or p_crew not between 1 and 4
    or p_slot is null or p_slot not between 1 and p_crew then
    raise exception 'Invalid crew allocation' using errcode='22023';
  end if;
  return p_work_cents / p_crew + case when p_slot <= p_work_cents % p_crew then 1 else 0 end;
end;
$$;
revoke all on function private.booking_slot_gross_v1(bigint,integer,integer) from public,anon,authenticated,service_role;
grant execute on function private.booking_slot_gross_v1(bigint,integer,integer) to service_role;

create function private.guard_booking_slot_insert() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id=new.booking_id;
  if not found or v_booking.contract_version is distinct from 1 or new.slot_no>v_booking.crew_size
    or new.gross_cents<>private.booking_slot_gross_v1(
      (v_booking.accepted_quote->>'baseCents')::bigint+(v_booking.accepted_quote->>'addOnsCents')::bigint,
      v_booking.crew_size,new.slot_no) then
    raise exception 'Slot must match accepted fixed allocation' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_booking_slot_insert() from public,anon,authenticated,service_role;
create trigger booking_slot_insert_guard before insert on public.booking_crew_slots
  for each row execute function private.guard_booking_slot_insert();

-- Account guards alone cannot protect an absent code or a code transferred to
-- a new owner. Mutators first pass the existing a00 sorted account guard, then
-- serialize old/new code identities. Writers do accounts -> code in that order.
-- Legacy source-row-first updates may deadlock: retry the WHOLE transaction.
create table private.booking_referral_code_guards (
  code text primary key,
  version bigint not null default 1 check(version>0)
);
alter table private.booking_referral_code_guards enable row level security;
revoke all on private.booking_referral_code_guards from public,anon,authenticated,service_role;
grant select,insert,update on private.booking_referral_code_guards to service_role;
create policy booking_referral_code_guards_service on private.booking_referral_code_guards
  for all to service_role using(true) with check(true);
create function private.lock_booking_referral_codes(p_codes text[]) returns void
language plpgsql volatile security invoker set search_path='' as $$
declare v_code text;
begin
  for v_code in select distinct code collate "C" as sorted_code from pg_catalog.unnest(p_codes) code
    where code is not null and code<>'' order by sorted_code loop
    -- A real version change also rejects an obsolete higher-isolation snapshot.
    insert into private.booking_referral_code_guards as guards(code) values(v_code)
      on conflict(code) do update set version=guards.version+1;
  end loop;
end;
$$;
revoke all on function private.lock_booking_referral_codes(text[]) from public,anon,authenticated,service_role;
grant execute on function private.lock_booking_referral_codes(text[]) to service_role;
create function private.guard_booking_referral_code() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_codes text[]:='{}'::text[];
begin
  if tg_table_schema<>'public' or tg_table_name<>'referrals' or tg_when<>'BEFORE' or tg_level<>'ROW'
    or tg_op not in ('INSERT','UPDATE','DELETE') then
    raise exception 'Unsupported referral code guard context' using errcode='42501';
  end if;
  if tg_op<>'INSERT' then v_codes:=v_codes||old.code; end if;
  if tg_op<>'DELETE' then v_codes:=v_codes||new.code; end if;
  perform private.lock_booking_referral_codes(v_codes);
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_booking_referral_code() from public,anon,authenticated,service_role;
create trigger a10_booking_referral_code_guard before insert or update or delete on public.referrals
  for each row execute function private.guard_booking_referral_code();

-- Caller MUST hold complete sorted account guards; this helper does not acquire
-- source locks or authorize a quote supplied by a browser.
create function private.booking_quote_facts_v1(p_user_id uuid,p_code text,p_at timestamptz)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare v_credit numeric; v_referral jsonb;
begin
  if p_user_id is null or p_at is null then raise exception 'Verified buyer and clock required' using errcode='22023'; end if;
  if (select count(*) from public.user_subscriptions s where s.user_id=p_user_id and s.status='active')>1 then
    raise exception 'Ambiguous active membership' using errcode='23514';
  end if;
  if exists(select 1 from public.xootcred_ledger l where l.user_id=p_user_id
    and l.status in ('available','redeemed') and (l.expires_at is null or l.expires_at>p_at)
    and (l.direction='debit' or (l.direction='credit' and l.status='available'))
    and (l.amount<0 or l.amount in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric))) then
    raise exception 'Invalid active XootCred amount' using errcode='23514';
  end if;
  select greatest(0,coalesce(sum(case
    when l.direction='credit' and l.status='available' then l.amount
    when l.direction='debit' then -l.amount else 0 end),0)*100)
    into v_credit from public.xootcred_ledger l where l.user_id=p_user_id
      and l.status in ('available','redeemed') and (l.expires_at is null or l.expires_at>p_at);
  if v_credit<>trunc(v_credit) or v_credit>9007199254740991 then
    raise exception 'Invalid credit balance' using errcode='23514';
  end if;
  select jsonb_build_object('code',r.code,'userId',r.user_id) into v_referral
    from public.referrals r where r.code=p_code and p_code<>'';
  return jsonb_build_object('buyerId',p_user_id,'carePlusMember',exists(
    select 1 from public.user_subscriptions s where s.user_id=p_user_id and s.status='active'
      and (s.next_billing_at is null or s.next_billing_at>p_at)),
    'availableCreditCents',v_credit,'referralRecord',v_referral,
    'completedBookingCount',(select count(*) from public.bookings b where b.user_id=p_user_id and b.completed_at is not null),
    'hasPriorRedemption',exists(select 1 from public.referral_redemptions r where r.referred_user_id=p_user_id),
    'coverAvailable',false);
end;
$$;
revoke all on function private.booking_quote_facts_v1(uuid,text,timestamptz) from public,anon,authenticated,service_role;
grant execute on function private.booking_quote_facts_v1(uuid,text,timestamptz) to service_role;

create function private.guard_reviewed_booking_contract() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.contract_version is not null and (
    row(new.contract_version,new.pricing_version,new.request_key,new.definition,new.accepted_quote,new.total_cents,
      new.solo_hours,new.primary_payment_record_id,new.crew_size,new.crew_elapsed_hours,new.duration_hours,
      new.user_id,new.price,new.service_fee,new.booking_cover_amount,new.high_demand_premium,new.xooter_id,
      new.original_xooter_id,new.commission_rate_bps,new.scheduled_at,new.service_type,new.address,
      new.household_profile_id,new.property_account_id,new.frequency,new.notes)
    is distinct from
    row(old.contract_version,old.pricing_version,old.request_key,old.definition,old.accepted_quote,old.total_cents,
      old.solo_hours,old.primary_payment_record_id,old.crew_size,old.crew_elapsed_hours,old.duration_hours,
      old.user_id,old.price,old.service_fee,old.booking_cover_amount,old.high_demand_premium,old.xooter_id,
      old.original_xooter_id,old.commission_rate_bps,old.scheduled_at,old.service_type,old.address,
      old.household_profile_id,old.property_account_id,old.frequency,old.notes)) then
    raise exception 'Reviewed booking acceptance is immutable' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_reviewed_booking_contract() from public,anon,authenticated,service_role;
create trigger reviewed_booking_contract_immutable before update on public.bookings
  for each row execute function private.guard_reviewed_booking_contract();

create function private.guard_reviewed_payment_obligation() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.booking_contract_version=1 and (tg_op='DELETE' or
    row(new.id,new.user_id,new.booking_id,new.amount,new.currency,new.payment_kind,new.booking_contract_version)
    is distinct from row(old.id,old.user_id,old.booking_id,old.amount,old.currency,old.payment_kind,old.booking_contract_version)) then
    raise exception 'Reviewed payment obligation is immutable' using errcode='23514';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function private.guard_reviewed_payment_obligation() from public,anon,authenticated,service_role;
create trigger reviewed_payment_obligation_immutable before update or delete on public.payment_records
  for each row execute function private.guard_reviewed_payment_obligation();

create function private.check_reviewed_booking_complete() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id=new.id;
  if v_booking.contract_version is null then return null; end if;
  if not exists(select 1 from public.payment_records p where p.id=v_booking.primary_payment_record_id
    and p.booking_id=v_booking.id and p.user_id=v_booking.user_id and p.booking_contract_version=1
    and p.payment_kind='booking' and p.currency='ZAR' and p.amount*100=v_booking.total_cents)
    or (select count(*) from public.booking_crew_slots s where s.booking_id=v_booking.id)<>v_booking.crew_size
    or exists(select 1 from public.booking_crew_slots s where s.booking_id=v_booking.id and
      (s.slot_no>v_booking.crew_size or s.gross_cents<>private.booking_slot_gross_v1(
        (v_booking.accepted_quote->>'baseCents')::bigint+(v_booking.accepted_quote->>'addOnsCents')::bigint,
        v_booking.crew_size,s.slot_no))) then
    raise exception 'Reviewed booking lacks singular payment or fixed allocations' using errcode='23514';
  end if;
  return null;
end;
$$;
revoke all on function private.check_reviewed_booking_complete() from public,anon,authenticated,service_role;
create constraint trigger reviewed_booking_complete after insert on public.bookings deferrable initially deferred
  for each row execute function private.check_reviewed_booking_complete();

create function public.create_reviewed_booking(p_user_id uuid,p_request_key uuid,p_definition jsonb,
  p_accepted_quote jsonb,p_confirmed_service text) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare
  v_attempt private.booking_creation_attempts%rowtype;
  v_input jsonb; v_booking jsonb; v_quote jsonb; v_facts jsonb; v_result jsonb;
  v_referrer uuid; v_current_referrer uuid; v_at timestamptz; v_scheduled timestamptz;
  v_booking_id uuid:=pg_catalog.gen_random_uuid(); v_payment_id uuid:=pg_catalog.gen_random_uuid();
  v_household uuid; v_property uuid; v_ids uuid[]; v_crew integer; v_work bigint;
  v_region text; v_slot integer;
  -- ECMAScript whitespace and UTF-16 limits from the reviewed strict parser.
  v_space constant text:=U&'[\0009-\000D\0020\00A0\1680\2000-\200A\2028\2029\202F\205F\3000\FEFF]';
begin
  -- Privileges, not caller-controlled JWT metadata, define this boundary.
  if p_user_id is null or p_request_key is null then raise exception 'Verified buyer and request key required' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_user_id::text||':'||p_request_key::text,0));
  select * into v_attempt from private.booking_creation_attempts a where a.user_id=p_user_id and a.request_key=p_request_key;
  if found then
    if v_attempt.definition is distinct from p_definition or v_attempt.accepted_quote is distinct from p_accepted_quote
      or v_attempt.confirmed_service is distinct from p_confirmed_service then
      return jsonb_build_object('status','request_key_reused');
    end if;
    return v_attempt.result||jsonb_build_object('status','replayed');
  end if;
  if jsonb_typeof(p_definition) is distinct from 'object'
    or (select array_agg(k order by k collate "C") from jsonb_object_keys(p_definition) k) is distinct from array['booking','input']::text[]
    or jsonb_typeof(p_definition->'booking') is distinct from 'object' then
    raise exception 'Invalid normalized definition' using errcode='22023';
  end if;
  v_input:=p_definition->'input'; v_booking:=p_definition->'booking';
  if (select array_agg(k order by k collate "C") from jsonb_object_keys(v_booking) k) is distinct from
    array['address','householdProfileId','instructions','propertyAccountId','selectedXooterIds']::text[]
    or jsonb_typeof(v_booking->'selectedXooterIds') is distinct from 'array'
    or jsonb_typeof(v_booking->'address') is distinct from 'string'
    or jsonb_typeof(v_booking->'instructions') is distinct from 'string'
    or length(v_booking->>'address') not between 1 and 240
    or length(v_booking->>'address')+length(regexp_replace(v_booking->>'address',U&'[\0001-\FFFF]','','g'))>240
    or length(v_booking->>'instructions')+length(regexp_replace(v_booking->>'instructions',U&'[\0001-\FFFF]','','g'))>1200
    or v_booking->>'address'<>btrim(regexp_replace(v_booking->>'address',v_space||'+',' ','g'))
    or v_booking->>'instructions'<>regexp_replace(v_booking->>'instructions','^'||v_space||'+|'||v_space||'+$','','g')
    or position(E'\r' in v_booking->>'instructions')>0
    or ((v_booking->>'address')||(v_booking->>'instructions'))~E'[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]' then
    raise exception 'Invalid normalized booking details' using errcode='22023';
  end if;
  foreach v_region in array array['householdProfileId','propertyAccountId'] loop
    if v_booking->v_region is distinct from 'null'::jsonb and
      (jsonb_typeof(v_booking->v_region) is distinct from 'string' or v_booking->>v_region !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
      raise exception 'Invalid owned profile identity' using errcode='22023';
    end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(v_booking->'selectedXooterIds') j where jsonb_typeof(j)<>'string'
    or j#>>'{}' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
    raise exception 'Invalid selected worker identity' using errcode='22023';
  end if;
  select coalesce(array_agg(id order by id),'{}'::uuid[]) into v_ids
    from (select (j#>>'{}')::uuid id from jsonb_array_elements(v_booking->'selectedXooterIds') j) ids;
  if cardinality(v_ids)<>(select count(distinct id) from pg_catalog.unnest(v_ids) id)
    or to_jsonb(v_ids) is distinct from v_booking->'selectedXooterIds' then
    raise exception 'Worker roster must be unique and sorted' using errcode='22023';
  end if;
  -- Discover the WHOLE account set before acquiring benefit or worker/source locks.
  select r.user_id into v_referrer from public.referrals r where r.code=v_input->>'referralCode';
  perform private.lock_booking_accounts(array[p_user_id,v_referrer]);
  perform private.lock_booking_referral_codes(array[v_input->>'referralCode']);
  select r.user_id into v_current_referrer from public.referrals r where r.code=v_input->>'referralCode';
  if v_current_referrer is distinct from v_referrer then
    -- Whole-transaction retry releases the old set. Never add a newly found owner
    -- out of order or continue with pre-guard referral facts.
    raise exception 'Referral ownership changed; retry whole transaction' using errcode='40001';
  end if;
  v_household:=(v_booking->>'householdProfileId')::uuid;
  v_property:=(v_booking->>'propertyAccountId')::uuid;
  if v_household is not null then
    perform 1 from public.household_profiles h where h.id=v_household and h.user_id=p_user_id for share;
    if not found then raise exception 'Household profile is not owned' using errcode='22023'; end if;
  end if;
  if v_property is not null then
    perform 1 from public.property_accounts a where a.id=v_property and a.user_id=p_user_id and a.status='active' for share;
    if not found then raise exception 'Property account is not active and owned' using errcode='22023'; end if;
  end if;
  select region into v_region from pg_catalog.unnest(array['midrand','sandton','bryanston','bedfordview','rosebank','parkhurst',
    'melville','fourways','waterfall','dainfern','hyde park','braamfontein']) with ordinality r(region,n)
    where position(region in lower(v_booking->>'address'))>0 order by n limit 1;
  if v_region is null then raise exception 'Outside approved launch coverage' using errcode='22023'; end if;
  perform 1 from public.xooters x where x.id=any(v_ids) order by x.id for update;
  v_at:=pg_catalog.clock_timestamp();
  v_facts:=private.booking_quote_facts_v1(p_user_id,v_input->>'referralCode',v_at);
  v_quote:=private.calculate_booking_quote_v1(v_input,v_facts);
  v_crew:=(v_quote->>'crewSize')::integer;
  if cardinality(v_ids)>v_crew then raise exception 'Selected roster exceeds crew' using errcode='22023'; end if;
  if p_confirmed_service is distinct from v_quote->>'service' then raise exception 'Explicit resolved service acceptance required' using errcode='22023'; end if;
  v_scheduled:=((v_input->>'date')||' '||(v_input->>'time'))::timestamp at time zone 'Africa/Johannesburg';
  if v_scheduled<=v_at then raise exception 'Booking start must be in the future' using errcode='22023'; end if;
  if cardinality(v_ids)>0 then
    if (select count(*) from public.xooters x where x.id=any(v_ids) and x.active)<>cardinality(v_ids) then
      return jsonb_build_object('status','assignment_unavailable','reason','worker_unavailable');
    end if;
    return jsonb_build_object('status','assignment_unavailable','reason','reservation_policy_unavailable');
  end if;
  if jsonb_typeof(p_accepted_quote) is distinct from 'object'
    or p_accepted_quote->>'fingerprint' !~ '^[0-9a-f]{64}$'
    or p_accepted_quote->>'fingerprint' is null then raise exception 'Invalid accepted quote' using errcode='22023'; end if;
  if p_accepted_quote-'fingerprint' is distinct from v_quote then
    return jsonb_build_object('status','quote_changed','quote',v_quote);
  end if;
  v_work:=(v_quote->>'baseCents')::bigint+(v_quote->>'addOnsCents')::bigint;
  insert into public.bookings(id,user_id,service,service_type,scheduled_at,duration_hours,address,status,price,notes,
    payment_status,frequency,household_profile_id,property_account_id,launch_region,completion_photo_required,
    service_fee,booking_cover_amount,high_demand_premium,crew_size,crew_elapsed_hours,
    contract_version,pricing_version,request_key,definition,accepted_quote,total_cents,solo_hours,primary_payment_record_id)
  values(v_booking_id,p_user_id,'cleaning',v_quote->>'service',v_scheduled,(v_quote->>'estimatedDurationHours')::numeric,
    v_booking->>'address','draft',v_work/100.0,nullif(v_booking->>'instructions',''),'pending',
    case when v_input->>'frequency'='once' then 'one_time' else 'repeat' end,v_household,v_property,v_region,
    v_quote->>'service' in ('airbnb','moving'),(v_quote->>'bookingFeeCents')::numeric/100,
    (v_quote->>'coverCents')::numeric/100,(v_quote->>'highDemandCents')::numeric/100,
    v_crew,(v_quote->>'estimatedDurationHours')::numeric,1,v_quote->>'pricingVersion',p_request_key,p_definition,
    p_accepted_quote,(v_quote->>'totalCents')::bigint,(v_quote->>'soloHours')::numeric,v_payment_id);
  for v_slot in 1..v_crew loop
    insert into public.booking_crew_slots values(v_booking_id,v_slot,private.booking_slot_gross_v1(v_work,v_crew,v_slot),1);
  end loop;
  insert into public.payment_records(id,user_id,booking_id,amount,currency,payment_kind,provider,provider_reference,status,meta,booking_contract_version)
    values(v_payment_id,p_user_id,v_booking_id,(v_quote->>'totalCents')::numeric/100,'ZAR','booking','manual_pending',
      'xoot_booking_'||v_booking_id,'pending',jsonb_build_object('contract_version',1,'accepted_quote',p_accepted_quote),1);
  insert into public.booking_status_events(booking_id,actor_id,status,label,meta) values
    (v_booking_id,p_user_id,'draft','Draft booking created',jsonb_build_object('contract_version',1,'unfilled_slots',v_crew));
  if (v_quote->>'referralDiscountCents')::bigint>0 then
    insert into public.referral_redemptions(referrer_user_id,referred_user_id,booking_id,credit_cents,rewarded)
      values(v_referrer,p_user_id,v_booking_id,(v_quote->>'referralDiscountCents')::integer,false);
  end if;
  if (v_quote->>'creditUsedCents')::bigint>0 then
    insert into public.xootcred_ledger(user_id,booking_id,amount,direction,reason,status,meta,booking_operation_key)
      values(p_user_id,v_booking_id,(v_quote->>'creditUsedCents')::numeric/100,'debit','redemption','redeemed',
        jsonb_build_object('source','create_reviewed_booking','funding','xoot'),'booking_debit:'||v_booking_id);
  end if;
  if v_input->>'frequency'<>'once' then
    insert into public.recurring_schedules(user_id,xooter_id,household_profile_id,cadence_days,preferred_day,preferred_time,
      next_suggested_at,source_booking_id,repeat_days,status) values(p_user_id,null,v_household,
      case when v_input->>'frequency'='weekly' then 7 else 14 end,to_char(v_scheduled at time zone 'Africa/Johannesburg','FMDay'),
      (v_input->>'time')::time,v_scheduled+case when v_input->>'frequency'='weekly' then interval '7 days' else interval '14 days' end,
      v_booking_id,array(select j::smallint from jsonb_array_elements_text(v_input->'repeatDays') j),'preferences_only');
  end if;
  insert into public.admin_review_queue(queue_type,subject_table,subject_id,user_id,booking_id,priority,summary)
    values('payment','payment_records',v_payment_id,p_user_id,v_booking_id,'normal','Pending reviewed booking payment; crew remains unfilled');
  insert into public.integration_outbox(source_table,source_id,event_type,channel,owner,stack_tool,payload,status,
    failure_mode,approval_required,created_by) values('payment_records',v_payment_id,'payment_authorisation_requested','payment_provider',
    'Finance Operations','PayFast payment session',jsonb_build_object('booking_id',v_booking_id,'payment_record_id',v_payment_id,
      'amount',(v_quote->>'totalCents')::numeric/100,'currency','ZAR','contract_version',1),'needs_approval',
    'Booking remains draft; no dispatch before verified payment and crew lifecycle readiness.',true,p_user_id);
  insert into public.admin_audit_log(admin_id,action,target_table,target_id,changes,reason)
    values(p_user_id,'create_reviewed_booking','bookings',v_booking_id,jsonb_build_object('request_key',p_request_key,
      'payment_record_id',v_payment_id,'total_cents',v_quote->'totalCents','unfilled_slots',v_crew,'benefit_funding','xoot'),
      'Verified buyer accepted one server-priced visit; no crew availability promised');
  v_result:=jsonb_build_object('status','created','bookingId',v_booking_id,'paymentRecordId',v_payment_id,
    'bookingStatus','draft','acceptedQuote',p_accepted_quote);
  insert into private.booking_creation_attempts values(p_user_id,p_request_key,p_definition,p_accepted_quote,p_confirmed_service,
    v_booking_id,v_payment_id,v_result);
  return v_result;
end;
$$;
revoke all on function public.create_reviewed_booking(uuid,uuid,jsonb,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function public.create_reviewed_booking(uuid,uuid,jsonb,jsonb,text) to service_role;
comment on function public.create_reviewed_booking(uuid,uuid,jsonb,jsonb,text) is
  'Service-only disabled foundation. Definition={input,booking} from strict parser. Whole-transaction 40001/40P01 retries; quote_changed needs Edge fingerprint. Nonempty rosters fail closed pending reservation policy.';
commit;
