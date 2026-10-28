-- Cancellation and settlement share payment -> booking lock order.
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
  -- Lock every candidate before the booking, like settlement. Never guess the latest payment.
  perform id from public.payment_records where booking_id=p_booking_id order by id for update;
  select count(*) into v_count from public.payment_records where booking_id=p_booking_id;
  if v_count <> 1 then raise exception 'one canonical booking payment required' using errcode = '22023'; end if;
  select * into v_payment from public.payment_records where booking_id=p_booking_id;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then raise exception 'booking not found' using errcode = 'P0002'; end if;
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
