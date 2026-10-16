import {
  cleanId, fail, getServiceClient, handlePreflight, ok, readJson, requireAuth,
} from "../_shared/action-utils.ts";

/**
 * Exact location is never a public table API or a Realtime publication.
 * This endpoint alone verifies every read/write against a current job.
 * No automatic/background tracking is enabled by this function.
 */
const POSITION_MAX_AGE_MS = 60_000;
const REPORT_MIN_INTERVAL_MS = 10_000;
const CLOCK_SKEW_MS = 30_000;
type LivePosition = {
  booking_id: string;
  xooter_id: string;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  recorded_at: string;
  expires_at: string;
  updated_at: string;
};

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
    body = await readJson(req);
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

  const active = String(booking.status) === "en_route" &&
    !booking.cancelled_at && !booking.completed_at && !booking.sensitive_data_revoked_at;
  if (!active) return ok({ state: "unavailable" }, origin);

  const { data: job, error: jobError } = await db.from("xooter_jobs")
    .select("id,xooter_id,state").eq("booking_id", bookingId)
    .eq("xooter_id", booking.xooter_id).eq("state", "accepted").maybeSingle();
  if (jobError || !job) return ok({ state: "unavailable" }, origin);

  const { data: worker, error: workerError } = await db.from("xooters")
    .select("id,user_id,active,background_check_status")
    .eq("id", job.xooter_id).maybeSingle();
  if (workerError || !worker || !worker.active || worker.background_check_status !== "approved") {
    return ok({ state: "unavailable" }, origin);
  }

  const isWorker = worker.user_id === actorId;
  const isCustomer = booking.user_id === actorId;
  if (!isWorker && !isCustomer) return fail("booking unavailable", origin, 404);

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
    return ok({ state: "current", latitude: point.latitude, longitude: point.longitude,
      accuracyM: point.accuracy_m, recordedAt: point.recorded_at, expiresAt: point.expires_at }, origin);
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

  const { data: previous, error: priorError } = await db.from("xoot_job_live_positions")
    .select("updated_at").eq("booking_id", bookingId).maybeSingle();
  if (priorError) return fail("location unavailable", origin, 500);
  if (previous && now - Date.parse(previous.updated_at) < REPORT_MIN_INTERVAL_MS) {
    return fail("location update too frequent", origin, 429);
  }
  const update: LivePosition = {
    booking_id: bookingId,
    xooter_id: worker.id,
    latitude: body.latitude,
    longitude: body.longitude,
    accuracy_m: body.accuracyM,
    recorded_at: new Date(now).toISOString(),
    expires_at: new Date(now + POSITION_MAX_AGE_MS).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
  const { error: writeError } = await db.from("xoot_job_live_positions").upsert(update, {
    onConflict: "booking_id",
  });
  if (writeError) return fail("location unavailable", origin, 500);
  // Never echo position to unauthorised callers or log coordinates.
  return ok({ state: "accepted", expiresAt: update.expires_at }, origin);
});
