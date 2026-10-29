import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * `twilio-token` and `twilio-conversation` were recovered from production on 2026-08-02, where
 * both had been running with no source in this repository. Each confirmed only that the caller
 * held a session, then acted on whatever `bookingId` it was handed.
 *
 * They chained: `twilio-conversation` returned the conversation SID for any booking, and
 * `twilio-token` returned a conversations grant for the service. Neither was obviously
 * exploitable alone, which is why the pair is worth a test rather than a memory.
 *
 * These assertions run against the source with comments stripped. The doc comments in both
 * functions describe the defects by name — `String(err)`, the wildcard origin — so matching raw
 * text would let a comment satisfy a test about code.
 */

const withoutComments = (source: string) =>
  source
    .replace(/\r\n/g, "\n")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");

const readFunction = (name: string) =>
  withoutComments(readFileSync(join(process.cwd(), `supabase/functions/${name}/index.ts`), "utf8"));

const recovered = ["twilio-token", "twilio-conversation"] as const;

describe("recovered Twilio functions", () => {
  it.each(recovered)("%s resolves the booking and requires the caller to be a participant", (name) => {
    const source = readFunction(name);
    expect(source).toContain("assertBookingParticipant");
    expect(source).toMatch(/from\("bookings"\)/);
    expect(source).toMatch(/\.select\("id,user_id,xooter_id"\)/);
  });

  it.each(recovered)("%s answers not-found and not-yours identically", (name) => {
    const source = readFunction(name);
    // One 404 covering both cases, so the endpoint cannot be used to enumerate booking ids.
    expect(source).toMatch(/if \(!participant\) return json\(\{ error: "Booking not found" \}, 404, origin\)/);
    expect(source).not.toMatch(/403|not a participant|not yours/i);
  });

  it.each(recovered)("%s resolves CORS against the allow-list rather than a wildcard", (name) => {
    const source = readFunction(name);
    expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(source).toContain("handlePreflight");
  });

  it.each(recovered)("%s does not return the raw error to the caller", (name) => {
    const source = readFunction(name);
    // String(err) told the caller which Twilio secrets were configured.
    expect(source).not.toContain("String(err)");
    expect(source).toContain("console.error");
  });

  it.each(recovered)("%s does not let the caller's header decide the service identity", (name) => {
    const source = readFunction(name);
    // Passing the caller's Authorization alongside the service key left the effective identity
    // to supabase-js header precedence. `requireAuth` verifies the JWT, then hands back a clean
    // service client.
    expect(source).not.toMatch(/global:\s*\{\s*headers:\s*\{\s*Authorization/);
    expect(source).toContain("requireAuth");
  });

  it("checks participation before twilio-conversation writes anything", () => {
    const source = readFunction("twilio-conversation");
    // The unconfigured path inserts a masked_conversation_sessions row and an outbox event
    // keyed to the booking, so the gate has to come first or an outsider can queue support
    // work against someone else's booking without Twilio being configured at all.
    const gate = source.indexOf("if (!participant)");
    const firstWrite = source.indexOf('.from("masked_conversation_sessions").insert');
    expect(gate).toBeGreaterThan(-1);
    expect(firstWrite).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(firstWrite);
  });

  it("does not leak the provider error body to the caller", () => {
    const source = readFunction("twilio-conversation");
    expect(source).not.toMatch(/configured: true, error: payload/);
  });
});

describe("twilio-voice-status callback writes", () => {
  const source = readFunction("twilio-voice-status");

  it("never builds a filter term from an absent identifier", () => {
    // The original interpolated both SIDs unconditionally, so a call-only callback produced
    // `provider_conference_sid.eq.,provider_call_sid.eq.CAxxxx` — an equality against the
    // empty string. Terms are now assembled from the identifiers that are present.
    expect(source).not.toMatch(/`provider_conference_sid\.eq\.\$\{conferenceSid\},provider_call_sid\.eq\.\$\{callSid\}`/);
    expect(source).toMatch(/conferenceSid \? `provider_conference_sid\.eq\.\$\{conferenceSid\}` : null/);
    expect(source).toMatch(/callSid \? `provider_call_sid\.eq\.\$\{callSid\}` : null/);
    expect(source).toContain(".filter(Boolean).join(\",\")");
  });

  it("shape-checks both SIDs before they reach a filter", () => {
    expect(source).toContain("isTwilioSid");
    expect(source).toMatch(/isTwilioSid\(rawConferenceSid, "CF"\)/);
    expect(source).toMatch(/isTwilioSid\(rawCallSid, "CA"\)/);
  });

  it("writes by primary key rather than by the match filter", () => {
    // The original ran the UPDATE with .or() directly, so it wrote every row the filter
    // selected. It now resolves one session and updates that id.
    expect(source).toMatch(/\.update\(patch\)\.eq\("id", session\.id\)/);
  });

  it("only writes an identifier the callback actually carried", () => {
    // `provider_conference_sid: conferenceSid || null` let a call-only callback erase the
    // conference SID a previous callback had stored.
    expect(source).not.toMatch(/provider_conference_sid: conferenceSid \|\| null/);
    expect(source).not.toMatch(/provider_call_sid: callSid \|\| null/);
    expect(source).toMatch(/if \(conferenceSid\) patch\.provider_conference_sid = conferenceSid/);
    expect(source).toMatch(/if \(callSid\) patch\.provider_call_sid = callSid/);
  });

  it("never clears ended_at", () => {
    // Twilio retries and reorders. The original wrote `ended_at: ... : null`, so one late
    // in-progress callback after a completed one un-ended a finished call.
    expect(source).not.toMatch(/ended_at:[^\n]*null/);
    expect(source).toMatch(/if \(ending && !session\.ended_at\)/);
  });

  it("only writes a duration the callback actually sent", () => {
    // `Number(form.get("CallDuration") ?? 0)` is 0 when the field is absent, and 0 is finite,
    // so a real duration was overwritten with zero by any later callback.
    expect(source).not.toMatch(/Number\(form\.get\("CallDuration"\) \?\? 0\)/);
    expect(source).toContain('form.has("CallDuration")');
  });

  it("keeps terminal states terminal", () => {
    expect(source).toContain("alreadyCompleted");
    expect(source).toMatch(/session\.status === "completed"/);
  });

  it("does not return the raw error to an unauthenticated caller", () => {
    expect(source).not.toContain("String(err)");
    expect(source).toContain("console.error");
  });
});
