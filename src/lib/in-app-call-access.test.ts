import { createHmac, webcrypto } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { edgeHandler } from "../test/edge-handler";

const actor = "11111111-1111-4111-8111-111111111111";
const booking = "22222222-2222-4222-8222-222222222222";
const otherBooking = "33333333-3333-4333-8333-333333333333";
const identity = `xoot_${actor.replace(/-/g, "")}_${booking.replace(/-/g, "")}_voice`;
const endpoint = "https://edge.test/functions/v1/twilio-voice-twiml";
const env = { SUPABASE_URL: "https://edge.test", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service",
  XOOT_APP_ENV: "staging", TWILIO_ACCOUNT_SID: `AC${"a".repeat(32)}`, TWILIO_API_KEY_SID: `SK${"b".repeat(32)}`,
  TWILIO_API_KEY_SECRET: "synthetic-signing-key", TWILIO_VOICE_APP_SID: `AP${"c".repeat(32)}`, TWILIO_AUTH_TOKEN: "synthetic-webhook-key",
  TWILIO_CONVERSATIONS_SERVICE_SID: `IS${"d".repeat(32)}` };
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());

function setup(options: { enabled?: boolean; allowed?: boolean; rpcError?: boolean; until?: string; participantRole?: string; rateAllowed?: boolean; owner?: string } = {}) {
  const eligibleUntil = options.until ?? new Date(Date.now() + 30 * 60_000).toISOString();
  const rpc = vi.fn(async (name: string) => name === "consume_rate_limit" ? { data: options.rateAllowed !== false, error: null } : {
    data: [{ allowed: options.allowed !== false, participant_role: options.participantRole ?? "client", eligible_until: eligibleUntil }], error: options.rpcError ? { message: "private database detail" } : null,
  });
  const from = vi.fn((table: string) => {
    let key: string;
    const q = { select: () => q, eq: (_column: string, value: string) => { key = value; return q; },
      in: () => Promise.resolve({ data: options.enabled === false ? [] : [{ environment: "all", enabled: true }], error: null }),
      maybeSingle: async () => ({ data: table === "bookings" ? { id: key, user_id: options.owner ?? actor, xooter_id: null } : null, error: null }),
      or: () => q, order: () => q, limit: () => q,
      insert: () => { throw new Error("Unaccepted transport must not write"); } };
    return q;
  });
  const service = { from, rpc };
  const client = vi.fn((_url: unknown, key: unknown) => key === "service" ? service : { auth: { getUser: async () => ({ data: { user: { id: actor } }, error: null }) } });
  return { rpc, from, client, eligibleUntil };
}
const tokenRequest = (capability = "voice") => new Request("https://edge.test/functions/v1/twilio-token", {
  method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer synthetic-auth", Origin: "https://xoot.co.za" },
  body: JSON.stringify({ bookingId: booking, capability, actorId: otherBooking }),
});
function signedForm(overrides: Record<string, string> = {}, extra: [string, string][] = [], url = endpoint) {
  const params = new URLSearchParams({ AccountSid: env.TWILIO_ACCOUNT_SID, CallSid: `CA${"e".repeat(32)}`, From: `client:${identity}`, bookingId: booking, ...overrides });
  for (const [key, value] of extra) params.append(key, value);
  // Independent Node signer: Twilio's SDK sorts unique names and duplicate values with .sort().
  const values = [...new Set(params.keys())].sort().map(key => [...new Set(params.getAll(key))].sort().map(value => key + value).join("")).join("");
  return new Request(url, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "x-twilio-signature": createHmac("sha1", env.TWILIO_AUTH_TOKEN).update(url + values).digest("base64") }, body: params });
}

describe("actual in-app call token entrypoint with synthetic transport", () => {
  it("does not mint a credential when the dedicated control is absent or disabled", async () => {
    const s = setup({ enabled: false }); const handler = edgeHandler("supabase/functions/twilio-token/index.ts", s.client, env);
    const response = await handler(tokenRequest()); expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ configured: false });
  });
  it.each([{ allowed: false }, { rpcError: true }, { until: "invalid" }, { until: "2020-01-01T00:00:00Z" }, { participantRole: "admin" }])("refuses a token without an authoritative active participant window: %j", async options => {
    const s = setup(options); const handler = edgeHandler("supabase/functions/twilio-token/index.ts", s.client, env);
    const response = await handler(tokenRequest()); expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await response.text()).not.toContain("private database detail");
  });
  it("binds the credential to the verified actor and booking and caps its lifetime", async () => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-token/index.ts", s.client, env);
    const response = await handler(tokenRequest()); const body = await response.json();
    expect(body.configured).toBe(true); expect(body.identity).toBe(identity);
    const parts = body.token.split("."); const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString());
    expect(payload.grants.identity).toBe(identity); expect(payload.exp - payload.iat).toBeLessThanOrEqual(300);
    expect(createHmac("sha256", env.TWILIO_API_KEY_SECRET).update(`${parts[0]}.${parts[1]}`).digest("base64url")).toBe(parts[2]);
    expect(s.rpc).toHaveBeenCalledWith("can_create_masked_call", { p_actor_id: actor, p_booking_id: booking });
  });
  it("keeps provider Conversations unavailable without minting a broad chat grant", async () => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-token/index.ts", s.client, env);
    const response = await handler(tokenRequest("conversations")); const body = await response.json();
    expect(body).toMatchObject({ configured: false }); expect(body.token).toBeUndefined();
  });
  it("does not create provider chat sessions or queue work while the transport is unaccepted", async () => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-conversation/index.ts", s.client, env);
    const response = await handler(tokenRequest("conversations"));
    expect(await response.json()).toMatchObject({ configured: false, status: "unavailable" });
    expect(s.from.mock.calls.map(([table]) => table)).toEqual(["bookings"]);
  });
  it("honours the token setup rate limit", async () => {
    const s = setup({ rateAllowed: false }); const handler = edgeHandler("supabase/functions/twilio-token/index.ts", s.client, env);
    expect((await handler(tokenRequest())).status).toBe(429);
  });
  it("limits the token to the time actually left in the contact window", async () => {
    const s = setup({ until: new Date(Date.now() + 45_000).toISOString() }); const handler = edgeHandler("supabase/functions/twilio-token/index.ts", s.client, env);
    const body = await (await handler(tokenRequest())).json();
    expect(body.ttlSeconds).toBeGreaterThan(0); expect(body.ttlSeconds).toBeLessThanOrEqual(45);
  });
});

