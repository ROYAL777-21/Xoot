import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/**
 * Twilio status callback for masked calls — records conference and call state.
 *
 * Recovered from production on 2026-08-02, where it ran with no source in this repository, then
 * committed verbatim so this fix reads as a diff.
 *
 * `verify_jwt: false` is correct — Twilio calls this, not a signed-in user — and the HMAC-SHA1
 * signature check is implemented properly, failing closed when the auth token is absent. The
 * wildcard CORS header is left alone deliberately: this endpoint returns `{ok:true}` to a server
 * that does not send an Origin, so there is no browser to protect and nothing to leak.
 *
 * FIXED — four bugs in one UPDATE, all the same shape: an unconditioned write driven by whatever
 * an external callback happened to include.
 *
 * 1. The `.or()` filter was built by string interpolation with no guard against an empty side.
 *    A callback carrying `CallSid` but no `ConferenceSid` produced
 *    `provider_conference_sid.eq.,provider_call_sid.eq.CAxxxx` — an equality against the empty
 *    string, a term nobody wrote. The filter is now assembled only from identifiers actually
 *    present, and the row is resolved first so the write is by primary key.
 *
 * 2. The update wrote `provider_conference_sid: conferenceSid || null`, so a call-only callback
 *    erased the conference SID that an earlier conference callback had stored, and vice versa.
 *    Each identifier is now written only when the callback carries it.
 *
 * 3. `ended_at` was set to `null` on every non-terminal status. Twilio retries and reorders
 *    callbacks, so one late `in-progress` after a `completed` un-ended a finished call.
 *
 * 4. `duration_seconds` read `Number(form.get("CallDuration") ?? 0)`, which is `0` — finite, so
 *    it was written — whenever the callback omitted the field. A real duration was overwritten
 *    with zero by any later callback.
 *
 * Terminal states are now terminal, matching `respond-zooter-job`: once a session is completed
 * it is not moved back to active by a replayed or out-of-order callback.
 *
 * FIXED — the catch returned `String(err)`.
 *
 * KNOWN GAP, not fixed here because it needs the live Twilio account to get right: nothing
 * currently populates `provider_call_sid` or `provider_conference_sid`. `create-masked-call`
 * creates a Twilio Proxy session and returns `session_sid` but never persists it, so there is no
 * correlation key and this callback matches no row regardless of how good the filter is. Wire
 * that up before enabling `twilio.masked_voice`, and confirm which identifier Proxy actually
 * sends on the status callback rather than assuming.
 *
 * Also unchanged: `status_callback_payload` stores Twilio's entire callback verbatim. Useful for
 * debugging, and a place caller identifiers accumulate — it needs a POPIA retention rule before
 * masked voice is enabled.
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

/** A Twilio SID is 34 characters: a two-letter prefix and 32 hex digits. */
const isTwilioSid = (value: string, prefix: string) =>
  new RegExp(`^${prefix}[0-9a-fA-F]{32}$`).test(value);

const isEndState = (status: string) => status.includes("end") || status === "completed";

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

    // Shape-checked before either value reaches a filter. An identifier that is absent, empty or
    // malformed is treated as absent rather than as an empty-string match.
    const rawConferenceSid = String(form.get("ConferenceSid") ?? "");
    const rawCallSid = String(form.get("CallSid") ?? "");
    const conferenceSid = isTwilioSid(rawConferenceSid, "CF") ? rawConferenceSid : "";
    const callSid = isTwilioSid(rawCallSid, "CA") ? rawCallSid : "";
    const status = String(form.get("CallStatus") ?? form.get("StatusCallbackEvent") ?? "active");

    if (!conferenceSid && !callSid) {
      // Nothing to correlate on. 200 so Twilio does not retry a callback we will never match.
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Built from the identifiers that are present, so no empty-string term can appear.
    const filter = [
      conferenceSid ? `provider_conference_sid.eq.${conferenceSid}` : null,
      callSid ? `provider_call_sid.eq.${callSid}` : null,
    ].filter(Boolean).join(",");

    const { data: session } = await supabase
      .from("masked_call_sessions")
      .select("id,status,ended_at")
      .or(filter)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (session?.id) {
      const ending = isEndState(status);
      // Terminal stays terminal. A replayed or out-of-order callback cannot reopen a call.
      const alreadyCompleted = session.status === "completed";

      const patch: Record<string, unknown> = {
        status: alreadyCompleted || ending ? "completed" : "active",
        status_callback_payload: Object.fromEntries(form.entries()),
      };
      // Only write an identifier the callback actually carried, so a call-only callback cannot
      // erase a conference SID recorded earlier.
      if (conferenceSid) patch.provider_conference_sid = conferenceSid;
      if (callSid) patch.provider_call_sid = callSid;
      // Only when Twilio sends it, and only as a number. An absent field used to write 0.
      if (form.has("CallDuration")) {
        const duration = Number(form.get("CallDuration"));
        if (Number.isFinite(duration) && duration >= 0) patch.duration_seconds = Math.trunc(duration);
      }
      // Set once, on the first callback that ends the call. Never cleared.
      if (ending && !session.ended_at) patch.ended_at = new Date().toISOString();

      await supabase.from("masked_call_sessions").update(patch).eq("id", session.id);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    // Logged, not returned. This endpoint is unauthenticated by design, so an echoed error is
    // readable by anyone who can reach the URL.
    console.error("twilio-voice-status failure", err);
    return new Response(JSON.stringify({ error: "Request failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
