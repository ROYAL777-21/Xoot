import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Holds the Twilio secret list together across the four places that describe it.
 *
 * ── The defect this exists to prevent ────────────────────────────────────────────
 * On 2026-08-09 there were three disagreeing answers to "which Twilio secrets do I set".
 *
 * Twilio issues **one** Auth Token per account. The code read it under two names:
 * `TWILIO_AUTH_TOKEN` in `_shared/twilio-webhook.ts` (covering the message, WhatsApp,
 * status-callback, verify and voice webhooks — five of seven) and `TWILIO_WEBHOOK_AUTH_TOKEN` in
 * `twilio-voice-twiml` and `twilio-voice-status`. `go-live.md` listed only the second and said it
 * was "what every webhook's HMAC-SHA1 check validates against", which was false. Following the
 * runbook exactly would have left five webhooks rejecting every inbound Twilio request —
 * silently, because signature validation fails closed and the 403 carries no log line about a
 * missing secret.
 *
 * `.env.example` was a third list again: it named a TwiML app variable the code does not read,
 * omitted `TWILIO_CONVERSATIONS_SERVICE_SID`, and carried six variables nothing reads at all.
 *
 * This is the same shape as the multi-Xooter bug fixed the same day: one question, several
 * answers, no test. So the answers are pinned to each other here.
 */

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const tokenFn = read("supabase/functions/twilio-token/index.ts");
const sharedWebhook = read("supabase/functions/_shared/twilio-webhook.ts");
const runbook = read("docs/release/go-live.md");
const envExample = read("supabase/functions/.env.example");
const envStaging = read("supabase/functions/.env.staging.example");

/** The seven `twilio-token` gates on, by their primary name. */
const REQUIRED = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_API_KEY_SID",
  "TWILIO_API_KEY_SECRET",
  "TWILIO_CONVERSATIONS_SERVICE_SID",
  "TWILIO_VOICE_APP_SID",
  "TWILIO_CALLER_ID",
  "TWILIO_WEBHOOK_AUTH_TOKEN",
];

/** The eighth — masked PSTN only, deliberately not in `requiredSecrets`. */
const OPTIONAL_EIGHTH = "TWILIO_PROXY_SERVICE_SID";

/** Read somewhere, but each with a working fallback, so absent is not a failure. */
const FALLBACK_BACKED = [
  "TWILIO_AUTH_TOKEN",
  "TWILIO_API_KEY",
  "TWILIO_WEBHOOK_BASE_URL",
  "TWILIO_WEBHOOK_HASH_SALT",
  "TWILIO_WEBHOOK_TWIML_URL",
  "TWILIO_WEBHOOK_STATUS_URL",
];

