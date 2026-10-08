-- A reviewed gift is one atomic order, payment record and operations entry.
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
