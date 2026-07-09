export type ZootConciergeFallbackReply = {
  response: string;
  source: "local_knowledge";
  cta?: {
    label: string;
    to: string;
  };
};

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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => {
    const phrase = escapeRegExp(term).replace(/ /g, "\\s+");
    return new RegExp(`(^|[^a-z0-9])${phrase}([^a-z0-9]|$)`, "i").test(text);
  });

const reply = (response: string, cta?: ZootConciergeFallbackReply["cta"]): ZootConciergeFallbackReply => ({
  response,
  source: "local_knowledge",
  cta,
});

const protectedCta = (signedIn: boolean, label: string, to: string) => ({
  label: signedIn ? label : "Sign in to continue",
  to: signedIn ? to : "/auth",
});

export const getLocalZootConciergeReply = (rawText: string, signedIn: boolean): ZootConciergeFallbackReply | null => {
  const text = rawText.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (/^(hi|hello|hey|howzit|good (morning|afternoon|evening))\b/.test(text)) {
    return reply(
      "Hi, I am Zoot Concierge. I can help you choose a cleaning service, prepare for a booking, understand Care+, plan an office or Airbnb reset, or find the right protected support path. For private booking, payment, address or account help, sign in first.",
    );
  }

  if (includesAny(text, ["what can you do", "help me", "what can i ask", "options", "menu"])) {
    return reply(
      "I can help with five safe things: choose the right clean, estimate what details to prepare, explain Care+ and ZootCred, guide hosts/offices/property managers, and route sensitive issues to protected Support. I cannot change bookings, approve refunds, collect access codes, or treat chat as payment confirmation.",
      protectedCta(signedIn, "Start a booking", "/app"),
    );
  }

  if (includesAny(text, ["what is zoot", "about zoot", "who are you", "what do you do"])) {
    return reply(
      "Zoot is a premium South African home-care platform for vetted independent cleaning contractors called Zooters. It is built for once-off cleaning, recurring home care, Airbnb turnovers, landlord handovers, small office resets, protected support and repeatable quality.",
    );
  }

  if (includesAny(text, ["where is my cleaner", "track", "tracking", "eta", "late", "not arrived"])) {
    return reply(
      signedIn
        ? "Open your booking detail page to see the latest safe status, ETA and support options. If the booking is late or the ETA looks wrong, use Support so the team can review it with the real booking record."
        : "Tracking and ETA are private booking details. Sign in, open your booking, and use Support if the Zooter is late or the status looks wrong.",
      protectedCta(signedIn, "Open bookings", "/app/bookings"),
    );
  }

  if (includesAny(text, ["office", "business", "salon", "clinic", "studio", "workspace"])) {
    return reply(
      "Zoot supports business cleaning needs such as quick office resets, studios, salons, clinics and client-facing spaces. A strong request includes timing, access notes, priority rooms, bathrooms or kitchenette needs, parking and whether the clean should recur.",
      protectedCta(signedIn, "Set up office cleaning", "/app/properties/office"),
    );
  }

  if (includesAny(text, ["launch", "area", "where", "bryanston", "rosebank", "sandton", "midrand", "fourways", "pretoria", "cape town"])) {
    return reply(
      `Zoot is prioritising Johannesburg launch density first: ${launchAreas.join(", ")} and nearby approved suburbs. Pretoria and Cape Town are expansion targets after supply, support, payments and quality controls are ready.`,
    );
  }

  if (includesAny(text, ["price", "pricing", "cost", "how much", "fee"])) {
    return reply(
      "Pricing depends on service type, home size, add-ons, timing, number of Zooters and coverage. Exact totals must come from the signed-in booking flow so backend pricing and payment state stay authoritative.",
      protectedCta(signedIn, "Check live pricing", "/app"),
    );
  }

  if (includesAny(text, ["care+", "care plus", "membership", "home memory", "favourite zooter", "favorite zooter"])) {
    return reply(
      "Care+ details need the approved Care+ policy. I can guide you to the Care+ page or support, but I cannot promise pricing, benefits, billing outcomes, credits or preferred Zooter availability from this chat.",
      { label: "View Care+ membership", to: "/care-plus" },
    );
  }

  if (includesAny(text, ["zootcred", "credit", "credits", "loyalty"])) {
    return reply(
      "ZootCred is a ledger-backed credit system for eligible rewards, referrals and member benefits. Balances should only be trusted inside the signed-in app because credits, expiry and debits are controlled by backend records.",
    );
  }

  if (includesAny(text, ["urgent", "emergency", "same day", "same-day", "today", "tonight", "last minute"])) {
    return reply(
      "For urgent or same-day cleaning, open the booking flow and choose the earliest available time. Availability depends on your area, service scope, travel time and live Zooter capacity. If the clean is tied to a guest arrival, inspection, complaint or safety issue, use Support after booking so a human can prioritise the case.",
      protectedCta(signedIn, "Find the earliest slot", "/app"),
    );
  }

  if (includesAny(text, ["prepare", "before", "ready", "what should i do", "before zooter", "before cleaner"])) {
    return reply(
      "Before your Zooter arrives, clear personal valuables, note priority rooms, secure pets, add parking and access instructions inside the protected booking fields, and photograph anything fragile or unusual. Keep gate codes, alarm codes and lockbox details out of chat.",
      protectedCta(signedIn, "Update home notes", "/app/profile"),
    );
  }

  if (includesAny(text, ["how long", "duration", "hours", "bedroom", "bathroom", "deep clean", "standard clean", "spring clean"])) {
    return reply(
      "A good duration choice starts with the home type, bedrooms, bathrooms, priority rooms, and whether you need a standard reset or deeper catch-up clean. If there is heavy build-up, post-event mess, pets, or laundry-style add-ons, choose more time rather than compressing the job. The signed-in booking flow keeps final duration and price authoritative.",
      protectedCta(signedIn, "Choose service duration", "/app"),
    );
  }

  if (includesAny(text, ["recurring", "weekly", "fortnight", "biweekly", "monthly", "repeat clean", "regular clean"])) {
    return reply(
      "For recurring cleaning, Zoot works best when you save clear home notes: preferred products, rooms to prioritise, pet routines, parking, and what a great clean looks like to you. If Care+ is available, confirm the current benefits on the Care+ page before relying on membership details.",
    );
  }

  if (includesAny(text, ["pet", "pets", "dog", "cat", "allergy", "asthma", "eco", "non toxic", "fragrance", "chemical"])) {
    return reply(
      "Add pets, allergies, asthma, fragrance preferences and product sensitivities inside the protected booking notes before the clean. Zooters should see what helps them work respectfully and safely, but access codes and private household-sensitive details must stay in the protected access fields, not chat.",
    );
  }

  if (includesAny(text, ["cancel", "refund", "reschedule", "change booking", "payment failed", "payment issue", "charge"])) {
    return reply(
      "Cancellations, refunds, failed payments and booking changes must be handled inside the signed-in app so Zoot can use the real booking state and keep an audit trail. I can explain the process, but I cannot change payments, refunds or bookings from public chat.",
      protectedCta(signedIn, "Open protected Support", "/app/support"),
    );
  }

  if (includesAny(text, ["damage", "broken", "stolen", "theft", "harassment", "unsafe", "complaint", "incident", "police", "legal"])) {
    return reply(
      "That should go to protected Support for human review. Use the signed-in app so Zoot can attach the real booking, timestamps, photos and messages. Do not put accusations, private addresses, access codes, ID numbers or payment details in public chat.",
      protectedCta(signedIn, "Escalate to Support", "/app/support"),
    );
  }

  if (includesAny(text, ["gate code", "alarm code", "lockbox", "access code", "access instructions", "exact address", "private note"])) {
    return reply(
      "Do not put access codes, alarm codes, lockbox details, exact private address notes or household-sensitive details in chat. Zoot stores those in protected booking fields and shows them only to the assigned Zooter during the approved access window.",
    );
  }

  if (includesAny(text, ["tip", "tips", "tipping", "rate the zooter", "review"])) {
    return reply(
      "The best way to support a great Zooter is to rate the job clearly, mention what went well, and book them again when available. If tipping is available in your signed-in flow, use the app so payment records remain auditable and the Zooter receives the right allocation.",
    );
  }

  if (includesAny(text, ["airbnb", "guest", "turnover", "host", "short-term", "short term"])) {
    return reply(
      "For Airbnb and short-term rental turnovers, Zoot is built around saved property notes, guest-ready checklists, access rules, linen instructions and support routing. Same-day turnovers depend on location, scope, timing and live Zooter availability.",
      protectedCta(signedIn, "Set up host turnover", "/app/properties/airbnb"),
    );
  }

  if (includesAny(text, ["landlord", "property manager", "property managers", "handover", "move out", "move-out", "inspection"])) {
    return reply(
      "Landlords and property managers can use Zoot for handovers, move-out cleans, inspection-ready resets and repeat property profiles. The best setup keeps each property's notes, recurring needs and safe access rules in the app so every clean is easier to brief and audit.",
      protectedCta(signedIn, "Add a property profile", "/app/properties"),
    );
  }

  if (includesAny(text, ["siri", "voice", "assistant", "gemini", "google assistant", "shortcut", "clean my house", "book a cleaner for"])) {
    return reply(
      "Zoot's native assistant flow is designed to open the right in-app booking screen from phrases like 'book a cleaner', 'clean my house', or 'I need my office cleaned'. Voice can start the handoff, but address, duration, payment, and final confirmation stay inside the authenticated app.",
      protectedCta(signedIn, "Open voice-ready booking", "/app"),
    );
  }

  if (includesAny(text, ["join", "work", "contractor", "apply", "become a zooter", "zooter onboarding"])) {
    return reply(
      "To become a Zooter, use the Become a Zooter application flow. Zooters complete onboarding, identity and document checks, training and operational readiness before live jobs. Do not send ID documents or banking details through chat.",
      protectedCta(signedIn, "Apply to become a Zooter", "/zooter/apply"),
    );
  }

  if (includesAny(text, ["book", "booking", "cleaner", "cleaning", "clean", "zooter"])) {
    return reply(
      signedIn
        ? "To book, open the app, choose the service type, area, date, time, duration, property notes and preferred Zooter options, then confirm payment through the protected flow. Keep private access details in protected booking fields rather than chat."
        : "You can ask general booking questions here. Sign in to create a booking so Zoot can protect your address, payment state, access notes and support history. The booking flow will ask for service type, date, time, duration and property notes.",
      protectedCta(signedIn, "Start booking", "/app"),
    );
  }

  if (includesAny(text, ["safe", "safety", "trust", "vetted", "screen", "background", "security"])) {
    return reply(
      "Zoot is designed around trust: vetted Zooters, protected app communication, role-scoped data access, logged sensitive-data reveals and human review for risky support issues. Never share gate codes, OTPs or private access details in chat.",
    );
  }

  return reply(
    "I can answer general Zoot questions about cleaning, Care+, ZootCred, launch areas, office resets, Airbnb turnovers and becoming a Zooter. For anything account-specific, payment-related, private, unsafe or urgent, sign in and use protected Support so a human can review it.",
  );
};
