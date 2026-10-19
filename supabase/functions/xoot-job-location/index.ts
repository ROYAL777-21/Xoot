import {
  cleanId, fail, getServiceClient, handlePreflight, ok, readJson, requireAuth,
} from "../_shared/action-utils.ts";
import { servePrivateDispatch } from "../_shared/live-dispatch.ts";
import {
  readFreshStoredJobFix, permanentFreeGeocodeUrl,
  parseSouthAfricanDestination, serverDirectionsUrl, parseServerRoute,
} from "../_shared/job-route.ts";

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
  // Dispatch does not accept arbitrary booking or actor IDs and cannot be used
  // without both a verified admin JWT role and MFA AAL2 assurance.
  if (action === "dispatch") return servePrivateDispatch(req, actorId, origin);
  const bookingId = cleanId(body.bookingId);
  if (!bookingId || !["publish", "read", "stop", "eta"].includes(String(action))) {
    return fail("invalid request", origin, 400);
  }

  // Service key is held only inside the Edge runtime. Never take an actor ID,
  // Xooter ID or access role from the untrusted request body.
  const db = getServiceClient();
  const { data: booking, error: bookingError } = await db.from("bookings")
    .select("id,user_id,xooter_id,status,address,cancelled_at,completed_at,sensitive_data_revoked_at")
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

  if (action === "read" || action === "eta") {
    const unavailable = () => {
      const response = ok({ state: "unavailable" }, origin);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    };
    // Source coordinates are *always* server-owned, current accepted-job GPS.
    // The caller cannot submit a route origin, destination, address or position.
    const { data: point, error } = await db.from("xoot_job_live_positions")
      .select("booking_id,xooter_id,latitude,longitude,accuracy_m,recorded_at,expires_at,updated_at")
      .eq("booking_id", bookingId).maybeSingle();
    if (error || !point) return unavailable();
    const fix = readFreshStoredJobFix(point, worker.id);
    if (!fix) return unavailable();

    if (action === "read") {
      const response = ok({
        state: "current", latitude: fix.latitude, longitude: fix.longitude,
        accuracyM: Number(point.accuracy_m), recordedAt: fix.recordedAt, expiresAt: point.expires_at,
      }, origin);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    // Routes are allowed OUTSIDE Xoot's service zones for already accepted jobs.
    // Coverage validation must never gate an active, authorised journey.
    const token = Deno.env.get("MAPBOX_DIRECTIONS_TOKEN")?.trim() ?? "";
    const geocodeUrl = permanentFreeGeocodeUrl(booking.address, token);
    if (!geocodeUrl) return unavailable();

    // Shared, atomic, service-only sliding rate budget already exists in both
    // Supabase projects. Only opaque SHA-256 actor+booking identifiers are kept.
    const identifier = new TextEncoder().encode(actorId + ":" + bookingId + ":route");
    const digest = await crypto.subtle.digest("SHA-256", identifier);
    const actorHash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
    const { data: permitted, error: budgetError } = await db.rpc("consume_rate_limit", {
      p_bucket: "xoot-private-journey", p_actor_hash: actorHash,
      p_action: "road-eta", p_limit_count: 4, p_window_seconds: 60,
    });
    if (budgetError || permitted !== true) return fail("road estimate rate limited or unavailable", origin, 429);

    // No stored geocoded destinations, provider logs, route history or server
    // cache. Timeout and bounded JSON guard against slow/malformed upstream data.
    const abort = AbortSignal.timeout(8_000);
    const fromMapbox = async (url: string): Promise<unknown | null> => {
      try {
        const result = await fetch(url, { signal: abort, cache: "no-store", redirect: "error" });
        if (!result.ok || Number(result.headers.get("content-length") ?? "0") > 48_000) return null;
        const text = await result.text();
        if (text.length > 48_000) return null;
        return JSON.parse(text);
      } catch { return null; }
    };
    const destination = parseSouthAfricanDestination(await fromMapbox(geocodeUrl));
    if (!destination) return unavailable();
    const directionsUrl = serverDirectionsUrl(fix, destination, token);
    if (!directionsUrl) return unavailable();
    const estimate = parseServerRoute(await fromMapbox(directionsUrl));
    if (!estimate) return unavailable();

    // Recheck after both network calls: a cancellation, completed/reassigned
    // job or explicit Stop must invalidate an in-flight ETA before disclosure.
    const [bookingAfter, pointAfter, workerAfter] = await Promise.all([
      db.from("bookings").select("xooter_id,status,cancelled_at,completed_at,sensitive_data_revoked_at")
        .eq("id", bookingId).maybeSingle(),
      db.from("xoot_job_live_positions").select("xooter_id,recorded_at,expires_at")
        .eq("booking_id", bookingId).maybeSingle(),
      db.from("xooters").select("active,background_check_status")
        .eq("id", worker.id).maybeSingle(),
    ]);
    const currentBooking = bookingAfter.data, currentPoint = pointAfter.data;
    if (bookingAfter.error || pointAfter.error || workerAfter.error || !currentBooking || !currentPoint ||
        !workerAfter.data?.active || workerAfter.data.background_check_status !== "approved" ||
        currentBooking.xooter_id !== worker.id ||
        !["en_route", "enroute"].includes(String(currentBooking.status)) ||
        currentBooking.cancelled_at || currentBooking.completed_at || currentBooking.sensitive_data_revoked_at ||
        currentPoint.xooter_id !== worker.id || currentPoint.recorded_at !== fix.recordedAt ||
        !Number.isFinite(Date.parse(currentPoint.expires_at)) ||
        Date.parse(currentPoint.expires_at) <= Date.now() ||
        Date.now() - Date.parse(fix.recordedAt) > 60_000) return unavailable();

    const response = ok({
      state: "current", minutes: estimate.minutes, kilometres: estimate.kilometres,
      calculatedAt: new Date().toISOString(), fixRecordedAt: fix.recordedAt,
    }, origin);
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
