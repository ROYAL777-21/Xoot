/**
 * Fixture for `xoot.yaml`. Run with:
 *
 *   semgrep --test --config .semgrep/rules
 *
 * A `ruleid` annotation marks the line that MUST match; an `ok` annotation marks one that must
 * NOT — and those are the more valuable half. (Both are written as a comment naming the rule, on
 * the line above. They cannot be spelled out here, because semgrep reads this header too.)
 *
 * `design-tokens.test.ts` once claimed to cover shared-module
 * imports with a fixture that wrote the dependency both ways, so it passed on the spelling that
 * already worked and never exercised the broken one. Every rule below therefore carries at least
 * one near-miss: the correct form of the same call, which must stay silent.
 *
 * Not shipped anywhere. `.github/workflows/semgrep.yml` excludes `.semgrep/` from the real scan,
 * or this file would report itself.
 */

/* eslint-disable */
// @ts-nocheck

declare const supa: any;
declare const json: any;
declare const fail: any;
declare const ok: any;
declare const origin: string;
declare const err: any;

// ── xoot-private-schema-over-postgrest ────────────────────────────────────────────────────
// ruleid: xoot-private-schema-over-postgrest
await supa.schema("private").rpc("consume_rate_limit", { p_bucket: "twilio.token" });

// The fix that shipped: a public SECURITY INVOKER wrapper, called with no schema hop.
// ok: xoot-private-schema-over-postgrest
await supa.rpc("consume_rate_limit", { p_bucket: "twilio.token" });

// Other schemas are not the defect — only `private` is hidden from PostgREST.
// ok: xoot-private-schema-over-postgrest
await supa.schema("storage").from("objects").select("id");

// ── xoot-error-detail-returned-to-caller ──────────────────────────────────────────────────
// ruleid: xoot-error-detail-returned-to-caller
json({ error: String(err) }, 500, origin);

// ruleid: xoot-error-detail-returned-to-caller
json({ configured: false, error: err.message }, 500, origin);

// ruleid: xoot-error-detail-returned-to-caller
fail(err.message, origin, 500);

// ruleid: xoot-error-detail-returned-to-caller
new Response(String(err), { status: 500 });

// What `twilio-token` does now: log the detail, return a constant.
console.error("twilio-token failure", err);
// ok: xoot-error-detail-returned-to-caller
json({ error: "Request failed" }, 500, origin);

// A logged string is fine — it goes to the function's own logs, not to the caller.
// ok: xoot-error-detail-returned-to-caller
console.warn("support Turnstile gate lookup failed", { error: String(err) });

// ── xoot-cors-wildcard-on-edge-function ───────────────────────────────────────────────────
// ruleid: xoot-cors-wildcard-on-edge-function
const wideOpen = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };

const headers = new Headers();
// ruleid: xoot-cors-wildcard-on-edge-function
headers.set("Access-Control-Allow-Origin", "*");

// The allow-list form, resolved per request.
// ok: xoot-cors-wildcard-on-edge-function
const scoped = { "Access-Control-Allow-Origin": allowedOrigin };
// ok: xoot-cors-wildcard-on-edge-function
headers.set("Access-Control-Allow-Origin", allowedOrigin);

// ── xoot-service-role-key-in-client-code ──────────────────────────────────────────────────
// ruleid: xoot-service-role-key-in-client-code
const leaked = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// The publishable key is the one that belongs in a bundle; RLS still applies to it.
// ok: xoot-service-role-key-in-client-code
const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// ── xoot-call-recording-enabled-without-notice ────────────────────────────────────────────
// ruleid: xoot-call-recording-enabled-without-notice
const recordingOn = { provider: "twilio_proxy", recording_enabled: true };

// ruleid: xoot-call-recording-enabled-without-notice
const transcriptionOn = { provider: "twilio_proxy", transcription_enabled: true };

// What every masked-call payload actually carries.
// ok: xoot-call-recording-enabled-without-notice
const held = { recording_enabled: false, transcription_enabled: false };

// ── xoot-pricing-from-user-spend-history ──────────────────────────────────────────────────
declare const customer: any;
declare const subtotal: number;
declare const slotTime: string;

// ruleid: xoot-pricing-from-user-spend-history
const surcharge = Math.round(subtotal * customer.lifetimeValue * 0.01);

// ruleid: xoot-pricing-from-user-spend-history
const personalRate = affluenceBand(customer.suburb) * 0.05;

// ruleid: xoot-pricing-from-user-spend-history
let priceMultiplier = customer.totalSpent > 500000 ? 1.15 : 1;

// The near-misses, and they are the point of this block. Every legitimate Xoot mechanism
// varies a price, and none of them may trip the rule.

// Slot scarcity — a fact about the job.
// ok: xoot-pricing-from-user-spend-history
const highDemandRate = isHighDemandSlot(slotTime) ? 0.15 : 0;

// Committed volume, chosen by the customer and available to anyone who chooses it.
// ok: xoot-pricing-from-user-spend-history
const cadenceDiscount = CADENCE_DISCOUNT[cadence] ?? 0;

// Supply quality on the pay side, which is a fact about the Xooter and not the customer.
// ok: xoot-pricing-from-user-spend-history
const commissionRate = commissionRateBps({ reliabilityScore, completedJobs });

// Reading a customer's spend for a report is fine. Only pricing off it is not.
// ok: xoot-pricing-from-user-spend-history
const reportedLifetimeValue = customer.lifetimeValue;

// ── xoot-html-injection-sink ──────────────────────────────────────────────────────────────
// Annotations are `//` comments at statement level, not JSX `{/* … */}` comments — semgrep's
// test reader does not see the latter, so an annotation inside a JSX tree is silently ignored
// and its line reports as an unexpected match.
const BlogBody = ({ html, text }: { html: string; text: string }) => {
  // ruleid: xoot-html-injection-sink
  const raw = <article dangerouslySetInnerHTML={{ __html: html }} />;
  // ok: xoot-html-injection-sink
  const escaped = <p>{text}</p>;
  return <div>{raw}{escaped}</div>;
};

declare const node: HTMLElement;
// ruleid: xoot-html-injection-sink
node.innerHTML = untrusted;

// ruleid: xoot-html-injection-sink
eval(untrusted);

// ruleid: xoot-html-injection-sink
const dynamic = new Function("return 1");

// Setting text is the safe counterpart, and is what the support surfaces do.
// ok: xoot-html-injection-sink
node.textContent = untrusted;
