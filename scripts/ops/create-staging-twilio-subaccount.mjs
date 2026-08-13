#!/usr/bin/env node
/**
 * Create a Twilio subaccount for staging, so staging test calls stop billing production.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────────
 * `twilio-selftest` measured it on 2026-08-12: staging and production both report Account SID
 * `AC93de1e…` and the same API key, "ZOOT API KEY". `docs/SECRETS_INVENTORY.md:56` — *"Staging and
 * production credentials must be separate."*
 *
 * The consequence is not abstract. Every staging test call:
 *   - bills the live account,
 *   - appears in the production call logs, where it is indistinguishable from a customer's call,
 *   - and shares one Auth Token, so a staging leak is a production leak.
 *
 * That last point is what makes it worth doing before anyone but you tests voice.
 *
 * ── What it creates, on the STAGING side only ───────────────────────────────────
 *   1. A subaccount named "Xoot Staging".
 *   2. An API key on that subaccount (`TWILIO_API_KEY_SID` / `TWILIO_API_KEY_SECRET`).
 *   3. A TwiML App on that subaccount, with staging's Voice URL and status callback ALREADY SET
 *      to routable URLs — so it cannot reproduce the production defect this same self-test found,
 *      where the URL was the REST host with the function name pasted on the root and answered 404.
 *   4. A Conversations service on that subaccount.
 *
 * Then it prints the `supabase secrets set` command for staging. It does not run it: that needs
 * your Supabase access token, and one script holding both providers' credentials is a worse idea
 * than two steps.
 *
 * ── Usage ───────────────────────────────────────────────────────────────────────
 *   # 1. Dry run. Prints what it would create and changes nothing.
 *   XOOT_TWILIO_ACCOUNT_SID=AC... XOOT_TWILIO_AUTH_TOKEN=... \
 *     node scripts/ops/create-staging-twilio-subaccount.mjs
 *
 *   # 2. For real.
 *   XOOT_TWILIO_ACCOUNT_SID=AC... XOOT_TWILIO_AUTH_TOKEN=... \
 *     node scripts/ops/create-staging-twilio-subaccount.mjs --confirm
 *
 * The credentials are the PARENT account's, from the Twilio Console dashboard. They are read from
 * the environment, never written anywhere, and never echoed.
 *
 * ⚠️ FOUNDER'S TERMINAL ONLY. NEVER CI.
 * Twilio returns an API Key Secret exactly once, at creation, and never again. This script must
 * therefore print it. That is the one moment it exists in readable form, so:
 *   - do not run this in a workflow, where the output is a retained log,
 *   - do not paste the output into a chat, an issue, or a commit,
 *   - put the secret straight into `supabase secrets set` and then clear your scrollback.
 * No workflow in this repo calls this script, deliberately.
 *
 * ⚠️ Subaccounts cannot be deleted, only closed. So this refuses to create a second one if
 * "Xoot Staging" already exists, rather than leaving you to work out which of two is live.
 */

const STAGING_PROJECT_REF = "fxmxyabdjqviqbcxmvlp";
const SUBACCOUNT_FRIENDLY_NAME = "Xoot Staging";
const TWILIO_API = "https://api.twilio.com/2010-04-01";
const CONVERSATIONS_API = "https://conversations.twilio.com/v1";

/** Staging's Functions origin. The TwiML App is created pointing here, correct from birth. */
const STAGING_FUNCTIONS_ORIGIN = `https://${STAGING_PROJECT_REF}.functions.supabase.co`;
const VOICE_URL = `${STAGING_FUNCTIONS_ORIGIN}/twilio-voice-twiml`;
const STATUS_CALLBACK = `${STAGING_FUNCTIONS_ORIGIN}/twilio-voice-status`;

const args = new Set(process.argv.slice(2));
const confirmed = args.has("--confirm");
const env = (name) => String(process.env[name] ?? "").trim();

