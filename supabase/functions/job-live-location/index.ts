import { fail, handlePreflight, ok, readJson, requireAuth } from "../_shared/action-utils.ts";
import {
  canPublishJobPosition, canReadJobPosition, freshLivePosition, validWorkerLocation,
  type LiveBooking, type LiveJob, type LiveWorker,
} from "../_shared/job-location-policy.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const shortId = (value: unknown) => typeof value === "string" && UUID.test(value) ? value : null;

/** Private GPS is available only on a JWT-authenticated active job.
 * Clients NEVER receive a service key, table role, or a GPS subscription to the table.
 */
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response || !auth.user || !auth.supa) return auth.response;
  const actorId = auth.user.id;
  const supa = auth.supa;

  const body = await readJson(req, 4096);
  const action = body?.action;
  const bookingId = shortId(body?.bookingId);
  const jobId = shortId(body?.jobId);

  if (!["read", "publish", "stop"].includes(String(action)) ||
      (action === "read" && !bookingId) || (action !== "read" && !jobId)) {
    return fail("invalid location request", origin, 400);
  }

  // Never accept an actor, worker ID or customer ID from the JSON body.
  // Read only the current server-side booking/job assignment and worker verification.
  const { data: job, error: jobError } = action === "read"
    ? await supa.from("xooter_jobs").select("id,booking_id,xooter_id,state")
      .eq("booking_id", bookingId!).eq("state", "accepted").limit(1).maybeSingle()
    : await supa.from("xooter_jobs").select("id,booking_id,xooter_id,state")
      .eq("id", jobId!).maybeSingle();
  if (jobError || !job) return fail("location unavailable", origin, 404);

  const [{ data: booking, error: bookingError }, { data: worker, error: workerError }] = await Promise.all([
    supa.from("bookings")
      .select("id,user_id,xooter_id,status,cancelled_at,sensitive_data_revoked_at")
      .eq("id", job.booking_id).maybeSingle(),
    supa.from("xooters")
      .select("id,user_id,active,background_check_status")
      .eq("id", job.xooter_id).maybeSingle(),
  ]);
  if (bookingError || workerError || !booking || !worker) {
    return fail("location unavailable", origin, 404);
  }
  const cleanBooking = booking as LiveBooking;
  const cleanJob = job as LiveJob;
  const cleanWorker = worker as LiveWorker;

  if (action === "read") {
    if (!canReadJobPosition(actorId, cleanBooking, cleanJob, cleanWorker)) {
      return fail("location unavailable", origin, 404);
    }
    const { data: loc, error } = await supa.from("job_live_positions")
      .select("latitude,longitude,accuracy_m,received_at,expires_at")
      .eq("job_id", cleanJob.id).gt("expires_at", new Date().toISOString()).maybeSingle();
    if (error) return fail("location temporarily unavailable", origin, 503);
    if (!loc || !freshLivePosition(loc.received_at, loc.expires_at, Date.now())) {
      return ok({ available: false, position: null }, origin);
    }
    return ok({ available: true, position: {
      latitude: loc.latitude, longitude: loc.longitude,
      accuracy_m: loc.accuracy_m, received_at: loc.received_at,
    } }, origin);
  }

  // A worker may stop sharing their own job even if the booking has just closed.
  // The DB's lifecycle triggers separately purge cancelled/reassigned jobs.
  if (actorId !== cleanWorker.user_id || cleanJob.xooter_id !== cleanWorker.id) {
    return fail("location unavailable", origin, 404);
  }
  if (action === "stop") {
    const { error } = await supa.from("job_live_positions")
      .delete().eq("job_id", cleanJob.id).eq("xooter_id", cleanWorker.id);
    if (error) return fail("could not stop location", origin, 503);
    return ok({ sharing: false }, origin);
  }

  if (!canPublishJobPosition(actorId, cleanBooking, cleanJob, cleanWorker)) {
    return fail("location sharing not available for this job", origin, 409);
  }
  // Explicit consent is part of EACH publish request. No silent tracking.
  const position = body?.position;
  if (!validWorkerLocation(position)) {
    return fail("invalid or unconsented location", origin, 400);
  }
  const now = Date.now();
  // Even if the API checks race with reassignment, the database BEFORE trigger
  // validates and row-locks current job and booking. A stale identity fails closed.
  const { error } = await supa.from("job_live_positions").upsert({
    job_id: cleanJob.id,
    booking_id: cleanBooking.id,
    xooter_id: cleanWorker.id,
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy_m: position.accuracy_m,
    consented_at: new Date(now).toISOString(),
    received_at: new Date(now).toISOString(),
    expires_at: new Date(now + 90_000).toISOString(),
  }, { onConflict: "job_id" });
  if (error) {
    // Never echo provider/database errors or sensitive coordinate payloads.
    return fail("location not accepted; retry later", origin, 429);
  }
  return ok({ sharing: true, expiresInSeconds: 90 }, origin);
});
