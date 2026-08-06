import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Twilio status callback for masked calls — records conference and call state.
 *
 * RECOVERED FROM PRODUCTION 2026-08-02, where it ran with no source in this repository.
 * Committed verbatim so the fix reads as a diff.
 *
 * `verify_jwt: false` is correct — Twilio calls this, not a signed-in user — and the HMAC-SHA1
 * signature check is implemented properly, failing closed when the auth token is absent.
 *
 * DEFECT — the `.or()` filter is built by string interpolation and is not guarded against an
 * empty side. When Twilio sends a `CallSid` but no `ConferenceSid` (or the reverse), the filter
 * becomes `provider_conference_sid.eq.,provider_call_sid.eq.CAxxxx` — an equality against the
 * empty string. That is a filter nobody intended, on an UPDATE that writes the whole callback
 * payload. It should match on whichever identifier is actually present, and the update should
 * be constrained to a single session rather than to whatever the filter happens to select.
 *
 * DEFECT — the catch returns `String(err)`. Same as elsewhere in this recovered set.
 *
 * Also note `status_callback_payload: Object.fromEntries(form.entries())` stores Twilio's
 * entire callback verbatim. That is useful for debugging and it is also a place caller
 * identifiers accumulate, which matters under POPIA retention. Worth a retention rule before
 * `twilio.masked_voice` is enabled.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-twilio-signature",
};

const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return diff === 0;
};

const signTwilioPayload = async (authToken: string, value: string) => {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
};

const validateTwilioWebhook = async (req: Request, form: FormData) => {
  const authToken = Deno.env.get("TWILIO_WEBHOOK_AUTH_TOKEN");
  if (!authToken) return false;
  const received = req.headers.get("x-twilio-signature") ?? "";
  if (!received) return false;
  const validationUrl = Deno.env.get("TWILIO_WEBHOOK_STATUS_URL") ?? req.url;
  const params = [...form.entries()]
    .map(([key, value]) => [key, String(value)] as const)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${key}${value}`)
    .join("");
  const expected = await signTwilioPayload(authToken, `${validationUrl}${params}`);
  return timingSafeEqual(expected, received);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const form = await req.formData();
    const validTwilioRequest = await validateTwilioWebhook(req, form);
    if (!validTwilioRequest) {
      return new Response(JSON.stringify({ error: "Twilio webhook signature validation failed or is not configured." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const conferenceSid = String(form.get("ConferenceSid") ?? "");
    const callSid = String(form.get("CallSid") ?? "");
    const status = String(form.get("CallStatus") ?? form.get("StatusCallbackEvent") ?? "active");
    const duration = Number(form.get("CallDuration") ?? 0);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (conferenceSid || callSid) {
      await supabase
        .from("masked_call_sessions")
        .update({
          provider_conference_sid: conferenceSid || null,
          provider_call_sid: callSid || null,
          status: status.includes("end") || status === "completed" ? "completed" : "active",
          duration_seconds: Number.isFinite(duration) ? duration : null,
          status_callback_payload: Object.fromEntries(form.entries()),
          ended_at: status.includes("end") || status === "completed" ? new Date().toISOString() : null,
        })
        .or(`provider_conference_sid.eq.${conferenceSid},provider_call_sid.eq.${callSid}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
