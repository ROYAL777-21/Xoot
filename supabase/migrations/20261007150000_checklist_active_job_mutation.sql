begin;

-- Edge authentication supplies p_actor_id; callers cannot invoke this RPC directly.
-- No corrections after completion. Booking cancellation and checklist writes serialize
-- on the booking first, then the job; existing Edge job-response writes are separate
-- PostgREST transactions and hold no booking lock while updating a job.
create or replace function public.update_active_xooter_checklist(
  p_actor_id uuid, p_job_id uuid, p_task_key text, p_complete boolean
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_booking_id uuid;
  v_booking public.bookings%rowtype;
  v_job public.xooter_jobs%rowtype;
  v_owner uuid;
  v_task public.xooter_job_checklist%rowtype;
begin
  if p_actor_id is null or p_job_id is null or p_complete is null
    or p_task_key is null or p_task_key not in ('confirm_arrival','start_work','final_walkthrough','completion_photos') then
    return jsonb_build_object('ok',false,'code','invalid_request');
  end if;
  select booking_id into v_booking_id from public.xooter_jobs where id = p_job_id;
  select * into v_booking from public.bookings where id = v_booking_id for update;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  select * into v_job from public.xooter_jobs where id = p_job_id for update;
  if not found or v_job.booking_id is distinct from v_booking.id then
    return jsonb_build_object('ok',false,'code','not_found');
  end if;
  select user_id into v_owner from public.xooters where id = v_job.xooter_id for share;
  if v_owner is distinct from p_actor_id then return jsonb_build_object('ok',false,'code','not_found'); end if;
  if v_job.state is distinct from 'accepted' or v_booking.cancelled_at is not null
    or v_booking.status::text not in ('contractor_accepted','en_route','in_progress','confirmed','enroute','arrived')
    or v_booking.status is null then
    return jsonb_build_object('ok',false,'code','not_active');
  end if;
  update public.xooter_job_checklist set
    completed_at = case when p_complete then now() else null end,
    completed_by = case when p_complete then p_actor_id else null end,
    updated_at = now()
  where job_id = v_job.id and booking_id = v_booking.id and task_key = p_task_key
  returning * into v_task;
  if not found then return jsonb_build_object('ok',false,'code','not_found'); end if;
  return jsonb_build_object('ok',true,'bookingId',v_booking.id,'task',
    jsonb_build_object('id',v_task.id,'task_key',v_task.task_key,'label',v_task.label,'completed_at',v_task.completed_at));
end;
$$;
revoke all on function public.update_active_xooter_checklist(uuid,uuid,text,boolean) from public, anon, authenticated;
grant execute on function public.update_active_xooter_checklist(uuid,uuid,text,boolean) to service_role;
comment on function public.update_active_xooter_checklist(uuid,uuid,text,boolean) is
  'Service-only active accepted-job checklist mutation. Verified Edge actor; booking/job/owner locks; no completed-job corrections.';
commit;
