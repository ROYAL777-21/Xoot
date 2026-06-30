import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assertTransition,
  normaliseBookingStatus,
  type BookingStatus,
} from "../_shared/booking-state-machine.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://zoothome.co.za",
  "https://www.zoothome.co.za",
];

const servicePrices: Record<string, number> = {
  residential: 270,
  deep: 365,
  airbnb: 315,
  premium: 420,
  moving: 455,
};

const bookingStatusLabels: Record<string, string> = {
  draft: "Setting up your booking",
  pending_payment: "Payment required",
  payment_confirmed: "Payment received",
  awaiting_assignment: "Finding your Zooter",
  assigned: "Zooter assigned",
  contractor_accepted: "Zooter confirmed",
  en_route: "On the way",
  arrived: "Arrived",
  in_progress: "Job started",
  completed: "Job completed",
  rated: "Thank you for your review",
  cancelled: "Cancelled",
  replacement_required: "Finding a replacement Zooter",
  replacement_offered: "Replacement Zooter found",
  reassigned: "New Zooter assigned",
};

const bookingEventTypes: Record<string, string> = {
  en_route: "contractor_on_the_way",
  arrived: "contractor_arrived",
  completed: "job_completed",
};

const trustIncidentTypes = new Set([
  "lateness",
  "disrespect",
  "poor_quality",
  "suspicious_behaviour",
  "damages",
  "complaint",
  "support_escalation",
]);

const verificationFields = new Set([
  "id_verification_status",
  "selfie_verification_status",
  "address_verification_status",
  "banking_verification_status",
  "reference_verification_status",
  "background_check_status",
  "third_party_verification_status",
]);

const verificationStatuses = new Set(["approved", "rejected", "pending"]);

const retiredTypedAdminActions = new Set([
  "admin_confirm_payment_record",
  "admin_complete_outbox_event",
  "admin_resolve_review_item",
  "admin_close_support_followup",
  "admin_decide_zooter_application",
]);

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

const cleanText = (value: unknown, maxLength = 160) =>
  typeof value === "string"
    ? stripUnsafeText(value).replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

const cleanId = (value: unknown) => cleanText(value, 80);

const routeNotificationChannel = (event: string) => {
  const urgentWhatsApp = new Set([
    "contractor_on_the_way",
    "contractor_arrived",
    "same_day_cancellation_replacement",
    "contractor_no_show",
    "critical_trust_safety_alert",
    "urgent_replacement_confirmation",
  ]);
  const emailEvents = new Set([
    "booking_confirmed",
    "invoice_created",
    "payment_receipt",
    "support_resolved",
    "homecare_summary",
    "onboarding_completed",
    "reactivation_campaign",
    "trust_verification_update",
  ]);
  const inAppOnly = new Set([
    "contractor_assigned",
    "job_completed",
    "support_opened",
    "onboarding_progress",
    "rebooking_prompt",
    "zootcred_update",
    "badge_unlocked",
  ]);

  if (urgentWhatsApp.has(event)) return ["in_app", "whatsapp_urgent"];
  if (event === "payment_receipt" || event === "invoice_created") return ["brevo_email"];
  if (emailEvents.has(event)) return ["in_app", "brevo_email"];
  if (inAppOnly.has(event)) return ["in_app"];
  return ["in_app"];
};

const getPriority = (text: string) => {
  const normalized = text.toLowerCase();
  if (normalized.includes("no-show") || normalized.includes("unsafe") || normalized.includes("damage")) return "urgent";
  if (normalized.includes("refund") || normalized.includes("replacement") || normalized.includes("complaint")) return "high";
  return "normal";
};

const isBookingParticipant = async (supa: any, booking: Record<string, any>, userId: string) => {
  if (booking.user_id === userId) return { participant: true, role: "client" };
  if (!booking.zooter_id) return { participant: false, role: null };

  const { data: zooter } = await supa
    .from("zooters")
    .select("id,user_id")
    .eq("id", booking.zooter_id)
    .maybeSingle();

  if (zooter?.user_id === userId) return { participant: true, role: "contractor" };
  return { participant: false, role: null };
};

const privateRpc = (supa: any, fn: string, args: Record<string, unknown>) => {
  if (typeof supa.schema === "function") return supa.schema("private").rpc(fn, args);
  return supa.rpc(fn, args);
};

