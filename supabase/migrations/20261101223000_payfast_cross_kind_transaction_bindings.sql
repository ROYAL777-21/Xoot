-- Financial preparation only: no checkout, capability, payout or subscription opens.
-- A PayFast transaction may corroborate exactly one immutable payment, across all kinds.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '60s';

create table private.payfast_payment_bindings (
  provider_transaction_id text primary key check(length(provider_transaction_id) between 1 and 120
    and provider_transaction_id = btrim(provider_transaction_id) and provider_transaction_id !~ '[[:cntrl:]]'),
  payment_record_id uuid not null unique,
  payment_kind text not null check(payment_kind in ('booking','homecare_membership','gift_clean')),
  amount_cents bigint not null check(amount_cents > 0),
  provider_reference text not null check(length(provider_reference) between 1 and 160
    and provider_reference = btrim(provider_reference) and provider_reference !~ '[[:cntrl:]]'),
  bound_at timestamptz not null default clock_timestamp()
);
-- Opaque IDs deliberately have no cascading FK. Deleting a payment/receipt must not make an
-- already-used provider transaction reusable. This table holds no name/email/bank/document data.
alter table private.payfast_payment_bindings enable row level security;
revoke all on private.payfast_payment_bindings from public,anon,authenticated,service_role;
grant select on private.payfast_payment_bindings to service_role;

create function private.bind_payfast_payment_transaction(
  p_payment_id uuid,p_payment_kind text,p_amount_cents bigint,p_reference text,
  p_transaction_id text,p_event_id uuid
) returns void language plpgsql security invoker set search_path='' as $$
declare payment public.payment_records%rowtype; event public.provider_events%rowtype;
  binding private.payfast_payment_bindings%rowtype;
begin
  if p_payment_id is null or p_payment_kind is null or p_payment_kind not in ('booking','homecare_membership','gift_clean')
    or p_amount_cents is null or p_amount_cents <= 0 or p_reference is null
    or length(p_reference) not between 1 and 160 or p_reference <> btrim(p_reference) or p_reference ~ '[[:cntrl:]]'
    or p_transaction_id is null or length(p_transaction_id) not between 1 and 120
    or p_transaction_id <> btrim(p_transaction_id) or p_transaction_id ~ '[[:cntrl:]]' or p_event_id is null then
    raise exception 'Complete verified PayFast binding required' using errcode='22023';
  end if;
  -- The owning settlement MUST already hold its complete account/payment/event locks.
  -- This helper adds no reverse lock order and never trusts JSON meta or a paid flag alone.
  select * into payment from public.payment_records where id=p_payment_id;
  if not found or payment.payment_kind is distinct from p_payment_kind
    or payment.provider is distinct from 'payfast' or payment.currency is distinct from 'ZAR'
    or payment.status not in ('paid','admin_confirmed','refunded','cancelled')
    or payment.amount*100 is distinct from p_amount_cents::numeric
    or payment.provider_reference is distinct from p_reference then
    raise exception 'PayFast payment binding mismatch' using errcode='22023';
  end if;
  select * into event from public.provider_events where id=p_event_id;
  if not found or event.provider is distinct from 'payfast' or event.event_type is distinct from 'payment_confirmed'
    or event.event_id is distinct from 'payfast:' || p_transaction_id
    or event.subject_table is distinct from 'payment_records' or event.subject_id is distinct from p_payment_id
    or event.payload_hash !~ '^[a-f0-9]{64}$' or event.status not in ('received','processing','processed','failed') then
    raise exception 'PayFast event binding mismatch' using errcode='22023';
  end if;
  -- Unique constraints arbitrate concurrent different-account/kind attempts atomically.
  -- A second charge for one payment is a reconciliation case, never another fulfilment.
  insert into private.payfast_payment_bindings(provider_transaction_id,payment_record_id,payment_kind,amount_cents,provider_reference)
    values(p_transaction_id,p_payment_id,p_payment_kind,p_amount_cents,p_reference)
    on conflict do nothing;
  select * into binding from private.payfast_payment_bindings where provider_transaction_id=p_transaction_id;
  if not found or binding.payment_record_id is distinct from p_payment_id
    or binding.payment_kind is distinct from p_payment_kind or binding.amount_cents is distinct from p_amount_cents
    or binding.provider_reference is distinct from p_reference then
    raise exception 'PayFast transaction already bound; reconciliation required' using errcode='23505';
  end if;
end $$;
revoke all on function private.bind_payfast_payment_transaction(uuid,text,bigint,text,text,uuid)
  from public,anon,authenticated,service_role;

create function private.guard_booking_payfast_binding()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if tg_table_schema <> 'private' or tg_table_name <> 'booking_payment_settlements'
    or tg_level <> 'ROW' or tg_when <> 'AFTER' or tg_op not in ('INSERT','UPDATE') then
    raise exception 'Unsupported PayFast receipt guard context' using errcode='42501';
  end if;
  if tg_op='UPDATE' and (new.payment_record_id is distinct from old.payment_record_id
    or new.booking_id is distinct from old.booking_id or new.user_id is distinct from old.user_id
    or new.amount_cents is distinct from old.amount_cents or new.provider_reference is distinct from old.provider_reference
    or (old.provider_transaction_id is not null and new.provider_transaction_id is distinct from old.provider_transaction_id)) then
    raise exception 'Financial receipt identity is immutable' using errcode='22023';
  end if;
  if new.provider_transaction_id is not null then
    -- Existing event FK cleanup uses ON DELETE SET NULL. Once the external transaction is
    -- durably bound, that cleanup may remove its transient event UUID without reopening replay.
    if tg_op='UPDATE' and old.provider_transaction_id is not null and new.provider_event_id is null
      and exists(select from private.payfast_payment_bindings b where b.provider_transaction_id=new.provider_transaction_id
        and b.payment_record_id=new.payment_record_id and b.payment_kind='booking'
        and b.amount_cents=new.amount_cents and b.provider_reference=new.provider_reference) then
      return new;
    end if;
    if not exists(select from public.payment_records p where p.id=new.payment_record_id
      and p.user_id=new.user_id and p.booking_id=new.booking_id) then
      raise exception 'Booking receipt owner or subject mismatch' using errcode='22023';
    end if;
    -- Includes an admin-first receipt's first genuine late callback; no new money/job consequence.
    perform private.bind_payfast_payment_transaction(new.payment_record_id,'booking',new.amount_cents,
      new.provider_reference,new.provider_transaction_id,new.provider_event_id);
  end if;
  return new;
end $$;
revoke all on function private.guard_booking_payfast_binding() from public,anon,authenticated,service_role;

-- Stop current receipt writers while validating/backfilling; fail quickly if production is busy.
-- No history is fabricated and no paid legacy flag is promoted into a settlement receipt.
lock table public.payment_records,public.provider_events in share mode;
lock table private.booking_payment_settlements in share row exclusive mode;
do $$ declare receipt private.booking_payment_settlements%rowtype;
begin
  for receipt in select * from private.booking_payment_settlements where provider_transaction_id is not null
    order by payment_record_id loop
    perform private.bind_payfast_payment_transaction(receipt.payment_record_id,'booking',receipt.amount_cents,
      receipt.provider_reference,receipt.provider_transaction_id,receipt.provider_event_id);
  end loop;
end $$;
create trigger booking_payfast_transaction_binding after insert or update on private.booking_payment_settlements
  for each row execute function private.guard_booking_payfast_binding();
comment on table private.payfast_payment_bindings is
  'Private provider transaction tombstones across payment kinds. Not provider approval, a mandate, a payout instruction or fulfilment proof.';
commit;
