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
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/(^|[^:])\/\/.*$/, "$1"))
    .join("\n");

const readFunction = (name: string) =>
  withoutComments(readFileSync(join(process.cwd(), `supabase/functions/${name}/index.ts`), "utf8"));

const recovered = ["twilio-token", "twilio-conversation"] as const;

describe("recovered Twilio functions", () => {
  it.each(recovered)("%s resolves the booking and requires the caller to be a participant", (name) => {
    const source = readFunction(name);
    expect(source).toContain("assertBookingParticipant");
    expect(source).toMatch(/from\("bookings"\)/);
    expect(source).toMatch(/\.select\("id,user_id,zooter_id"\)/);
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
