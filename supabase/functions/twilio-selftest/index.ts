import { fail, handlePreflight, json, requireAdmin, requireAuth } from "../_shared/action-utils.ts";

/**
 * Asks Twilio whether voice and chat are actually configured, and reports what it says.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────
 * `verify-secrets.yml` proves a secret is *present*. It cannot prove the value is right, and the
 * most likely failure on this project is precisely a present-but-wrong value:
 *
 * **A TwiML App whose Voice Request URL was never filled in.** `TWILIO_VOICE_APP_SID` verifies ✅,
 * `twilio-token` mints a token happily, the call button appears — and the call dies silently at the
 * moment two people are trying to speak, because Twilio has nowhere to fetch TwiML from. Nothing
 * short of asking Twilio catches that.
 *
 * So this calls Twilio's REST API with the secrets that are already set and reads the real
 * configuration back.
 *
 * ── What it proves and what it does not ─────────────────────────────────────────
 * It proves the account and Auth Token are a valid pair, the API key belongs to that account, the
 * TwiML App exists **with its Voice URL and status callback pointing at our functions**, and the
 * Conversations service exists. That is everything that can be verified without two people.
 *
 * It does **not** prove two people can hear each other. Media has to flow between two browsers for
 * that, and no server-side check substitutes for it.
 *
 * ── Why admin-only ──────────────────────────────────────────────────────────────
 * The response describes account configuration — which SIDs exist, which URLs are set. That is not
 * dangerous, but it is not a customer's business either, and an endpoint that enumerates your
 * integration state should not be open. It never returns a token or a secret, and never logs one.
 *
 * ── The service-role path, and why it is not an escalation ──────────────────────
 * There are two ways in: an admin's session, or the project's **service-role key** in the
 * `Authorization` header. The second exists because of a specific dead end — this function's whole
 * purpose is to answer "does Twilio work", and until now the only way to ask was for a human to
 * sign in as an admin and click something. No session, no answer. So the question kept being
 * asked, and kept being answered with "I cannot check".
 *
 * The service role is not a privilege grant here. Anyone holding that key already has unrestricted
 * read and write on every table in the project; there is nothing in this response they could not
 * obtain more directly. What it buys is a caller with no browser — specifically
 * `.github/workflows/twilio-selftest.yml`, which fetches the key with the `SUPABASE_ACCESS_TOKEN`
 * that already exists as a repository secret and never echoes it.
 *
 * Compared exactly, not by prefix. A `startsWith("eyJ")` check would accept any JWT the caller
 * happened to hold, including a user's own access token, and that WOULD be an escalation.
 */

const TWILIO_API = "https://api.twilio.com/2010-04-01";
const CONVERSATIONS_API = "https://conversations.twilio.com/v1";

type Check = {
  name: string;
  /** true = working, false = broken, null = not applicable (the feature is deliberately unused). */
  ok: boolean | null;
  detail: string;
};

/** Basic auth for Twilio's REST API. The Auth Token is used here and never leaves this function. */
const basicAuth = (sid: string, token: string) => `Basic ${btoa(`${sid}:${token}`)}`;

