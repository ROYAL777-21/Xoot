import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `supabase/config.toml` must declare `verify_jwt` for every Edge Function on disk.
 *
 * This became load-bearing the moment a repo-driven `supabase functions deploy` became possible
 * (`.github/workflows/deploy-edge-functions.yml`). Supabase treats an **undeclared** function as
 * `verify_jwt = true`. For most functions that is right; for the ten that Twilio, Stitch/Ozow and
 * the public concierge form call, it is fatal — none of them can present a Supabase JWT, so the
 * gateway rejects the request *before* the function's own HMAC signature check runs. The failure
 * is a 401 at the edge, invisible in the function's logs, on a webhook nobody watches.
 *
 * The repo already learned this once, by hand: `twilio-voice-status` and `twilio-voice-twiml`
 * were recovered from production with no source and therefore no declaration, and the config
 * comments record that the values were *read off the live project rather than guessed*.
 *
 * A missing declaration is now a failing test rather than a silent 401 in three weeks.
 */

const root = process.cwd();
const config = readFileSync(join(root, "supabase/config.toml"), "utf8");
const functionsDir = join(root, "supabase/functions");

const declared = new Map(
  [...config.matchAll(/\[functions\.([\w-]+)\]\s*\nverify_jwt\s*=\s*(true|false)/g)].map(
    (m) => [m[1], m[2] === "true"] as const,
  ),
);

const onDisk = readdirSync(functionsDir)
  .filter((name) => name !== "_shared" && statSync(join(functionsDir, name)).isDirectory())
  .sort();

/**
 * The functions that must stay open, each with the caller that cannot authenticate.
 *
 * Values read off the live production project on 2026-08-06 and re-confirmed against
 * `list_edge_functions` on 2026-08-09 — all ten matched. This list is the deploy's safety rail:
 * if a config edit flips one of these to `true`, a deploy would break the integration and the
 * only symptom would be silence.
 */
const MUST_STAY_OPEN: Record<string, string> = {
  "confirm-payment": "Stitch and Ozow payment callbacks. A PSP cannot present a Supabase JWT.",
  "support-respond": "The public support form, used before anyone has signed in.",
  "report-concierge-answer": "Concierge answer reports from the public site.",
  // Added 2026-08-11. Returns `concierge.*` capability booleans and nothing else — no user data,
  // no secret, no control the caller can act on. Open because the launcher renders before anyone
  // signs in, so a signed-out visitor must be able to learn whether the Concierge is switched on.
  // The paths it gates re-check the controls server-side, so this response is a hint for drawing
  // a button, never a permission.
  "concierge-config": "The Concierge launcher renders for signed-out visitors and must know if it is enabled.",
  // Added 2026-08-12. A fare-split invitation arrives as a WhatsApp message from a friend, so its
  // reader has no Xoot account — and asking them to make one before telling them what they are
  // being asked to pay for is how an invitation gets ignored.
  //
  // The 192-bit `invite_token` is the credential, and the response is five scalars: service label,
  // date, amount, the invited email and the organiser's FIRST name. No address, no notes, no
  // access codes — `fare-split-privacy.test.ts` pins the booking select to exactly three columns.
  //
  // Open to read, closed to act: this endpoint cannot accept a share. Accepting goes to
  // `split-booking-fare`, which additionally requires a verified session whose email matches the
  // invited address, because a WhatsApp link lands in group chats.
  "fare-split-invite": "A split invitation is opened by someone with no account, before they will make one.",
  "twilio-message-webhook": "Twilio SMS. HMAC-SHA1 signature is the auth.",
  "twilio-whatsapp-webhook": "Twilio WhatsApp. Same signature scheme.",
  "twilio-voice-webhook": "Twilio voice. Same.",
  "twilio-status-callback": "Twilio delivery status. Same.",
  "twilio-verify-webhook": "Twilio Verify. Same.",
  "twilio-voice-status": "Twilio call status callback. Same.",
  "twilio-voice-twiml": "Twilio fetches TwiML here to join the conference. Same.",
};

describe("supabase/config.toml", () => {
  it("declares verify_jwt for every function on disk", () => {
    // Not "most". A single undeclared webhook is a 401 at the gateway on the next deploy.
    expect(onDisk.filter((fn) => !declared.has(fn))).toEqual([]);
  });

  it("does not declare functions that no longer exist", () => {
    // A stale declaration is harmless to deploy and misleading to read — it suggests a function
    // is live when the directory was deleted.
    expect([...declared.keys()].filter((fn) => !onDisk.includes(fn)).sort()).toEqual([]);
  });

  it.each(Object.entries(MUST_STAY_OPEN))("keeps %s open — %s", (fn, _reason) => {
    expect({ fn, verifyJwt: declared.get(fn) }).toEqual({ fn, verifyJwt: false });
  });

  it("keeps everything else closed", () => {
    // The inverse direction. Flipping a normal function to `verify_jwt = false` removes the
    // gateway's authentication check entirely, leaving only whatever the handler does itself —
    // and most handlers here call `requireAuth`, which would then be the *only* gate.
    const unexpectedlyOpen = [...declared.entries()]
      .filter(([fn, verify]) => !verify && !(fn in MUST_STAY_OPEN))
      .map(([fn]) => fn)
      .sort();
    expect(unexpectedlyOpen).toEqual([]);
  });

  it("targets production, so a deploy without --project-ref cannot land somewhere unexpected", () => {
    // `project_id` is what the CLI falls back to when no --project-ref is passed. The deploy
    // workflow always passes one; this asserts the fallback is at least not a stranger's project.
    expect(config).toMatch(/^project_id = "mvlrkelahhsyjrwgsxaf"/m);
  });
});
