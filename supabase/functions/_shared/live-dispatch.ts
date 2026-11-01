import { fail, getServiceClient, isAdminUser, ok } from "./action-utils.ts";

const MAX_ACTIVE_DISPATCH = 30;
const POSITION_MAX_AGE_MS = 60_000;

/** AAL2 and admin role required; no public/admin claim is trusted from request body. */
export async function servePrivateDispatch(req: Request, actorId: string, origin: string | null): Promise<Response> {
  const header = req.headers.get("Authorization") ?? "";
  let assurance: string | undefined;
  try {
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const part = token.split(".")[1];
    if (part) {
      const plain = part.replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(plain.padEnd(Math.ceil(plain.length / 4) * 4, "=")));
      assurance = typeof claims.aal === "string" ? claims.aal : undefined;
    }
  } catch { /* reject any unparseable / unverifiable identity */ }
  // requireAuth has already called auth.getUser against this same signed bearer.
  const db = getServiceClient();
  if (assurance !== "aal2" || !(await isAdminUser(db, actorId))) {
    return fail("dispatch unavailable", origin, 404);
  }

  const now = Date.now();
  const after = new Date(now - POSITION_MAX_AGE_MS).toISOString();
  const { data: positions, error } = await db.from("xoot_job_live_positions")
    .select("booking_id,xooter_id,latitude,longitude,accuracy_m,recorded_at,expires_at")
    .gt("expires_at", new Date(now).toISOString())
    .gte("recorded_at", after).lte("recorded_at", new Date(now + 30_000).toISOString())
    .order("recorded_at", { ascending: false }).limit(MAX_ACTIVE_DISPATCH);
  if (error || !positions) return fail("dispatch unavailable", origin, 503);
  if (positions.length === 0) {
    const empty = ok({ state: "available", points: [] }, origin);
    empty.headers.set("Cache-Control", "private, no-store");
    return empty;
  }
  const ids = positions.map(position => position.booking_id);
  const { data: bookings, error: bookingError } = await db.from("bookings")
    .select("id,xooter_id,status,cancelled_at,completed_at,sensitive_data_revoked_at").in("id", ids);
  if (bookingError || !bookings) return fail("dispatch unavailable", origin, 503);
  const { data: jobs, error: jobsError } = await db.from("xooter_jobs")
    .select("booking_id,xooter_id,state").in("booking_id",ids).eq("state","accepted");
  if (jobsError || !jobs) return fail("dispatch unavailable", origin, 503);
  const workers = [...new Set(positions.map(point => point.xooter_id))];
  const { data: approved, error: workerError } = await db.from("xooters")
    .select("id").in("id", workers).eq("active", true).eq("background_check_status","approved");
  if (workerError || !approved) return fail("dispatch unavailable", origin, 503);
  const allowedWorkerIds = new Set(approved.map(p => p.id));
  const permitted = new Set(bookings.filter(booking =>
    ["en_route","enroute"].includes(String(booking.status)) &&
    !booking.cancelled_at && !booking.completed_at && !booking.sensitive_data_revoked_at &&
    jobs.some(job => job.booking_id === booking.id && job.xooter_id === booking.xooter_id)
  ).map(b => b.id + ":" + b.xooter_id));
  const points = positions.flatMap(point => {
    if (!permitted.has(point.booking_id + ":" + point.xooter_id) ||
        !allowedWorkerIds.has(point.xooter_id)) return [];
    const latitude = Number(point.latitude);
    const longitude = Number(point.longitude);
    const accuracyM = Number(point.accuracy_m);
    const recorded = Date.parse(point.recorded_at);
    const expires = Date.parse(point.expires_at);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 || Math.abs(longitude) > 180 ||
        !Number.isFinite(accuracyM) || accuracyM <= 0 || accuracyM > 200 ||
        !Number.isFinite(recorded) || !Number.isFinite(expires) ||
        now - recorded > POSITION_MAX_AGE_MS || recorded > now + 30_000 || expires <= now) return [];
    return [{
      bookingId: point.booking_id,
      latitude, longitude, recordedAt: point.recorded_at, expiresAt: point.expires_at,
    }];
  });
  const response = ok({ state: "available", points }, origin);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
