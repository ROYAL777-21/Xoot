import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { claimProviderEvent, markProviderEventProcessed } from "./governance-utils.ts";
import { readRequestTextWithLimit } from "./request-body.ts";

type TwilioChannel = "sms" | "whatsapp" | "voice" | "verify" | "status" | "unknown";

type TwilioLogInput = {
  eventType: string;
  channel: TwilioChannel;
  params: URLSearchParams;
  signatureValid: boolean;
  status?: string | null;
};

const encoder = new TextEncoder();

const cleanText = (value: unknown, maxLength = 500) =>
  typeof value === "string"
    ? value
        .replace(/\p{Cc}/gu, " ")
        .replace(/[<>`\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, maxLength)
    : "";

const getPriority = (text: string) => {
  const normalized = text.toLowerCase();
  if (normalized.includes("fraud") || normalized.includes("unsafe") || normalized.includes("threat")) return "urgent";
  if (
    normalized.includes("payment") ||
    normalized.includes("refund") ||
    normalized.includes("replacement") ||
    normalized.includes("complaint")
  ) {
    return "high";
  }
  if (normalized.includes("cancel") || normalized.includes("late") || normalized.includes("reschedule")) return "normal";
  return "low";
};

const getServiceClient = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

const insertReviewQueue = async (
  supa: ReturnType<typeof getServiceClient>,
  payload: {
    subjectId: string | null;
    priority: string;
    summary: string;
  },
) => {
  const { error } = await supa.from("admin_review_queue").insert({
    queue_type: "support",
    subject_table: "twilio_webhook_events",
    subject_id: payload.subjectId,
    priority: payload.priority,
    summary: cleanText(payload.summary, 240),
  });

  if (error) {
    console.warn("Twilio review queue insert failed", { error: error.message });
  }
};

const xmlHeaders = {
  "Content-Type": "text/xml; charset=utf-8",
  "Cache-Control": "no-store",
};

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const emptyTwiml = () => new Response("<Response></Response>", { status: 200, headers: xmlHeaders });

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const twimlMessage = (body: string) =>
  new Response(`<Response><Message>${escapeXml(body)}</Message></Response>`, { status: 200, headers: xmlHeaders });

const twimlVoice = (body: string) =>
  new Response(`<Response><Say voice="alice">${escapeXml(body)}</Say><Hangup /></Response>`, {
    status: 200,
    headers: xmlHeaders,
  });

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const constantTimeEqual = (left: string, right: string) => {
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  const max = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;

  for (let index = 0; index < max; index += 1) {
    diff |= (a[index] ?? 0) ^ (b[index] ?? 0);
  }

  return diff === 0;
};

export const computeTwilioSignature = async (
  authToken: string,
  url: string,
  params: URLSearchParams,
) => {
  const keys = Array.from(new Set(params.keys())).sort();
  const payload = keys.reduce((result, key) => {
    const values = Array.from(new Set(params.getAll(key))).sort();
    return values.reduce((current, value) => `${current}${key}${value}`, result);
  }, url);
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  let binary = "";
  digest.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const getCanonicalRequestUrl = (req: Request) => {
  const overrideBase = Deno.env.get("TWILIO_WEBHOOK_BASE_URL")?.trim();
  if (!overrideBase) return req.url;

  const requestUrl = new URL(req.url);
  const baseUrl = new URL(overrideBase);
  baseUrl.pathname = requestUrl.pathname;
  baseUrl.search = requestUrl.search;
  return baseUrl.toString();
};

const signatureUrlCandidates = (url: string) => {
  const parsed = new URL(url);
  const withoutPort = new URL(parsed);
  withoutPort.port = "";
  const standardPort = parsed.protocol === "https:" ? "443" : "80";
  const withPort = `${parsed.protocol}//${parsed.hostname}:${standardPort}${parsed.pathname}${parsed.search}${parsed.hash}`;
  return Array.from(new Set([url, withoutPort.toString(), withPort]));
};

export const validateTwilioSignature = async (req: Request, params: URLSearchParams) => {
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  if (!authToken) return { configured: false, valid: false };

  const providedSignature = req.headers.get("X-Twilio-Signature") ?? "";
  if (!providedSignature) return { configured: true, valid: false };

  const candidates = signatureUrlCandidates(getCanonicalRequestUrl(req));
  for (const url of candidates) {
    const expected = await computeTwilioSignature(authToken, url, params);
    if (constantTimeEqual(providedSignature, expected)) {
      return { configured: true, valid: true };
    }
  }

  return {
    configured: true,
    valid: false,
  };
};

const safeObjectFromParams = (params: URLSearchParams) => {
  const allowedKeys = [
    "AccountSid",
    "ApiVersion",
    "CallSid",
    "CallStatus",
    "Direction",
    "ErrorCode",
    "ErrorMessage",
    "MessageSid",
    "MessageStatus",
    "MessagingServiceSid",
    "SmsSid",
    "SmsStatus",
    "ToCountry",
    "FromCountry",
    "VerificationSid",
    "VerificationStatus",
  ];

  return allowedKeys.reduce<Record<string, string>>((result, key) => {
    const value = cleanText(params.get(key), 240);
    if (value) result[key] = value;
    return result;
  }, {});
};

const sha256Hex = async (value: string) => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
  return Array.from(digest)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const phoneLast4 = (value: string | null) => {
  const digits = (value ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : null;
};

const phoneHash = async (value: string | null) => {
  if (!value) return null;
  const salt = Deno.env.get("TWILIO_WEBHOOK_HASH_SALT") ?? Deno.env.get("SUPABASE_URL") ?? "zoot";
  return sha256Hex(`${salt}:${value}`);
};

const detectMessageChannel = (params: URLSearchParams): TwilioChannel => {
  const from = params.get("From") ?? "";
  const to = params.get("To") ?? "";
  return from.startsWith("whatsapp:") || to.startsWith("whatsapp:") ? "whatsapp" : "sms";
};

const detectSid = (params: URLSearchParams) =>
  cleanText(
    params.get("MessageSid") ??
      params.get("SmsSid") ??
      params.get("CallSid") ??
      params.get("VerificationSid"),
    80,
  );

const logTwilioEvent = async ({ eventType, channel, params, signatureValid, status }: TwilioLogInput) => {
  const supa = getServiceClient();
  const from = params.get("From");
  const to = params.get("To");

  const { data, error } = await supa
    .from("twilio_webhook_events")
    .insert({
      event_type: eventType,
      channel,
      twilio_sid: detectSid(params) || null,
      from_hash: await phoneHash(from),
      to_hash: await phoneHash(to),
      from_last4: phoneLast4(from),
      to_last4: phoneLast4(to),
      status: cleanText(status, 80) || null,
      payload: safeObjectFromParams(params),
      signature_valid: signatureValid,
    })
    .select("id")
    .maybeSingle();

  if (error || !data?.id) {
    console.warn("Twilio webhook event log failed", { eventType, channel, error: error?.message });
    return null;
  }

  return data.id as string;
};

const readTwilioParams = async (req: Request) => {
  const body = await readRequestTextWithLimit(req, {
    maxBytes: 64 * 1024,
    allowedContentTypes: ["application/x-www-form-urlencoded"],
  });
  if (!body.ok) {
    return {
      rawBody: "",
      params: new URLSearchParams(),
      response: json({ error: body.error }, body.status),
    };
  }
  return { rawBody: body.value, params: new URLSearchParams(body.value), response: null };
};

const claimTwilioProviderEvent = async (
  supa: ReturnType<typeof getServiceClient>,
  eventType: string,
  channel: TwilioChannel,
  params: URLSearchParams,
  rawBody: string,
) => {
  const sid = detectSid(params);
  const fallbackId = await crypto.subtle.digest("SHA-256", encoder.encode(`${eventType}:${rawBody}`)).then((digest) =>
    Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 80)
  );
  const status = cleanText(params.get("MessageStatus") ?? params.get("SmsStatus") ?? params.get("CallStatus") ?? params.get("VerificationStatus"), 80);
  return claimProviderEvent(supa, {
    provider: "twilio",
    eventId: `${eventType}:${sid || fallbackId}`,
    eventType,
    rawPayload: rawBody,
    metadata: {
      channel,
      status,
      twilio_sid_present: Boolean(sid),
    },
  });
};

const rejectIfInvalid = async (req: Request, params: URLSearchParams) => {
  const signature = await validateTwilioSignature(req, params);
  if (!signature.configured) {
    return { response: json({ error: "twilio webhook auth not configured" }, 503), valid: false };
  }

  if (!signature.valid) {
    return { response: json({ error: "invalid twilio signature" }, 403), valid: false };
  }

  return { response: null, valid: true };
};

const createReviewForInboundMessage = async (eventId: string | null, params: URLSearchParams, channel: TwilioChannel) => {
  const body = cleanText(params.get("Body"), 320);
  if (!body) return;

  const priority = getPriority(body.toLowerCase());
  await insertReviewQueue(getServiceClient(), {
    subjectId: eventId,
    priority,
    summary: `Inbound ${channel.toUpperCase()} message requires support triage: ${body}`,
  });
};

const createReviewForFailedStatus = async (eventId: string | null, params: URLSearchParams, channel: TwilioChannel) => {
  const status = cleanText(params.get("MessageStatus") ?? params.get("SmsStatus") ?? params.get("CallStatus"), 80).toLowerCase();
  const errorCode = cleanText(params.get("ErrorCode"), 40);
  if (!["failed", "undelivered", "busy", "no-answer", "canceled"].includes(status) && !errorCode) return;

  await insertReviewQueue(getServiceClient(), {
    subjectId: eventId,
    priority: "high",
    summary: `Twilio ${channel} delivery/call status needs review: ${status || "unknown"}${errorCode ? ` (${errorCode})` : ""}`,
  });
};

export const handleTwilioMessagingWebhook = async (
  req: Request,
  options: { expectedChannel?: "sms" | "whatsapp" } = {},
) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const { rawBody, params, response } = await readTwilioParams(req);
  if (response) return response;
  const verification = await rejectIfInvalid(req, params);
  if (verification.response) return verification.response;

  const channel = detectMessageChannel(params);
  const supa = getServiceClient();
  const claim = await claimTwilioProviderEvent(supa, "inbound_message", channel, params, rawBody);
  if (claim.alreadySeen) return options.expectedChannel && channel === options.expectedChannel ? emptyTwiml() : emptyTwiml();

  if (options.expectedChannel && channel !== options.expectedChannel) {
    const eventId = await logTwilioEvent({
      eventType: "unexpected_message_channel",
      channel,
      params,
      signatureValid: true,
      status: params.get("MessageStatus") ?? params.get("SmsStatus"),
    });
    await createReviewForInboundMessage(eventId, params, channel);
    await markProviderEventProcessed(supa, claim.providerEventId, "processed");
    return emptyTwiml();
  }

  const eventId = await logTwilioEvent({
    eventType: "inbound_message",
    channel,
    params,
    signatureValid: true,
    status: params.get("MessageStatus") ?? params.get("SmsStatus"),
  });
  await createReviewForInboundMessage(eventId, params, channel);
  await markProviderEventProcessed(supa, claim.providerEventId, "processed");

  return twimlMessage(
    "Thanks for contacting Zoot. For bookings, payments, private addresses or cleaner details, please open the Zoot app so we can protect your account.",
  );
};