describe("Twilio secrets contract", () => {
  it("twilio-token still gates on exactly these seven", () => {
    const block = tokenFn.slice(
      tokenFn.indexOf("const requiredSecrets"),
      tokenFn.indexOf("] as const", tokenFn.indexOf("const requiredSecrets")),
    );
    const names = [...block.matchAll(/"(TWILIO_[A-Z_]+)"/g)].map((m) => m[1]);
    // The first name of each group is the one reported as missing and documented.
    const primary = [...block.matchAll(/\["(TWILIO_[A-Z_]+)"/g)].map((m) => m[1]);

    expect(primary).toEqual(REQUIRED);
    // The Auth Token group accepts both spellings; nothing else has an alternative.
    expect(names).toContain("TWILIO_AUTH_TOKEN");
    expect(names.length).toBe(REQUIRED.length + 1);

    // The eighth must stay out: gating token minting on the PSTN-only secret would make the
    // in-app data call impossible to enable without Proxy, which is backwards.
    expect(primary).not.toContain(OPTIONAL_EIGHTH);
  });

  it("accepts either name for the one account Auth Token, everywhere it is checked", () => {
    // The whole point of the fix: one value under either name works in all seven webhooks.
    expect(sharedWebhook).toMatch(
      /Deno\.env\.get\("TWILIO_AUTH_TOKEN"\) \?\? Deno\.env\.get\("TWILIO_WEBHOOK_AUTH_TOKEN"\)/,
    );
    for (const fn of ["twilio-voice-twiml", "twilio-voice-status"]) {
      const src = read(`supabase/functions/${fn}/index.ts`);
      expect(
        src,
        `${fn} must accept either Auth Token name`,
      ).toMatch(
        /Deno\.env\.get\("TWILIO_WEBHOOK_AUTH_TOKEN"\) \?\? Deno\.env\.get\("TWILIO_AUTH_TOKEN"\)/,
      );
    }
  });

  it("fails closed when no Auth Token is set, under either name", () => {
    // A signature check that passes when unconfigured is worse than none: it would accept any
    // caller claiming to be Twilio. Both paths must refuse.
    expect(sharedWebhook).toMatch(/if \(!authToken\) return \{ configured: false, valid: false \}/);
    for (const fn of ["twilio-voice-twiml", "twilio-voice-status"]) {
      expect(read(`supabase/functions/${fn}/index.ts`)).toMatch(/if \(!authToken\) return false/);
    }
  });

  it("the runbook documents every required secret, and the optional eighth", () => {
    for (const name of REQUIRED) {
      expect(runbook, `go-live.md no longer documents ${name}`).toContain(name);
    }
    expect(runbook).toContain(OPTIONAL_EIGHTH);
    // The sentence that was false must not come back.
    expect(runbook).not.toContain("This is what every webhook's HMAC-SHA1 check validates against");
  });

  it("both .env examples list every required secret and nothing the code ignores", () => {
    for (const [label, file] of [[".env.example", envExample], [".env.staging.example", envStaging]] as const) {
      for (const name of REQUIRED) {
        expect(file, `${label} is missing ${name}`).toContain(`${name}=`);
      }
      expect(file, `${label} is missing the optional eighth`).toContain(`${OPTIONAL_EIGHTH}=`);

      // Every TWILIO_* key present must be one the code actually reads. This is what stopped the
      // examples drifting into six variables nothing consumes.
      const declared = [...file.matchAll(/^(TWILIO_[A-Z_]+)=/gm)].map((m) => m[1]);
      const known = new Set([...REQUIRED, OPTIONAL_EIGHTH, ...FALLBACK_BACKED]);
      for (const name of declared) {
        expect(known.has(name), `${label} declares ${name}, which no Edge Function reads`).toBe(true);
      }
    }
  });

  it("every TWILIO_* variable read by an Edge Function is documented somewhere", () => {
    // The direction the other assertions cannot cover: a new secret added in code and never
    // written down is how this drifted in the first place.
    const functions = read("supabase/functions/twilio-token/index.ts")
      + sharedWebhook
      + read("supabase/functions/create-masked-call/index.ts")
      + read("supabase/functions/twilio-conversation/index.ts")
      + read("supabase/functions/twilio-voice-twiml/index.ts")
      + read("supabase/functions/twilio-voice-status/index.ts");

    const readNames = new Set([...functions.matchAll(/Deno\.env\.get\("(TWILIO_[A-Z_]+)"\)/g)].map((m) => m[1]));
    const documented = new Set([...REQUIRED, OPTIONAL_EIGHTH, ...FALLBACK_BACKED]);
    for (const name of readNames) {
      expect(documented.has(name), `${name} is read by an Edge Function but documented nowhere`).toBe(true);
    }
  });

  it("records that the two twilio.* switches gate PSTN only, not the data call", () => {
    // Corrected 2026-08-09. `twilio-token` mints the WebRTC token and never reads these controls;
    // only `create-masked-call` and `ops-workflow` do. Stating it in the runbook stops the next
    // person flipping switches to fix a data-call problem they cannot fix that way.
    expect(tokenFn).not.toContain("twilio.masked_voice\"");
    expect(tokenFn).not.toContain("isOperationalControlEnabled");
    const masked = read("supabase/functions/create-masked-call/index.ts");
    expect(masked).toMatch(/twilioAccountReady && maskedVoiceReady/);
    expect(runbook).toContain("These two switches turn on the phone-number fallback.");
  });
});
