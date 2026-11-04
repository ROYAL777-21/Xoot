-- New service-only transaction; applied SQL and existing money history are immutable.
do $preflight$
begin
  if to_regprocedure('private.lock_booking_accounts(uuid[])') is null
    or to_regprocedure('private.booking_credit_effect(numeric,text,text,timestamptz,timestamptz)') is null
    or to_regprocedure('private.lock_payment_booking_accounts(uuid,uuid)') is null
    or to_regclass('private.booking_account_guards') is null
    or to_regclass('private.booking_payment_settlements') is null
    or to_regclass('private.booking_cancellations') is null then
    raise exception 'Atomic credit redemption requires account, settlement and cancellation foundations' using errcode='55000';
  end if;
  if (select count(*) from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid=t.tgrelid join pg_catalog.pg_namespace n on n.oid=c.relnamespace
    where not t.tgisinternal and t.tgname='a00_booking_benefit_guard' and t.tgenabled='O'
      and n.nspname='public' and c.relname in
        ('bookings','xootcred_ledger','user_subscriptions','referrals','referral_redemptions')) <> 5 then
    raise exception 'Atomic credit redemption requires all five current account guards' using errcode='55000';
  end if;
end;
$preflight$;

create table private.booking_credit_redemptions (
  request_key uuid primary key, user_id uuid not null,
  booking_id uuid not null references public.bookings(id),
  payment_record_id uuid not null references public.payment_records(id),
  ledger_entry_id uuid not null unique references public.xootcred_ledger(id),
  previous_amount_cents bigint not null check(previous_amount_cents between 5000 and 9999999999),
  redemption_cents bigint not null check(redemption_cents > 0),
  amount_cents_after bigint not null check(amount_cents_after >= 5000),
  balance_cents_after bigint not null check(balance_cents_after >= 0),
  provider_reference text, created_at timestamptz not null,
  check(previous_amount_cents - redemption_cents = amount_cents_after)
);
alter table private.booking_credit_redemptions enable row level security;
revoke all on private.booking_credit_redemptions from public, anon, authenticated, service_role;
comment on table private.booking_credit_redemptions is
  'Original committed owner/payment/accepted-amount receipt. No client or service direct writes; retry returns the original result without spending again.';

create function private.redeem_booking_xootcred(
  p_actor_id uuid, p_booking_id uuid, p_payment_record_id uuid, p_request_key uuid,
  p_expected_amount_cents bigint, p_redemption_cents bigint
) returns jsonb language plpgsql volatile security definer set search_path='' as $function$
declare
  v_accounts uuid[];
  v_payment public.payment_records%rowtype;
  v_booking public.bookings%rowtype;
  v_receipt private.booking_credit_redemptions%rowtype;
  v_count integer; v_at timestamptz; v_balance numeric; v_ledger_id uuid;
  v_idempotent boolean := false;
