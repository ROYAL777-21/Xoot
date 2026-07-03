export type ZootKnowledgeReply = {
  response: string;
  source: "knowledge_base";
  knowledge_id: string;
  knowledge_version: string;
  answer_type: "general_guidance" | "safe_route" | "support_escalation";
  confidence: "high" | "medium";
};

export const zootKnowledgeVersion = "2026-06-29.phase5";

const launchAreas = [
  "Sandton",
  "Bryanston",
  "Rosebank",
  "Midrand",
  "Fourways",
  "Hyde Park",
  "Parkhurst",
  "Melville",
  "Waterfall",
  "Dainfern",
  "Bedfordview",
  "Braamfontein",
];

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, "i").test(text));

const reply = (
  response: string,
  knowledgeId: string,
  answerType: ZootKnowledgeReply["answer_type"] = "general_guidance",
  confidence: ZootKnowledgeReply["confidence"] = "high",
): ZootKnowledgeReply => ({
  response,
  source: "knowledge_base",
  knowledge_id: knowledgeId,
  knowledge_version: zootKnowledgeVersion,
  answer_type: answerType,
  confidence,
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

export const sanitiseSupportText = (value: unknown, maxLength = 1500) =>
  typeof value === "string"
    ? stripUnsafeText(value).replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

export const redactSupportText = (value: string) =>
  value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)\b/g, "[phone redacted]")
    .replace(/\b\d{13}\b/g, "[id number redacted]")
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, "[card number redacted]")
    .replace(/\b(gate|access|lockbox|alarm|door|garage)\s*(code|pin|password)?\s*[:#-]?\s*[A-Z0-9-]{3,}\b/gi, "$1 code [redacted]")
    .replace(/\b(password|passcode|otp|one-time code)\s*[:#-]?\s*\S+/gi, "$1 [redacted]")
    .slice(0, 1200);

export const zootKnowledgeContext = [
  "Zoot is a premium South African home-care platform for vetted independent cleaning contractors called Zooters.",
  `Launch focus: ${launchAreas.join(", ")} and nearby approved Johannesburg areas before wider Gauteng, Pretoria, then Cape Town expansion.`,
  "Core services: once-off home cleaning, recurring home care, express resets, deep cleaning, moving cleans, Airbnb turnover cleaning, landlord handovers, and quick office resets.",
  "Care+ is the Zoot membership layer. Current detailed Care+ pricing, benefits, billing and cancellation wording requires the approved Care+ policy and should be shown through the Care+ page or protected support route.",
  "ZootCred is a ledger-based credit system. Credits and debits must come from audited server-side records, not editable wallet totals.",
  "Sensitive access details such as gate codes, alarm codes, lockbox codes, and private household notes must stay inside protected app flows and are never requested in chat.",
  "Payments, refunds, booking changes, replacements, damage reports, complaints, and private account details require authenticated support and human review where risk exists.",
  "Zooters must complete onboarding, document checks, training, and operational readiness before live work.",
].join("\n");

export const getZootKnowledgeReply = (rawText: string, signedIn: boolean): ZootKnowledgeReply | null => {
  const text = rawText.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (/^(hi|hello|hey|howzit|good (morning|afternoon|evening))\b/.test(text)) {
    return reply(
      "Hi, I am Zoot Concierge. I can help with Zoot services, Care+, launch areas, booking prep, office or Airbnb cleaning, and becoming a Zooter. For anything private about your booking, payment, address or account, sign in first.",
      "zoot-overview",
    );
  }

  if (includesAny(text, ["what is zoot", "about zoot", "who are you", "what do you do"])) {
    return reply(
      "Zoot is a premium home-care platform for South African homes, hosts, landlords, property managers and small offices. It helps clients book vetted Zooters, save property preferences, keep support inside the app, and make repeat cleaning feel organised instead of improvised.",
      "zoot-overview",
    );
  }

  if (includesAny(text, ["launch", "area", "where", "bryanston", "rosebank", "sandton", "midrand", "fourways", "pretoria", "cape town"])) {
    return reply(
      `Zoot is prioritising Johannesburg launch density first: ${launchAreas.join(", ")} and nearby approved suburbs. Pretoria and Cape Town are expansion targets after supply, support, payments and quality controls are ready, so live availability should still be checked in the app.`,
      "service-area-guide",
    );
  }

  if (includesAny(text, ["price", "pricing", "cost", "how much", "fee"])) {
    return reply(
      "Pricing depends on service type, home size, add-ons, timing, number of Zooters and coverage. For an exact booking total, use the authenticated booking flow so the app can calculate the real service and payment state.",
      "payment-and-invoice-guide",
      "safe_route",
    );
  }

  if (includesAny(text, ["care+", "care plus", "membership", "home memory", "favourite zooter", "favorite zooter"])) {
    return reply(
      "Care+ details need the approved Care+ policy. I can guide you to the Care+ page or support, but I cannot promise pricing, benefits, billing outcomes, credits or preferred Zooter availability from this chat.",
      "care-plus-guide",
      "safe_route",
      "medium",
    );
  }

  if (includesAny(text, ["zootcred", "credit", "credits", "loyalty"])) {
    return reply(
      "ZootCred is Zoot's credit system for eligible rewards, referrals and member benefits. Balances come from the ZootCred ledger with expiry rules, so credits should only be trusted when shown inside the signed-in app.",
      "zootcred-and-referrals-guide",
    );
  }

  if (includesAny(text, ["urgent", "emergency", "same day", "same-day", "today", "tonight", "last minute"])) {
    return reply(
      "For urgent or same-day cleaning, open the booking flow and choose the earliest available time. Availability depends on your area, service scope, travel time and live Zooter capacity. If the clean is tied to a guest arrival, inspection, complaint or safety issue, use Support after booking so a human can prioritise the case.",
      "safety-and-urgent-support-guide",
      "support_escalation",
    );
  }

  if (includesAny(text, ["prepare", "before", "ready", "what should i do", "before zooter", "before cleaner"])) {
    return reply(
      "Before your Zooter arrives, clear personal valuables, note priority rooms, secure pets, add parking and access instructions inside the protected booking fields, and photograph anything fragile or unusual. Keep gate codes, alarm codes and lockbox details out of chat.",
      "customer-preparation-guide",
    );
  }

  if (includesAny(text, ["cancel", "refund", "reschedule", "change booking", "payment failed", "payment issue", "charge"])) {
    return reply(
      "Cancellations, refunds, failed payments and booking changes must be handled inside the signed-in app so Zoot can use the real booking state and keep an audit trail. I can explain the process, but I cannot change payments, refunds or bookings from public chat.",
      "cancellation-and-rescheduling-guide",
      "support_escalation",
      "medium",
    );
  }

  if (includesAny(text, ["where is my cleaner", "track", "tracking", "eta", "late", "not arrived"])) {
    return reply(
      signedIn
        ? "Open your booking detail page to see the latest safe status, ETA and support options. If the booking is late or the ETA looks wrong, use Support so the team can review it with the real booking record."
        : "Tracking and ETA are private booking details. Sign in, open your booking, and use Support if the Zooter is late or the status looks wrong.",
      "booking-status-guide",
      "safe_route",
    );
  }

  if (includesAny(text, ["gate code", "alarm code", "lockbox", "access code", "access instructions", "exact address", "private note"])) {
    return reply(
      "Do not put access codes, alarm codes, lockbox details, exact private address notes or household-sensitive details in chat. Zoot stores those in protected booking fields and shows them only to the assigned Zooter during the approved access window.",
      "privacy-and-data-guide",
      "support_escalation",
    );
  }

  if (includesAny(text, ["office", "business", "salon", "clinic", "studio", "workspace"])) {
    return reply(
      "Zoot supports business cleaning needs such as quick office resets, studios, salons, clinics and client-facing spaces. The best request includes access notes, priority rooms, bathrooms or kitchenette needs, timing, parking and whether it should become recurring.",
      "service-catalogue",
    );
  }

  if (includesAny(text, ["airbnb", "guest", "turnover", "host", "short-term", "short term"])) {
    return reply(
      "For Airbnb and short-term rental turnovers, Zoot is built around saved property notes, guest-ready checklists, access rules, linen instructions and support routing. Same-day turnovers depend on location, scope, timing and live Zooter availability.",
      "service-catalogue",
    );
  }

  if (includesAny(text, ["landlord", "property manager", "property managers", "handover", "move out", "move-out", "inspection"])) {
    return reply(
      "Landlords and property managers can use Zoot for handovers, move-out cleans, inspection-ready resets and repeat property profiles. Keep access and property notes inside the app so each clean becomes easier to brief and audit.",
      "property-manager-partnership-guide",
    );
  }

  if (includesAny(text, ["book", "booking", "cleaner", "cleaning", "clean", "zooter"])) {
    return reply(
      signedIn
        ? "To book, open the app, choose the service type, area, date, time, duration, property notes and preferred Zooter options, then confirm payment through the protected flow. Keep private access details in protected booking fields rather than chat."
        : "You can ask general booking questions here, but sign in to create a booking. Zoot will ask for service type, launch area, date, time, duration, property notes and preferred Zooter options inside the protected app flow.",
      "booking-guide",
      "safe_route",
    );
  }

  if (includesAny(text, ["join", "work", "contractor", "apply", "become a zooter", "zooter onboarding"])) {
    return reply(
      "To become a Zooter, use the Become a Zooter application flow. Zooters complete onboarding, identity and document checks, training and operational readiness before live jobs. Do not send ID documents or banking details through chat.",
      "zooter-support-guide",
    );
  }

  if (includesAny(text, ["safe", "safety", "trust", "vetted", "screen", "background", "security"])) {
    return reply(
      "Zoot is designed around trust: vetted Zooters, protected app communication, role-scoped data access, logged sensitive-data reveals and human review for risky support issues. Never share gate codes, OTPs or private access details in chat.",
      "privacy-and-data-guide",
    );
  }

  return null;
};
