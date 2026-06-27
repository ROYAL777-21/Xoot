export type ZootKnowledgeReply = {
  response: string;
  source: "knowledge_base";
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

const reply = (response: string): ZootKnowledgeReply => ({ response, source: "knowledge_base" });

export const zootKnowledgeContext = [
  "Zoot is a premium South African home-care platform for vetted independent cleaning contractors called Zooters.",
  `Launch focus: ${launchAreas.join(", ")} and nearby approved Johannesburg areas before wider Gauteng, Pretoria, then Cape Town expansion.`,
  "Core services: once-off home cleaning, recurring home care, express resets, deep cleaning, moving cleans, Airbnb turnover cleaning, landlord handovers, and quick office resets.",
  "Care+ is the Zoot membership layer for homes that want Home Memory, favourite Zooter workflows, smart reminders, priority support, and member ZootCred benefits. Public price: R99/month where live.",
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
    );
  }

  if (includesAny(text, ["what is zoot", "about zoot", "who are you", "what do you do"])) {
    return reply(
      "Zoot is a premium home-care platform for South African homes, hosts, landlords, property managers and small offices. It helps clients book vetted Zooters, save property preferences, keep support inside the app, and make repeat cleaning feel organised instead of improvised.",
    );
  }

  if (includesAny(text, ["launch", "area", "where", "bryanston", "rosebank", "sandton", "midrand", "fourways", "pretoria", "cape town"])) {
    return reply(
      `Zoot is prioritising Johannesburg launch density first: ${launchAreas.join(", ")} and nearby approved suburbs. Pretoria and Cape Town are expansion targets after supply, support, payments and quality controls are ready, so live availability should still be checked in the app.`,
    );
  }

  if (includesAny(text, ["price", "pricing", "cost", "how much", "fee"])) {
    return reply(
      "Pricing depends on service type, home size, add-ons, timing, number of Zooters and coverage. Care+ is listed publicly as R99/month where live. For an exact booking total, use the authenticated booking flow so the app can calculate the real service and payment state.",
    );
  }

  if (includesAny(text, ["care+", "care plus", "membership", "home memory", "favourite zooter", "favorite zooter"])) {
    return reply(
      "Care+ is Zoot's membership layer for people who want their home remembered: Home Memory, favourite Zooter workflows, smart reminders, priority support and member ZootCred benefits. It is designed for recurring homes, hosts, landlords and offices that want less repeated admin.",
    );
  }

  if (includesAny(text, ["zootcred", "credit", "credits", "loyalty"])) {
    return reply(
      "ZootCred is Zoot's credit system for eligible rewards, referrals and member benefits. Balances come from the ZootCred ledger with expiry rules, so credits should only be trusted when shown inside the signed-in app.",
    );
  }

  if (includesAny(text, ["office", "business", "salon", "clinic", "studio", "workspace"])) {
    return reply(
      "Zoot supports business cleaning needs such as quick office resets, studios, salons, clinics and client-facing spaces. The best request includes access notes, priority rooms, bathrooms or kitchenette needs, timing, parking and whether it should become recurring.",
    );
  }

  if (includesAny(text, ["airbnb", "guest", "turnover", "host", "short-term", "short term"])) {
    return reply(
      "For Airbnb and short-term rental turnovers, Zoot is built around saved property notes, guest-ready checklists, access rules, linen instructions and support routing. Same-day turnovers depend on location, scope, timing and live Zooter availability.",
    );
  }

  if (includesAny(text, ["landlord", "property manager", "property managers", "handover", "move out", "move-out", "inspection"])) {
    return reply(
      "Landlords and property managers can use Zoot for handovers, move-out cleans, inspection-ready resets and repeat property profiles. Keep access and property notes inside the app so each clean becomes easier to brief and audit.",
    );
  }

  if (includesAny(text, ["book", "booking", "cleaner", "cleaning", "clean", "zooter"])) {
    return reply(
      signedIn
        ? "To book, open the app, choose the service, area, date, time, property notes and preferred Zooter options. Keep private access details in the protected booking fields rather than chat."
        : "You can ask general booking questions here, but sign in to create a booking. Zoot will ask for the service, launch area, date, time, property notes and preferred Zooter options inside the protected app flow.",
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

  return null;
};
