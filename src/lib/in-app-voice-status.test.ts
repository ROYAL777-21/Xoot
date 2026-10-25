import { createHmac, webcrypto } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { edgeHandler } from "../test/edge-handler";

const account = `AC${"a".repeat(32)}`, first = `CA${"b".repeat(32)}`, second = `CA${"c".repeat(32)}`;
const conference = `CF${"d".repeat(32)}`, booking = "11111111-1111-4111-8111-111111111111";
const url = `https://edge.test/functions/v1/twilio-in-app-voice-status?anchor=${first}`;
const env = { SUPABASE_URL: "https://edge.test", SUPABASE_SERVICE_ROLE_KEY: "service", TWILIO_ACCOUNT_SID: account, TWILIO_AUTH_TOKEN: "synthetic-status-key" };
type Row = Record<string, any>;
const row = (call = first, patch: Row = {}): Row => ({ call_sid: call, account_sid: account, booking_id: booking,
  actor_id: call === first ? "customer" : "worker", participant_role: call === first ? "client" : "contractor",
  conference_sid: null, sequence_number: -1, status: "queued", expires_at: new Date(Date.now() + 200_000).toISOString(), ...patch });
beforeAll(() => vi.stubGlobal("crypto", webcrypto));
afterAll(() => vi.unstubAllGlobals());

function fixture(rows = [row(), row(second)], fail = false) {
  const writes: Row[] = [];
  const from = vi.fn((name: string) => {
    if (name !== "xoot_in_app_voice_sessions") throw new Error("Unexpected table");
    const filters: Array<(r: Row) => boolean> = []; let patch: Row | null = null;
    const result = () => {
      if (fail) return { data: null, error: { message: "synthetic database error" } };
      const matches = rows.filter(r => filters.every(fn => fn(r)));
      if (patch) { writes.push(patch); matches.forEach(r => Object.assign(r, patch)); }
      return { data: matches.map(r => ({ ...r })), error: null };
    };
    const query = {
      select: () => query,
      update: (value: Row) => { patch = value; return query; },
      eq: (key: string, value: unknown) => { filters.push(r => r[key] === value); return query; },
      neq: (key: string, value: unknown) => { filters.push(r => r[key] !== value); return query; },
      gt: (key: string, value: string) => { filters.push(r => r[key] > value); return query; },
      lt: (key: string, value: number) => { filters.push(r => r[key] < value); return query; },
      or: (filter: string) => { const id = filter.split("conference_sid.eq.")[1]; filters.push(r => r.conference_sid === null || r.conference_sid === id); return query; },
      maybeSingle: async () => { const r = result(); return { ...r, data: r.data?.[0] ?? null }; },
      then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve),
    };
    return query;
  });
  const createClient = vi.fn(() => ({ from }));
  return { rows, writes, from, createClient, handler: edgeHandler("supabase/functions/twilio-in-app-voice-status/index.ts", createClient, env) };
}
function request(patch: Record<string, string> = {}, extra: [string, string][] = [], destination = url) {
  const form = new URLSearchParams({ AccountSid: account, ConferenceSid: conference, FriendlyName: `xoot-masked-${booking}`,
    SequenceNumber: "1", StatusCallbackEvent: "participant-join", CallSid: first, ...patch });
  extra.forEach(([key, value]) => form.append(key, value));
  const parameters = [...new Set(form.keys())].sort().map(key => [...new Set(form.getAll(key))].sort().map(value => key + value).join("")).join("");
  return new Request(destination, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded",
    "x-twilio-signature": createHmac("sha1", env.TWILIO_AUTH_TOKEN).update(destination + parameters).digest("base64") }, body: form });
}

