import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { consumeRateLimit, isOperationalControlEnabled } from "../_shared/governance-utils.ts";
import { getClientIp, verifyTurnstile } from "../_shared/turnstile.ts";
import { redactSupportText, sanitiseSupportText } from "../_shared/xoot-knowledge.ts";

import { readJson } from "../_shared/action-utils.ts";
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

const getRequestActor = (req: Request, userId?: string | null) => {
  if (userId) return `user:${userId}`;
  const ip = getClientIp(req) || "unknown-ip";
  const userAgent = req.headers.get("user-agent") ?? "unknown-agent";
  return `guest:${ip}:${userAgent.slice(0, 160)}`;
};

// Must match the CHECK constraint on `xoot_concierge_feedback.source`. An unrecognised value is
// not rejected here — line below coerces it to "unknown" — so a missing entry silently strips the
// attribution off a report rather than failing. `concierge-provider.test.ts` pins all four copies.
const allowedSources = new Set(["knowledge_base", "openrouter", "openai_responses", "human_escalation", "local_knowledge"]);

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return json({ error: "origin not allowed" }, 403, origin);

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) return json({ error: "support reporting unavailable" }, 503, origin);

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
    const signedIn = Boolean(authData.user);

    const adminClient = getServiceClient();
    const feedbackEnabled = await isOperationalControlEnabled(adminClient, "support.concierge_feedback").catch(() => true);
    if (!feedbackEnabled) return json({ error: "concierge feedback disabled" }, 403, origin);

    const body = await readJson(req);
    const role = body.role === "xooter" ? "xooter" : "user";
    const source = allowedSources.has(body.source) ? body.source : "unknown";
    const reason = sanitiseSupportText(body.reason, 240) || "User reported this Concierge answer";
    const answerExcerpt = redactSupportText(sanitiseSupportText(body.answer_excerpt, 900));
    const conversationContext = redactSupportText(sanitiseSupportText(body.conversation_context, 900));
    const knowledgeVersion = sanitiseSupportText(body.knowledge_version, 80) || null;

    const rateLimit = await consumeRateLimit(adminClient, {
      bucket: "support",
      actor: getRequestActor(req, authData.user?.id ?? null),
      action: signedIn ? "concierge_feedback_signed_in" : "concierge_feedback_guest",
      limitCount: signedIn ? 20 : 6,
      windowSeconds: 600,
    });
    if (!rateLimit.allowed) return json({ error: "too many feedback reports" }, 429, origin);

    const turnstileRequired = !signedIn && await isOperationalControlEnabled(adminClient, "support.turnstile_required").catch(() => false);
    const turnstile = await verifyTurnstile({
      token: body.turnstile_token,
      remoteIp: getClientIp(req),
      required: turnstileRequired,
    });
    if (!turnstile.ok) {
      return json(
        {
          error: "turnstile verification failed",
          turnstile_required: turnstile.required,
          turnstile_configured: turnstile.configured,
        },
        turnstile.configured ? 403 : 503,
        origin,
      );
    }

    const { data, error } = await adminClient
      .from("xoot_concierge_feedback")
      .insert({
        user_id: authData.user?.id ?? null,
        role,
        source,
        knowledge_version: knowledgeVersion,
        reason,
        answer_excerpt: answerExcerpt || null,
        conversation_context: conversationContext || null,
      })
      .select("id,created_at")
      .single();

    if (error) return json({ error: "feedback could not be recorded" }, 400, origin);

    return json({ data, ok: true }, 200, origin);
  } catch {
    return json({ error: "concierge feedback failed" }, 500, origin);
  }
});
