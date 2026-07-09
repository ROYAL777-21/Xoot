import {
  assertBookingParticipant,
  cleanId,
  cleanText,
  fail,
  handlePreflight,
  insertNotification,
  insertOutbox,
  insertReviewQueue,
  isAdminUser,
  ok,
  readJson,
  requireAuth,
  writeAuditLog,
} from "../_shared/action-utils.ts";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";

const sensitivePatterns = [
  /\b(?:gate|alarm|lockbox|door|garage|parking)\s*(?:code|pin|password|passcode)?\s*(?:is|:|-)?\s*[\w#*-]{3,}\b/gi,
  /\b(?:otp|one[-\s]?time code|verification code)\s*(?:is|:|-)?\s*\d{4,8}\b/gi,
  /\b(?:cvv|cvc)\s*(?:is|:|-)?\s*\d{3,4}\b/gi,
  /\b(?:\d[ -]?){13,19}\b/g,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
  /\+?\d[\d\s().-]{7,}\d/g,
  /\b(?:api[_\s-]?key|secret|token|password)\s*(?:is|:|-)?\s*[\w._~:/+=-]{8,}\b/gi,
  /\b(?:sk|sbp|sb_secret|cfat|figd|cr)-[A-Za-z0-9._-]{8,}\b/g,
];

const redactSensitiveText = (value: string, maxLength = 1800) => {
  const cleaned = cleanText(value, maxLength);
  return sensitivePatterns.reduce((text, pattern) => text.replace(pattern, "[redacted]"), cleaned);
};

const textIncludesAny = (text: string, words: string[]) => {
  const normalized = text.toLowerCase();
  return words.some((word) => normalized.includes(word));
};

const inferIntentCategory = (text: string, requested: string) => {
  const normalized = `${requested} ${text}`.toLowerCase();
  if (textIncludesAny(normalized, ["danger", "injury", "violence", "threat", "harassment", "unsafe", "theft", "privacy", "breach", "stalking"])) {
    return "trust_safety";
  }
  if (textIncludesAny(normalized, ["payment", "refund", "charge", "invoice", "paid", "card", "ozow", "stitch"])) return "payment";
  if (textIncludesAny(normalized, ["cancel", "reschedule", "late", "arrived", "assignment", "zooter", "booking"])) return "booking";
  if (textIncludesAny(normalized, ["care+", "care plus", "membership"])) return "care_plus";
  if (textIncludesAny(normalized, ["zootcred", "referral", "reward", "credit"])) return "zootcred_referrals";
  if (textIncludesAny(normalized, ["cover", "claim", "damage", "insurance"])) return "booking_cover";
  if (textIncludesAny(normalized, ["partner", "property manager", "airbnb", "office manager", "body corporate"])) return "partnership";
  if (textIncludesAny(normalized, ["sign in", "login", "otp", "password", "account", "security"])) return "account_security";
  return "general_support";
};

const inferUrgencyLevel = (text: string, intentCategory: string) => {
  const normalized = text.toLowerCase();
  if (textIncludesAny(normalized, ["fire", "medical emergency", "immediate danger", "violence", "forced entry", "injury", "crime"])) return 5;
  if (intentCategory === "trust_safety") return 4;
  if (textIncludesAny(normalized, ["chargeback", "fraud", "account accessed", "privacy breach", "harassment", "theft"])) return 4;
  if (textIncludesAny(normalized, ["no show", "has not arrived", "late", "payment", "refund", "replacement", "complaint", "damage"])) return 3;
  return 2;
};

const priorityFromUrgency = (urgencyLevel: number) => {
  if (urgencyLevel >= 4) return "urgent";
  if (urgencyLevel === 3) return "high";
  return "normal";
};

const queueFromIntent = (intentCategory: string) => {
  if (intentCategory === "trust_safety" || intentCategory === "account_security") return "trust_incident";
  if (intentCategory === "payment" || intentCategory === "booking_cover") return "payment";
  if (intentCategory === "booking") return "support";
  return "support";
};

const resolveRoleType = async (supa: any, userId: string) => {
  if (await isAdminUser(supa, userId)) return "admin";

  const { data: zooter } = await supa
    .from("zooters")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return zooter?.id ? "zooter" : "user";
};

const controlsEnabled = async (supa: any) => {
  try {
    const [globalEnabled, supportCreation, humanHandoff, toolEnabled, killGlobal, killHandoff] = await Promise.all([
      isOperationalControlEnabled(supa, "concierge.enabled"),
      isOperationalControlEnabled(supa, "concierge.support_case_creation"),
      isOperationalControlEnabled(supa, "concierge.human_handoff"),
      isOperationalControlEnabled(supa, "concierge.handoff.case_creation_tool"),
      isOperationalControlEnabled(supa, "concierge.kill.global"),
      isOperationalControlEnabled(supa, "concierge.kill.support_handoff"),
    ]);

    return globalEnabled && supportCreation && humanHandoff && toolEnabled && !killGlobal && !killHandoff;
  } catch (error) {
    console.warn("Concierge handoff controls unavailable; failing closed", error);
    return false;
  }
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  const auth = await requireAuth(req, origin);
  if (auth.response) return auth.response;
  const { user, supa } = auth as { user: any; supa: any };

  try {
    if (!(await controlsEnabled(supa))) {
      return fail(
        "Concierge handoff is not enabled yet. Please use the support page for this request.",
        origin,
        409,
        { fallback_route: "/app/support" },
      );
    }

    const rateLimit = await consumeRateLimit(supa, {
      bucket: "concierge_handoff",
      actor: user.id,
      action: "create_concierge_handoff",
      limitCount: 4,
      windowSeconds: 3600,
    });
    if (!rateLimit.allowed) return fail("too many support handoff requests", origin, 429);

    const body = await readJson(req);
    const rawIssue = cleanText(body.issue ?? body.message ?? body.description ?? body.body, 2200);
    if (!rawIssue || rawIssue.length < 8) return fail("issue description required", origin, 400);

    const bookingId = cleanId(body.bookingId ?? body.booking_id) || null;
    const requestedIntent = cleanText(body.intent_category ?? body.category, 80);
    const redactedIssue = redactSensitiveText(rawIssue, 1800);
    const subject = cleanText(body.subject, 140) || "Concierge support handoff";
    const roleType = await resolveRoleType(supa, user.id);
    const intentCategory = inferIntentCategory(redactedIssue, requestedIntent);
    const urgencyLevel = inferUrgencyLevel(redactedIssue, intentCategory);
    const priority = priorityFromUrgency(urgencyLevel);
    const consentToShareContext = body.consent_to_share_context === true || body.consentToShareContext === true;

    let booking: any = null;
    let participantRole = "none";
    if (bookingId) {
      const { data } = await supa
        .from("bookings")
        .select("id,user_id,zooter_id,status,service_type,scheduled_at")
        .eq("id", bookingId)
        .maybeSingle();
      if (!data?.id) return fail("booking not found", origin, 404);

      const participant = await assertBookingParticipant(supa, data, user.id);
      if (!participant.participant) return fail("booking access denied", origin, 403);
      booking = data;
      participantRole = participant.role;
    }

    const safeContext = {
      answer_type: "human_handoff",
      source: "zoot_concierge",
      intent_category: intentCategory,
      urgency_level: urgencyLevel,
      booking_linked: Boolean(booking?.id),
      booking_status: booking?.status ?? null,
      service_type: booking?.service_type ?? null,
      participant_role: participantRole,
      consent_to_share_context: consentToShareContext,
      sensitive_data_redacted: redactedIssue !== rawIssue,
    };

    const { data: ticket, error: ticketError } = await supa
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject,
        body: redactedIssue,
        status: urgencyLevel >= 4 ? "escalated" : "open",
      })
      .select("id,status")
      .single();
    if (ticketError || !ticket?.id) throw new Error("support ticket insert failed");

    const { data: handoff, error: handoffError } = await supa
      .from("support_handoff_contexts")
      .insert({
        ticket_id: ticket.id,
        user_id: user.id,
        booking_id: booking?.id ?? null,
        role_type: roleType,
        intent_category: intentCategory,
        urgency_level: urgencyLevel,
        customer_stated_issue: redactedIssue,
        safe_context: safeContext,
        recommended_queue: queueFromIntent(intentCategory),
        recommended_owner: urgencyLevel >= 4 ? "Trust and Safety" : "Customer Support Agent",
        requested_action: urgencyLevel >= 4 ? "urgent_human_review" : "review_and_reply",
        consent_to_share_context: consentToShareContext,
      })
      .select("id,correlation_id")
      .single();
    if (handoffError || !handoff?.id) throw new Error("handoff context insert failed");

    await supa.from("support_followups").insert({
      ticket_id: ticket.id,
      booking_id: booking?.id ?? null,
      user_id: user.id,
      trigger_type: urgencyLevel >= 4 ? "incident" : "manual",
      priority,
      notes: `Concierge handoff: ${intentCategory}`,
    });

    await insertReviewQueue(supa, {
      queueType: queueFromIntent(intentCategory),
      subjectTable: "support_tickets",
      subjectId: ticket.id,
      userId: user.id,
      zooterId: booking?.zooter_id ?? null,
      bookingId: booking?.id ?? null,
      priority,
      summary: `${subject}: ${intentCategory}`,
    });

    await insertNotification(supa, {
      userId: user.id,
      kind: "concierge_handoff_created",
      title: urgencyLevel >= 4 ? "Urgent support request sent" : "Support request sent",
      body: "Your request was sent to the Zoot support team for review through the approved support channel.",
      link: "/app/support",
    });

    await insertOutbox(supa, {
      source_table: "support_tickets",
      source_id: ticket.id,
      event_type: "concierge_handoff_created",
      channel: "in_app",
      owner: "Customer Support Agent",
      stack_tool: "Zoot Concierge handoff",
      payload: {
        ticket_id: ticket.id,
        handoff_id: handoff.id,
        urgency_level: urgencyLevel,
        intent_category: intentCategory,
        booking_id: booking?.id ?? null,
        correlation_id: handoff.correlation_id,
      },
      status: "queued",
      approval_required: urgencyLevel >= 4,
      created_by: user.id,
    });

    await writeAuditLog(supa, {
      actorId: user.id,
      action: "create_concierge_handoff",
      targetTable: "support_tickets",
      targetId: ticket.id,
      changes: {
        handoff_id: handoff.id,
        intent_category: intentCategory,
        urgency_level: urgencyLevel,
        booking_id: booking?.id ?? null,
        sensitive_data_redacted: redactedIssue !== rawIssue,
      },
      reason: "Concierge created sanitized human handoff request",
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    return ok(
      {
        case_id: ticket.id,
        handoff_id: handoff.id,
        status: ticket.status,
        intent_category: intentCategory,
        urgency_level: urgencyLevel,
        support_route: "/app/support",
        next_message: "I have sent this to the Zoot support team for review through the approved support channel.",
      },
      origin,
      201,
    );
  } catch (error) {
    console.error("create-concierge-handoff failed", error);
    return fail("support handoff failed", origin, 500);
  }
});
