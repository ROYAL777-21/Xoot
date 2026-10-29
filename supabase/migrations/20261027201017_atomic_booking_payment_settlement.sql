-- A verified callback is not a completed booking until all consequences commit together.
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