describe("actual signed TwiML entrypoint with synthetic transport", () => {
  it("accepts a signature whose canonical field order is stated explicitly, including lowercase bookingId", async () => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-voice-twiml/index.ts", s.client, env);
    const params = new URLSearchParams({ From: `client:${identity}`, bookingId: booking, CallSid: `CA${"e".repeat(32)}`, AccountSid: env.TWILIO_ACCOUNT_SID });
    const canonical = endpoint + "AccountSid" + env.TWILIO_ACCOUNT_SID + "CallSid" + `CA${"e".repeat(32)}` + "Fromclient:" + identity + "bookingId" + booking;
    const signature = createHmac("sha1", env.TWILIO_AUTH_TOKEN).update(canonical).digest("base64");
    const response = await handler(new Request(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "x-twilio-signature": signature }, body: params }));
    expect(response.status).toBe(200); expect(await response.text()).toContain("<Conference");
  });
  it.each([
    { bookingId: otherBooking }, { From: "client:xoot_legacy_voice" }, { From: "+27110000000" },
    { AccountSid: `AC${"f".repeat(32)}` }, { Caller: "client:someone_else" },
  ])("rejects a signed callback whose caller is not bound to this room: %j", async overrides => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-voice-twiml/index.ts", s.client, env);
    const response = await handler(signedForm(overrides)); expect(response.status).toBe(403); expect(await response.text()).not.toContain("<Conference");
  });
  it("rejects duplicate signed booking parameters", async () => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-voice-twiml/index.ts", s.client, env);
    expect((await handler(signedForm({}, [["bookingId", otherBooking]]))).status).toBe(403);
  });
  it.each([{ enabled: false }, { allowed: false }, { rpcError: true }, { participantRole: "admin" }])("fails closed on a revoked control or booking window: %j", async options => {
    const s = setup(options); const handler = edgeHandler("supabase/functions/twilio-voice-twiml/index.ts", s.client, env);
    const response = await handler(signedForm()); expect(await response.text()).not.toContain("<Conference");
  });
  it("rejects an unsigned request before any database access", async () => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-voice-twiml/index.ts", s.client, env);
    const request = signedForm(); request.headers.delete("x-twilio-signature");
    expect((await handler(request)).status).toBe(403); expect(s.client).not.toHaveBeenCalled();
  });
  it("joins only the bound booking with two distinct roles, no recording and a five-minute limit", async () => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-voice-twiml/index.ts", s.client, env);
    const response = await handler(signedForm()); expect(response.status).toBe(200); const xml = await response.text();
    expect(xml).toContain(`xoot-masked-${booking}`); expect(xml).toContain('maxParticipants="2"');
    expect(xml).toContain('participantLabel="client"'); expect(xml).toContain('record="do-not-record"');
    expect(xml).toContain('timeLimit="300"'); expect(xml).not.toContain("<Number>");
  });
  it("rejects an oversized body before signature work or database access", async () => {
    const s = setup(); const handler = edgeHandler("supabase/functions/twilio-voice-twiml/index.ts", s.client, env);
    const request = new Request(endpoint, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `padding=${"x".repeat(20_000)}` });
    expect((await handler(request)).status).toBe(403); expect(s.client).not.toHaveBeenCalled();
  });
  it("honours the per-booking join rate limit", async () => {
    const s = setup({ rateAllowed: false }); const handler = edgeHandler("supabase/functions/twilio-voice-twiml/index.ts", s.client, env);
    expect(await (await handler(signedForm())).text()).not.toContain("<Conference");
  });
});
it("validates case-sensitive field ordering on the status callback too", async () => {
  const s = setup(); const handler = edgeHandler("supabase/functions/twilio-voice-status/index.ts", s.client, env);
  const response = await handler(signedForm({}, [], "https://edge.test/functions/v1/twilio-voice-status"));
  expect(response.status).toBe(200); expect(s.client).toHaveBeenCalled();
});
it("accepts Twilio's published security vector without using the local signer", async () => {
  // https://www.twilio.com/docs/usage/security#explore-the-algorithm-yourself
  const s = setup(); const handler = edgeHandler("supabase/functions/twilio-voice-status/index.ts", s.client, { ...env, TWILIO_AUTH_TOKEN: "12345" });
  const response = await handler(new Request("https://example.com/myapp.php?foo=1&bar=2", {
    method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "x-twilio-signature": "L/OH5YylLD5NRKLltdqwSvS0BnU=" },
    body: new URLSearchParams({ Digits: "1234", To: "+18005551212", From: "+14158675310", Caller: "+14158675310", CallSid: "CA1234567890ABCDE" }),
  }));
  expect(response.status).toBe(200);
});
