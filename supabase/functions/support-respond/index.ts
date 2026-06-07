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

const sanitiseUuid = (value: unknown) =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : "";

const redactSupportText = (value: string) =>
  value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email redacted]")
    .replace(/(?:\+?\d[\d\s().-]{6,}\d)\b/g, "[phone redacted]")
    .replace(/\b(gate|access|lockbox|alarm|door|garage)\s*(code|pin|password)?\s*[:#-]?\s*[A-Z0-9-]{3,}\b/gi, "$1 code [redacted]")
    .replace(/\b(password|passcode|otp|one-time code)\s*[:#-]?\s*\S+/gi, "$1 [redacted]")
    .slice(0, 1200);

type UserRole = "user" | "zooter";

type AssistantResult = {
  response: string;
  source: "openai_responses" | "zoot_support_rules" | "human_escalation";
  requestId?: string | null;
};

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

const extractOpenAiText = (payload: any) => {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();

  for (const item of payload?.output ?? []) {
    for (const content of item?.content ?? []) {
      if (content?.type === "output_text" && typeof content.text === "string" && content.text.trim()) {
        return content.text.trim();
      }
    }
  }

  return "";
};

const buildOpenAiSupportResponse = async ({
  subject,
  body,
  role,
}: {
  subject: string;
  body: string;
  role: UserRole;
}): Promise<AssistantResult | null> => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const model = Deno.env.get("OPENAI_SUPPORT_MODEL") ?? "gpt-4.1-mini";
  const clientRequestId = crypto.randomUUID();
  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Client-Request-Id": clientRequestId,
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 180,
      text: { format: { type: "text" } },
      instructions: [
        "You are Zoot Assistant, the in-app support concierge for Zoot home-care bookings in South Africa.",
        "Give short, calm, practical help in 2-4 sentences.",
        "Never claim a refund, payment, insurance, safety, or contractor replacement is approved.",
        "Never ask for passwords, OTPs, full card numbers, gate codes, access codes, lockbox codes, or private keys.",
        "For anything risky, tell the user a human support reviewer will handle it in the app.",
      ].join(" "),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Role: ${role}`,
                `Subject: ${redactSupportText(subject)}`,
                `Message: ${redactSupportText(body)}`,
              ].join("\n"),
            },
          ],
        },
      ],
    }),
  });

  const requestId = openAIResponse.headers.get("x-request-id") ?? clientRequestId;
  if (!openAIResponse.ok) {
    console.warn("OpenAI support response failed", { status: openAIResponse.status, requestId });
    return null;
  }

  const payload = await openAIResponse.json();
  const response = extractOpenAiText(payload).slice(0, 900);
  if (!response) return null;

  return { response, source: "openai_responses", requestId };
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

    const { subject, body, role, ticket_id } = await req.json();
    const safeSubject = sanitiseSupportText(subject, 180);
    const safeBody = sanitiseSupportText(body);
    const safeTicketId = sanitiseUuid(ticket_id);
    if (!safeSubject || !safeBody) return json({ error: "subject and body required" }, 400, origin);

    if (safeTicketId) {
      const { data: ticket, error: ticketError } = await authClient
        .from("support_tickets")
        .select("id")
        .eq("id", safeTicketId)
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (ticketError || !ticket) return json({ error: "ticket not found" }, 404, origin);
    }

    const userRole: UserRole = role === "zooter" ? "zooter" : "user";
    const text = `${safeSubject} ${safeBody}`.toLowerCase();
    const escalated = shouldEscalate(text);
    const assistant = escalated
      ? {
          response: "I've flagged this to our human support team. They'll review it in the app and follow up through the right support queue.",
          source: "human_escalation" as const,
          requestId: null,
        }
      : (await buildOpenAiSupportResponse({ subject: safeSubject, body: safeBody, role: userRole })) ?? {
          response: buildResponse(text, userRole),
          source: "zoot_support_rules" as const,
          requestId: null,
        };

    if (safeTicketId && assistant.response) {
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (serviceRoleKey) {
        const adminClient = createClient(Deno.env.get("SUPABASE_URL")!, serviceRoleKey);
        const { error: updateError } = await adminClient
          .from("support_tickets")
          .update({ ai_response: assistant.response, status: escalated ? "escalated" : "open" })
          .eq("id", safeTicketId)
          .eq("user_id", authData.user.id);
        if (updateError) console.warn("Support assistant ticket update failed", { ticketId: safeTicketId });
      } else {
        console.warn("SUPABASE_SERVICE_ROLE_KEY missing; support assistant reply was not persisted", { ticketId: safeTicketId });
      }
    }

    return json(
      {
        response: assistant.response,
        escalated,
        source: assistant.source,
        openai_request_id: assistant.requestId,
      },
      200,
      origin,
    );
  } catch {
    return json({ error: "support response failed" }, 500, origin);
  }
});