const getMaskedCallEligibility = async (supa: any, bookingId: string, actorId: string) => {
  const { data, error } = await privateRpc(supa, "can_create_masked_call", {
    p_booking_id: bookingId,
    p_actor_id: actorId,
  });
  if (error) throw new Error(`masked call eligibility check failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  return {
    allowed: Boolean(row?.allowed),
    reason: typeof row?.reason === "string" ? row.reason : "unknown",
    participantRole: typeof row?.participant_role === "string" ? row.participant_role : "none",
    eligibleUntil: typeof row?.eligible_until === "string" ? row.eligible_until : null,
  };
};

const insertOutbox = async (
  supa: any,
  rows: Record<string, unknown> | Record<string, unknown>[],
) => {
  const { error } = await supa.from("integration_outbox").insert(rows);
  if (error) throw new Error(`outbox insert failed: ${error.message}`);
};

const isAdminUser = async (supa: any, userId: string) => {
  const { data } = await supa
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  return Boolean(data?.id);
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

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json();
    const action = cleanText(body.action, 60);
    const userId = authData.user.id;

    if (retiredTypedAdminActions.has(action)) {
      return json({ error: "This admin action must use the typed audited admin Edge Function." }, 410, origin);
    }

    if (action === "admin_set_kyc_verification") {
      if (!(await isAdminUser(supa, userId))) return json({ error: "admin role required" }, 403, origin);
      const applicationId = cleanId(body.applicationId);
      const field = cleanText(body.field, 80);
      const status = cleanText(body.status, 20);
      if (!verificationFields.has(field) || !verificationStatuses.has(status)) return json({ error: "invalid verification update" }, 400, origin);

      const { data, error } = await supa
        .from("zooter_applications")
        .update({ [field]: status })
        .eq("id", applicationId)
        .select("*")
        .single();
      if (error || !data?.id) return json({ error: "verification update failed" }, 400, origin);
      return json({ application: data }, 200, origin);
    }

    if (action === "support_opened") {
      const ticketId = cleanId(body.ticketId);
      const { data: ticket, error } = await supa
        .from("support_tickets")
        .select("id,user_id,subject,body")
        .eq("id", ticketId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !ticket) return json({ error: "support ticket not found" }, 404, origin);

      const priority = getPriority(`${ticket.subject} ${ticket.body}`);
      const assistantSource = cleanText(body.assistantSource, 60) || "queued";
      const openaiRequestId = cleanText(body.openaiRequestId, 120) || null;

      await supa.from("support_followups").insert({
        ticket_id: ticket.id,
        user_id: userId,
        trigger_type: "manual",
        priority,
        notes: cleanText(ticket.subject, 240),
      });
      await supa.from("admin_review_queue").insert({
        queue_type: "support",
        subject_table: "support_tickets",
        subject_id: ticket.id,
        user_id: userId,
        priority,
        summary: cleanText(ticket.subject, 240) || "Support request",
      });
      await insertOutbox(supa, routeNotificationChannel("support_opened").map((channel) => ({
        source_table: "support_tickets",
        source_id: ticket.id,
        event_type: "support_opened",
        channel,
        owner: "Customer Support Agent",
        stack_tool: "Zoot in-app notification",
        payload: {
          ticket_id: ticket.id,
          subject: cleanText(ticket.subject, 240),
          priority,
          assistant_source: assistantSource,
          openai_request_id: openaiRequestId,
        },
        created_by: userId,
      })));

      return json({ queued: true, priority }, 200, origin);
    }

    if (action === "property_account_created") {
      const propertyAccountId = cleanId(body.propertyAccountId);
      const { data: account, error } = await supa
        .from("property_accounts")
        .select("id,user_id,account_type,name")
        .eq("id", propertyAccountId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !account) return json({ error: "property account not found" }, 404, origin);

      await supa.from("admin_review_queue").insert({
        queue_type: "b2b_invoice",
        subject_table: "property_accounts",
        subject_id: account.id,
        user_id: userId,
        priority: "normal",
        summary: `B2B monthly invoice setup for ${cleanText(account.name, 120) || "property account"}`,
      });
      await insertOutbox(supa, {
        source_table: "property_accounts",
        source_id: account.id,
        event_type: "property_account_created",
        channel: "airtable_ops",
        owner: "Strategy & Operations Agent",
        stack_tool: "Airtable ops queue",
        payload: { property_account_id: account.id, account_type: account.account_type },
        created_by: userId,
      });

      return json({ queued: true }, 200, origin);
    }

    if (action === "gift_clean_order_requested") {
      const serviceType = servicePrices[cleanText(body.serviceType, 40)] ? cleanText(body.serviceType, 40) : "residential";
      const amount = servicePrices[serviceType];
      const recipientName = cleanText(body.recipientName, 120);
      if (!recipientName) return json({ error: "recipient required" }, 400, origin);

      const { data: order, error: orderError } = await supa.from("gift_clean_orders").insert({
        purchaser_user_id: userId,
        recipient_name: recipientName,
        recipient_email: cleanText(body.recipientEmail, 160) || null,
        recipient_phone: cleanText(body.recipientPhone, 80) || null,
        occasion: cleanText(body.occasion, 120) || null,
        message: cleanText(body.message, 600) || null,
        service_type: serviceType,
        amount,
        status: "pending_payment",
      }).select("id").single();
      if (orderError || !order?.id) throw new Error("gift order insert failed");

      const { data: payment, error: paymentError } = await supa.from("payment_records").insert({
        user_id: userId,
        amount,
        currency: "ZAR",
        status: "pending",
        provider: "manual_pending",
        payment_kind: "gift_clean",
        meta: { gift_clean_order_id: order.id, service_type: serviceType, provider_required: "Ozow/Stitch credentials not connected" },
      }).select("id").single();
      if (paymentError || !payment?.id) throw new Error("gift payment insert failed");

      await supa.from("gift_clean_orders").update({ payment_record_id: payment.id }).eq("id", order.id);
      await supa.from("admin_review_queue").insert({
        queue_type: "payment",
        subject_table: "gift_clean_orders",
        subject_id: order.id,
        user_id: userId,
        priority: "normal",
        summary: `Gift clean pending payment for ${recipientName}`,
      });
      await insertOutbox(supa, [
        ...routeNotificationChannel("invoice_created").map((channel) => ({
          source_table: "gift_clean_orders",
          source_id: order.id,
          event_type: "gift_clean_invoice_created",
          channel,
          owner: "Retention & Loyalty Agent",
          stack_tool: channel === "brevo_email" ? "Brevo email queue" : "Zoot in-app notification",
          payload: { gift_clean_order_id: order.id, amount },
          status: "queued",
          approval_required: false,
          failure_mode: null,
          created_by: userId,
        })),
        {
          source_table: "payment_records",
          source_id: payment.id,
          event_type: "gift_clean_payment_authorisation_requested",
          channel: "payment_provider",
          owner: "Finance Operations",
          stack_tool: "Payment provider queue",
          payload: { payment_record_id: payment.id, amount },
          status: "needs_approval",
          approval_required: true,
          failure_mode: "Gift order remains pending until provider callback or admin confirmation exists.",
          created_by: userId,
        },
      ]);

      return json({ order_id: order.id, payment_record_id: payment.id, amount, status: "pending_payment" }, 200, origin);
    }

    if (action === "redeem_loyalty_credit") {
      const { data: loyalty } = await supa
        .from("loyalty_points")
        .select("user_id,free_credits")
        .eq("user_id", userId)
        .maybeSingle();
      if (!loyalty || Number(loyalty.free_credits) < 1) return json({ error: "no free credits available" }, 409, origin);

      await supa
        .from("loyalty_points")
        .update({ free_credits: Number(loyalty.free_credits) - 1 })
        .eq("user_id", userId);
      const { data: ledger, error: ledgerError } = await supa.from("zootcred_ledger").insert({
        user_id: userId,
        amount: 1,
        direction: "debit",
        reason: "redemption",
        status: "redeemed",
        meta: { redemption_type: "free_clean_credit" },
      }).select("id").single();
      if (ledgerError) throw new Error("zootcred ledger insert failed");
      await insertOutbox(supa, routeNotificationChannel("zootcred_update").map((channel) => ({
        source_table: "zootcred_ledger",
        source_id: ledger?.id ?? null,
        event_type: "zootcred_update",
        channel,
        owner: "Retention & Loyalty Agent",
        stack_tool: "Zoot in-app notification",
        payload: { redemption_type: "free_clean_credit" },
        created_by: userId,
      })));

      return json({ redeemed: true, free_credits: Number(loyalty.free_credits) - 1 }, 200, origin);
    }

    if (action === "booking_status_changed") {
      const bookingId = cleanId(body.bookingId);
      const status = cleanText(body.status, 40);
      const requestedStatus = (status === "enroute" ? "en_route" : status === "arrived" ? "in_progress" : status) as BookingStatus;
      const label = bookingStatusLabels[status] ?? bookingStatusLabels[requestedStatus];
      if (!label) return json({ error: "unsupported booking status" }, 400, origin);

      const { data: booking, error } = await supa
        .from("bookings")
        .select("id,user_id,zooter_id,scheduled_at,status,job_completed_at,cancelled_at,service,service_type")
        .eq("id", bookingId)
        .maybeSingle();
      if (error || !booking) return json({ error: "booking not found" }, 404, origin);

      const participant = await isBookingParticipant(supa, booking, userId);
      if (!participant.participant) return json({ error: "booking access denied" }, 403, origin);
      if (["enroute", "en_route", "arrived", "in_progress", "completed"].includes(status) && participant.role !== "contractor") {
        return json({ error: "contractor status action required" }, 403, origin);
      }
      const currentStatus = normaliseBookingStatus(booking.status);
      if (!currentStatus) return json({ error: "booking status is unsupported" }, 409, origin);
      const timelineOnlyJobStart = status === "in_progress" && currentStatus === "in_progress";
      if (!timelineOnlyJobStart) {
        try {
          assertTransition(currentStatus, requestedStatus);
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "invalid booking transition" }, 409, origin);
        }
      }

      const timestampField = status === "arrived" ? "arrived_at" : status === "in_progress" ? "job_started_at" : status === "completed" ? "job_completed_at" : null;
      const bookingStatus = requestedStatus;
      const updatePayload: Record<string, unknown> = { status: bookingStatus, updated_at: new Date().toISOString() };
      if (timestampField) updatePayload[timestampField] = new Date().toISOString();
      if (status === "completed") updatePayload.completed_at = new Date().toISOString();

      await supa.from("bookings").update(updatePayload).eq("id", booking.id);
      await supa.from("booking_status_events").insert({
        booking_id: booking.id,
        actor_id: userId,
        status,
        label,
        meta: { previous_status: currentStatus, canonical_status: bookingStatus },
      });

      const eventType = bookingEventTypes[status] ?? bookingEventTypes[requestedStatus];
      if (eventType) {
        await insertOutbox(supa, routeNotificationChannel(eventType).map((channel) => ({
          source_table: "bookings",
          source_id: booking.id,
          event_type: eventType,
          channel,
          owner: channel === "whatsapp_urgent" ? "Scheduling & Allocation Agent" : "Customer Support Agent",
          stack_tool: channel === "whatsapp_urgent" ? "WhatsApp urgent queue" : "Zoot in-app notification",
          payload: { booking_id: booking.id, status, scheduled_at: booking.scheduled_at },
          created_by: userId,
        })));
      }

      if (status === "completed") {
        const { data: lp } = await supa.from("loyalty_points").select("*").eq("user_id", booking.user_id).maybeSingle();
        if (lp) {
          const total = Number(lp.total_bookings) + 1;
          await supa.from("loyalty_points").update({
            total_bookings: total,
            points: Number(lp.points) + 10,
            free_credits: Number(lp.free_credits) + (total % 10 === 0 ? 1 : 0),
          }).eq("user_id", booking.user_id);
        }
        await supa.from("zooter_jobs").update({ state: "completed" }).eq("booking_id", booking.id);
      }

      return json({ status: bookingStatus, timeline_status: status }, 200, origin);
    }

    if (action === "booking_reschedule_requested") {
      const bookingId = cleanId(body.bookingId);
      const scheduledAtRaw = cleanText(body.scheduledAt, 80);
      const scheduledAt = new Date(scheduledAtRaw);
      if (!scheduledAtRaw || Number.isNaN(scheduledAt.getTime())) return json({ error: "invalid scheduled time" }, 400, origin);
      if (scheduledAt.getTime() <= Date.now()) return json({ error: "scheduled time must be in the future" }, 400, origin);

      const { data: booking, error } = await supa
        .from("bookings")
        .select("id,user_id,zooter_id,scheduled_at,status")
        .eq("id", bookingId)
        .maybeSingle();
      if (error || !booking) return json({ error: "booking not found" }, 404, origin);

      const participant = await isBookingParticipant(supa, booking, userId);
      const admin = await isAdminUser(supa, userId);
      if (!admin && participant.role !== "client") return json({ error: "booking access denied" }, 403, origin);
      if (!["pending", "confirmed", "reassigned"].includes(booking.status)) {
        return json({ error: "booking cannot be rescheduled in its current state" }, 409, origin);
      }

      const nextScheduledAt = scheduledAt.toISOString();
      const { data: updated, error: updateError } = await supa
        .from("bookings")
        .update({ scheduled_at: nextScheduledAt, status: "pending", updated_at: new Date().toISOString() })
        .eq("id", booking.id)
        .select("id,scheduled_at,status")
        .single();
      if (updateError || !updated?.id) return json({ error: "booking reschedule failed" }, 400, origin);

      await supa.from("booking_status_events").insert({
        booking_id: booking.id,
        actor_id: userId,
        status: "rescheduled",
        label: "Reschedule requested",
        meta: { previous_scheduled_at: booking.scheduled_at, scheduled_at: nextScheduledAt },
      });

      await insertOutbox(supa, routeNotificationChannel("booking_reschedule_requested").map((channel) => ({
        source_table: "bookings",
        source_id: booking.id,
        event_type: "booking_reschedule_requested",
        channel,
        owner: "Scheduling & Allocation Agent",
        stack_tool: channel === "whatsapp_urgent" ? "WhatsApp urgent queue" : "Zoot in-app notification",
        payload: { booking_id: booking.id, previous_scheduled_at: booking.scheduled_at, scheduled_at: nextScheduledAt },
        created_by: userId,
      })));

      return json({ booking_id: updated.id, scheduled_at: updated.scheduled_at, status: updated.status }, 200, origin);
    }

    if (action === "masked_call_requested") {
      const bookingId = cleanId(body.bookingId);
      const { data: booking, error } = await supa
        .from("bookings")
        .select("id,user_id,zooter_id,scheduled_at,status,job_completed_at,cancelled_at")
        .eq("id", bookingId)
        .maybeSingle();
      if (error || !booking) return json({ error: "booking not found" }, 404, origin);

      const participant = await isBookingParticipant(supa, booking, userId);
      if (!participant.participant) return json({ error: "booking access denied" }, 403, origin);

      const rateLimit = await consumeRateLimit(supa, {
        bucket: "twilio.masked_voice",
        actor: `ops-masked-call:${userId}:${booking.id}`,
        action: "create",
        limitCount: 3,
        windowSeconds: 600,
      });
      if (!rateLimit.allowed) return json({ error: "too many masked call requests" }, 429, origin);

      const eligibility = await getMaskedCallEligibility(supa, booking.id, userId);
      if (!eligibility.allowed) {
        return json({ error: "masked calls are available during the active booking window", reason: eligibility.reason }, 403, origin);
      }

      const twilioAccountReady = await isOperationalControlEnabled(supa, "twilio.operational_messages").catch(() => false);
      const maskedVoiceReady = await isOperationalControlEnabled(supa, "twilio.masked_voice").catch(() => false);
      const providerAllowed = twilioAccountReady && maskedVoiceReady;
      const calleeRole = eligibility.participantRole === "contractor" ? "client" : "contractor";
      const { data: call, error: callError } = await supa.from("masked_call_sessions").insert({
        booking_id: booking.id,
        caller_id: userId,
        callee_role: calleeRole,
        status: "queued",
        eligibility_checked_at: new Date().toISOString(),
        eligible_until: eligibility.eligibleUntil,
        provider_status: {
          provider: "twilio_voice_queue",
          provider_allowed: providerAllowed,
          operational_messages_ready: twilioAccountReady,
          masked_voice_ready: maskedVoiceReady,
          eligibility_reason: eligibility.reason,
          recording_enabled: false,
          transcription_enabled: false,
        },
      }).select("id").single();
      if (callError || !call?.id) throw new Error("masked call insert failed");

      await insertOutbox(supa, {
        source_table: "masked_call_sessions",
        source_id: call.id,
        event_type: "masked_voice_call_requested",
        channel: "twilio_voice",
        owner: "Customer Support Agent",
        stack_tool: "Twilio masked voice queue",
        payload: {
          booking_id: booking.id,
          callee_role: calleeRole,
          provider_allowed: providerAllowed,
          eligibility_reason: eligibility.reason,
          recording_enabled: false,
          transcription_enabled: false,
        },
        status: "needs_approval",
        approval_required: true,
        failure_mode: "Keep communication in chat if masked call setup fails.",
        created_by: userId,
      });

      return json({ call_session_id: call.id, callee_role: calleeRole }, 200, origin);
    }

    if (action === "trust_incident_submitted") {
      const bookingId = cleanId(body.bookingId);
      const incidentType = cleanText(body.incidentType, 80);
      const notes = cleanText(body.notes, 1000);
      if (!trustIncidentTypes.has(incidentType) || !notes) return json({ error: "invalid incident" }, 400, origin);

      const { data: booking } = await supa
        .from("bookings")
        .select("id,user_id,zooter_id")
        .eq("id", bookingId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!booking?.id || !booking.zooter_id) return json({ error: "booking not found" }, 404, origin);

      const urgent = incidentType === "suspicious_behaviour" || incidentType === "damages";
      const { data: incident, error: incidentError } = await supa.from("trust_incidents").insert({
        booking_id: booking.id,
        zooter_id: booking.zooter_id,
        user_id: userId,
        incident_type: incidentType,
        severity: urgent ? 4 : 3,
        notes,
      }).select("id").single();
      if (incidentError || !incident?.id) throw new Error("trust incident insert failed");

      await supa.from("admin_review_queue").insert({
        queue_type: "trust_incident",
        subject_table: "trust_incidents",
        subject_id: incident.id,
        user_id: userId,
        zooter_id: booking.zooter_id,
        booking_id: booking.id,
        priority: urgent ? "urgent" : "high",
        summary: `Trust incident: ${incidentType.replace(/_/g, " ")}`,
      });
      await insertOutbox(supa, routeNotificationChannel("critical_trust_safety_alert").map((channel) => ({
        source_table: "trust_incidents",
        source_id: incident.id,
        event_type: "critical_trust_safety_alert",
        channel,
        owner: "Trust & Safety Agent",
        stack_tool: channel === "whatsapp_urgent" ? "WhatsApp urgent queue" : "Zoot in-app notification",
        payload: { booking_id: booking.id, incident_type: incidentType },
        created_by: userId,
      })));

      return json({ incident_id: incident.id, queued: true }, 200, origin);
    }

    if (action === "review_followup_requested") {
      const reviewId = cleanId(body.reviewId);
      const { data: review } = await supa
        .from("post_job_reviews")
        .select("id,user_id,zooter_id,booking_id,rating,notes")
        .eq("id", reviewId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!review?.id) return json({ error: "review not found" }, 404, origin);
      if (Number(review.rating) > 2) return json({ queued: false }, 200, origin);

      await supa.from("support_followups").insert({
        booking_id: review.booking_id,
        user_id: userId,
        trigger_type: "low_rating",
        priority: "high",
        notes: cleanText(review.notes, 400) || "Low post-job rating",
      });
      await supa.from("admin_review_queue").insert({
        queue_type: "support",
        subject_table: "post_job_reviews",
        subject_id: review.id,
        user_id: userId,
        zooter_id: review.zooter_id,
        booking_id: review.booking_id,
        priority: "high",
        summary: "Low post-job rating needs follow-up",
      });

      return json({ queued: true }, 200, origin);
    }

    if (action === "zooter_application_submitted") {
      const applicationId = cleanId(body.applicationId);
      const { data: application } = await supa
        .from("zooter_applications")
        .select("*")
        .eq("id", applicationId)
        .eq("user_id", userId)
        .maybeSingle();
      if (!application?.id) return json({ error: "application not found" }, 404, origin);

      await supa.from("zooter_applications").update({
        status: "submitted",
        id_verification_status: "pending",
        selfie_verification_status: "pending",
        address_verification_status: "pending",
        banking_verification_status: "pending",
        reference_verification_status: "pending",
        background_check_status: "pending",
        third_party_verification_status: "pending",
        activation_locked_reason: "Verification, MIE screening, and required training must be complete before activation.",
      }).eq("id", application.id).eq("user_id", userId);

      await supa.from("notifications").insert({
        user_id: userId,
        kind: "zooter_application_submitted",
        title: "Application received",
        body: "Our trust team reviews ID, selfie, address, bank, references and background checks before activation.",
      });
      await supa.from("admin_review_queue").insert({
        queue_type: "kyc",
        subject_table: "zooter_applications",
        subject_id: application.id,
        user_id: userId,
        priority: "normal",
        summary: `KYC review for ${cleanText(application.full_name, 120) || "Zooter applicant"}`,
      });
      await insertOutbox(supa, [
        {
          source_table: "zooter_applications",
          source_id: application.id,
          event_type: "mie_screening_requested",
          channel: "mie_screening",
          owner: "Trust & Safety Agent",
          stack_tool: "MIE screening queue",
          payload: {
            application_id: application.id,
            suburb: cleanText(application.suburb, 120),
            years_experience: application.years_experience ?? null,
          },
          status: "needs_approval",
          approval_required: true,
          failure_mode: "Keep application pending until manual review is complete.",
          created_by: userId,
        },
        ...routeNotificationChannel("trust_verification_update").map((channel) => ({
          source_table: "zooter_applications",
          source_id: application.id,
          event_type: "trust_verification_update",
          channel,
          owner: channel === "brevo_email" ? "Contractor Success Agent" : "Trust & Safety Agent",
          stack_tool: channel === "brevo_email" ? "Brevo email queue" : "Zoot in-app notification",
          payload: { application_id: application.id, status: "submitted" },
          status: "queued",
          approval_required: false,
          failure_mode: null,
          created_by: userId,
        })),
      ]);

      return json({ application_id: application.id, status: "submitted" }, 200, origin);
    }

    if (action === "zooter_job_response") {
      const jobId = cleanId(body.jobId);
      const accept = body.accept === true;
      const { data: job } = await supa
        .from("zooter_jobs")
        .select("id,booking_id,zooter_id,state")
        .eq("id", jobId)
        .maybeSingle();
      if (!job?.id) return json({ error: "job not found" }, 404, origin);

      const { data: zooter } = await supa
        .from("zooters")
        .select("id,user_id")
        .eq("id", job.zooter_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!zooter?.id) return json({ error: "job access denied" }, 403, origin);

      const { data: booking } = await supa
        .from("bookings")
        .select("id,status")
        .eq("id", job.booking_id)
        .maybeSingle();
      if (!booking?.id) return json({ error: "booking not found" }, 404, origin);

      await supa.from("zooter_jobs").update({
        state: accept ? "accepted" : "declined",
        responded_at: new Date().toISOString(),
      }).eq("id", job.id).eq("zooter_id", zooter.id);

      if (accept) {
        let currentStatus = normaliseBookingStatus(booking.status);
        if (!currentStatus) return json({ error: "booking status is unsupported" }, 409, origin);

        const transitionEvents: Array<{ status: BookingStatus; label: string }> = [];
        const advance = (targetStatus: BookingStatus) => {
          assertTransition(currentStatus!, targetStatus);
          currentStatus = targetStatus;
          transitionEvents.push({ status: targetStatus, label: bookingStatusLabels[targetStatus] });
        };

        try {
          if (currentStatus === "payment_confirmed") advance("awaiting_assignment");
          if (currentStatus === "awaiting_assignment" || currentStatus === "replacement_offered") advance("assigned");
          if (currentStatus !== "contractor_accepted") advance("contractor_accepted");
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "invalid booking transition" }, 409, origin);
        }

        await supa.from("bookings").update({
          status: "contractor_accepted",
          assigned_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", job.booking_id);
        if (transitionEvents.length) {
          await supa.from("booking_status_events").insert(transitionEvents.map((event) => ({
            booking_id: job.booking_id,
            actor_id: userId,
            status: event.status,
            label: event.label,
          })));
        }
        await insertOutbox(supa, routeNotificationChannel("contractor_assigned").map((channel) => ({
          source_table: "bookings",
          source_id: job.booking_id,
          event_type: "contractor_assigned",
          channel,
          owner: "Scheduling & Allocation Agent",
          stack_tool: "Zoot in-app notification",
          payload: { booking_id: job.booking_id, zooter_id: zooter.id },
          created_by: userId,
        })));
      } else {
        await supa.from("admin_review_queue").insert({
          queue_type: "replacement",
          subject_table: "bookings",
          subject_id: job.booking_id,
          zooter_id: zooter.id,
          booking_id: job.booking_id,
          priority: "normal",
          summary: "Contractor declined job offer; review replacement availability",
        });
      }

      return json({ job_id: job.id, state: accept ? "accepted" : "declined" }, 200, origin);
    }

    return json({ error: "unsupported action" }, 400, origin);
  } catch {
    return json({ error: "ops workflow action failed" }, 500, origin);
  }
});
