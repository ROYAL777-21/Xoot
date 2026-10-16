import {
  cleanId, fail, getServiceClient, handlePreflight, ok, readJson, requireAuth,
} from "../_shared/action-utils.ts";

/**
 * Exact location is never a public table API or a Realtime publication.
 * This endpoint alone verifies every read/write against a current job.
 * No automatic/background tracking is enabled by this function.
 */
const POSITION_MAX_AGE_MS = 60_000;
const CLOCK_SKEW_MS = 30_000;
Deno.serve(async req => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  if (req.method !== "POST") return fail("method not allowed", origin, 405);
  const auth = await requireAuth(req, origin);
  if (auth.response || !auth.user) return auth.response;
  const actorId = auth.user.id;
  let body: Record<string, unknown>;
  try {
    const candidate: unknown = await readJson(req);
    if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) {
      return fail("invalid request", origin, 400);
    }
    body = candidate as Record<string, unknown>;
  } catch {
    return fail("invalid request", origin, 400);
  }
  const action = body.action;
  const bookingId = cleanId(body.bookingId);
  if (!bookingId || !["publish", "read", "stop"].includes(String(action))) {
    return fail("invalid request", origin, 400);
  }

  // Service key is held only inside the Edge runtime. Never take an actor ID,
  // Xooter ID or access role from the untrusted request body.
  const db = getServiceClient();
  const { data: booking, error: bookingError } = await db.from("bookings")
    .select("id,user_id,xooter_id,status,cancelled_at,completed_at,sensitive_data_revoked_at")
    .eq("id", bookingId).maybeSingle();
  if (bookingError || !booking) return fail("booking unavailable", origin, 404);

  const isCustomer = booking.user_id === actorId;
  const { data: job, error: jobError } = await db.from("xooter_jobs")
    .select("id,xooter_id,state").eq("booking_id", bookingId)
    .eq("xooter_id", booking.xooter_id).eq("state", "accepted").maybeSingle();
  // Non-participants must not be able to distinguish an unassigned or revoked
  // booking from a booking they were never authorised to see.
  if (jobError || !job) return isCustomer
    ? ok({ state: "unavailable" }, origin)
    : fail("booking unavailable", origin, 404);

  const { data: worker, error: workerError } = await db.from("xooters")
    .select("id,user_id,active,background_check_status")
    .eq("id", job.xooter_id).maybeSingle();
  if (workerError || !worker || !worker.active || worker.background_check_status !== "approved") {
    return isCustomer
      ? ok({ state: "unavailable" }, origin)
      : fail("booking unavailable", origin, 404);
  }

  const isWorker = worker.user_id === actorId;
  if (!isWorker && !isCustomer) return fail("booking unavailable", origin, 404);

  // Check participant identity before disclosing even the state of a private booking.
  const active = ["en_route", "enroute"].includes(String(booking.status)) &&
    !booking.cancelled_at && !booking.completed_at && !booking.sensitive_data_revoked_at;
  if (!active) return ok({ state: "unavailable" }, origin);

  if (action === "read") {
    const { data: point, error } = await db.from("xoot_job_live_positions")
      .select("booking_id,xooter_id,latitude,longitude,accuracy_m,recorded_at,expires_at,updated_at")
      .eq("booking_id", bookingId).maybeSingle();
    if (error || !point || point.xooter_id !== worker.id) return ok({ state: "unavailable" }, origin);
    const now = Date.now();
    const captured = Date.parse(point.recorded_at);
    const expiry = Date.parse(point.expires_at);
    if (!Number.isFinite(captured) || !Number.isFinite(expiry) ||
        now > expiry || now - captured > POSITION_MAX_AGE_MS || captured > now + CLOCK_SKEW_MS) {
      return ok({ state: "unavailable" }, origin);
    }
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);
    const accuracyM = Number(point.accuracy_m);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(accuracyM) ||
        latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 ||
        accuracyM <= 0 || accuracyM > 200) return ok({ state: "unavailable" }, origin);
    const response = ok({ state: "current", latitude, longitude,
      accuracyM, recordedAt: point.recorded_at, expiresAt: point.expires_at }, origin);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }

  if (!isWorker) return fail("booking unavailable", origin, 404);

  if (action === "stop") {
    const { error } = await db.from("xoot_job_live_positions")
      .delete().eq("booking_id", bookingId).eq("xooter_id", worker.id);
    return error ? fail("location unavailable", origin, 500) : ok({ state: "stopped" }, origin);
  }

  // Explicit consent and a recent foreground GPS fix are required *on every report*.
  // Never accept client-provided identity, expiry, provider ETA or historic replay.
  if (body.consent !== true ||
      typeof body.latitude !== "number" || !Number.isFinite(body.latitude) ||
      typeof body.longitude !== "number" || !Number.isFinite(body.longitude) ||
      typeof body.accuracyM !== "number" || !Number.isFinite(body.accuracyM) ||
      typeof body.capturedAt !== "string" ||
      body.latitude < -90 || body.latitude > 90 ||
      body.longitude < -180 || body.longitude > 180 ||
      body.accuracyM <= 0 || body.accuracyM > 100) {
    return fail("invalid location report", origin, 400);
  }
  const now = Date.now(), recorded = Date.parse(body.capturedAt);
  if (!Number.isFinite(recorded) || Math.abs(now - recorded) > CLOCK_SKEW_MS) {
    return fail("stale location report", origin, 400);
  }

  // This database RPC atomically rechecks accepted job + booking lifecycle
  // under row locks, and handles simultaneous requests with a 10-second
  // ON CONFLICT throttle. A read-then-upsert here would be racy.
  const { data: saved, error: publishError } = await db.rpc("xoot_publish_private_job_location", {
    p_booking_id: bookingId,
    p_xooter_id: worker.id,
    p_latitude: body.latitude,
    p_longitude: body.longitude,
    p_accuracy_m: body.accuracyM,
    p_captured_at: new Date(recorded).toISOString(),
  });
  if (publishError) return fail("location unavailable", origin, 500);
  if (saved !== true) return fail("location unavailable or update too frequent", origin, 409);
  const expiresAt = new Date(Math.min(now, recorded) + POSITION_MAX_AGE_MS).toISOString();
  // Never echo position to unauthorised callers or log coordinates.
  return ok({ state: "accepted", expiresAt }, origin);
});
