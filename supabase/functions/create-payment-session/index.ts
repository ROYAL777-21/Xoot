import {
  cleanId,
  fail,
  handlePreflight,
  ok,
  readJson,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";
import { PAYFAST_PROCESS_URL_LIVE } from "../_shared/payfast.ts";
import { buildSignedCheckout } from "../_shared/payfast-checkout.ts";

/**
 * Turn a pending booking into a payment the customer can actually make.
 *
 * ── What was missing, and why it mattered ──────────────────────────────────────────────────────
 * `create-booking` wrote a draft and filed an internal `payment_authorisation_requested` row;
 * `confirm-payment` stood ready to verify an ITN. **Nothing connected the two.** The customer was
 * never sent anywhere, so no ITN could ever arrive, so no booking could ever be paid.
 * `create-booking` carried a TODO saying exactly this. This is that TODO.
 *
 * ── The rules this function exists to enforce ──────────────────────────────────────────────────
 *
 * 1. **The amount comes from the database, never the request.** The client sends a booking id and
 *    nothing else that touches money. A body field naming a price would be an endpoint where the
 *    payer chooses the price.
 *
 * 2. **`m_payment_id` is the existing `provider_reference`.** `confirm-payment` looks records up by
 *    it and rejects on amount mismatch. Minting a fresh reference here would produce payments that
 *    verify against nothing.
 *
 * 3. **Both governance gates must be on.** `payments.provider_checkout` and
 *    `payments.hosted_checkout.payfast` are false in production today. This function refuses while
 *    they are, so merely deploying it cannot start taking money — that stays a deliberate act.
 *
 * 4. **A missing credential is a 503, not a crash.** The secrets are absent on both projects right
 *    now. An unconfigured provider must say so in a way the UI can render, rather than throwing and
 *    surfacing as "something went wrong".
 *
 * ── The multi-Xooter case is refused, on purpose ───────────────────────────────────────────────
 * A booking for N Xooters creates N bookings and N `payment_records`. PayFast checkout is a single
 * amount against a single `m_payment_id`, and `confirm-payment` settles exactly one record per ITN.
 * Covering N records in one session would need `confirm-payment`'s matching rule to understand a
 * group — a change to the most security-sensitive money function in the repo, and Correctness &
 * Safety's to make.
 *
 * So this refuses with a named reason rather than quietly charging for one booking out of three.
 * **Collecting a third of the money silently is the failure that must not happen**; a visible
 * refusal is recoverable. See the worklog entry for 2026-08-15.
 */

/** Both must be on. Either one off means checkout is not live. */
const REQUIRED_CONTROLS = ["payments.provider_checkout", "payments.hosted_checkout.payfast"];

const siteUrl = () =>
  (Deno.env.get("XOOT_SITE_URL") ?? "https://xoot.co.za").replace(/\/+$/, "");

/**
 * `confirm-payment` runs with `verify_jwt = false` precisely so PayFast can reach it — see
 * `edge-function-config.test.ts`. Derived from SUPABASE_URL rather than configured separately, so
 * the notify URL cannot drift to a project the ITN would never be matched against.
 */
const notifyUrl = () => `${(Deno.env.get("SUPABASE_URL") ?? "").replace(/\/+$/, "")}/functions/v1/confirm-payment`;

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const { response, user, supa } = await requireAuth(req, origin);
  if (response || !user || !supa) return response ?? fail("authentication required", origin, 401);

  try {
    for (const control of REQUIRED_CONTROLS) {
      if (!(await isOperationalControlEnabled(supa, control))) {
        return fail("online payment is not enabled yet", origin, 503, {
          reason: "control_disabled",
          control,
        });
      }
    }

    // A checkout session is cheap to build and free to replay, but it is also a signed instruction
    // carrying a merchant key. Ten a minute is far above any real customer and far below useful for
    // harvesting signed field sets.
    const limit = await consumeRateLimit(supa, {
      bucket: "payment_session",
      actor: user.id,
      action: "create",
      limitCount: 10,
      windowSeconds: 60,
    });
    if (!limit.allowed) return fail("too many payment attempts, please wait a moment", origin, 429);

    const body = await readJson(req);
    const bookingId = cleanId(body?.bookingId ?? body?.booking_id);
    if (!bookingId) return fail("bookingId required", origin, 400);

    /*
     * Ownership is established by the query, not checked after it. Filtering on `user_id` means a
     * booking belonging to somebody else returns "not found" rather than reaching a comparison that
     * a later edit could drop.
     */
    const { data: booking, error: bookingError } = await supa
      .from("bookings")
      .select("id,user_id,service_type,scheduled_at,status,payment_status")
      .eq("id", bookingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (bookingError) return fail("booking lookup failed", origin, 500);
    if (!booking?.id) return fail("booking not found", origin, 404);

    const { data: records, error: recordsError } = await supa
      .from("payment_records")
      .select("id,amount,currency,status,provider_reference,meta")
      .eq("booking_id", booking.id)
      .eq("user_id", user.id)
      .eq("payment_kind", "booking");

    if (recordsError) return fail("payment lookup failed", origin, 500);

    const all = Array.isArray(records) ? records : [];
    if (all.length === 0) return fail("no payment record for this booking", origin, 404);

    // Already settled. Idempotent so a customer refreshing the return page is told the truth rather
    // than being sent to pay a second time.
    if (all.every((r) => r.status === "paid")) {
      return ok({ already_paid: true, booking_id: booking.id }, origin);
    }

    const pending = all.filter((r) => r.status === "pending");
    if (pending.length === 0) {
      return fail("this booking has no payable amount", origin, 409, { reason: "no_pending_record" });
    }
    if (pending.length > 1) {
      // See the module note. Refuse loudly rather than collect part of the total.
      return fail("multi-Xooter bookings cannot be paid online yet", origin, 409, {
        reason: "multi_record_checkout_unsupported",
        pending_records: pending.length,
      });
    }

    const record = pending[0];
    if (String(record.currency ?? "ZAR").toUpperCase() !== "ZAR") {
      return fail("only ZAR payments are supported", origin, 409);
    }
    const amount = Number(record.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail("payment amount is not payable", origin, 409);
    }

    const merchantId = Deno.env.get("PAYFAST_MERCHANT_ID") ?? "";
    const merchantKey = Deno.env.get("PAYFAST_MERCHANT_KEY") ?? "";
    const passphrase = Deno.env.get("PAYFAST_PASSPHRASE") ?? "";
    if (!merchantId.trim() || !merchantKey.trim()) {
      return fail("payment provider is not configured", origin, 503, {
        reason: "provider_not_configured",
      });
    }

    const site = siteUrl();
    const serviceLabel = String(booking.service_type ?? "home service").replace(/[_-]+/g, " ");

    const fields = buildSignedCheckout(
      {
        merchantId,
        merchantKey,
        returnUrl: `${site}/app/bookings/${booking.id}?payment=return`,
        cancelUrl: `${site}/app/bookings/${booking.id}?payment=cancelled`,
        notifyUrl: notifyUrl(),
        paymentReference: String(record.provider_reference ?? ""),
        amount,
        itemName: `Xoot ${serviceLabel} booking`,
        itemDescription: `Xoot booking ${booking.id}`,
        // First name only, and no surname, phone or address: PayFast needs enough to label the
        // transaction, not a profile. POPIA minimisation applies to a processor the same as to us.
        nameFirst: String(user.user_metadata?.first_name ?? "").trim(),
        emailAddress: String(user.email ?? "").trim(),
      },
      passphrase,
    );

    /*
     * The record was created as `manual_pending` because no provider existed. It has one now. The
     * amount is untouched — this records which rail the money is expected on, nothing about what is
     * owed.
     */
    await supa
      .from("payment_records")
      .update({
        provider: "payfast",
        updated_at: new Date().toISOString(),
        meta: {
          ...(record.meta ?? {}),
          checkout_initiated_at: new Date().toISOString(),
          provider_required: null,
        },
      })
      .eq("id", record.id);

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "create_payment_session",
      targetTable: "payment_records",
      targetId: record.id,
      // Amount and reference only. The signed field set contains the merchant key and must not be
      // written to a table that support staff and admins can read.
      changes: { booking_id: booking.id, amount, provider: "payfast" },
      reason: "Customer started PayFast checkout",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok(
      {
        process_url: Deno.env.get("PAYFAST_PROCESS_URL") ?? PAYFAST_PROCESS_URL_LIVE,
        // An ordered array, not an object. The order is what PayFast signed; a client that
        // rebuilds this as an object and iterates its keys can reorder the form and break the
        // signature. Documented at the client call site too.
        fields: fields.map(([name, value]) => ({ name, value })),
        amount,
        currency: "ZAR",
        booking_id: booking.id,
        payment_record_id: record.id,
      },
      origin,
    );
  } catch (error) {
    console.error("create-payment-session failed", error);
    return fail("could not start payment", origin, 500);
  }
});
