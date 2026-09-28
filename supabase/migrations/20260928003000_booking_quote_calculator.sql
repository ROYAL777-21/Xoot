-- Pure calculator for the later locked booking transaction. No booking writes or enablement.
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
