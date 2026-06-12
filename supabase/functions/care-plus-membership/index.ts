import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://zoothome.co.za",
  "https://www.zoothome.co.za",
];

const getAllowedOrigins = () =>
  (Deno.env.get("ALLOWED_ORIGINS")?.split(",") ?? defaultAllowedOrigins)
    .map((origin) => origin.trim())
    .filter(Boolean);

const getCorsHeaders = (origin: string | null) => {
  const allowedOrigins = getAllowedOrigins();
  const allowedOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
};

const isAllowedOrigin = (origin: string | null) => !origin || getAllowedOrigins().includes(origin);

const json = (body: Record<string, unknown>, status: number, origin: string | null) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });

const stripUnsafeText = (value: string) =>
  value
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 || character === "<" || character === ">" || character === "`" || character === "\\"
        ? " "
        : character;
    })
    .join("");

const cleanText = (value: unknown, maxLength = 120) =>
  typeof value === "string"
    ? stripUnsafeText(value).replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

const routeNotificationChannel = (event: string) => {
  if (event === "homecare_summary") return ["in_app", "brevo_email"];
  return ["in_app"];
};

const assertNoDbError = (error: { message?: string } | null | undefined, operation: string) => {
  if (error) throw new Error(`${operation} failed: ${error.message ?? "unknown database error"}`);
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return json({ error: "origin not allowed" }, 403, origin);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "authentication required" }, 401, origin);

    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await authClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "authentication required" }, 401, origin);

    const body = await req.json();
    const action = cleanText(body.action, 40);
    const planId = cleanText(body.planId, 80);
    if (!planId) return json({ error: "plan required" }, 400, origin);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: plan, error: planError } = await supa
      .from("subscription_plans")
      .select("id,name,monthly_price")
      .eq("id", planId)
      .maybeSingle();
    if (planError || !plan) return json({ error: "plan not found" }, 404, origin);

    if (action === "request_membership") {
      const { data: existing } = await supa
        .from("user_subscriptions")
        .select("id, status")
        .eq("user_id", authData.user.id)
        .eq("plan_id", plan.id)
        .in("status", ["active", "pending_payment"])
        .maybeSingle();

      if (existing?.id) {
        return json({ subscription_id: existing.id, subscription_status: existing.status, already_exists: true }, 200, origin);
      }

      const { data: payment, error: paymentError } = await supa.from("payment_records").insert({
        user_id: authData.user.id,
        amount: Number(plan.monthly_price),
        currency: "ZAR",
        status: "pending",
        provider: "manual_pending",
        payment_kind: "homecare_membership",
        meta: {
          plan_id: plan.id,
          membership_name: plan.name,
          provider_required: "Ozow/Stitch credentials not connected",
        },
      }).select("id").single();
      if (paymentError || !payment?.id) throw new Error("payment insert failed");

      const { data: subscription, error: subscriptionError } = await supa.from("user_subscriptions").insert({
        user_id: authData.user.id,
        plan_id: plan.id,
        status: "pending_payment",
      }).select("id,status").single();
      if (subscriptionError || !subscription?.id) throw new Error("subscription insert failed");

      const { error: reviewError } = await supa.from("admin_review_queue").insert({
        queue_type: "payment",
        subject_table: "payment_records",
        subject_id: payment.id,
        user_id: authData.user.id,
        priority: "normal",
        summary: "Care+ membership payment pending confirmation",
      });
      assertNoDbError(reviewError, "review queue insert");

      const { error: outboxError } = await supa.from("integration_outbox").insert([
        ...routeNotificationChannel("homecare_summary").map((channel) => ({
          source_table: "user_subscriptions",
          source_id: subscription.id,
          event_type: "care_plus_membership_requested",
          channel,
          owner: channel === "brevo_email" ? "Retention & Loyalty Agent" : "Customer Support Agent",
          stack_tool: channel === "brevo_email" ? "Brevo email queue" : "Zoot in-app notification",
          payload: { plan_id: plan.id, subscription_id: subscription.id, payment_record_id: payment.id },
          status: "queued",
          approval_required: false,
          failure_mode: null,
          created_by: authData.user.id,
        })),
        {
          source_table: "payment_records",
          source_id: payment.id,
          event_type: "care_plus_payment_authorisation_requested",
          channel: "payment_provider",
          owner: "Finance Operations",
          stack_tool: "Payment provider queue",
          payload: { payment_record_id: payment.id, amount: Number(plan.monthly_price), currency: "ZAR" },
          status: "needs_approval",
          approval_required: true,
          failure_mode: "Keep membership pending until provider callback or admin confirmation exists.",
          created_by: authData.user.id,
        },
      ]);
      assertNoDbError(outboxError, "outbox insert");

      const { error: notificationError } = await supa.from("notifications").insert({
        user_id: authData.user.id,
        kind: "homecare_plus_active",
        title: "Care+ request received",
        body: "Your membership is pending payment confirmation. Home Memory, priority support and ZootCred boost activate after confirmation.",
        link: "/app",
      });
      assertNoDbError(notificationError, "notification insert");

      return json(
        { subscription_id: subscription.id, subscription_status: subscription.status, payment_record_id: payment.id },
        200,
        origin,
      );
    }

    if (action === "cancel_membership") {
      const { data: subscription } = await supa
        .from("user_subscriptions")
        .select("id,status")
        .eq("user_id", authData.user.id)
        .eq("plan_id", plan.id)
        .in("status", ["active", "pending_payment"])
        .maybeSingle();
      if (!subscription?.id) return json({ error: "active membership not found" }, 404, origin);

      const { error: updateError } = await supa
        .from("user_subscriptions")
        .update({ status: "cancelled" })
        .eq("id", subscription.id)
        .eq("user_id", authData.user.id);
      if (updateError) throw new Error("subscription cancellation failed");

      const { error: outboxError } = await supa.from("integration_outbox").insert({
        source_table: "user_subscriptions",
        source_id: subscription.id,
        event_type: "care_plus_membership_cancelled",
        channel: "in_app",
        owner: "Customer Support Agent",
        stack_tool: "Zoot in-app notification",
        payload: { plan_id: plan.id, previous_status: subscription.status },
        created_by: authData.user.id,
      });
      assertNoDbError(outboxError, "outbox insert");

      const { error: notificationError } = await supa.from("notifications").insert({
        user_id: authData.user.id,
        kind: "homecare_plus_cancelled",
        title: "Care+ cancelled",
        body: "Your membership has ended. Your saved home profile remains available.",
        link: "/app/plans",
      });
      assertNoDbError(notificationError, "notification insert");

      return json({ subscription_id: subscription.id, subscription_status: "cancelled" }, 200, origin);
    }

    return json({ error: "unsupported action" }, 400, origin);
  } catch (error) {
    console.error("care-plus-membership failed", error instanceof Error ? error.message : error);
    return json({ error: "care plus membership action failed" }, 500, origin);
  }
});
