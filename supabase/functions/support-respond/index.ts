import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";
import { getConciergeCapabilities } from "../_shared/concierge-controls.ts";
import { getClientIp, verifyTurnstile } from "../_shared/turnstile.ts";
import { getXootKnowledgeReply, redactSupportText, sanitiseSupportText, xootKnowledgeContext, xootKnowledgeVersion } from "../_shared/xoot-knowledge.ts";

const defaultAllowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "https://staging.xoot.co.za",
  "https://preview.xoot.co.za",
  "https://xoot.co.za",
  "https://www.xoot.co.za",
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

const getServiceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

const sanitiseUuid = (value: unknown) =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : "";

type UserRole = "user" | "xooter";

type AssistantResult = {
  response: string;
  source: "knowledge_base" | "openrouter" | "openai_responses" | "human_escalation";
  requestId?: string | null;
  knowledge_id?: string;
  knowledge_version?: string;
  answer_type?: string;
  confidence?: string;
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

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const includesAny = (text: string, terms: string[]) =>
  terms.some((term) => new RegExp(`(^|[^a-z0-9])${escapeRegex(term)}([^a-z0-9]|$)`, "i").test(text));

const shouldEscalate = (text: string) => includesAny(text, escalationKeywords);

const getRequestActor = (req: Request, userId?: string | null) => {
  if (userId) return `user:${userId}`;
  const ip = getClientIp(req) || "unknown-ip";
  const userAgent = req.headers.get("user-agent") ?? "unknown-agent";
  return `guest:${ip}:${userAgent.slice(0, 160)}`;
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs = 8000) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
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

/**
 * The system prompt, in one place, because two providers now read it.
 *
 * Most of these lines are safety rules, not tone: never claim a refund or replacement is
 * approved, never ask for an OTP or a gate code, never promise an action the bot cannot take.
 * Two copies of that would drift, and the copy that drifts is the one nobody is looking at —
 * which is the same argument that put the pricing rule in one module.
 *
 * Kept as an array so a rule reads as a rule rather than as a sentence buried in a paragraph.
 */
const CONCIERGE_INSTRUCTIONS = [
  "You are Xoot Assistant, the in-app support concierge for Xoot home-care bookings in South Africa.",
  "You can answer practical Xoot questions about booking cleaners, launch areas, Care+, XootCred, property profiles, office cleaning, Airbnb turnovers, onboarding, training, support routing, and how to prepare for a clean.",
  "Guests may receive general guidance only. You have no account, booking, payment, address, ticket, or private user context unless the request is authenticated.",
  "Give short, calm, practical help in 2-4 sentences with one clear next step.",
  "Write in a human, warm, premium service tone; never sound like a generic AI policy bot.",
  "Prefer app-safe guidance: tell people to use the authenticated app for bookings, ticket details, private property notes, and support follow-up.",
  "If the user asks about their own booking, payment, refund, address, cleaner, support ticket, or private history while unauthenticated, say you can explain the general process but they must sign in for protected account help.",
  "Never claim a refund, payment, insurance, safety, or contractor replacement is approved.",
  "Never ask for passwords, OTPs, full card numbers, gate codes, access codes, lockbox codes, or private keys.",
  "Do not perform or promise tools, actions, refunds, cancellations, bookings, claims, payouts, account changes, admin decisions or sensitive-data reveals.",
  "For anything risky, tell the user a human support reviewer will handle it in the app.",
  "Use this Xoot source-of-truth context and do not invent facts beyond it:",
  xootKnowledgeContext,
].join(" ");

/**
 * The user turn. Redacted on the way in, for whichever provider gets it.
 *
 * `redactSupportText` is applied here rather than at each call site so a new provider cannot be
 * added with the redaction accidentally left off — the thing that would send a customer's pasted
 * gate code to a third party.
 */
const buildConciergeUserTurn = ({
  subject,
  body,
  role,
  signedIn,
}: {
  subject: string;
  body: string;
  role: UserRole;
  signedIn: boolean;
}) =>
  [
    `Knowledge version: ${xootKnowledgeVersion}`,
    `Role: ${role}`,
    `Authenticated: ${signedIn ? "yes" : "no"}`,
    `Subject: ${redactSupportText(subject)}`,
    `Message: ${redactSupportText(body)}`,
  ].join("\n");

/**
 * OpenRouter — the primary path since 2026-08-13.
 *
 * ⚠️ **This is chat-completions, not OpenAI's Responses API.** The two are easy to conflate while
 * editing the file, and they differ in both directions: `messages` rather than `instructions` +
 * `input`, `max_tokens` rather than `max_output_tokens`, and the answer at
 * `choices[0].message.content` rather than under `output`. `concierge-provider.test.ts` asserts
 * the shape so a half-applied edit fails loudly instead of returning null on every request and
 * quietly degrading to canned answers.
 *
 * The model comes from `CONCIERGE_MODEL`. An unset or stale id is safe: OpenRouter answers with a
 * non-OK status, this returns null, and the caller falls through to OpenAI and then to the
 * knowledge base. That is what makes shipping a default id reasonable without being able to
 * verify it from here.
 */
const buildOpenRouterSupportResponse = async (input: {
  subject: string;
  body: string;
  role: UserRole;
  signedIn: boolean;
}): Promise<AssistantResult | null> => {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!apiKey) return null;

  const model = Deno.env.get("CONCIERGE_MODEL") ?? "openai/gpt-4o-mini";
  const clientRequestId = crypto.randomUUID();
  let response: Response;
  try {
    response = await fetchWithTimeout("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        // OpenRouter's attribution headers. Not auth — they identify the calling app in
        // OpenRouter's own dashboards, which is how spend gets attributed to this product.
        "HTTP-Referer": "https://xoot.co.za",
        "X-Title": "Xoot Concierge",
      },
      body: JSON.stringify({
        model,
        max_tokens: 260,
        messages: [
          { role: "system", content: CONCIERGE_INSTRUCTIONS },
          { role: "user", content: buildConciergeUserTurn(input) },
        ],
      }),
    });
  } catch {
    console.warn("OpenRouter support response timed out or failed before response", { requestId: clientRequestId });
    return null;
  }

  // OpenRouter echoes an id header; fall back to ours so a reported answer is always traceable.
  const requestId = response.headers.get("x-request-id") ?? clientRequestId;
  if (!response.ok) {
    // Status and id only. The key must never reach a log line, and neither must the customer's
    // message — this function handles text a customer may have pasted a gate code into.
    console.warn("OpenRouter support response failed", { status: response.status, model, requestId });
    return null;
  }

  const payload = await response.json().catch(() => null);
  const text = payload?.choices?.[0]?.message?.content;
  const answer = typeof text === "string" ? text.trim().slice(0, 900) : "";
  if (!answer) return null;

  return { response: answer, source: "openrouter", requestId };
};

