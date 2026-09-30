import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateXootCredSummary, useXootCred, type XootCredLedgerRow } from "./useXootCred";

const harness = vi.hoisted(() => ({
  auth: { user: { id: "account-a" } as { id: string } | null, loading: false },
  range: vi.fn(),
  queries: [] as Array<{ accountId: string; from: number; to: number; orders: string[] }>,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => harness.auth }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      let accountId = "";
      const orders: string[] = [];
      const query = {
        select: () => query,
        eq: (_field: string, value: string) => { accountId = value; return query; },
        order: (column: string) => { orders.push(column); return query; },
        range: (from: number, to: number) => {
          harness.queries.push({ accountId, from, to, orders });
          return harness.range(accountId, from, to);
        },
      };
      return query;
    },
  },
}));

const now = new Date("2026-06-14T12:00:00.000Z");

describe("calculateXootCredSummary", () => {
  it("excludes redeemed credits but keeps redeemed debits and cent precision", () => {
    const rows: XootCredLedgerRow[] = [
      { id: "available", amount: "10.10", direction: "credit", status: "available", reason: "loyalty_reward", created_at: "2026-06-01T08:00:00Z" },
      { id: "redeemed-credit", amount: "5.01", direction: "credit", status: "redeemed", reason: "loyalty_reward", created_at: "2026-06-02T08:00:00Z" },
      { id: "redeemed-debit", amount: "0.09", direction: "debit", status: "redeemed", reason: "redemption", created_at: "2026-06-03T08:00:00Z" },
      { id: "legacy-debit", amount: "-0.01", direction: null, status: "available", reason: "redemption", created_at: "2026-06-04T08:00:00Z" },
    ];
    const summary = calculateXootCredSummary(rows, now);
    expect(summary.availableBalance).toBe(10);
    expect(summary.welcomeCredit).toBe(10.1);
    expect(summary.entries).toHaveLength(4);
  });
  it("calculates available balance from non-expired credit and debit ledger entries", () => {
    const rows: XootCredLedgerRow[] = [
      { id: "credit", amount: 100, direction: "credit", status: "available", reason: "loyalty_reward", created_at: "2026-06-01T08:00:00.000Z" },
      { id: "debit", amount: 35, direction: "debit", status: "redeemed", reason: "redemption", created_at: "2026-06-02T08:00:00.000Z" },
      { id: "expired", amount: 30, direction: "credit", status: "available", reason: "loyalty_reward", created_at: "2026-05-01T08:00:00.000Z", expires_at: "2026-06-01T00:00:00.000Z" },
    ];

    expect(calculateXootCredSummary(rows, now).availableBalance).toBe(65);
  });

  it("separates pending credits from the Care+ welcome credit", () => {
    const rows: XootCredLedgerRow[] = [
      { id: "pending", amount: 50, direction: "credit", status: "pending", reason: "referral", created_at: "2026-06-03T08:00:00.000Z" },
      {
        id: "monthly",
        amount: 30,
        direction: "credit",
        status: "available",
        reason: "loyalty_reward",
        meta: { source: "care_plus_activation" },
        created_at: "2026-06-04T08:00:00.000Z",
        expires_at: "2026-06-30T21:59:59.000Z",
      },
    ];

    const summary = calculateXootCredSummary(rows, now);
    expect(summary.availableBalance).toBe(30);
    expect(summary.pendingBalance).toBe(50);
    expect(summary.welcomeCredit).toBe(30);
    expect(summary.welcomeCreditExpiresAt).toBe("2026-06-30T21:59:59.000Z");
  });

  it("supports signed legacy rows when direction is absent", () => {
    const rows: XootCredLedgerRow[] = [
      { id: "credit", amount: 70, reason: "loyalty_reward", created_at: "2026-06-01T08:00:00.000Z" },
      { id: "debit", amount: -20, reason: "redemption", created_at: "2026-06-02T08:00:00.000Z" },
    ];

    expect(calculateXootCredSummary(rows, now).availableBalance).toBe(50);
  });

  it("preserves signed legacy redeemed credit while excluding a typed redeemed credit", () => {
    const rows: XootCredLedgerRow[] = [
      { id: "legacy", amount: 50, direction: null, status: "redeemed", reason: "loyalty_reward", created_at: "2026-06-01T08:00:00Z" },
      { id: "typed", amount: 40, direction: "credit", status: "redeemed", reason: "loyalty_reward", created_at: "2026-06-01T08:00:00Z" },
      { id: "spent", amount: 20, direction: "debit", status: "redeemed", reason: "booking_redemption", created_at: "2026-06-01T08:00:00Z" },
    ];
    const summary = calculateXootCredSummary(rows, now);
    expect(summary.availableBalance).toBe(30);
    expect(summary.welcomeCredit).toBe(50);
  });

  it("counts the Care+ credit while it is live, not while its expiry lands this month", () => {
    // `activate-care-plus` sets expires_at to activation + 30 days, so for most of the
    // year the credit straddles a month boundary. Activate on 20 August and it expires
    // on 19 September — the member has R30 available all through late August and the
    // card must say so.
    const rows: XootCredLedgerRow[] = [
      {
        id: "welcome",
        amount: 30,
        direction: "credit",
        status: "available",
        reason: "loyalty_reward",
        meta: { source: "care_plus_activation" },
        created_at: "2026-08-20T08:00:00.000Z",
        expires_at: "2026-09-19T08:00:00.000Z",
      },
    ];

    const summary = calculateXootCredSummary(rows, new Date("2026-08-25T10:00:00.000Z"));
    expect(summary.availableBalance).toBe(30);
    expect(summary.welcomeCredit).toBe(30);
    expect(summary.welcomeCreditExpiresAt).toBe("2026-09-19T08:00:00.000Z");
  });

  it("stops counting the credit once it has expired", () => {
    const rows: XootCredLedgerRow[] = [
      {
        id: "welcome",
        amount: 30,
        direction: "credit",
        status: "available",
        reason: "loyalty_reward",
        meta: { source: "care_plus_activation" },
        created_at: "2026-08-20T08:00:00.000Z",
        expires_at: "2026-09-19T08:00:00.000Z",
      },
    ];

    const summary = calculateXootCredSummary(rows, new Date("2026-09-20T10:00:00.000Z"));
    expect(summary.welcomeCredit).toBe(0);
    expect(summary.welcomeCreditExpiresAt).toBeNull();
  });
});