describe("actual signed in-app status callback with synthetic transport", () => {
  it("links the original participant by signed call/account/booking and records only allowed fields", async () => {
    const f = fixture();
    expect((await f.handler(request({ From: "+27110000000", RecordingUrl: "https://private.invalid/recording", Reason: "private text" }))).status).toBe(204);
    expect(f.rows[0]).toMatchObject({ conference_sid: conference, status: "active", sequence_number: 1 });
    expect(f.rows[1].status).toBe("queued");
    expect(JSON.stringify(f.writes)).not.toMatch(/27110000000|private text|private.invalid|RecordingUrl|From/);
  });
  it("links the second participant only when its call was registered for the same booking", async () => {
    const f = fixture(); await f.handler(request({ CallSid: second }));
    expect(f.rows[1]).toMatchObject({ conference_sid: conference, status: "active" });
  });
  it("does not create a correlation row for an unregistered call", async () => {
    const f = fixture(); await f.handler(request({ CallSid: `CA${"e".repeat(32)}` }));
    expect(f.rows).toHaveLength(2); expect(f.rows.every(r => r.status === "queued")).toBe(true);
  });
  it("makes terminal state irreversible across late/replayed callbacks", async () => {
    const f = fixture();
    await f.handler(request({ StatusCallbackEvent: "participant-leave", SequenceNumber: "5" }));
    const finished = f.rows[0].finished_at;
    await f.handler(request({ SequenceNumber: "6" }));
    await f.handler(request({ StatusCallbackEvent: "participant-leave", SequenceNumber: "4" }));
    expect(f.rows[0]).toMatchObject({ status: "completed", sequence_number: 5, finished_at: finished });
  });
  it("ignores out-of-order non-terminal events", async () => {
    const f = fixture(); await f.handler(request({ SequenceNumber: "3" })); await f.handler(request({ SequenceNumber: "2" }));
    expect(f.rows[0].sequence_number).toBe(3);
  });
  it("ends only participants already bound to this exact conference", async () => {
    const f = fixture([row(first, { conference_sid: conference, status: "completed", finished_at: "prior" }), row(second)]);
    await f.handler(request({ StatusCallbackEvent: "conference-end", SequenceNumber: "8" }));
    expect(f.rows[1]).toMatchObject({ status: "queued", conference_sid: null });
  });
  it("ignores an expired original join", async () => {
    const f = fixture([row(first, { expires_at: "2020-01-01T00:00:00Z" })]);
    expect((await f.handler(request())).status).toBe(204); expect(f.writes).toHaveLength(0);
  });
  it("ignores another conference attempting to reuse the anchor", async () => {
    const f = fixture([row(first, { conference_sid: `CF${"f".repeat(32)}` })]);
    expect((await f.handler(request())).status).toBe(204); expect(f.writes).toHaveLength(0);
  });
  it("does not link an anchor to a different booking", async () => {
    const f = fixture(); await f.handler(request({ FriendlyName: "xoot-masked-22222222-2222-4222-8222-222222222222" }));
    expect(f.writes).toHaveLength(0);
  });
  it.each([{ AccountSid: `AC${"f".repeat(32)}` }, { ConferenceSid: "invalid" }, { FriendlyName: "arbitrary-room" },
    { SequenceNumber: "-1" }, { SequenceNumber: "9999999999" }, { StatusCallbackEvent: "conference-record-end" }, { CallSid: "" }])("rejects invalid provider fields before database access: %j", async patch => {
    const f = fixture(); expect((await f.handler(request(patch))).status).toBe(403); expect(f.createClient).not.toHaveBeenCalled();
  });
  it("rejects duplicate required parameters", async () => {
    const f = fixture(); expect((await f.handler(request({}, [["CallSid", second]]))).status).toBe(403); expect(f.createClient).not.toHaveBeenCalled();
  });
  it("rejects unsigned requests and tampered anchor URLs before database access", async () => {
    const f = fixture(); const unsigned = request(); unsigned.headers.delete("x-twilio-signature");
    expect((await f.handler(unsigned)).status).toBe(403);
    const signed = request(); const changed = new Request(url.replace(first, second), { method: "POST", headers: signed.headers, body: await signed.text() });
    expect((await f.handler(changed)).status).toBe(403); expect(f.createClient).not.toHaveBeenCalled();
  });
  it("returns a retriable error without leaking database details", async () => {
    const f = fixture([], true); const response = await f.handler(request());
    expect(response.status).toBe(503); expect(await response.text()).not.toContain("synthetic database error");
  });
});
