import { cleanId, cleanText, fail, handlePreflight, ok, readJson, requireAuth } from "../_shared/action-utils.ts";
import { mfaSessionFromVerifiedBearer } from "../_shared/mfa-assurance.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  if (req.method !== "POST") return fail("method not allowed", origin, 405);

  // Auth verifies this exact bearer before its optional admin MFA session is read.
  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth;

  try {
    const body = await readJson(req);
    const bookingId = cleanId(body?.bookingId ?? body?.booking_id).toLowerCase();
    if (!uuid.test(bookingId)) return fail("valid booking_id required", origin, 400);
    const reason = cleanText(body?.reason, 500) || "Client cancellation request";
    const input = {
      p_booking_id: bookingId,
      p_actor_id: user.id,
      p_reason: reason,
      p_admin_session_id: mfaSessionFromVerifiedBearer(req.headers.get("Authorization"), user.id),
    };
    let result;
    // Each RPC is an entire database transaction; never retry individual financial writes.
    for (let attempt = 0; attempt < 3; attempt++) {
      result = await supa.rpc("cancel_booking_atomically", input);
      if (!["40P01", "40001"].includes(result.error?.code ?? "")) break;
    }
    if (!result) throw new Error("cancellation transaction did not run");
    const { data, error } = result;
    if (error) {
      if (["40P01", "40001"].includes(error.code)) return fail("booking changed; please retry", origin, 503);
      if (error.code === "42501") return fail("booking access denied or two-step verification required", origin, 403);
      if (["P0002", "22023"].includes(error.code)) return fail("booking cancellation needs support review", origin, 409);
      return fail("booking cancellation failed; please retry", origin, 500);
    }
    // Only a committed receipt can acknowledge success. Never return a partial financial write.
    const refund = data?.refund;
    if (data?.booking_id !== bookingId || data?.status !== "cancelled" || typeof data?.idempotent !== "boolean"
      || typeof refund?.eligible !== "boolean" || typeof refund?.amount !== "number" || !Number.isFinite(refund.amount)
      || refund.amount < 0 || typeof refund.reason !== "string"
      || (data.refund_request_id !== null && (typeof data.refund_request_id !== "string" || !uuid.test(data.refund_request_id)))
      || refund.eligible !== (refund.amount > 0) || refund.eligible !== (data.refund_request_id !== null)) {
      return fail("booking cancellation could not be confirmed; please retry", origin, 500);
    }
    return ok(data, origin);
  } catch {
    console.error("cancel-booking transaction failed");
    return fail("booking cancellation failed; please retry", origin, 500);
  }
});
