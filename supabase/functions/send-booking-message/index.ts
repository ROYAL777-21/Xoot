import { cleanArray, cleanId, fail, handlePreflight, ok, readJson, requireAuth } from "../_shared/action-utils.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: { id: string }; supa: any };
  try {
    const body = await readJson(req);
    const bookingId = cleanId(body.bookingId ?? body.booking_id);
    const messageId = cleanId(body.clientMessageId ?? body.client_message_id);
    const encryptedBody = typeof (body.encryptedBody ?? body.encrypted_body ?? body.body) === "string" ? (body.encryptedBody ?? body.encrypted_body ?? body.body).trim() : "";
    const flags = body.clientSafetyFlags ?? body.client_safety_flags ?? [];
    if (!uuid.test(bookingId)) return fail("valid booking_id required", origin, 400);
    // Incompatible clients must upgrade; never fall through to a non-idempotent writer.
    if (!uuid.test(messageId)) return fail("valid client_message_id required; update your app before sending", origin, 400);
    if (!encryptedBody.startsWith("xoot:e2ee:v1:") || encryptedBody.length <= 13) return fail("encrypted booking chat envelope required", origin, 400);
    if (encryptedBody.length > 12000) return fail("message envelope too large", origin, 413);
    if (!Array.isArray(flags) || flags.length > 8 || flags.some(value => typeof value !== "string" || value.length > 48 || !value.trim())) return fail("invalid safety flags", origin, 400);
    const safetyFlags = [...new Set(cleanArray(flags, 8, 48))].sort();
    if (!await isOperationalControlEnabled(supa, "booking.chat_send")) return fail("booking chat is temporarily unavailable", origin, 503);
    const rate = await consumeRateLimit(supa, { bucket: "booking_chat", actor: user.id, action: "send_message", limitCount: 30, windowSeconds: 60 });
    if (!rate.allowed) return fail("too many chat messages", origin, 429);
    const result = await supa.rpc("send_booking_message_once", { p_actor_id: user.id, p_booking_id: bookingId, p_client_message_id: messageId, p_encrypted_body: encryptedBody, p_safety_flags: safetyFlags });
    if (result.error || !result.data) return fail("message service is unavailable; retry with the same message key", origin, 503);
    if (!result.data.ok) {
      const code = result.data.code;
      return fail(code === "closed" ? "booking chat is closed" : code === "key_conflict" ? "message key is already bound to different content" : code === "crew_pending" ? "crew chat is unavailable" : code === "not_found" ? "booking not found or unavailable" : "invalid message request", origin, code === "not_found" ? 404 : code === "invalid_request" ? 400 : 409);
    }
    return ok({ message: result.data.message, existing: result.data.existing }, origin, result.data.existing ? 200 : 201);
  } catch { return fail("message could not be confirmed; retry with the same message key", origin, 500); }
});
