import { fail, handlePreflight, json, readJson, requireAuth } from '../_shared/action-utils.ts';

const allowedTasks = new Set(['confirm_arrival', 'start_work', 'final_walkthrough', 'completion_photos']);

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  try {
    const { response: authFailure, user, supa } = await requireAuth(req, origin);
    if (authFailure || !user || !supa) return authFailure ?? fail('Authentication required', origin, 401);
    const body = await readJson(req);
    const jobId = String(body.jobId ?? body.job_id ?? '');
    const taskKey = String(body.taskKey ?? body.task_key ?? '');
    const complete = body.complete !== false;
    if (!jobId || !allowedTasks.has(taskKey)) return fail('jobId and a valid taskKey are required', origin, 400);

    const { data: xooter } = await supa.from('xooters').select('id').eq('user_id', user.id).maybeSingle();
    if (!xooter?.id) return fail('Xooter profile not found', origin, 403);
    const { data: job } = await supa.from('xooter_jobs').select('id,xooter_id,booking_id').eq('id', jobId).maybeSingle();
    if (!job || job.xooter_id !== xooter.id) return fail('Job not found', origin, 404);

    const { data: task, error } = await supa
      .from('xooter_job_checklist')
      .update({ completed_at: complete ? new Date().toISOString() : null, completed_by: complete ? user.id : null, updated_at: new Date().toISOString() })
      .eq('job_id', jobId)
      .eq('task_key', taskKey)
      .select('id,task_key,label,completed_at')
      .maybeSingle();
    if (error || !task) return fail('Checklist task not found', origin, 404);
    return json({ ok: true, task, bookingId: job.booking_id }, 200, origin);
  } catch (error) {
    console.error('xooter-job-checklist failure', error);
    return fail('Checklist update failed', origin, 500);
  }
});
