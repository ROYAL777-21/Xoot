import {
  cleanText,
  fail,
  getAllowedOrigins,
  handlePreflight,
  ok,
  getServiceClient,
  readJson,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import {
  consumeRateLimit,
  getEdgeEnvironment,
  isOperationalControlEnabled,
} from "../_shared/governance-utils.ts";
import { buildPayfastCheckout, resolveMode } from "../_shared/payfast-checkout.ts";
import {
  CAPABILITY_COLUMNS,
  hostedCheckoutBlockReason,
  hostedCheckoutControlKey,
  type PaymentProviderCapability,
} from "../_shared/payment-provider-gate.ts";

/**
 * Start a PayFast checkout for a payment record the caller owns.
 *
 * ── The gap this fills ──────────────────────────────────────────────────────────
 * Both `confirm-payment` and `_shared/payfast.ts` handle a notification arriving. Until this
 * function existed **nothing sent the customer to PayFast**: `PAYFAST_PROCESS_URL_LIVE` and
 * `_SANDBOX` were declared and referenced nowhere, `create-booking` returned the placeholder
 * `/app/bookings/{id}?payment=pending`, and no client read it. The receiving half was complete and
 * unreachable.
 *
 * ── Why a separate function rather than part of `create-booking` ────────────────
 * Three reasons, and the first is the one that settles it:
 *
 *   1. `create-booking` writes **one payment record per booking** for a recurring series, so a
 *      checkout is per-record no matter where it is built.
 *   2. A customer who abandons the PayFast page must be able to come back and pay from the
 *      bookings screen. That needs an endpoint they can call again.
 *   3. `create-booking` should not have to know a payment provider's field order.
 *
 * ── Authenticated, deliberately ─────────────────────────────────────────────────
 * `verify_jwt` stays at its default. This is not a webhook: it names an amount and a reference for
 * a specific person's booking, so it needs a caller identity to check ownership against.
 */

/** The customer comes back here after paying or cancelling. */
const returnUrls = (origin: string | null, bookingId: string | null) => {
  /*
   * `handlePreflight` has already rejected any origin not on the allowlist, so a non-null origin
   * here is trusted. The fallback is the first allowlisted origin rather than a hardcoded domain,
   * so this follows `ALLOWED_ORIGINS` when it is set per environment.
   */
  const site = (origin ?? getAllowedOrigins()[0] ?? "https://xoot.co.za").replace(/\/$/, "");
  const target = bookingId ? `${site}/app/bookings/${bookingId}` : `${site}/app/bookings`;
  return { returnUrl: `${target}?payment=return`, cancelUrl: `${target}?payment=cancelled` };
};

/**
 * Where PayFast posts the ITN.
 *
 * Derived from `SUPABASE_URL` so it cannot drift from the project the record lives in, with an
 * override for the case where the functions are fronted by a custom domain. It must point at
 * `confirm-payment` — the function that actually verifies and records the notification.
 */
const notifyUrl = () => {
  const override = Deno.env.get("PAYFAST_NOTIFY_URL");
  if (override?.trim()) return override.trim();
  const base = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
  if (!base) throw new Error("SUPABASE_URL is not set, so the PayFast notify URL cannot be derived");
  return `${base}/functions/v1/confirm-payment`;
};

/**
 * Read both gates and the capability row, then apply `hostedCheckoutBlockReason`.
 *
 * Lives here rather than in `_shared/payment-provider-gate.ts` because it is the only caller, and
 * because putting it there would make that module import `governance-utils.ts` — which uses
 * `Deno.env` and cannot be type-checked by the web app's `tsc` run. Keeping the rules importable is
 * worth more than sharing a round trip nobody else makes.
 *
 * **Fails closed.** A lookup error returns blocked, for the same reason `getConciergeCapabilities`
 * does: a gate that opens when it cannot read its own rules is not a gate.
 */
const readHostedCheckoutGate = async (
  supa: ReturnType<typeof getServiceClient>,
  provider: string,
): Promise<{ allowed: boolean; reason: string | null; environment: string }> => {
  /*
   * ⚠️ `getEdgeEnvironment()` defaults to "production" when XOOT_APP_ENV / APP_ENV / ENVIRONMENT
   * are all unset — and none of them is set in the documented staging Edge Function config.
   *
   * `payment_provider_capabilities` has a row per environment, so an unlabelled staging deployment
   * reads PRODUCTION's readiness. That is wrong in both directions: verifying PayFast on staging
   * would not open staging, and approving production would open staging too.
   *
   * Neither is exploitable today — every flag on both rows is false — but this is a money gate and
   * a latent wrong answer in one is not something to leave unsaid. The fix is configuration, not
   * code: `XOOT_APP_ENV=staging` on the staging project. Recorded in NEEDS-FOUNDER.md, and the
   * resolved environment is returned in the refusal so the screen shows WHICH row was consulted
   * rather than leaving someone to guess.
   */
  const environment = getEdgeEnvironment();
  try {
    const [providerCheckoutEnabled, providerGateEnabled] = await Promise.all([
      isOperationalControlEnabled(supa, "payments.provider_checkout", environment),
      isOperationalControlEnabled(supa, hostedCheckoutControlKey(provider), environment),
    ]);

    const { data, error } = await supa
      .from("payment_provider_capabilities")
      .select(CAPABILITY_COLUMNS)
      .eq("provider", provider)
      .eq("environment", environment)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const reason = hostedCheckoutBlockReason({
      providerCheckoutEnabled,
      providerGateEnabled,
      capability: (data as PaymentProviderCapability | null) ?? null,
    });
    return { allowed: reason === null, reason, environment };
  } catch (error) {
    console.warn("hosted checkout gate lookup failed; failing closed", {
      provider,
      message: error instanceof Error ? error.message : String(error),
    });
    return { allowed: false, reason: "provider readiness could not be confirmed", environment };
  }
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth;

  try {
    const body = await readJson(req);
    const paymentRecordId = cleanText(String(body.payment_record_id ?? body.paymentRecordId ?? ""), 64);
    if (!paymentRecordId) return fail("payment_record_id required", origin, 400);

    // A checkout is cheap to build and cheap to abuse: each call reveals a signed form. Bounded per
    // user rather than per record, so retrying one booking cannot be used to enumerate others.
    const limit = await consumeRateLimit(supa, {
      bucket: "payments",
      actor: user.id,
      action: "create_payment_session",
      limitCount: 20,
      windowSeconds: 300,
    });
    if (!limit.allowed) return fail("too many checkout attempts, please wait a moment", origin, 429);

    const { data: payment, error: paymentError } = await supa
      .from("payment_records")
      .select("id,user_id,booking_id,amount,currency,status,provider,provider_reference,payment_kind")
      .eq("id", paymentRecordId)
      .maybeSingle();
    if (paymentError || !payment?.id) return fail("payment record not found", origin, 404);

    /*
     * Ownership. The check that stops one customer generating a signed checkout against another
     * customer's booking — which would let them read its amount and reference, and pay it.
     *
     * Compared server-side against the JWT's user rather than anything in the body, for the same
     * reason `create-booking` re-derives the price: a value the caller supplies is not a fact.
     */
    if (payment.user_id !== user.id) return fail("payment record not found", origin, 404);

    if (payment.status !== "pending") {
      return fail(`this payment is already ${payment.status}`, origin, 409);
    }
    // Gift delivery/redemption must be verified before accepting money. The generic
    // provider gate alone is insufficient: a paid record cannot fulfil a gift yet.
    if (payment.payment_kind === "gift_clean") {
      return fail("Gift checkout is not available yet. Your gift remains unpaid.", origin, 503);
    }
    if (String(payment.currency ?? "ZAR").toUpperCase() !== "ZAR") {
      // PayFast is a ZAR-only gateway, and `confirm-payment` compares against the record's own
      // currency. Anything else could never be confirmed.
      return fail("PayFast can only take ZAR payments", origin, 409);
    }
    if (!payment.provider_reference) {
      // `confirm-payment` finds the record by `m_payment_id` = `provider_reference`. Without one,
      // a completed payment could never be matched back to this booking.
      return fail("payment record has no provider reference", origin, 409);
    }

    const gate = await readHostedCheckoutGate(supa, "payfast");
    if (!gate.allowed) {
      /*
       * 503 rather than 403: nothing is wrong with the caller or their booking. The provider is
       * not switched on yet. The reason is returned so the screen can say what is missing instead
       * of showing a dead button — and so this does not become another silent blocker.
       */
      return fail("PayFast checkout is not available yet", origin, 503, {
        reason: gate.reason,
        environment: gate.environment,
      });
    }

    /*
     * The amount comes from the RECORD, in cents, never from the request.
     *
     * `create-booking` priced this server-side and wrote it here. `confirm-payment` will compare
     * PayFast's `amount_gross` against this same column with **no tolerance**. Any other source
     * for this number — a body field, a recomputed price, a rounded float — reintroduces the
     * defect this repo has shipped three times: a screen showing one price and a charge of another.
     *
     * Under the Consumer Protection Act the displayed price is the price, so this must be exactly
     * what the customer was quoted.
     */
    const amountCents = Math.round(Number(payment.amount) * 100);
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      return fail("payment record has no chargeable amount", origin, 409);
    }

    const checkout = buildPayfastCheckout({
      merchantId: Deno.env.get("PAYFAST_MERCHANT_ID") ?? "",
      merchantKey: Deno.env.get("PAYFAST_MERCHANT_KEY") ?? "",
      passphrase: Deno.env.get("PAYFAST_PASSPHRASE") ?? "",
      mode: resolveMode(Deno.env.get("PAYFAST_MODE")),
      processUrlOverride: Deno.env.get("PAYFAST_PROCESS_URL"),
      notifyUrl: notifyUrl(),
      ...returnUrls(origin, payment.booking_id),
      reference: payment.provider_reference,
      amountCents,
      itemName: payment.payment_kind === "booking" ? "Xoot booking" : `Xoot ${String(payment.payment_kind).replace(/_/g, " ")}`,
      emailAddress: user.email ?? null,
    });

    // Record which route this payment took, so reconciliation can tell a PayFast payment from an
    // EFT without reading the audit log. Legal since 20260813200000 widened the provider check.
    await supa
      .from("payment_records")
      .update({ provider: "payfast", updated_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending");

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "create_payment_session",
      targetTable: "payment_records",
      targetId: payment.id,
      changes: {
        provider: "payfast",
        amount_cents: amountCents,
        booking_id: payment.booking_id,
        reference: payment.provider_reference,
      },
      reason: "Customer started a PayFast checkout",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok(
      {
        url: checkout.url,
        fields: checkout.fields,
        payment_record_id: payment.id,
        booking_id: payment.booking_id ?? null,
        amount_cents: amountCents,
      },
      origin,
    );
  } catch (error) {
    console.error("create-payment-session failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return fail("could not start the payment", origin, 500);
  }
});
