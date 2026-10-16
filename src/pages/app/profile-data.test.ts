import { beforeEach, describe, expect, it, vi } from "vitest";
import { blankHome, readHome, readProfileOverview, saveHome, saveIdentity } from "./profile-data";

type Query = { table: string; selection?: string; filters: [string, unknown][]; orders: string[]; range?: number[]; update?: unknown; insert?: unknown };
const harness = vi.hoisted(() => ({ queries: [] as Query[], result: vi.fn(), rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...args: unknown[]) => harness.rpc(...args), from: (table: string) => {
  const record: Query = { table, filters: [], orders: [] };
  harness.queries.push(record);
  const query = { select: (selection: string) => { record.selection = selection; return query; },
    eq: (field: string, value: unknown) => { record.filters.push([field, value]); return query; },
    is: (field: string, value: unknown) => { record.filters.push([field, value]); return query; },
    order: (field: string) => { record.orders.push(field); return query; },
    range: (start: number, end: number) => { record.range = [start, end]; return harness.result(record); },
    maybeSingle: () => harness.result(record),
    update: (payload: unknown) => { record.update = payload; return query; },
    insert: (payload: unknown) => { record.insert = payload; return query; },
  }; return query;
} } }));
const profile = { full_name: "Synthetic Person", phone: "", address: "", avatar_url: null };
beforeEach(() => { harness.queries = []; harness.result.mockReset(); harness.rpc.mockReset(); });

