-- Coordinate with the optional account-guard foundation without stamping missing history.
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
