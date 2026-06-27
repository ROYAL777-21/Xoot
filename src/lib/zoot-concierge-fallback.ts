export type ZootConciergeFallbackReply = {
  response: string;
  source: "local_knowledge";
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

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const reply = (response: string): ZootConciergeFallbackReply => ({ response, source: "local_knowledge" });

export const getLocalZootConciergeReply = (rawText: string, signedIn: boolean): ZootConciergeFallbackReply | null => {
  const text = rawText.toLowerCase().replace(/\s+/g, " ").trim();
  if (!text) return null;

  if (/^(hi|hello|hey|howzit|good (morning|afternoon|evening))\b/.test(text)) {
    return reply(
      "Hi, I am Zoot Concierge. I can help with Zoot services, Care+, ZootCred, launch areas, office cleaning, Airbnb turnovers, booking prep and becoming a Zooter. For private booking, payment, address or account help, sign in first.",
    );
  }

  if (includesAny(text, ["what is zoot", "about zoot", "who are you", "what do you do"])) {
    return reply(
      "Zoot is a premium South African home-care platform for vetted independent cleaning contractors called Zooters. It is built for once-off cleaning, recurring home care, Airbnb turnovers, landlord handovers, small office resets, protected support and repeatable quality.",
    );
  }

  if (includesAny(text, ["launch", "area", "where", "bryanston", "rosebank", "sandton", "midrand", "fourways", "pretoria", "cape town"])) {
    return reply(
      `Zoot is prioritising Johannesburg launch density first: ${launchAreas.join(", ")} and nearby approved suburbs. Pretoria and Cape Town are expansion targets after supply, support, payments and quality controls are ready.`,
    );
  }

  if (includesAny(text, ["price", "pricing", "cost", "how much", "fee"])) {
    return reply(
      "Pricing depends on service type, home size, add-ons, timing, number of Zooters and coverage. Care+ is listed publicly as R99/month where live. Exact totals must come from the signed-in booking flow so backend pricing and payment state stay authoritative.",
    );
  }

  if (includesAny(text, ["care+", "care plus", "membership", "home memory", "favourite zooter", "favorite zooter"])) {
    return reply(
      "Care+ is Zoot's membership layer for homes that want Home Memory, favourite Zooter workflows, smart reminders, priority support and member ZootCred benefits. It is designed for repeat households, hosts, landlords and offices that want less repeated admin.",
    );
  }

  if (includesAny(text, ["zootcred", "credit", "credits", "loyalty"])) {
    return reply(
      "ZootCred is a ledger-backed credit system for eligible rewards, referrals and member benefits. Balances should only be trusted inside the signed-in app because credits, expiry and debits are controlled by backend records.",
    );
  }

  if (includesAny(text, ["office", "business", "salon", "clinic", "studio", "workspace"])) {
    return reply(
      "Zoot supports business cleaning needs such as quick office resets, studios, salons, clinics and client-facing spaces. A strong request includes timing, access notes, priority rooms, bathrooms or kitchenette needs, parking and whether the clean should recur.",
    );
  }

  if (includesAny(text, ["airbnb", "guest", "turnover", "host", "short-term", "short term"])) {
    return reply(
      "For Airbnb and short-term rental turnovers, Zoot is built around saved property notes, guest-ready checklists, access rules, linen instructions and support routing. Same-day turnovers depend on location, scope, timing and live Zooter availability.",
    );
  }

  if (includesAny(text, ["book", "booking", "cleaner", "cleaning", "clean", "zooter"])) {
    return reply(
      signedIn
        ? "To book, open the app and choose the service, area, date, time, property notes and preferred Zooter options. Keep private access details in protected booking fields rather than chat."
        : "You can ask general booking questions here. Sign in to create a booking so Zoot can protect your address, payment state, access notes and support history.",
    );
  }

  if (includesAny(text, ["join", "work", "contractor", "apply", "become a zooter", "zooter onboarding"])) {
    return reply(
      "To become a Zooter, use the Become a Zooter application flow. Zooters complete onboarding, identity and document checks, training and operational readiness before live jobs. Do not send ID documents or banking details through chat.",
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