const row = (id: string, amount: number, direction: "credit" | "debit" = "credit"): XootCredLedgerRow => ({
  id, amount, direction, status: direction === "debit" ? "redeemed" : "available",
  reason: direction === "debit" ? "redemption" : "loyalty_reward",
  created_at: "2026-06-01T08:00:00Z",
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

describe("useXootCred ledger reads", () => {
  beforeEach(() => {
    harness.auth.user = { id: "account-a" };
    harness.auth.loading = false;
    harness.queries.length = 0;
    harness.range.mockReset();
  });
  afterEach(() => cleanup());

  it("includes an old debit on page two with owner and deterministic ordering", async () => {
    harness.range.mockImplementation((_account: string, from: number) => Promise.resolve({
      data: from === 0 ? Array.from({ length: 500 }, (_, index) => row(`credit-${index}`, 1)) : [row("old-debit", 120, "debit")],
      error: null,
    }));
    const { result } = renderHook(() => useXootCred());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.availableBalance).toBe(380);
    expect(result.current.entries).toHaveLength(501);
    expect(harness.queries).toEqual([
      { accountId: "account-a", from: 0, to: 499, orders: ["created_at", "id"] },
      { accountId: "account-a", from: 500, to: 999, orders: ["created_at", "id"] },
    ]);
  });

  it("shows no partial balance when a later page fails", async () => {
    harness.range.mockImplementation((_account: string, from: number) => Promise.resolve(from === 0
      ? { data: Array.from({ length: 500 }, (_, index) => row(`credit-${index}`, 1)), error: null }
      : { data: null, error: { message: "page failed" } }));
    const { result } = renderHook(() => useXootCred());
    await waitFor(() => expect(result.current.error).toBe("XootCred could not be refreshed. Try again shortly."));
    expect(result.current.availableBalance).toBe(0);
    expect(result.current.entries).toEqual([]);
  });

  it("hides prior data on switch and logout, ignoring late results", async () => {
    const old = deferred<{ data: XootCredLedgerRow[]; error: null }>();
    harness.range.mockImplementation((account: string) => account === "account-a"
      ? old.promise
      : Promise.resolve({ data: [row("new", 7)], error: null }));
    const { result, rerender } = renderHook(() => useXootCred());
    harness.auth.user = { id: "account-b" };
    rerender();
    expect(result.current.entries).toEqual([]);
    await waitFor(() => expect(result.current.availableBalance).toBe(7));
    await act(async () => old.resolve({ data: [row("old", 90)], error: null }));
    expect(result.current.availableBalance).toBe(7);
    harness.auth.user = null;
    rerender();
    expect(result.current.availableBalance).toBe(0);
    expect(result.current.entries).toEqual([]);
  });

  it("keeps the newest refresh for an unchanged account", async () => {
    const first = deferred<{ data: XootCredLedgerRow[]; error: null }>();
    harness.range.mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => Promise.resolve({ data: [row("new", 4)], error: null }));
    const { result } = renderHook(() => useXootCred());
    await act(async () => result.current.refresh());
    expect(result.current.availableBalance).toBe(4);
    await act(async () => first.resolve({ data: [row("old", 80)], error: null }));
    expect(result.current.availableBalance).toBe(4);
  });

  it("hides a settled balance while auth is pending and rejects a late logout response", async () => {
    const late = deferred<{ data: XootCredLedgerRow[]; error: null }>();
    harness.range.mockImplementationOnce(() => Promise.resolve({ data: [row("first", 12)], error: null }))
      .mockImplementationOnce(() => late.promise);
    const { result, rerender, unmount } = renderHook(() => useXootCred());
    await waitFor(() => expect(result.current.availableBalance).toBe(12));
    void act(() => { void result.current.refresh(); });
    harness.auth.loading = true;
    rerender();
    expect(result.current.availableBalance).toBe(0);
    harness.auth.loading = false;
    harness.auth.user = null;
    rerender();
    await act(async () => late.resolve({ data: [row("late", 99)], error: null }));
    expect(result.current.availableBalance).toBe(0);
    unmount();
  });
});
