import {
  addDays,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertOutbox,
  ok,
  readJson,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await readJson(req);
    /*
     * The Care+ placement product was retired on 2026-08-13 (ZD-031). This branch used to create
     * a `care_plus_applications` row, queue a review and notify the user.
     *
     * It is rejected explicitly rather than deleted, and that matters: an installed app build or
     * a queued retry can still POST `action: "placement_application"`. Without this check the
     * request falls through to the SUBSCRIPTION path below, where a body carrying an
     * `application` object and no payment reference would be handled as a Care+ activation
     * attempt. A retired endpoint must fail loudly, not do something adjacent.
     *
     * 410 Gone, not 400: the request is well-formed and was valid until the product ended.
     *
     * Existing `care_plus_applications` rows are untouched. Anyone who applied before the product
     * was retired is still in the support queue and still owed an answer.
     */
    if (cleanText(body.action, 60) === "placement_application" || body.application) {
      return fail("Care+ placement applications are no longer accepted", origin, 410);
    }

    const paymentReference = cleanText(body.paymentRef ?? body.payment_reference ?? body.provider_reference, 160);
    if (!paymentReference) return fail("payment reference required", origin, 400);

    const { data: payment } = await supa
      .from("payment_records")
      .select("id,user_id,status,payment_kind,provider_reference")
      .eq("provider_reference", paymentReference)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!payment?.id) return fail("payment record not found", origin, 404);
    if (payment.status !== "paid") return fail("Care+ can only be activated after confirmed payment", origin, 409);
    if (payment.payment_kind !== "homecare_membership") return fail("payment is not for Care+ membership", origin, 409);

    const { data: existing } = await supa
      .from("user_subscriptions")
      .select("id,status,next_billing_at")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (existing?.id) return ok({ subscription_id: existing.id, status: existing.status, idempotent: true }, origin);

    const { data: plan } = await supa
      .from("subscription_plans")
      .select("id,name")
      .or("name.ilike.%Care+%,name.ilike.%HomeCare+%")
      .limit(1)
      .maybeSingle();
    if (!plan?.id) return fail("Care+ plan is not configured", origin, 500);

    const now = new Date();
    const { data: subscription, error } = await supa.from("user_subscriptions").insert({
      user_id: user.id,
      plan_id: plan.id,
      status: "active",
      started_at: now.toISOString(),
      next_billing_at: addDays(now, 30).toISOString(),
    }).select("id,status,next_billing_at").single();
    if (error || !subscription?.id) throw new Error("subscription insert failed");

    await supa.from("xootcred_ledger").insert({
      user_id: user.id,
      amount: 30,
      direction: "credit",
      reason: "loyalty_reward",
      status: "available",
      expires_at: addDays(now, 30).toISOString(),
      meta: { source: "care_plus_activation", xootcred_multiplier: 1.5, payment_record_id: payment.id },
    });

    await insertNotification(supa, {
      userId: user.id,
      kind: "care_plus_activated",
      title: "Care+ is active",
      body: "Your Care+ benefits are active, including priority support, R30 add-on credit, and 1.5x XootCred on completed bookings.",
      link: "/care-plus",
    });
    await insertOutbox(supa, {
      source_table: "user_subscriptions",
      source_id: subscription.id,
      event_type: "care_plus_welcome",
      channel: "brevo_email",
      owner: "Retention & Loyalty Agent",
      stack_tool: "Brevo transactional email queue",
      payload: { subscription_id: subscription.id, payment_record_id: payment.id },
      status: "queued",
      approval_required: false,
      created_by: user.id,
    });
    await writeAuditLog(supa, {
      actorId: user.id,
      action: "activate_care_plus",
      targetTable: "user_subscriptions",
      targetId: subscription.id,
      changes: { status: "active", next_billing_at: subscription.next_billing_at, xootcred_credit: 30, xootcred_multiplier: 1.5 },
      reason: "Confirmed membership payment activated Care+",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok({ subscription_id: subscription.id, status: "active", next_billing_at: subscription.next_billing_at, xootcred_multiplier: 1.5 }, origin);
  } catch (error) {
    console.error("activate-care-plus failed", error);
    return fail("Care+ action failed", origin, 500);
  }
});
