import { fail, handlePreflight, json, requireAdmin, requireAuth } from "../_shared/action-utils.ts";
import {
  describeUnroutableFunctionUrl,
  expectedFunctionUrls,
  isRoutableFunctionUrl,
  projectRefFrom,
  sameSignatureUrl,
} from "../_shared/function-url.ts";

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

/** How many TwiML Apps to enumerate. Enough to see the mismatch, capped so a public log stays readable. */
const TWIML_APP_LIST_LIMIT = 10;

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

/**
 * The canonical URL this project serves `fn` on — the one an error message tells you to paste.
 * The predicate itself lives in `_shared/function-url.ts`, where it is unit-tested; see the note
 * at the top of that file for the production failure that made a substring match insufficient.
 */
const canonicalUrlFor = (fn: string) =>
  expectedFunctionUrls(projectRefFrom(Deno.env.get("SUPABASE_URL") ?? ""), fn)[0];

const describeUnroutable = (url: string, fn: string) =>
  describeUnroutableFunctionUrl(url, fn, canonicalUrlFor(fn));

/**
 * One override secret against the URL Twilio is configured to call.
 *
 * Three outcomes, and the middle one is the whole reason this exists:
 *
 *   unset      ➖ safe by construction — validation falls back to `req.url`, which is by definition
 *                the URL Twilio just called, so it always matches.
 *   equal      ✅ set and agreeing.
 *   different  ❌ set and stale. The request arrives and is refused 403.
 *
 * `null` for unset follows this function's existing convention — not-applicable rather than broken,
 * the same way the PSTN rows are reported. An unset override is the recommended state, not a gap.
 */
