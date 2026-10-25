import { createHmac, webcrypto } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { edgeHandler } from "../test/edge-handler";
const account = `AC${"a".repeat(32)}`, call = `CA${"b".repeat(32)}`, conference = `CF${"d".repeat(32)}`;
const room = "11111111-1111-4111-8111-111111111111";
const url = `https://edge.test/functions/v1/twilio-in-app-voice-status?room=${room}`;
const env = { SUPABASE_URL: "https://edge.test", SUPABASE_SERVICE_ROLE_KEY: "service", TWILIO_ACCOUNT_SID: account, TWILIO_AUTH_TOKEN: "synthetic-status-key" };
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());
function fixture(fail = false, applied = true) {
  const rpc = vi.fn(async () => ({ data: applied, error: fail ? { message: "private database detail" } : null }));
  const createClient = vi.fn(() => ({ rpc, from: () => { throw new Error("No non-transactional table writes permitted"); } }));
  return { rpc, createClient, handler: edgeHandler("supabase/functions/twilio-in-app-voice-status/index.ts", createClient, env) };
}
function request(patch: Record<string, string> = {}, extra: [string, string][] = [], destination = url) {
  const form = new URLSearchParams({ AccountSid: account, ConferenceSid: conference, FriendlyName: `xoot-inapp-${room}`,
    SequenceNumber: "1", StatusCallbackEvent: "participant-join", CallSid: call, ...patch });
  extra.forEach(([key, value]) => form.append(key, value));
  const parameters = [...new Set(form.keys())].sort().map(key => [...new Set(form.getAll(key))].sort().map(value => key + value).join("")).join("");
  return new Request(destination, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded",
    "x-twilio-signature": createHmac("sha1", env.TWILIO_AUTH_TOKEN).update(destination + parameters).digest("base64") }, body: form });
}
describe("actual signed in-app callback with synthetic transport; lifecycle tested in real PostgreSQL", () => {
  it("sends only allowlisted signed room metadata to one transactional RPC", async () => {
    const f = fixture();
    expect((await f.handler(request({ From: "+27110000000", RecordingUrl: "https://private.invalid/recording", Reason: "private text" }))).status).toBe(204);
    expect(f.rpc).toHaveBeenCalledExactlyOnceWith("xoot_apply_in_app_voice_event", {
      p_room_id: room, p_account_sid: account, p_conference_sid: conference, p_call_sid: call,
      p_sequence: 1, p_event: "participant-join",
    });
    expect(JSON.stringify(f.rpc.mock.calls)).not.toMatch(/27110000000|private text|private.invalid|RecordingUrl|From/);
  });
  it("handles conference events without an anchor or participant CallSid", async () => {
    const f = fixture();
    expect((await f.handler(request({ StatusCallbackEvent: "conference-end", CallSid: "" }))).status).toBe(204);
    expect(f.rpc).toHaveBeenCalledWith("xoot_apply_in_app_voice_event", expect.objectContaining({ p_call_sid: null, p_event: "conference-end" }));
  });
  it("acknowledges expired, terminal or reordered events rejected by the atomic database decision", async () => {
    const f = fixture(false, false);
    expect((await f.handler(request())).status).toBe(204);
    expect(f.rpc).toHaveBeenCalledTimes(1);
  });
  it.each([{ AccountSid: `AC${"f".repeat(32)}` }, { ConferenceSid: "invalid" }, { FriendlyName: "arbitrary-room" },
    { FriendlyName: "xoot-inapp-22222222-2222-4222-8222-222222222222" }, { SequenceNumber: "-1" },
    { SequenceNumber: "9999999999" }, { StatusCallbackEvent: "conference-record-end" }, { CallSid: "" }])("rejects invalid provider fields before database access: %j", async patch => {
    const f = fixture(); expect((await f.handler(request(patch))).status).toBe(403); expect(f.createClient).not.toHaveBeenCalled();
  });
  it("rejects duplicate required parameters", async () => {
    const f = fixture(); expect((await f.handler(request({}, [["CallSid", call]]))).status).toBe(403); expect(f.createClient).not.toHaveBeenCalled();
  });
  it("rejects unsigned requests, tampered rooms and extra query parameters before database access", async () => {
    const f = fixture(); const unsigned = request(); unsigned.headers.delete("x-twilio-signature");
    expect((await f.handler(unsigned)).status).toBe(403);
    const signed = request(); const changed = new Request(url.replace(room, "22222222-2222-4222-8222-222222222222"), { method: "POST", headers: signed.headers, body: await signed.text() });
    expect((await f.handler(changed)).status).toBe(403);
    expect((await f.handler(request({}, [], url + "&room=" + room))).status).toBe(403);
    expect(f.createClient).not.toHaveBeenCalled();
  });
  it("returns a retriable error without leaking database details", async () => {
    const f = fixture(true); const response = await f.handler(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("private database detail");
  });
});
