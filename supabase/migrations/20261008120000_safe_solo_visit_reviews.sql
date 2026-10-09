begin;

-- Never remove historical reviews to make uniqueness pass. Delivery must stop if data
-- changed since preflight; an operator must review those records separately.
do $$ begin
  if exists (select 1 from public.post_job_reviews group by booking_id,user_id having count(*) > 1) then
    raise exception 'Duplicate historical visit reviews require review before this migration';
  end if;
end $$;
create unique index if not exists post_job_reviews_booking_owner_unique
  on public.post_job_reviews(booking_id,user_id);

revoke insert, update on public.post_job_reviews from authenticated;
-- UPDATE had column-level grants from the old client-write lockdown.
do $$ declare col record; begin
  for col in select column_name from information_schema.columns
    where table_schema='public' and table_name='post_job_reviews' loop
    execute format('revoke update (%I) on public.post_job_reviews from authenticated', col.column_name);
  end loop;
end $$;

create or replace function public.save_solo_visit_review(p_actor_id uuid,p_booking_id uuid,p_rating integer,p_notes text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_booking public.bookings%rowtype;
  v_review public.post_job_reviews%rowtype;
begin
  if p_actor_id is null or p_booking_id is null or p_rating is null or p_rating not between 1 and 5
    or length(coalesce(p_notes,'')) > 1000 then
    return jsonb_build_object('ok',false,'code','invalid_request');
  end if;
  select * into v_booking from public.bookings where id=p_booking_id for update;
  if not found or v_booking.user_id is distinct from p_actor_id then
    return jsonb_build_object('ok',false,'code','not_found');
  end if;
  -- A retry after a lost transport response reads the existing opinion; it never edits it.
  select * into v_review from public.post_job_reviews where booking_id=p_booking_id and user_id=p_actor_id;
  if found then
    return jsonb_build_object('ok',true,'existing',true,'review',jsonb_build_object('id',v_review.id,'rating',v_review.rating,'notes',v_review.notes));
  end if;
  if v_booking.status::text <> 'completed' or v_booking.status is null or v_booking.cancelled_at is not null or v_booking.xooter_id is null then
    return jsonb_build_object('ok',false,'code','not_eligible');
  end if;
  if v_booking.crew_size <> 1 or exists(select 1 from public.booking_assignees where booking_id=p_booking_id and xooter_id<>v_booking.xooter_id)
    or (select count(*) from public.booking_assignees where booking_id=p_booking_id) > 1
    or exists(select 1 from public.xooter_jobs where booking_id=p_booking_id and state in ('accepted','completed') and xooter_id<>v_booking.xooter_id) then
    return jsonb_build_object('ok',false,'code','crew_pending');
  end if;
  if not exists(select 1 from public.xooters where id=v_booking.xooter_id) then
    return jsonb_build_object('ok',false,'code','not_eligible');
  end if;
  insert into public.post_job_reviews(booking_id,user_id,xooter_id,rating,complaint,notes)
    values(p_booking_id,p_actor_id,v_booking.xooter_id,p_rating,p_rating<=2,nullif(btrim(p_notes),''))
    returning * into v_review;
  return jsonb_build_object('ok',true,'existing',false,'review',jsonb_build_object('id',v_review.id,'rating',v_review.rating,'notes',v_review.notes));
end;
$$;
revoke all on function public.save_solo_visit_review(uuid,uuid,integer,text) from public,anon,authenticated;
grant execute on function public.save_solo_visit_review(uuid,uuid,integer,text) to service_role;
comment on function public.save_solo_visit_review(uuid,uuid,integer,text) is
  'Authenticated Edge actor; owner/completed/solo booking only; locked booking and unique review; immutable retry readback. No crew allocation or money/status effects.';
commit;
