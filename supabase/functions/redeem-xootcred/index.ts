import { fail, handlePreflight, ok, readJson, requireAuth } from "../_shared/action-utils.ts";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const id = (value: unknown) => typeof value === "string" && uuid.test(value) ? value.toLowerCase() : "";
const cents = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value)
  && value > 0 && value <= 9_999_999_999;
const amountCents = (value: unknown) => {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rounded = Math.round(value * 100);
  return cents(rounded) && rounded / 100 === value ? rounded : null;
};
Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;
  if (req.method !== "POST") return fail("method not allowed", origin, 405);
  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth;
  try {
    const body = await readJson(req);
    const bookingId = id(body?.booking_id ?? body?.bookingId);
    const paymentId = id(body?.payment_record_id);
    const requestKey = id(body?.request_key);
    const expected = body?.expected_amount_cents;
    const redemption = amountCents(body?.amount);
    if (!bookingId || !paymentId || !requestKey || !cents(expected) || expected < 5000 || redemption === null) {
      return fail("booking, payment, request key, accepted amount and exact redemption are required", origin, 400);
    }
    const input = { p_actor_id: user.id, p_booking_id: bookingId, p_payment_record_id: paymentId,
      p_request_key: requestKey, p_expected_amount_cents: expected, p_redemption_cents: redemption };
    let result;
    // Retry only the whole transaction, retaining the key for an uncertain commit.
    for (let attempt = 0; attempt < 3; attempt++) {
      result = await supa.rpc("redeem_booking_xootcred", input);
      if (!["40P01", "40001"].includes(result.error?.code ?? "")) break;
    }
    if (!result) throw new Error("missing transaction result");
    if (result.error) {
      if (["40P01", "40001"].includes(result.error.code)) return fail("booking changed; please retry", origin, 503);
      if (result.error.code === "42501") return fail("booking access denied", origin, 403);
      if (["22023", "23514", "23505", "P0002"].includes(result.error.code)) {
        return fail("XootCred could not be applied to that unchanged pending payment; refresh your booking", origin, 409);
      }
      return fail("XootCred redemption could not be confirmed; retry with the same request", origin, 500);
    }
    const r = result.data;
    const receivedRedemption = amountCents(r?.redeemed);
    const previous = amountCents(r?.previous_amount_due);
    const due = amountCents(r?.amount_due);
    const balance = typeof r?.updated_balance === "number" && Number.isFinite(r.updated_balance)
      ? Math.round(r.updated_balance * 100) : -1;
    if (r?.booking_id !== bookingId || r?.payment_record_id !== paymentId || r?.request_key !== requestKey
      || !id(r?.ledger_entry_id) || typeof r?.idempotent !== "boolean" || receivedRedemption !== redemption
      || previous !== expected || due !== expected - redemption || due < 5000 || balance < 0
      || !Number.isSafeInteger(balance) || balance / 100 !== r.updated_balance) {
      return fail("XootCred redemption receipt could not be confirmed; retry with the same request", origin, 500);
    }
    return ok(r, origin);
  } catch {
    console.error("redeem-xootcred transaction failed");
    return fail("XootCred redemption failed; retry with the same request", origin, 500);
  }
});