describe("Profile owner-qualified data", () => {
  it("loads all places and subscriptions with minimal columns and stable owner order", async () => {
    harness.result.mockImplementation((query: Query) => {
      if (query.table === "profiles") return Promise.resolve({ data: profile, error: null });
      if (query.table === "household_profiles") return Promise.resolve({ data: query.range?.[0] === 0 ? Array.from({ length: 100 }, (_, index) => ({ id: `place-${index}`, label: "Synthetic place", address: null, is_default: false })) : [{ id: "last-place", label: "Last", address: null, is_default: false }], error: null });
      return Promise.resolve({ data: query.range?.[0] === 0 ? Array.from({ length: 100 }, (_, index) => ({ id: `sub-${index}`, status: "active", started_at: "2026-01-01", next_billing_at: "2026-02-01", subscription_plans: { name: "Garden care" } })) : [{ id: "care", status: "active", started_at: "2025-01-01", next_billing_at: "2026-02-01", subscription_plans: { name: "HomeCare+" } }], error: null });
    });
    const result = await readProfileOverview("owner-a");
    expect(result.places).toHaveLength(101);
    expect(result.membership?.id).toBe("care");
    expect(harness.queries.every(query => query.filters.some(([field, value]) => (field === "id" || field === "user_id") && value === "owner-a"))).toBe(true);
    expect(harness.queries.filter(query => query.table === "household_profiles").map(query => [query.selection, query.orders, query.range])).toEqual([
      ["id,label,address,is_default", ["is_default", "id"], [0, 99]], ["id,label,address,is_default", ["is_default", "id"], [100, 199]],
    ]);
    expect(harness.queries.every(query => !query.selection?.includes("*"))).toBe(true);
  });
  it("does not treat unrelated care plans or cancelled membership as active membership", async () => {
    harness.result.mockImplementation((query: Query) => Promise.resolve({ error: null, data: query.table === "profiles" ? profile : query.table === "household_profiles" ? [] : [
      { id: "other", status: "active", subscription_plans: { name: "Garden Care+" } },
      { id: "cancelled", status: "cancelled", subscription_plans: { name: "Care+" } },
    ] }));
    expect((await readProfileOverview("owner-a")).membership).toBeNull();
  });
  it("fails when a later places page fails instead of reporting an empty or partial list", async () => {
    harness.result.mockResolvedValueOnce({ data: profile, error: null }).mockResolvedValueOnce({ data: Array.from({ length: 100 }, () => ({})), error: null }).mockResolvedValueOnce({ data: null, error: { message: "synthetic denial" } });
    await expect(readProfileOverview("owner-a")).rejects.toThrow("places");
  });
  it("rejects missing identity and membership read errors", async () => {
    harness.result.mockResolvedValueOnce({ data: null, error: null });
    await expect(readProfileOverview("owner-a")).rejects.toThrow("account");
    harness.result.mockResolvedValueOnce({ data: profile, error: null }).mockResolvedValueOnce({ data: [], error: null }).mockResolvedValueOnce({ data: null, error: { message: "denied" } });
    await expect(readProfileOverview("owner-a")).rejects.toThrow("membership");
  });
  it("reads sensitive place fields only for the requested owner's editor", async () => {
    harness.result.mockResolvedValue({ data: { ...blankHome, label: "Synthetic home" }, error: null });
    await readHome("owner-a", "place-a");
    expect(harness.queries[0].filters).toEqual([["id", "place-a"], ["user_id", "owner-a"], ["archived_at", null]]);
    expect(harness.queries[0].selection).toContain("access_notes");
  });
  it("validates account details and requires a confirmed owner row", async () => {
    await expect(saveIdentity("owner-a", { ...profile, phone: "123" })).rejects.toThrow("phone number");
    expect(harness.queries).toHaveLength(0);
    harness.result.mockResolvedValueOnce({ data: null, error: null });
    await expect(saveIdentity("owner-a", profile)).rejects.toThrow("not saved");
    harness.result.mockResolvedValueOnce({ data: { id: "owner-a" }, error: null });
    await expect(saveIdentity("owner-a", profile)).resolves.toBeUndefined();
    expect(harness.queries[1].filters).toEqual([["id", "owner-a"]]);
    await expect(saveIdentity("owner-a", { ...profile, full_name: "x".repeat(121) })).rejects.toThrow("too long");
  });
  it("requires a committed RPC reply and preserves a concurrent default on ordinary edits", async () => {
    const draft = { ...blankHome, label: "Office", address: "100 Test Road, Test City", is_default: true };
    harness.rpc.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { id: "place-a", is_default: true }, error: { message: "denied" } }).mockResolvedValueOnce({ data: { id: "place-a", is_default: false }, error: null });
    await expect(saveHome("owner-a", "place-a", draft)).rejects.toThrow("not saved");
    await expect(saveHome("owner-a", "place-a", draft)).rejects.toThrow("not saved");
    await expect(saveHome("owner-a", "place-a", draft)).resolves.toBe("place-a");
    expect(harness.rpc).toHaveBeenLastCalledWith("save_home", expect.objectContaining({ p_expected_owner: "owner-a", p_home_id: "place-a", p_selected: null }));
    expect(harness.rpc.mock.calls[2][1].p_details).not.toHaveProperty("is_default");
    expect(harness.queries).toHaveLength(0);
  });
  it("atomically requests a selected new home and keeps a stable UUID for lost-reply retries", async () => {
    const draft = { ...blankHome, label: "Office", address: "100 Test Road, Test City" };
    await expect(saveHome("owner-a", "new-place", { ...draft, pet_notes: "x".repeat(1001) }, true)).rejects.toThrow("1000");
    expect(harness.rpc).not.toHaveBeenCalled();
    harness.rpc.mockResolvedValueOnce({ data: null, error: { code: "PGRST202" } }).mockResolvedValue({ data: { id: "new-place", is_default: true }, error: null });
    await expect(saveHome("owner-a", "new-place", draft, true)).rejects.toThrow("confirmation");
    await expect(saveHome("owner-a", "new-place", draft, true)).resolves.toBe("new-place");
    expect(harness.rpc.mock.calls[0]).toEqual(harness.rpc.mock.calls[1]);
    expect(harness.rpc.mock.calls[1][1]).toMatchObject({ p_expected_owner: "owner-a", p_home_id: "new-place", p_selected: true, p_details: {label: "Office"} });
  });
});
