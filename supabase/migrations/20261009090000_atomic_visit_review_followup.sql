begin;

-- Serialize retries on the saved opinion. Do not rewrite or deduplicate legacy routing.
create or replace function public.queue_visit_review_followup(p_actor_id uuid,p_review_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare
  v_review public.post_job_reviews%rowtype;
  v_followup uuid;
  v_queue uuid;
begin
  select * into v_review from public.post_job_reviews
    where id=p_review_id and user_id=p_actor_id for update;
  if not found then return jsonb_build_object('queued',false,'code','not_found'); end if;
  if v_review.rating is null or v_review.rating > 2 then return jsonb_build_object('queued',false); end if;

  select id into v_followup from public.support_followups
    where booking_id=v_review.booking_id and user_id=p_actor_id and trigger_type='low_rating'
    order by created_at,id limit 1;
  if v_followup is null then
    insert into public.support_followups(booking_id,user_id,trigger_type,priority,notes)
      values(v_review.booking_id,p_actor_id,'low_rating','high',
        coalesce(nullif(left(regexp_replace(btrim(v_review.notes),'\s+',' ','g'),400),''),'Low post-job rating'))
      returning id into v_followup;
  end if;
  select id into v_queue from public.admin_review_queue
    where queue_type='support' and subject_table='post_job_reviews' and subject_id=v_review.id and user_id=p_actor_id
    order by created_at,id limit 1;
  if v_queue is null then
    insert into public.admin_review_queue(queue_type,subject_table,subject_id,user_id,xooter_id,booking_id,priority,summary)
      values('support','post_job_reviews',v_review.id,p_actor_id,v_review.xooter_id,v_review.booking_id,'high','Low post-job rating needs follow-up')
      returning id into v_queue;
  end if;
  -- Any insertion error escapes the function and rolls back both writes. Existing statuses
  -- are never reset, including a retry after the transport lost a successful response.
  return jsonb_build_object('queued',true,'followup_id',v_followup,'queue_id',v_queue);
end;
$$;
revoke all on function public.queue_visit_review_followup(uuid,uuid) from public,anon,authenticated;
grant execute on function public.queue_visit_review_followup(uuid,uuid) to service_role;
comment on function public.queue_visit_review_followup(uuid,uuid) is
  'Verified Edge actor; owner low-rating review lock; atomic idempotent routing on existing tables; preserves saved opinion and routing statuses.';
commit;
