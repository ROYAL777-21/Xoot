import {
  addDays,
  cleanArray,
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertOutbox,
  insertReviewQueue,
  ok,
  requireAuth,
  toNumber,
  writeAuditLog,
} from "../_shared/action-utils.ts";

const createPlacementApplication = async (req: Request, origin: string | null, user: any, supa: any, body: any) => {
  const application = body.application ?? body;
  const firstName = cleanText(application.first_name, 100);
  const lastName = cleanText(application.last_name, 100);
  const email = cleanText(application.email, 255);
  const phone = cleanText(application.phone, 40);
  const address = cleanText(application.address, 500);
  const dailyPayRate = toNumber(application.daily_pay_rate, 0);
  if (!firstName || !lastName || !email.includes("@") || !phone || address.length < 5) {
    return fail("complete contact details are required", origin, 400);
  }
  if (dailyPayRate < 220) return fail("minimum pay is R220 for half-day placement", origin, 400);

  const { data, error } = await supa.from("care_plus_applications").insert({
    user_id: user.id,
    status: "submitted",
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    address,
    preferred_start_date: cleanText(application.preferred_start_date, 20) || null,
    daily_start_time: cleanText(application.daily_start_time, 20) || null,
    daily_end_time: cleanText(application.daily_end_time, 20) || null,
    days_of_week: cleanArray(application.days_of_week, 7, 10),
    daily_pay_rate: dailyPayRate,
    overtime: cleanText(application.overtime, 120) || null,
    job_description: cleanText(application.job_description, 1000) || null,
    preferred_language: cleanText(application.preferred_language, 80) || null,
    ideal_personality: cleanText(application.ideal_personality, 500) || null,
    required_skills: cleanArray(application.required_skills, 12, 80),
    pets: cleanArray(application.pets, 8, 80),
    other_qualities: cleanText(application.other_qualities, 500) || null,
  }).select("id").single();
  if (error || !data?.id) throw new Error("care plus application insert failed");

  await insertReviewQueue(supa, {
    queueType: "support",
    subjectTable: "care_plus_applications",
    subjectId: data.id,
    userId: user.id,
    priority: "normal",
    summary: `HomeCare+ placement request for ${firstName} ${lastName}`,
  });
  await insertNotification(supa, {
    userId: user.id,
    kind: "care_plus_application_submitted",
    title: "HomeCare+ request received",
    body: "Your placement request is in the support queue. We will review the details and next steps in-app.",
    link: "/app",
  });
  await writeAuditLog(supa, {
    actorId: user.id,
    action: "create_care_plus_application",
    targetTable: "care_plus_applications",
    targetId: data.id,
    changes: { status: "submitted" },
    reason: "Client submitted HomeCare+ placement request through Edge Function",
    ipAddress: req.headers.get("x-forwarded-for"),
  });

  return ok({ application_id: data.id, status: "submitted" }, origin);
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    const body = await req.json();
    if (cleanText(body.action, 60) === "placement_application" || body.application) {
      return await createPlacementApplication(req, origin, user, supa, body);
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

    await supa.from("zootcred_ledger").insert({
      user_id: user.id,
      amount: 30,
      direction: "credit",
      reason: "loyalty_reward",
      status: "available",
      expires_at: addDays(now, 30).toISOString(),
      meta: { source: "care_plus_activation", zootcred_multiplier: 1.5, payment_record_id: payment.id },
    });

    await insertNotification(supa, {
      userId: user.id,
      kind: "care_plus_activated",
      title: "Care+ is active",
      body: "Your Care+ benefits are active, including priority support, R30 add-on credit, and 1.5x ZootCred on completed bookings.",
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
      changes: { status: "active", next_billing_at: subscription.next_billing_at, zootcred_credit: 30, zootcred_multiplier: 1.5 },
      reason: "Confirmed membership payment activated Care+",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok({ subscription_id: subscription.id, status: "active", next_billing_at: subscription.next_billing_at, zootcred_multiplier: 1.5 }, origin);
  } catch (error) {
    console.error("activate-care-plus failed", error);
    return fail("Care+ action failed", origin, 500);
  }
});