export const handleTwilioStatusCallback = async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const { rawBody, params, response } = await readTwilioParams(req);
  if (response) return response;
  const verification = await rejectIfInvalid(req, params);
  if (verification.response) return verification.response;

  const isCall = Boolean(params.get("CallSid"));
  const channel: TwilioChannel = isCall ? "voice" : detectMessageChannel(params);
  const supa = getServiceClient();
  const claim = await claimTwilioProviderEvent(supa, "status_callback", channel, params, rawBody);
  if (claim.alreadySeen) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  const eventId = await logTwilioEvent({
    eventType: "status_callback",
    channel: isCall ? "voice" : "status",
    params,
    signatureValid: true,
    status: params.get("MessageStatus") ?? params.get("SmsStatus") ?? params.get("CallStatus"),
  });
  await createReviewForFailedStatus(eventId, params, channel);
  await markProviderEventProcessed(supa, claim.providerEventId, "processed");

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};

export const handleTwilioVoiceWebhook = async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const { rawBody, params, response } = await readTwilioParams(req);
  if (response) return response;
  const verification = await rejectIfInvalid(req, params);
  if (verification.response) return verification.response;

  const supa = getServiceClient();
  const claim = await claimTwilioProviderEvent(supa, "voice_webhook", "voice", params, rawBody);
  if (claim.alreadySeen) {
    return twimlVoice(
      "Welcome to Zoot. For a booking, open the Zoot app and choose Book a clean. For protected support, use the Support tab so we can verify your account.",
    );
  }

  const eventId = await logTwilioEvent({
    eventType: "voice_webhook",
    channel: "voice",
    params,
    signatureValid: true,
    status: params.get("CallStatus"),
  });
  await createReviewForFailedStatus(eventId, params, "voice");
  await markProviderEventProcessed(supa, claim.providerEventId, "processed");

  return twimlVoice(
    "Welcome to Zoot. For a booking, open the Zoot app and choose Book a clean. For protected support, use the Support tab so we can verify your account.",
  );
};

export const handleTwilioVerifyWebhook = async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const { rawBody, params, response } = await readTwilioParams(req);
  if (response) return response;
  const verification = await rejectIfInvalid(req, params);
  if (verification.response) return verification.response;

  const supa = getServiceClient();
  const claim = await claimTwilioProviderEvent(supa, "verify_webhook", "verify", params, rawBody);
  if (claim.alreadySeen) return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

  await logTwilioEvent({
    eventType: "verify_webhook",
    channel: "verify",
    params,
    signatureValid: true,
    status: params.get("VerificationStatus"),
  });
  await markProviderEventProcessed(supa, claim.providerEventId, "processed");

  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
};