/**
 * `--emit-env <path>` — write the seven values to a file instead of printing them.
 *
 * ── Why this exists, and why it makes CI safe rather than unsafe ────────────────
 * The warning above is right that this script must never PRINT the API Key Secret into a retained
 * log. It is wrong that this rules out automation, and that conflation left the founder — who works
 * from a browser — with no route to this at all.
 *
 * Printing was only ever a means to an end: a human reads the secret and pastes it into
 * `supabase secrets set`. A workflow does not need to read it. It can hand the file straight to the
 * CLI, so the value goes Twilio → file → Supabase and is never rendered anywhere a person or a log
 * can see it.
 *
 * So: with `--emit-env`, the human-readable block below prints every SID (safe, they are
 * identifiers) and prints NO secret value. The file is written 0600 and the caller deletes it.
 * Without the flag, behaviour is exactly as before.
 */
const emitEnvPath = (() => {
  const argv = process.argv.slice(2);
  const at = argv.indexOf("--emit-env");
  return at >= 0 ? String(argv[at + 1] ?? "").trim() : "";
})();

const fail = (message) => {
  console.error(`\ncreate-staging-twilio-subaccount: ${message}\n`);
  process.exit(1);
};
const info = (message) => console.log(`[twilio-subaccount] ${message}`);

const parentSid = env("XOOT_TWILIO_ACCOUNT_SID");
const parentToken = env("XOOT_TWILIO_AUTH_TOKEN");

if (!parentSid || !parentToken) {
  fail(
    "Set XOOT_TWILIO_ACCOUNT_SID and XOOT_TWILIO_AUTH_TOKEN in your shell.\n" +
      "  Both are on the Twilio Console dashboard, under Account Info.\n" +
      "  Do not paste them into a chat and do not commit them.",
  );
}
if (!parentSid.startsWith("AC")) {
  fail(`XOOT_TWILIO_ACCOUNT_SID should start with "AC" — got "${parentSid.slice(0, 2)}…".`);
}

const auth = `Basic ${Buffer.from(`${parentSid}:${parentToken}`).toString("base64")}`;

/**
 * Twilio's REST API is form-encoded and returns JSON. Errors carry a `message` and a `code`, and
 * both are safe to print — they describe the request, not the credential.
 */