const getJson = async (url: string, auth: string): Promise<{ status: number; body: any }> => {
  const res = await fetch(url, { headers: { Authorization: auth } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
};

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const preflight = handlePreflight(req, origin);
  if (preflight) return preflight;

  try {
    /*
     * Exact comparison against a service-role key — any of the names the platform uses for one.
     *
     * ⚠️ WHY THERE IS MORE THAN ONE NAME, measured 2026-08-12. The first CI run of this path
     * answered `authentication required` on both projects. The workflow fetches the key with
     * `supabase projects api-keys --reveal`, which returns Supabase's **current** key set, while
     * this function was comparing only against `SUPABASE_SERVICE_ROLE_KEY` — the legacy JWT. On a
     * project that has moved to the new `sb_secret_…` scheme those are two different strings, so
     * a correct caller presenting a correct key was rejected.
     *
     * The fix is to accept any of the secret-key env names the platform injects. It is NOT to
     * loosen the comparison: every entry below is still matched in full, against a value only the
     * project owner has. `startsWith("eyJ")` or a length check would accept any user's own access
     * token and turn an admin endpoint into an open one — that is the thing this must never do.
     *
     * `timingSafeEqual` is not available here without a Node polyfill, and the compared value is a
     * 200-plus-character random secret; an attacker who could exploit the timing of a string
     * compare against it would already have the key.
     *
     * No escalation either way: anyone holding any of these already has unrestricted read and
     * write on every table in the project. There is nothing in this response they could not get
     * more directly.
     */
    const serviceRoleKeys = [
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      Deno.env.get("SUPABASE_SECRET_KEY"),
      Deno.env.get("SB_SECRET_KEY"),
    ].filter((key): key is string => typeof key === "string" && key.length > 20);

    const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    const isServiceRole = bearer.length > 20 && serviceRoleKeys.some((key) => key === bearer);

    if (!isServiceRole) {
      const { response: authFailure, user, supa } = await requireAuth(req, origin);
      if (authFailure || !user || !supa) return authFailure ?? fail("Authentication required", origin, 401);
      const adminFailure = await requireAdmin(supa, user.id, origin);
      if (adminFailure) return adminFailure;
    }

    const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID") ?? "";
    // Either name — this repo reads the one Twilio Auth Token under two, and a check that accepted
    // only one would report a working configuration as broken.
    const authToken =
      Deno.env.get("TWILIO_AUTH_TOKEN") ?? Deno.env.get("TWILIO_WEBHOOK_AUTH_TOKEN") ?? "";
    const apiKeySid = Deno.env.get("TWILIO_API_KEY_SID") ?? "";
    const voiceAppSid = Deno.env.get("TWILIO_VOICE_APP_SID") ?? "";
    const conversationsSid = Deno.env.get("TWILIO_CONVERSATIONS_SERVICE_SID") ?? "";
    const proxySid = Deno.env.get("TWILIO_PROXY_SERVICE_SID") ?? "";

    const checks: Check[] = [];

    if (!accountSid || !authToken) {
      return json(
        {
          ok: false,
          checks: [{
            name: "credentials present",
            ok: false,
            detail: "TWILIO_ACCOUNT_SID or the Auth Token is not set. Run the verify-secrets workflow.",
          }],
        },
        200,
        origin,
      );
    }

    const auth = basicAuth(accountSid, authToken);

    // 1. Are the Account SID and Auth Token a valid pair? Everything below depends on this, so a
    //    401 here means the rest would fail for one reason and be reported as five.
    const account = await getJson(`${TWILIO_API}/Accounts/${accountSid}.json`, auth);
    const credentialsValid = account.status === 200;
    checks.push({
      name: "account credentials",
      ok: credentialsValid,
      detail: credentialsValid
        ? `Account "${account.body?.friendly_name ?? "unnamed"}" is ${account.body?.status ?? "unknown"}.`
        : `Twilio rejected the Account SID and Auth Token (HTTP ${account.status}). Check both values.`,
    });

    if (!credentialsValid) {
      return json({ ok: false, accountSid, checks }, 200, origin);
    }

    // 2. Does the API key belong to this account? A key from another Twilio account is a
    //    plausible copy-paste error and produces a confusing failure at token-mint time.
    if (apiKeySid) {
      const key = await getJson(`${TWILIO_API}/Accounts/${accountSid}/Keys/${apiKeySid}.json`, auth);
      checks.push({
        name: "API key",
        ok: key.status === 200,
        detail: key.status === 200
          ? `API key "${key.body?.friendly_name ?? apiKeySid}" belongs to this account.`
          : `API key is not on this account (HTTP ${key.status}). It may be from a different Twilio project.`,
      });
    } else {
      checks.push({ name: "API key", ok: false, detail: "TWILIO_API_KEY_SID is not set." });
    }

    // 3. The TwiML App, and — the whole point of this function — whether its Voice URL is set.
    if (voiceAppSid) {
      const app = await getJson(`${TWILIO_API}/Accounts/${accountSid}/Applications/${voiceAppSid}.json`, auth);
      if (app.status !== 200) {
        checks.push({
          name: "voice TwiML app",
          ok: false,
          detail: `TwiML App ${voiceAppSid} not found on this account (HTTP ${app.status}).`,
        });
      } else {
        const voiceUrl = String(app.body?.voice_url ?? "");
        const statusCallback = String(app.body?.status_callback ?? "");
        const voiceUrlSet = voiceUrl.length > 0;
        const pointsAtUs = voiceUrl.includes("twilio-voice-twiml");

        checks.push({
          name: "voice TwiML app",
          ok: voiceUrlSet && pointsAtUs,
          detail: !voiceUrlSet
            // The named failure this function exists for.
            ? `TwiML App "${app.body?.friendly_name ?? voiceAppSid}" exists but its Voice Request URL is EMPTY. Calls will connect and then die silently. Set it to .../twilio-voice-twiml (POST).`
            : pointsAtUs
              ? `Voice URL: ${voiceUrl} (${app.body?.voice_method ?? "?"}).`
              : `Voice URL is set but does not point at twilio-voice-twiml: ${voiceUrl}`,
        });

        checks.push({
          name: "voice status callback",
          // Not fatal: calls connect without it, we just lose call-status events.
          ok: statusCallback.includes("twilio-voice-status") ? true : null,
          detail: statusCallback
            ? `Status callback: ${statusCallback}`
            : "No status callback set. Calls still work; call-status events will not arrive.",
        });
      }
    } else {
      checks.push({ name: "voice TwiML app", ok: false, detail: "TWILIO_VOICE_APP_SID is not set." });
    }

    // 4. The Conversations service, which is all in-app chat needs — there is no webhook to set.
    if (conversationsSid) {
      const service = await getJson(`${CONVERSATIONS_API}/Services/${conversationsSid}`, auth);
      checks.push({
        name: "conversations service",
        ok: service.status === 200,
        detail: service.status === 200
          ? `Service "${service.body?.friendly_name ?? conversationsSid}" is reachable. Chat needs no webhook — it is API-driven.`
          : `Conversations service not found (HTTP ${service.status}).`,
      });
    } else {
      checks.push({
        name: "conversations service",
        ok: false,
        detail: "TWILIO_CONVERSATIONS_SERVICE_SID is not set.",
      });
    }

    /*
     * 5. The PSTN path, reported as not-applicable rather than failed.
     *
     * Xoot deliberately does not buy phone numbers: the in-app call is `<Dial><Conference>` over
     * data and needs none. Reporting these as ❌ would push someone toward "fixing" them by buying
     * a number they do not need — which is the exact mistake `TWILIO_CALLER_ID` in the token gate
     * already caused once. Keeping *broken* and *deliberately unused* visually distinct is the
     * point.
     */
    checks.push({
      name: "masked PSTN calling",
      ok: proxySid ? true : null,
      detail: proxySid
        ? "Twilio Proxy service is configured. The phone fallback is available."
        : "Not configured, and not needed. The in-app call is WebRTC and uses no phone number.",
    });
    checks.push({
      name: "SMS / WhatsApp webhooks",
      ok: null,
      detail: "Not applicable: these need a purchased number or WhatsApp sender. In-app chat does not use them.",
    });

    const failures = checks.filter((check) => check.ok === false);

    return json(
      {
        // `null` checks are deliberately excluded — not-applicable is not a failure.
        ok: failures.length === 0,
        // Returned so staging and production can be compared: the same Account SID on both means
        // shared credentials, which SECRETS_INVENTORY.md forbids.
        accountSid,
        summary: failures.length === 0
          ? "Voice and chat are configured. This does not prove a call connects — that needs two browsers."
          : `${failures.length} problem(s) found.`,
        checks,
      },
      200,
      origin,
    );
  } catch (err) {
    // Logged, never returned: the error from a Twilio call can carry request detail.
    console.error("twilio-selftest failure", err);
    return fail("Self-test failed", origin, 500);
  }
});