const buildOpenAiSupportResponse = async ({
  subject,
  body,
  role,
  signedIn,
}: {
  subject: string;
  body: string;
  role: UserRole;
  signedIn: boolean;
}): Promise<AssistantResult | null> => {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return null;

  const model = Deno.env.get("OPENAI_SUPPORT_MODEL") ?? "gpt-4.1-mini";
  const clientRequestId = crypto.randomUUID();
  let openAIResponse: Response;
  try {
    openAIResponse = await fetchWithTimeout("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-Client-Request-Id": clientRequestId,
      },
      body: JSON.stringify({
        model,
        store: false,
        max_output_tokens: 260,
        text: { format: { type: "text" } },
        instructions: CONCIERGE_INSTRUCTIONS,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: buildConciergeUserTurn({ subject, body, role, signedIn }) }],
          },
        ],
      }),
    });
  } catch {
    console.warn("OpenAI support response timed out or failed before response", { requestId: clientRequestId });
    return null;
  }

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
    const authClient = authHeader?.startsWith("Bearer ")
      ? createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } },
        )
      : null;
    const { data: authData } = authClient
      ? await authClient.auth.getUser().catch(() => ({ data: { user: null } }))
      : { data: { user: null } };

    const requestBody = await req.json();
    const safeSubject = sanitiseSupportText(requestBody.subject, 180);
    const safeBody = sanitiseSupportText(requestBody.body);
    const safeTicketId = sanitiseUuid(requestBody.ticket_id);
    if (!safeSubject || !safeBody) return json({ error: "subject and body required" }, 400, origin);

    if (safeTicketId) {
      if (!authClient || !authData.user) return json({ error: "authentication required for ticket support" }, 401, origin);
      const { data: ticket, error: ticketError } = await authClient
        .from("support_tickets")
        .select("id")
        .eq("id", safeTicketId)
        .eq("user_id", authData.user.id)
        .maybeSingle();
      if (ticketError || !ticket) return json({ error: "ticket not found" }, 404, origin);
    }

    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = serviceRoleKey ? getServiceClient() : null;
    if (adminClient) {
      const rateLimit = await consumeRateLimit(adminClient, {
        bucket: "support",
        actor: getRequestActor(req, authData.user?.id ?? null),
        action: authData.user ? "concierge_signed_in" : "concierge_guest",
        limitCount: authData.user ? 60 : 20,
        windowSeconds: 300,
      });
      if (!rateLimit.allowed) {
        return json(
          {
            error: "too many concierge requests",
            response: "I need a short pause before answering more questions. Please try again in a few minutes, or sign in and open Support for protected help.",
            escalated: true,
            source: "human_escalation",
          },
          429,
          origin,
        );
      }
    } else {
      console.warn("SUPABASE_SERVICE_ROLE_KEY missing; support rate limiting is not available");
    }

    const signedIn = Boolean(authData.user);
    const turnstileRequired =
      !signedIn &&
      (
        Deno.env.get("XOOT_REQUIRE_CONCIERGE_TURNSTILE") === "true" ||
        (adminClient
          ? await isOperationalControlEnabled(adminClient, "support.turnstile_required").catch((error) => {
              console.warn("support Turnstile gate lookup failed", { error: error instanceof Error ? error.message : String(error) });
              return false;
            })
          : false)
      );
    const turnstile = await verifyTurnstile({
      token: requestBody.turnstile_token,
      remoteIp: getClientIp(req),
      required: turnstileRequired,
    });
    if (!turnstile.ok) {
      return json(
        {
          error: "turnstile verification failed",
          response: "Please complete the anti-abuse check and try again.",
          escalated: true,
          source: "human_escalation",
          turnstile_required: turnstile.required,
          turnstile_configured: turnstile.configured,
          knowledge_version: xootKnowledgeVersion,
        },
        turnstile.configured ? 403 : 503,
        origin,
      );
    }

    /*
     * The Concierge's own governance controls, which until now governed nothing.
     *
     * 20 `concierge.*` controls are registered across two migrations, and before this change the
     * only function reading any of them was `create-concierge-handoff`. This function — the one
     * every Concierge message goes through — read `support.*` and nothing else, so
     * `concierge.kill.global` was a kill switch attached to no wire.
     *
     * Deliberately a no-op against current live state: `concierge.enabled`, `web.enabled` and
     * `safe_static_fallback` are all `true`, and `model_answers` is `false` alongside
     * `support.openai_fallback`, which is also `false`. If answers change after this ships, the
     * wiring is wrong. It only starts mattering when someone flips a switch, which is the entire
     * point of a switch.
     */
    const concierge = await getConciergeCapabilities(adminClient);

    if (!concierge.enabled || concierge.killed) {
      // No model call, no knowledge lookup. A disabled Concierge must not do the work and then
      // discard it — the switch exists to stop the work happening.
      return json(
        {
          response: signedIn
            ? "Xoot Concierge is switched off right now. Open Support and a human reviewer will pick this up in the app."
            : "Xoot Concierge is switched off right now. Please sign in and open Support, and a human reviewer will help.",
          escalated: true,
          source: "human_escalation",
          knowledge_version: xootKnowledgeVersion,
        },
        200,
        origin,
      );
    }

    const userRole: UserRole = requestBody.role === "xooter" ? "xooter" : "user";
    const text = `${safeSubject} ${safeBody}`.toLowerCase();
    const escalated = shouldEscalate(text);
    // `safe_static_fallback` governs the approved-knowledge answer. It is `true` live, so this
    // reads exactly as it did before.
    const knowledgeAssistant =
      escalated || !concierge.staticFallback
        ? null
        : getXootKnowledgeReply(`${safeSubject} ${safeBody}`, signedIn);
    /*
     * Both switches must agree before a model answers.
     *
     * `support.openai_fallback` is the support-wide switch; `concierge.model_answers` is the
     * Concierge-specific one and `concierge.kill.model_answers` overrides it. Requiring both
     * narrows, never widens — turning the Concierge flag on cannot enable a model that the
     * support-wide flag has switched off.
     */
    const supportOpenAiAllowed = adminClient
      ? await isOperationalControlEnabled(adminClient, "support.openai_fallback").catch((error) => {
          console.warn("support OpenAI gate lookup failed", { error: error instanceof Error ? error.message : String(error) });
          return false;
        })
      : false;
    /*
     * The gate is "may a model answer at all", not "may OpenAI answer".
     *
     * `support.openai_fallback` is named for the only provider that existed when it was written;
     * it governs both, and the kill switch must not stop working because a second provider was
     * added behind it. Renaming the control key would mean a migration and a window where the
     * switch silently does nothing, which is worse than a stale name.
     */
    const modelAnswersAllowed = supportOpenAiAllowed && concierge.modelAnswers;
    const modelInput = { subject: safeSubject, body: safeBody, role: userRole, signedIn };
    /*
     * OpenRouter first, OpenAI second (founder decision 2026-08-13).
     *
     * `??` rather than a try/catch chain because each builder already returns null on a missing
     * key, a timeout, a non-OK status or an empty answer — so "OpenRouter could not answer" and
     * "OpenRouter is not configured" collapse to the same fall-through, which is the behaviour
     * wanted in both cases. If neither answers, `assistant` below falls to the knowledge base.
     */
    const modelAssistant = escalated
      ? null
      : knowledgeAssistant ??
        (modelAnswersAllowed
          ? (await buildOpenRouterSupportResponse(modelInput)) ?? (await buildOpenAiSupportResponse(modelInput))
          : null);
    const assistant: AssistantResult = escalated
      ? {
          response: signedIn
            ? "I've flagged this to our human support team. They'll review it in the app and follow up through the right support queue."
            : "I can explain the general process, but this needs protected support. Sign in to Xoot and open Support so a human reviewer can handle the booking, payment, safety or account detail.",
          source: "human_escalation" as const,
          requestId: null,
        }
      : modelAssistant ?? {
          response: "Xoot Support could not answer this automatically right now. A human support reviewer can handle it in the app without making unsupported claims.",
          source: "human_escalation" as const,
          requestId: null,
        };
    const needsHumanReview = escalated || !modelAssistant;

    if (safeTicketId && authData.user && assistant.response) {
      if (adminClient) {
        const { error: updateError } = await adminClient
          .from("support_tickets")
          .update({ ai_response: assistant.response, status: needsHumanReview ? "escalated" : "open" })
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
        escalated: needsHumanReview,
        source: assistant.source,
        openai_request_id: assistant.requestId,
        knowledge_version: assistant.knowledge_version ?? xootKnowledgeVersion,
        knowledge_id: assistant.knowledge_id ?? null,
        answer_type: assistant.answer_type ?? (needsHumanReview ? "support_escalation" : "model_guidance"),
        confidence: assistant.confidence ?? null,
        turnstile_required: turnstileRequired,
      },
      200,
      origin,
    );
  } catch (error) {
    // Logged, not swallowed. This `catch` took no argument and printed nothing, so when every
    // governance RPC began throwing — `supa.schema("private")` cannot work, see
    // governance-utils.ts — the Concierge returned this generic 500 to every real question and
    // left no trace of why. A caught error nobody can read is indistinguishable from no error.
    // The message stays out of the response body: this endpoint is `verify_jwt: false`, so
    // anything returned here is readable by anyone who can reach the URL.
    console.error("support-respond failed", {
      message: error instanceof Error ? error.message : String(error),
    });
    return json({ error: "support response failed" }, 500, origin);
  }
});
