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
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId) || !allowedTasks.has(taskKey)) return fail('jobId and a valid taskKey are required', origin, 400);

    const { data, error } = await supa.rpc('update_active_xooter_checklist', {
      p_actor_id: user.id, p_job_id: jobId, p_task_key: taskKey, p_complete: complete,
    });
    if (error || !data) return fail('Checklist updates are unavailable. Try again shortly.', origin, 503);
    if (!data.ok) {
      if (data.code === 'not_active') return fail('This visit is not active for checklist updates.', origin, 409);
      if (data.code === 'invalid_request') return fail('Invalid checklist update', origin, 400);
      return fail('Checklist task not found', origin, 404);
    }
    return json(data, 200, origin);
  } catch (error) {
    console.error('xooter-job-checklist failure', error);
    return fail('Checklist update failed', origin, 500);
  }
});