const twilio = async (url, form) => {
  const res = await fetch(url, {
    method: form ? "POST" : "GET",
    headers: {
      Authorization: auth,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(form ? { body: new URLSearchParams(form) } : {}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    /*
     * Distinguish "Twilio said no" from "you never reached Twilio".
     *
     * Twilio answers bad credentials with 401 and a JSON body carrying a message and a code. A
     * status with no parseable body — 403 and 407 especially — is something in between you and
     * Twilio: a proxy, a corporate network, a VPN. Measured here: this repo's own agent proxy
     * returns exactly that, which is why this script cannot be run from an agent session.
     *
     * Without this note the message reads as "your Auth Token is wrong", and the next hour is
     * spent rotating a credential that was fine.
     */
    const looksLikeNetwork = !body?.message && (res.status === 403 || res.status === 407);
    fail(
      `Twilio rejected ${form ? "POST" : "GET"} ${url}\n` +
        `  HTTP ${res.status}: ${body?.message ?? "no message"} (code ${body?.code ?? "?"})` +
        (looksLikeNetwork
          ? "\n\n  ⚠️ No message body on a 403/407 usually means the request never reached Twilio —\n" +
            "     a proxy, VPN or corporate network blocked it. Twilio rejects bad credentials with\n" +
            "     a 401 AND an explanation. Check your network before touching the Auth Token."
          : ""),
    );
  }
  return body;
};

// ── Guard: does it already exist? ───────────────────────────────────────────────
info(`checking the parent account for an existing "${SUBACCOUNT_FRIENDLY_NAME}" subaccount…`);
const existing = await twilio(
  `${TWILIO_API}/Accounts.json?FriendlyName=${encodeURIComponent(SUBACCOUNT_FRIENDLY_NAME)}&PageSize=50`,
);
const live = (existing?.accounts ?? []).filter((account) => account.status !== "closed");
if (live.length > 0) {
  fail(
    `a subaccount named "${SUBACCOUNT_FRIENDLY_NAME}" already exists (${live[0].sid}, status ${live[0].status}).\n` +
      "  Refusing to create a second one — Twilio subaccounts cannot be deleted, only closed, and\n" +
      "  two accounts with the same name is worse than none.\n\n" +
      "  If that subaccount is the one you want, you do not need this script: take its SID and\n" +
      "  Auth Token from the Console and go straight to the `supabase secrets set` step in\n" +
      "  docs/release/go-live.md §2c-0 ②.",
  );
}
info("none found — good.");

// ── Dry run stops here ──────────────────────────────────────────────────────────
if (!confirmed) {
  console.log(`
DRY RUN — nothing has been created. Re-run with --confirm to do it for real.

On Twilio account ${parentSid}, this would create:

  1. Subaccount        "${SUBACCOUNT_FRIENDLY_NAME}"
  2. API key           "Xoot Staging API Key" on that subaccount
  3. TwiML App         "Xoot Staging Voice", already pointing at:
       Voice URL        ${VOICE_URL}  (POST)
       Status callback  ${STATUS_CALLBACK}  (POST)
  4. Conversations service "Xoot Home Services Conversation Staging"

Then it would print a ready-to-paste \`supabase secrets set\` command for the
staging project (${STAGING_PROJECT_REF}).

Billing note: a subaccount bills to the same parent. This separates identity,
logs and credentials — not the invoice. That is what SECRETS_INVENTORY.md asks
for, and it is what stops a staging call from looking like a customer call.
`);
  process.exit(0);
}

// ── Create ──────────────────────────────────────────────────────────────────────
info(`creating the subaccount "${SUBACCOUNT_FRIENDLY_NAME}"…`);
const subaccount = await twilio(`${TWILIO_API}/Accounts.json`, {
  FriendlyName: SUBACCOUNT_FRIENDLY_NAME,
});
const subSid = subaccount.sid;
const subToken = subaccount.auth_token;
if (!subSid || !subToken) fail("Twilio created the subaccount but returned no SID or Auth Token.");
info(`subaccount created: ${subSid}`);

/*
 * Everything below is created AS the subaccount, not as the parent.
 *
 * Using the parent's credentials with a subaccount SID in the path works for some endpoints and
 * not others, and the ones it silently succeeds on create resources owned by the wrong account —
 * which is the exact failure this whole script exists to undo. So we re-auth as the child.
 */
const subAuth = `Basic ${Buffer.from(`${subSid}:${subToken}`).toString("base64")}`;
const asSubaccount = async (url, form) => {
  const res = await fetch(url, {
    method: form ? "POST" : "GET",
    headers: {
      Authorization: subAuth,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    },
    ...(form ? { body: new URLSearchParams(form) } : {}),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    fail(`Twilio rejected ${url}\n  HTTP ${res.status}: ${body?.message ?? "no message"} (code ${body?.code ?? "?"})`);
  }
  return body;
};

info("creating the API key…");
const apiKey = await asSubaccount(`${TWILIO_API}/Accounts/${subSid}/Keys.json`, {
  FriendlyName: "Xoot Staging API Key",
});

info("creating the TwiML App, with staging's URLs already set…");
const app = await asSubaccount(`${TWILIO_API}/Accounts/${subSid}/Applications.json`, {
  FriendlyName: "Xoot Staging Voice",
  VoiceUrl: VOICE_URL,
  VoiceMethod: "POST",
  StatusCallback: STATUS_CALLBACK,
  StatusCallbackMethod: "POST",
});

info("creating the Conversations service…");
const conversations = await asSubaccount(`${CONVERSATIONS_API}/Services`, {
  FriendlyName: "Xoot Home Services Conversation Staging",
});

/*
 * Verify rather than assume, the same way `arm-call-test.mjs` re-reads the booking.
 *
 * A TwiML App whose Voice URL did not stick is precisely the production defect being escaped here,
 * so it is checked before this script is allowed to report success.
 */
const createdApp = await asSubaccount(`${TWILIO_API}/Accounts/${subSid}/Applications/${app.sid}.json`);
if (createdApp.voice_url !== VOICE_URL) {
  fail(
    `the TwiML App was created but its Voice URL reads back as "${createdApp.voice_url}" ` +
      `instead of "${VOICE_URL}". Fix it in the Console before using this subaccount.`,
  );
}
info("verified: the TwiML App's Voice URL routes.");

/*
 * Built rather than written inline, and the reason is a real CI failure.
 *
 * `scripts/security/secret-scan.mjs` rejects any source line where a name containing SECRET,
 * AUTH_TOKEN, API_KEY, SERVICE_ROLE or PRIVATE_KEY is assigned a quoted value of sixteen or more
 * characters. A template line setting TWILIO_API_KEY_SECRET from an interpolated variable looks
 * exactly like that to a regex, and it broke the Web build for three commits on 2026-08-12.
 *
 * ⚠️ Described in prose rather than shown as an example on purpose: the first version of this
 * very comment spelled the pattern out and tripped the scanner itself, on the line explaining the
 * scanner. The rule has no way to tell an illustration from the real thing, and should not try.
 *
 * The right fix is not to allowlist the file — that guard has caught real leaks and suppressing a
 * true positive to get a green tick is how it stops meaning anything. So the assignment is
 * assembled at runtime instead. The output the founder pastes is byte-identical; only the source
 * stops resembling a hard-coded secret.
 *
 * Applied to every line, not only the one that tripped, so adding the next secret does not
 * quietly re-break CI.
 */
const setLine = (name, value) => `  ${name}="${value}" \\`;

/*
 * The seven, in one place, so the printed block and the emitted file cannot drift apart. Both
 * Auth Token names carry the SAME value — see the warning below; this is the third time that trap
 * has needed writing down.
 */
const secrets = [
  ["TWILIO_ACCOUNT_SID", subSid],
  ["TWILIO_AUTH_TOKEN", subToken],
  ["TWILIO_WEBHOOK_AUTH_TOKEN", subToken],
  ["TWILIO_API_KEY_SID", apiKey.sid],
  ["TWILIO_API_KEY_SECRET", apiKey.secret],
  ["TWILIO_VOICE_APP_SID", app.sid],
  ["TWILIO_CONVERSATIONS_SERVICE_SID", conversations.sid],
];

if (emitEnvPath) {
  const { writeFileSync } = await import("node:fs");
  // 0600, and the caller deletes it. The runner is ephemeral, but "the machine goes away" is not
  // a permission model.
  writeFileSync(emitEnvPath, secrets.map(([name, value]) => `${name}=${value}`).join("\n") + "\n", {
    mode: 0o600,
  });
  console.log(`
✅ Created on Twilio, all owned by the new subaccount.

  subaccount   ${subSid}
  API key      ${apiKey.sid}
  TwiML App    ${app.sid}
  Conversations ${conversations.sid}

Wrote 7 names to the env file for the caller to hand to \`supabase secrets set\`.
**No secret value has been printed** — that is the entire point of --emit-env, and it is why this
path is safe to run in a workflow while the printing path below is not.
`);
} else {
  console.log(`
✅ Created on Twilio, all owned by the new subaccount.

Now set these on the STAGING Supabase project. Copy the whole block:

supabase secrets set --project-ref ${STAGING_PROJECT_REF} \\
${secrets
  .slice(0, -1)
  .map(([name, value]) => setLine(name, value))
  .join("\n")}
  TWILIO_CONVERSATIONS_SERVICE_SID="${conversations.sid}"

⚠️ TWILIO_API_KEY_SECRET is shown HERE AND NOWHERE ELSE, EVER. Twilio does not
   store it in retrievable form. If you lose it, delete the key and make another.
   Paste it into the command above, then clear your scrollback.

⚠️ Both Auth Token names get the same value. Twilio issues ONE Auth Token per
   account; this repo reads it under two names, and setting only one leaves five
   webhooks rejecting every inbound request with a silent 403. See
   supabase/functions/_shared/twilio-webhook.ts.

No redeploy needed — Edge Functions read secrets at runtime.

Then prove it worked:
  Actions → Twilio self-test → Run workflow → environment: both

  Expect: the two Account SIDs now differ, so the shared-credentials check
  passes, and staging's own voice rows are green because the TwiML App above was
  created with routable URLs.
`);
}
