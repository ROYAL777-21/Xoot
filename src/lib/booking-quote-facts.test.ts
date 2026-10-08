import { describe, expect, it, vi } from "vitest";
import { loadBookingQuoteFacts } from "../../supabase/functions/_shared/booking-quote-facts";

const now = Date.parse("2026-09-27T10:00:00Z");
type Result = { data?: unknown; error?: unknown; count?: number | null };
function database(overrides: Record<string, Result | Result[]> = {}) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const defaults: Record<string, Result> = {
    user_subscriptions: { data: null, error: null },
    xootcred_ledger: { data: [], error: null },
    referrals: { data: null, error: null },
    bookings: { count: 0, error: null },
    referral_redemptions: { data: null, error: null },
  };
  const from = vi.fn((table: string) => {
    const answer = overrides[table] ?? defaults[table];
    const result = Array.isArray(answer) ? answer.shift() : answer;
    const chain: Record<string, unknown> = {};
    for (const method of ["select", "eq", "in", "not", "order", "range", "maybeSingle"]) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ table, method, args });
        return chain;
      };
    }
    chain.then = (resolve: (value: Result | undefined) => void) => Promise.resolve(result).then(resolve);
    return chain;
  });
  return { from, calls };
}

describe("booking quote reads authoritative account facts", () => {
  it("scopes account queries to the verified buyer and returns no invented benefits", async () => {
    const db = database();
    expect(await loadBookingQuoteFacts(db, "buyer", "", now)).toEqual({
      buyerId: "buyer", carePlusMember: false, availableCreditCents: 0,
      referralRecord: null, completedBookingCount: 0, hasPriorRedemption: false,
      coverAvailable: false,
    });
    for (const table of ["user_subscriptions", "xootcred_ledger"]) {
      expect(db.calls).toContainEqual({ table, method: "eq", args: ["user_id", "buyer"] });
    }
    expect(db.from).not.toHaveBeenCalledWith("referrals");
  });
  it("uses active, unexpired membership and exact available credit cents", async () => {
    const db = database({
      user_subscriptions: { data: { id: "membership", status: "active", next_billing_at: "2026-10-01T00:00:00Z" } },
      xootcred_ledger: { data: [
        { amount: "100.25", direction: "credit", status: "available", expires_at: null },
        { amount: "20.10", direction: "debit", status: "redeemed", expires_at: null },
        { amount: 100, direction: "credit", status: "pending", expires_at: null },
        { amount: 100, direction: "credit", status: "redeemed", expires_at: null },
        { amount: 100, direction: "credit", status: "available", expires_at: "2026-09-27T10:00:00Z" },
      ] },
    });
    expect(await loadBookingQuoteFacts(db, "buyer", "", now)).toMatchObject({
      carePlusMember: true, availableCreditCents: 8015, coverAvailable: false,
    });
  });
  it("expires membership at its billing boundary", async () => {
    const db = database({ user_subscriptions: { data: { id: "member", status: "active", next_billing_at: "2026-09-27T10:00:00Z" } } });
    expect((await loadBookingQuoteFacts(db, "buyer", "", now)).carePlusMember).toBe(false);
  });
  it("retrieves referral owner and completion/redemption facts only on the server", async () => {
    const db = database({
      referrals: { data: { code: "FRIEND", user_id: "referrer" } },
      bookings: { count: 2 },
      referral_redemptions: { data: { id: "redemption" } },
    });
    expect(await loadBookingQuoteFacts(db, "buyer", "FRIEND", now)).toMatchObject({
      referralRecord: { code: "FRIEND", userId: "referrer" },
      completedBookingCount: 2, hasPriorRedemption: true,
    });
    expect(db.calls).toContainEqual({ table: "referrals", method: "eq", args: ["code", "FRIEND"] });
    expect(db.calls).toContainEqual({ table: "bookings", method: "eq", args: ["user_id", "buyer"] });
    expect(db.calls).toContainEqual({ table: "bookings", method: "not", args: ["completed_at", "is", null] });
    expect(db.calls).toContainEqual({ table: "referral_redemptions", method: "eq", args: ["referred_user_id", "buyer"] });
  });
  it.each(["user_subscriptions", "xootcred_ledger", "referrals", "bookings", "referral_redemptions"])(
    "refuses to guess when %s cannot be read", async (table) => {
      await expect(loadBookingQuoteFacts(database({ [table]: { data: null, error: { message: "private database diagnostic" } } }), "buyer", "FRIEND", now))
        .rejects.toThrow("Could not verify booking benefits. Please try again.");
    },
  );
  it("rejects a missing completion count instead of granting first-booking eligibility", async () => {
    await expect(loadBookingQuoteFacts(database({ bookings: { count: null } }), "buyer", "FRIEND", now)).rejects.toThrow();
  });
  it.each(["invalid", "12.345", "Infinity", -5])("refuses a corrupt credit amount %s", async (amount) => {
    await expect(loadBookingQuoteFacts(database({ xootcred_ledger: { data: [{ amount, direction: "credit", status: "available", expires_at: null }] } }), "buyer", "", now)).rejects.toThrow();
  });
  it("reads past the API row limit so old credits cannot hide newer debits", async () => {
    const page = Array.from({ length: 500 }, () => ({ amount: 1, direction: "credit", status: "available", expires_at: null }));
    const db = database({ xootcred_ledger: [{ data: page }, { data: [{ amount: 499, direction: "debit", status: "redeemed", expires_at: null }] }] });
    expect((await loadBookingQuoteFacts(db, "buyer", "", now)).availableCreditCents).toBe(100);
    expect(db.calls).toContainEqual({ table: "xootcred_ledger", method: "range", args: [500, 999] });
    expect(db.calls).toContainEqual({ table: "xootcred_ledger", method: "order", args: ["id", { ascending: true }] });
  });
  it("fails closed on malformed expiry data", async () => {
    await expect(loadBookingQuoteFacts(database({ user_subscriptions: { data: { id: "member", status: "active", next_billing_at: "bad-date" } } }), "buyer", "", now)).rejects.toThrow();
    await expect(loadBookingQuoteFacts(database({ xootcred_ledger: { data: [{ amount: 1, direction: "credit", status: "available", expires_at: "bad-date" }] } }), "buyer", "", now)).rejects.toThrow();
  });
});
