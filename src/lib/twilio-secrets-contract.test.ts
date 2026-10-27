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
const runbook = read("docs/release/production-checklist.md");
const envExample = read("supabase/functions/.env.example");
const envStaging = read("supabase/functions/.env.staging.example");

/**
 * The seven the runbook documents. `TWILIO_CALLER_ID` stays documented because the masked-PSTN
 * fallback will need it, but it no longer gates either token capability — see the scoping test.
 */
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
  /**
   * Scoped per capability on 2026-08-10, and the scoping is the assertion.
   *
   * `TWILIO_CALLER_ID` used to gate both capabilities, so an **in-app data call** refused to mint a
   * token without a verified phone number that nothing in this codebase reads. That made the free
   * path look unavailable and would have led to buying numbers Twilio Proxy needs and WebRTC does
   * not: `twilio-voice-twiml` answers `<Dial><Conference>`, which has no PSTN leg at all.
   */
  it("asks each capability only for the secrets it actually uses", () => {
    const block = tokenFn.slice(
      tokenFn.indexOf("const CAPABILITY_SECRETS"),
      tokenFn.indexOf("} as const satisfies"),
    );
    // Slice to the close of the capability's own array — `\n  ],` — not the first `],`, which
    // would be the end of the first inner name group and match only one secret.
    const section = (name: string) => {
      const start = block.indexOf(`${name}: [`);
      return block.slice(start, block.indexOf("\n  ],", start));
    };
    const primaries = (name: string) =>
      [...section(name).matchAll(/\["(TWILIO_[A-Z_]+)"/g)].map((m) => m[1]);

    expect(primaries("voice")).toEqual([
      "TWILIO_ACCOUNT_SID",
      "TWILIO_API_KEY_SID",
      "TWILIO_API_KEY_SECRET",
      "TWILIO_VOICE_APP_SID",
      "TWILIO_WEBHOOK_AUTH_TOKEN",
    ]);
    expect(primaries("conversations")).toEqual([
      "TWILIO_ACCOUNT_SID",
      "TWILIO_API_KEY_SID",
      "TWILIO_API_KEY_SECRET",
      "TWILIO_CONVERSATIONS_SERVICE_SID",
      "TWILIO_WEBHOOK_AUTH_TOKEN",
    ]);

    // Neither capability may require a phone number. This is the regression that costs money.
    for (const capability of ["voice", "conversations"]) {
      expect(primaries(capability)).not.toContain("TWILIO_CALLER_ID");
      expect(primaries(capability)).not.toContain(OPTIONAL_EIGHTH);
    }

    // The Auth Token still accepts either spelling, in both capabilities.
    expect(section("voice")).toContain("TWILIO_AUTH_TOKEN");
    expect(section("conversations")).toContain("TWILIO_AUTH_TOKEN");

    // And the gate is evaluated per capability rather than as one blanket list.
    expect(tokenFn).toMatch(/CAPABILITY_SECRETS\[capability as keyof typeof CAPABILITY_SECRETS\]/);
  });

  it("keeps the data call free of phone numbers, which is why none need buying", () => {
    // The commercial fact this whole scoping rests on, asserted rather than remembered.
    const twiml = read("supabase/functions/twilio-voice-twiml/index.ts");
    expect(twiml).toMatch(/<Conference/);
    expect(twiml).not.toMatch(/<Number>/);

    // Proxy — and only Proxy — allocates numbers from a pool you pay for.
    const masked = read("supabase/functions/create-masked-call/index.ts");
    expect(masked).toMatch(/proxy\.twilio\.com/);
    expect(masked).toMatch(/TWILIO_PROXY_SERVICE_SID/);

    // And the runbook answers the question in those terms, because it is the one that keeps being
    // asked and the wrong answer costs money every month. If the code above ever changes, this
    // fails alongside it rather than leaving the doc confidently wrong.
    expect(runbook).toContain("The in-app data call does not require purchasing a phone number.");
    // The runbook must not send anyone to buy a number for the caller ID.
    expect(runbook).not.toMatch(/Buy a\n\s*number under Phone Numbers/);
  });

  it("accepts either name for the one account Auth Token, everywhere it is checked", () => {
    // The whole point of the fix: one value under either name works in all seven webhooks.
    expect(sharedWebhook).toMatch(
      /Deno\.env\.get\("TWILIO_AUTH_TOKEN"\) \?\? Deno\.env\.get\("TWILIO_WEBHOOK_AUTH_TOKEN"\)/,
    );
    for (const fn of ["twilio-voice-status", "_shared/in-app-voice-webhook"]) {
      const src = read(fn.startsWith("_shared/") ? `supabase/functions/${fn}.ts` : `supabase/functions/${fn}/index.ts`);
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
    for (const fn of ["twilio-voice-status"]) {
      expect(read(`supabase/functions/${fn}/index.ts`)).toMatch(/if \(!authToken\) return false/);
    }
    const signedForm = read("supabase/functions/_shared/in-app-voice-webhook.ts");
    expect(signedForm).toContain("!secret || !signature");
    for (const fn of ["twilio-voice-twiml", "twilio-in-app-voice-status"]) {
      expect(read(`supabase/functions/${fn}/index.ts`)).toMatch(/await signedVoiceForm\(/);
    }
  });

  it("the runbook documents every required secret, and the optional eighth", () => {
    for (const name of REQUIRED) {
      expect(runbook, `production-checklist.md no longer documents ${name}`).toContain(name);
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

  it("requires an independent disabled-by-default gate for the data call", () => {
    expect(tokenFn).not.toContain("twilio.masked_voice\"");
    expect(tokenFn).toContain("isOperationalControlEnabled");
    expect(tokenFn).toContain('"twilio.in_app_voice"');
    const masked = read("supabase/functions/create-masked-call/index.ts");
    expect(masked).toMatch(/twilioAccountReady && maskedVoiceReady/);
    expect(runbook).toContain("twilio.in_app_voice");
    const gate = read("supabase/migrations/20261025080000_in_app_voice_control.sql");
    expect(gate).toMatch(/'twilio\.in_app_voice',\s*'provider_gate',\s*'all',\s*false/);
    expect(gate).toContain("on conflict (control_key, environment) do nothing");
  });
});