begin
  if p_actor_id is null or p_booking_id is null or p_payment_record_id is null or p_request_key is null
    or p_expected_amount_cents is null or p_expected_amount_cents not between 5000 and 9999999999
    or p_redemption_cents is null or p_redemption_cents <= 0
    or p_redemption_cents > p_expected_amount_cents - 5000 then
    raise exception 'Valid owner, request, payment and exact accepted cents required' using errcode='22023';
  end if;
  -- Reject another actor's booking using identity alone, before taking that
  -- account's financial locks. Ownership is still revalidated under locks.
  if not exists(select from public.bookings where id=p_booking_id and user_id=p_actor_id) then
    raise exception 'Booking owner required' using errcode='42501';
  end if;
  -- Only identity reads before complete account acquisition. Same account ->
  -- payments in ID order -> booking order as settlement/cancellation.
  v_accounts := private.lock_payment_booking_accounts(p_booking_id,null);
  -- Require guards even if the legacy helper's optional foundation changes.
  perform private.lock_booking_accounts(v_accounts);
  perform id from public.payment_records where booking_id=p_booking_id order by id for update;
  select count(*) into v_count from public.payment_records where booking_id=p_booking_id;
  if v_count <> 1 then raise exception 'One canonical booking payment required' using errcode='22023'; end if;
  select * into v_payment from public.payment_records where booking_id=p_booking_id;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'Booking not found' using errcode='P0002'; end if;
  if (v_payment.user_id=any(v_accounts)) is not true or (v_booking.user_id=any(v_accounts)) is not true then
    raise exception 'Booking or payment owner changed; retry transaction' using errcode='40001';
  end if;
  if v_booking.user_id is distinct from p_actor_id then
    raise exception 'Booking owner required' using errcode='42501';
  end if;
  -- An earlier FK insert can finish while we wait for the booking row lock.
  if (select count(*) from public.payment_records where booking_id=p_booking_id) <> 1
    or v_payment.id is distinct from p_payment_record_id
    or v_payment.user_id is distinct from v_booking.user_id
    or v_payment.payment_kind is distinct from 'booking'
    or v_payment.currency is distinct from 'ZAR' or v_booking.crew_size is distinct from 1 then
    raise exception 'Canonical owner and single-worker booking payment required' using errcode='22023';
  end if;
  select * into v_receipt from private.booking_credit_redemptions where request_key=p_request_key;
  if found then
    if v_receipt.user_id is distinct from p_actor_id then
      raise exception 'Request owner mismatch' using errcode='42501';
    end if;
    if v_receipt.booking_id is distinct from p_booking_id or v_receipt.payment_record_id is distinct from p_payment_record_id
      or v_receipt.previous_amount_cents is distinct from p_expected_amount_cents
      or v_receipt.redemption_cents is distinct from p_redemption_cents then
      raise exception 'Request definition changed' using errcode='22023';
    end if;
    -- Historical receipt: later payment/cancellation or another redemption
    -- never repeats or recomputes the original financial operation.
    v_idempotent := true;
  else
    if (v_booking.status::text=any(array['draft','pending','pending_payment'])) is not true
      or v_booking.payment_status is distinct from 'pending' or v_booking.cancelled_at is not null
      or v_payment.status is distinct from 'pending' or v_payment.paid_at is not null
      or v_payment.provider is distinct from 'manual_pending'
      or exists(select from private.booking_payment_settlements where payment_record_id=v_payment.id)
      or exists(select from private.booking_cancellations where booking_id=v_booking.id)
      or jsonb_typeof(v_payment.meta) is distinct from 'object'
      or v_payment.amount is null or v_payment.amount in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)
      or v_payment.amount*100 is distinct from p_expected_amount_cents::numeric then
      raise exception 'Pending unrouted payment and unchanged accepted amount required' using errcode='22023';
    end if;
    v_at := pg_catalog.clock_timestamp();
    select coalesce(sum(private.booking_credit_effect(amount,direction,status,expires_at,v_at)),0)
      into v_balance from public.xootcred_ledger where user_id=p_actor_id;
    if v_balance in ('NaN'::numeric,'Infinity'::numeric,'-Infinity'::numeric)
      or v_balance*100 <> trunc(v_balance*100) or v_balance*100 < p_redemption_cents
      or v_balance*100 > 9007199254740991 then
      raise exception 'Insufficient available XootCred for the accepted redemption' using errcode='23514';
    end if;
    -- Never clamp to a smaller discount after consent. Debit, amount, audit and
    -- receipt either all commit or PostgreSQL rolls back the entire operation.
    insert into public.xootcred_ledger(user_id,booking_id,amount,direction,reason,status,meta)
      values(p_actor_id,p_booking_id,p_redemption_cents/100.0,'debit','redemption','redeemed',
        jsonb_build_object('reason','booking_redemption','payment_record_id',p_payment_record_id,'request_key',p_request_key))
      returning id into v_ledger_id;
    update public.payment_records set amount=(p_expected_amount_cents-p_redemption_cents)/100.0,
      meta=meta || jsonb_build_object('xootcred_redemption',p_redemption_cents/100.0,
        'xootcred_redemption_request_key',p_request_key), updated_at=v_at where id=p_payment_record_id;
    insert into public.admin_audit_log(admin_id,action,target_table,target_id,changes,reason)
      values(p_actor_id,'redeem_xootcred','xootcred_ledger',v_ledger_id,
        jsonb_build_object('booking_id',p_booking_id,'payment_record_id',p_payment_record_id,'request_key',p_request_key,
          'redeemed',p_redemption_cents/100.0,'previous_amount_due',p_expected_amount_cents/100.0,
          'amount_due',(p_expected_amount_cents-p_redemption_cents)/100.0),
        'Owner accepted exact XootCred redemption against an unrouted pending booking payment');
    insert into private.booking_credit_redemptions(request_key,user_id,booking_id,payment_record_id,ledger_entry_id,
      previous_amount_cents,redemption_cents,amount_cents_after,balance_cents_after,provider_reference,created_at)
      values(p_request_key,p_actor_id,p_booking_id,p_payment_record_id,v_ledger_id,p_expected_amount_cents,p_redemption_cents,
        p_expected_amount_cents-p_redemption_cents,(v_balance*100-p_redemption_cents)::bigint,v_payment.provider_reference,v_at)
      returning * into v_receipt;
  end if;
  return jsonb_build_object('booking_id',v_receipt.booking_id,'payment_record_id',v_receipt.payment_record_id,
    'request_key',v_receipt.request_key,'ledger_entry_id',v_receipt.ledger_entry_id,'redeemed',v_receipt.redemption_cents/100.0,
    'previous_amount_due',v_receipt.previous_amount_cents/100.0,'amount_due',v_receipt.amount_cents_after/100.0,
    'updated_balance',v_receipt.balance_cents_after/100.0,'idempotent',v_idempotent);
end;
$function$;
revoke all on function private.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint)
  from public, anon, authenticated, service_role;
grant execute on function private.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint) to service_role;
create function public.redeem_booking_xootcred(
  p_actor_id uuid, p_booking_id uuid, p_payment_record_id uuid, p_request_key uuid,
  p_expected_amount_cents bigint, p_redemption_cents bigint
) returns jsonb language sql volatile security invoker set search_path='' as $function$
  select private.redeem_booking_xootcred(p_actor_id,p_booking_id,p_payment_record_id,p_request_key,
    p_expected_amount_cents,p_redemption_cents);
$function$;
revoke all on function public.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint)
  from public, anon, authenticated, service_role;
grant execute on function public.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint) to service_role;
comment on function public.redeem_booking_xootcred(uuid,uuid,uuid,uuid,bigint,bigint) is
  'Service-only owner redemption: exact payment/cents and replay key. Account-first locks and atomic debit/payment/audit/receipt. No routed/paid/cancelled repricing.';