const signatureUrlCheck = (
  name: string,
  envName: string,
  override: string,
  configuredUrl: string,
  consequence: string,
): Check => {
  if (!override) {
    return {
      name,
      ok: null,
      detail: `${envName} is not set, which is the safe default: signature validation falls back to the request URL, which always matches whatever Twilio called.`,
    };
  }
  if (sameSignatureUrl(override, configuredUrl)) {
    return { name, ok: true, detail: `${envName} matches the URL configured in Twilio.` };
  }
  return {
    name,
    ok: false,
    // Both values in full. Neither is a secret — one is Twilio's own configuration, already printed
    // by the check above, and the other is a URL. The exact characters are the point: a trailing
    // slash or a query string is enough to break the HMAC, and a truncated message would hide it.
    detail:
      `${envName} does not match the URL configured in Twilio, so the HMAC is computed over a different string and ${consequence}. ` +
      `Twilio calls: ${configuredUrl || "(nothing configured)"} — ${envName} is: ${override}. ` +
      `Fix whichever is wrong; if Twilio's is now correct, run: supabase secrets set ${envName}="${configuredUrl}" --project-ref <ref>`,
  };
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

    /*
     * The three signature-validation URL overrides.
     *
     * ⚠️ These are the reason "fix the Voice URL in the Console" can be incomplete advice. Both
     * voice functions validate Twilio's HMAC against an override if one is set:
     *
     *   twilio-voice-twiml   validationUrl = TWILIO_WEBHOOK_TWIML_URL  ?? req.url
     *   twilio-voice-status  validationUrl = TWILIO_WEBHOOK_STATUS_URL ?? req.url
     *
     * and the other five webhooks rebuild the URL from TWILIO_WEBHOOK_BASE_URL
     * (`_shared/twilio-webhook.ts`). Twilio signs the URL it actually posted to. So if the Console
     * URL is corrected and a stale override is left behind, the request now ARRIVES and is then
     * rejected 403 — the call still dies, with a different error and no log line saying why.
     *
     * Unreadable from anywhere else: these are Edge Function secrets, and `verify-secrets.yml`
     * reports names only. This function is the only place that sees the env value and Twilio's
     * configured value at the same time, which is why the check lives here.
     */
    const twimlSignatureUrl = Deno.env.get("TWILIO_WEBHOOK_TWIML_URL") ?? "";
    const statusSignatureUrl = Deno.env.get("TWILIO_WEBHOOK_STATUS_URL") ?? "";
    const webhookBaseUrl = Deno.env.get("TWILIO_WEBHOOK_BASE_URL") ?? "";

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
        const voiceUrlRoutable = isRoutableFunctionUrl(voiceUrl, "twilio-voice-twiml");

        /*
         * ⚠️ NAME THE APP IN EVERY BRANCH, NOT JUST THE EMPTY-URL ONE.
         *
         * Measured 2026-08-12: staging and production report the SAME Twilio account and DIFFERENT
         * `voice_url` values. A TwiML App has exactly one `voice_url`, so that is two apps in one
         * account — which is defect ② (shared credentials) showing through as an ordinary
         * usability problem.
         *
         * The first version of this check reported "the Voice URL is wrong" and named no app. With
         * two candidates sitting in one Console list, the founder opened one, found it already
         * correct, changed nothing that mattered, and had no way to discover why. The check was
         * right about the defect and useless for fixing it — the same failure as the substring
         * match it replaced, one level up.
         *
         * The SID is an identifier, not a credential. It is what makes the instruction actionable,
         * because it is the only thing that distinguishes the two apps reliably: friendly names
         * are duplicated and list order is not stable.
         */
        const appLabel = `TwiML App "${app.body?.friendly_name ?? "unnamed"}" (${voiceAppSid})`;

        checks.push({
          name: "voice TwiML app",
          ok: voiceUrlSet && voiceUrlRoutable,
          detail: !voiceUrlSet
            // The named failure this function exists for.
            ? `${appLabel} exists but its Voice Request URL is EMPTY. Calls will connect and then die silently. Set it to ${canonicalUrlFor("twilio-voice-twiml")} (POST).`
            : voiceUrlRoutable
              ? `${appLabel} — Voice URL: ${voiceUrl} (${app.body?.voice_method ?? "?"}).`
              : `${appLabel} — ⚠️ EDIT THIS APP, MATCHING THE SID ABOVE, not whichever app the Console lists first. Voice URL ${describeUnroutable(voiceUrl, "twilio-voice-twiml")}`,
        });

        /*
         * A GET TwiML App is another silent 403.
         *
         * `twilio-voice-twiml` builds its signature payload from the POSTed form fields; a GET
         * arrives with none, so the HMAC cannot match and the call dies the same quiet way. Free
         * to check, since the app object is already here.
         */
        const voiceMethod = String(app.body?.voice_method ?? "").toUpperCase();
        checks.push({
          name: "voice TwiML app method",
          ok: voiceMethod === "POST",
          detail: voiceMethod === "POST"
            ? "Voice Request URL is called with POST, which is what the signature check expects."
            : `Voice Request URL is set to ${voiceMethod || "(unset)"}, not POST. The signature is built from POSTed form fields, so a GET arrives with none and is rejected 403 — the call dies as silently as a 404. Change the method beside the URL on ${appLabel}.`,
        });

        const statusRoutable = isRoutableFunctionUrl(statusCallback, "twilio-voice-status");
        checks.push({
          name: "voice status callback",
          // Not fatal: calls connect without it, we just lose call-status events. But a callback
          // that is set to an unroutable URL is worth flagging as broken rather than absent — it
          // looks configured and is not.
          ok: statusRoutable ? true : statusCallback.length > 0 ? false : null,
          detail: !statusCallback
            ? `${appLabel} has no status callback set. Calls still work; call-status events will not arrive.`
            : statusRoutable
              ? `${appLabel} — Status callback: ${statusCallback}`
              : `${appLabel} — ⚠️ SAME APP, SAME SID. Status callback ${describeUnroutable(statusCallback, "twilio-voice-status")}`,
        });

        /*
         * Does each function validate against the URL Twilio will actually sign?
         *
         * Reported per override rather than as one row, because the two are set independently and
         * "voice works, status events vanish" is a real and confusing half-state.
         */
        checks.push(signatureUrlCheck(
          "voice TwiML signature URL",
          "TWILIO_WEBHOOK_TWIML_URL",
          twimlSignatureUrl,
          voiceUrl,
          "the call is rejected 403 before any TwiML is returned, so it dies exactly like a 404 does",
        ));
        checks.push(signatureUrlCheck(
          "voice status signature URL",
          "TWILIO_WEBHOOK_STATUS_URL",
          statusSignatureUrl,
          statusCallback,
          "every call-status callback is rejected 403, so calls still connect but their events vanish",
        ));
      }
    } else {
      checks.push({ name: "voice TwiML app", ok: false, detail: "TWILIO_VOICE_APP_SID is not set." });
    }

    /*
     * 3a. Every TwiML App on the account, so "which one?" is answerable in one glance.
     *
     * This row exists because of a real dead end. Production's Voice URL was wrong; the founder
     * opened the Console, found an app whose URLs were already correct, changed nothing, and the
     * check kept failing. Both observations were true: the account holds more than one TwiML App,
     * and the one being looked at was not the one `TWILIO_VOICE_APP_SID` names.
     *
     * Nothing in the Console makes that obvious — the apps sit in one list, and while this account
     * is shared between staging and production there is no environment column to sort by.
     *
     * Several apps is NOT reported as a fault. It is the direct, expected consequence of defect ②,
     * and calling a correct configuration broken is how a founder gets taught to ignore this
     * report. It is `null` — informational — with the SIDs lined up so the mismatch is visible.
     */
    {
      const list = await getJson(`${TWILIO_API}/Accounts/${accountSid}/Applications.json?PageSize=${TWIML_APP_LIST_LIMIT}`, auth);
      if (list.status !== 200) {
        checks.push({
          name: "TwiML apps on this account",
          ok: null,
          detail: `Could not list the account's TwiML Apps (HTTP ${list.status}). Not fatal — the check above still names the app it read.`,
        });
      } else {
        const apps = Array.isArray(list.body?.applications) ? list.body.applications : [];
        // SIDs, names and URLs only. No credential is in a TwiML App object, and the list is capped
        // so a large account cannot flood what is a public run log.
        const lines = apps.slice(0, TWIML_APP_LIST_LIMIT).map((entry: any) => {
          const mine = entry?.sid === voiceAppSid ? " ← THIS PROJECT USES THIS ONE" : "";
          return `${entry?.sid ?? "?"} "${entry?.friendly_name ?? "unnamed"}" voice_url=${entry?.voice_url || "(empty)"}${mine}`;
        });
        checks.push({
          name: "TwiML apps on this account",
          ok: null,
          detail: apps.length === 0
            ? "This Twilio account has no TwiML Apps at all."
            : apps.length === 1
              ? `One TwiML App on this account: ${lines[0]}`
              : `⚠️ ${apps.length} TwiML Apps on this account — edit by SID, not by name or list position. ${lines.join(" | ")}`,
        });
      }
    }

    /*
     * 3b. The base URL the OTHER five webhooks validate against.
     *
     * `_shared/twilio-webhook.ts` rebuilds the signed URL by taking this origin and pasting the
     * request's path onto it, for the message, WhatsApp, verify, status-callback and voice
     * webhooks. Gate 0 has never said anything about those five, so a wrong origin here breaks all
     * of them at once, silently, and nothing reports it.
     *
     * Checked by origin rather than by full URL because it is a base: the path varies per webhook.
     */
    if (!webhookBaseUrl) {
      checks.push({
        name: "webhook base URL",
        ok: null,
        detail: "TWILIO_WEBHOOK_BASE_URL is not set, which is the safe default: the five non-voice webhooks validate against the request URL, which always matches.",
      });
    } else {
      // Reuse the routability shape check by appending a known function name — the base is correct
      // exactly when base + "/<fn>" is a URL this project serves.
      const probe = `${webhookBaseUrl.trim().replace(/\/+$/, "")}/twilio-message-webhook`;
      const baseOk = isRoutableFunctionUrl(probe, "twilio-message-webhook");
      checks.push({
        name: "webhook base URL",
        ok: baseOk,
        detail: baseOk
          ? `TWILIO_WEBHOOK_BASE_URL: ${webhookBaseUrl}`
          : `TWILIO_WEBHOOK_BASE_URL is not this project's Functions origin: ${webhookBaseUrl}. The message, WhatsApp, verify, status-callback and voice webhooks all validate their signature against it, so every one of them returns 403. Set it to ${canonicalUrlFor("").replace(/\/$/, "")}`,
      });
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
