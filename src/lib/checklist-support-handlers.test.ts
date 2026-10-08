import { describe, expect, it, vi } from "vitest";
import { edgeHandler } from "../test/edge-handler";

const post = (origin: string | null, body: object = {}, auth = false) => new Request("https://edge.test", {
  method: "POST", headers: { "Content-Type": "application/json", ...(origin ? { Origin: origin } : {}), ...(auth ? { Authorization: "Bearer verified-token" } : {}) }, body: JSON.stringify(body),
});
describe("Concierge actual POST entrypoint", () => {
  it("reaches the allowed origin body guard and rejects unapproved origins before transport", async () => {
    const client = vi.fn();
    const handler = edgeHandler("supabase/functions/support-respond/index.ts", client);
    expect((await handler(post("https://xoot.co.za"))).status).toBe(400);
    expect((await handler(post(null))).status).toBe(400);
    const denied = await handler(post("https://attacker.test"));
    expect(denied.status).toBe(403);
    expect(await denied.json()).toEqual({ error: "origin not allowed" });
    expect(client).not.toHaveBeenCalled();
  });
});
describe("Checklist actual authenticated entrypoint", () => {
  const jobId = "11111111-1111-4111-8111-111111111111";
  const setup = (result: unknown = { data: { ok: true, task: { id: "task" } }, error: null }) => {
    const rpc = vi.fn().mockResolvedValue(result);
    const handler = edgeHandler("supabase/functions/xooter-job-checklist/index.ts", (_url, key) => key === "service" ? { rpc } : { auth: { getUser: async () => ({ data: { user: { id: "verified-actor" } }, error: null }) } }, { SUPABASE_URL: "https://fake.test", SUPABASE_ANON_KEY: "anon", SUPABASE_SERVICE_ROLE_KEY: "service" });
    return { handler, rpc };
  };
  it("uses verified identity rather than a supplied actor, and returns the atomic mutation result", async () => {
    const { handler, rpc } = setup();
    expect((await handler(post("https://xoot.co.za", { jobId, taskKey: "start_work", complete: false, p_actor_id: "attacker" }, true))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("update_active_xooter_checklist", { p_actor_id: "verified-actor", p_job_id: jobId, p_task_key: "start_work", p_complete: false });
  });
  it.each([["not_active", 409], ["not_found", 404], ["invalid_request", 400]])("maps %s without a second service write", async (code, status) => {
    const { handler, rpc } = setup({ data: { ok: false, code }, error: null });
    expect((await handler(post(null, { jobId, taskKey: "start_work" }, true))).status).toBe(status);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("fails safely when schema delivery is unavailable", async () => {
    const { handler } = setup({ data: null, error: { message: "private database detail" } });
    const response = await handler(post(null, { jobId, taskKey: "start_work" }, true));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private database");
  });
  it("rejects unauthenticated, invalid and cross-origin requests without RPC", async () => {
    const { handler, rpc } = setup();
    expect((await handler(post(null))).status).toBe(401);
    expect((await handler(post(null, { jobId: "invalid", taskKey: "start_work" }, true))).status).toBe(400);
    expect((await handler(post("https://attacker.test", { jobId, taskKey: "start_work" }, true))).status).toBe(403);
    expect(rpc).not.toHaveBeenCalled();
  });
});
