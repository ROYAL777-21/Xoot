begin;

-- Historical messages keep NULL keys. New supported sends always carry a UUID key.
alter table public.messages add column if not exists client_message_id uuid;
create unique index if not exists messages_sender_client_message_unique
  on public.messages(booking_id,sender_user_id,client_message_id);

create or replace function public.send_booking_message_once(
  p_actor_id uuid,p_booking_id uuid,p_client_message_id uuid,p_encrypted_body text,p_safety_flags text[]
) returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_booking public.bookings%rowtype;
  v_message public.messages%rowtype;
  v_worker uuid;
  v_sender text;
  v_flags text[];
begin
  if p_actor_id is null or p_booking_id is null or p_client_message_id is null
    or p_encrypted_body is null or p_encrypted_body not like 'xoot:e2ee:v1:%'
    or length(p_encrypted_body)>12000 or length(p_encrypted_body)<=13
    or cardinality(coalesce(p_safety_flags,'{}'))>8
    or exists(select 1 from unnest(p_safety_flags) flag where flag is null or length(flag)>48 or btrim(flag)='') then
    return jsonb_build_object('ok',false,'code','invalid_request');
  end if;
  select coalesce(array_agg(flag order by flag),'{}'::text[]) into v_flags
    from (select distinct btrim(flag) flag from unnest(coalesce(p_safety_flags,'{}')) flag) canonical;
  -- Serializes insert/replay against other sends and lifecycle/reassignment mutations.
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select user_id into v_worker from public.xooters where id=v_booking.xooter_id for share;
  if p_actor_id=v_booking.user_id then v_sender:='user';
  elsif p_actor_id=v_worker then v_sender:='xooter';
  else return jsonb_build_object('ok',false,'code','not_found'); end if;
  if v_booking.crew_size is distinct from 1
    or exists(select 1 from public.booking_assignees where booking_id=p_booking_id and xooter_id<>v_booking.xooter_id)
    or (select count(*) from public.booking_assignees where booking_id=p_booking_id)>1
    or exists(select 1 from public.xooter_jobs where booking_id=p_booking_id and state in ('accepted','completed') and xooter_id<>v_booking.xooter_id) then
    return jsonb_build_object('ok',false,'code','crew_pending');
  end if;
  -- Actor is revalidated before even an immutable replay; a removed helper cannot read it.
  select * into v_message from public.messages where booking_id=p_booking_id
    and sender_user_id=p_actor_id and client_message_id=p_client_message_id;
  if found then
    if v_message.body is distinct from p_encrypted_body or v_message.client_safety_flags is distinct from v_flags then
      return jsonb_build_object('ok',false,'code','key_conflict');
    end if;
    return jsonb_build_object('ok',true,'existing',true,'message',to_jsonb(v_message));
  end if;
  -- Completed remains open until rating, matching the existing service lifecycle.
  if v_booking.status is null or v_booking.status::text in ('cancelled','rated') or v_booking.cancelled_at is not null then
    return jsonb_build_object('ok',false,'code','closed');
  end if;
  insert into public.messages(booking_id,sender_type,sender_user_id,body,envelope_version,client_safety_flags,moderation_state,client_message_id)
    values(p_booking_id,v_sender,p_actor_id,p_encrypted_body,1,v_flags,
      case when cardinality(v_flags)>0 then 'flagged_client' else 'clear' end,p_client_message_id)
    returning * into v_message;
  return jsonb_build_object('ok',true,'existing',false,'message',to_jsonb(v_message));
end;
$$;
revoke all on function public.send_booking_message_once(uuid,uuid,uuid,text,text[]) from public,anon,authenticated;
grant execute on function public.send_booking_message_once(uuid,uuid,uuid,text,text[]) to service_role;
comment on function public.send_booking_message_once(uuid,uuid,uuid,text,text[]) is
  'Verified Edge actor only. Locked participant/solo/lifecycle validation and immutable scoped-key replay; no browser message writes or crew permission expansion.';
commit;
