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

const sanitiseSupportText = (value: unknown, maxLength = 1500) =>
  typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f<>`\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";

type UserRole = "user" | "zooter";

const escalationKeywords = [
  "refund",
  "billing",
  "payment",
  "charge",
  "complaint",
  "unsafe",
  "damage",
  "theft",
  "harassment",
  "no-show",
  "noshow",
  "replacement",
  "cancel",
  "cancellation",
  "gate code",
  "access code",
  "lockbox",
  "technical bug",
  "bug",
];

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term));

const shouldEscalate = (text: string) => includesAny(text, escalationKeywords);

const buildResponse = (text: string, role: UserRole) => {
  if (text.includes("care+") || text.includes("care plus") || text.includes("membership")) {
    return "Care+ is R99/month and keeps your home remembered, protected, and ready. It includes Home Memory, Favourite Zooter rebooking, priority booking windows, priority replacement support, 1.5x ZootCred, a R30 monthly add-on credit, smart reminders, property profiles, and priority support.";
  }

  if (text.includes("zootcred") || text.includes("credit")) {
    return "ZootCred rewards completed bookings and can help reduce future booking costs where eligible. Care+ members earn 1.5x ZootCred on completed bookings and receive a R30 monthly add-on credit that must be used with a completed booking.";
  }

  if (text.includes("zooter") && (text.includes("favorite") || text.includes("favourite") || text.includes("book again"))) {
    return "You can save a preferred Zooter and rebook them from your Care+ experience using the Book Nomsa again pattern. Availability still depends on the Zooter's schedule, so support can help when plans need attention.";
  }

  if (text.includes("airbnb") || text.includes("landlord") || text.includes("property")) {
    return "Property Profiles help hosts and landlords save access notes, room priorities, turnover instructions, cleaning history, and favourite add-ons for each home. Keep lockbox and gate details inside the authenticated app rather than email or SMS.";
  }

  if (role === "zooter") {
    return "Thanks for contacting Zoot Support. We have noted your message and will route it to the right internal queue so a human reviewer can follow up in the app if needed.";
  }

  return "Thanks for contacting Zoot Support. We have noted your message and will route it to the right support queue for booking, Care+, trust, or account help.";
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return json({ error: "origin not allowed" }, 403, origin);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "authentication required" }, 401, origin);

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: authData, error: authError } = await supa.auth.getUser();
    if (authError || !authData.user) return json({ error: "authentication required" }, 401, origin);

    const { subject, body, role } = await req.json();
    const safeSubject = sanitiseSupportText(subject, 180);
    const safeBody = sanitiseSupportText(body);
    if (!safeSubject || !safeBody) return json({ error: "subject and body required" }, 400, origin);

    const userRole: UserRole = role === "zooter" ? "zooter" : "user";
    const text = `${safeSubject} ${safeBody}`.toLowerCase();
    const escalated = shouldEscalate(text);
    const response = escalated
      ? "I've flagged this to our human support team. They'll review it in the app and follow up through the right support queue."
      : buildResponse(text, userRole);

    return json({ response, escalated, source: "zoot_support_rules" }, 200, origin);
  } catch {
    return json({ error: "support response failed" }, 500, origin);
  }
});
