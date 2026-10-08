import { beforeEach, describe, expect, it, vi } from "vitest";
import { blankHome, readHome, readProfileOverview, saveHome, saveIdentity } from "./profile-data";

type Query = { table: string; selection?: string; filters: [string, unknown][]; orders: string[]; range?: number[]; update?: unknown; insert?: unknown };
const harness = vi.hoisted(() => ({ queries: [] as Query[], result: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  const record: Query = { table, filters: [], orders: [] };
  harness.queries.push(record);
  const query = { select: (selection: string) => { record.selection = selection; return query; },
    eq: (field: string, value: unknown) => { record.filters.push([field, value]); return query; },
    order: (field: string) => { record.orders.push(field); return query; },
    range: (start: number, end: number) => { record.range = [start, end]; return harness.result(record); },
    maybeSingle: () => harness.result(record),
    update: (payload: unknown) => { record.update = payload; return query; },
    insert: (payload: unknown) => { record.insert = payload; return query; },
  }; return query;
} } }));
const profile = { full_name: "Synthetic Person", phone: "", address: "", avatar_url: null };
beforeEach(() => { harness.queries = []; harness.result.mockReset(); });

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
    expect(harness.queries[0].filters).toEqual([["id", "place-a"], ["user_id", "owner-a"]]);
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
  it("scopes place updates by id and owner, rejecting missing or denied rows", async () => {
    const draft = { ...blankHome, label: "Synthetic home", address: "100 Test Road, Test City" };
    harness.result.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { id: "place-a" }, error: { message: "denied" } }).mockResolvedValueOnce({ data: { id: "place-a" }, error: null });
    await expect(saveHome("owner-a", "place-a", draft)).rejects.toThrow("not saved");
    await expect(saveHome("owner-a", "place-a", draft)).rejects.toThrow("not saved");
    await expect(saveHome("owner-a", "place-a", draft)).resolves.toBe("place-a");
    expect(harness.queries.every(query => JSON.stringify(query.filters) === JSON.stringify([["id", "place-a"], ["user_id", "owner-a"]]))).toBe(true);
    expect(harness.queries.every(query => !Object.prototype.hasOwnProperty.call(query.update, "is_default"))).toBe(true);
  });
  it("creates with the auth owner and validates bounded text before querying", async () => {
    const draft = { ...blankHome, label: "Synthetic home", address: "100 Test Road, Test City" };
    await expect(saveHome("owner-a", null, { ...draft, pet_notes: "x".repeat(1001) })).rejects.toThrow("1000");
    expect(harness.queries).toHaveLength(0);
    harness.result.mockResolvedValue({ data: { id: "created-place" }, error: null });
    await expect(saveHome("owner-a", null, { ...draft, is_default: true })).resolves.toBe("created-place");
    expect(harness.queries[0].insert).toMatchObject({ user_id: "owner-a", label: "Synthetic home", is_default: false });
  });
});
