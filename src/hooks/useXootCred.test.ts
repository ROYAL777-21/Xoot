import { describe, expect, it } from "vitest";
import { calculateXootCredSummary, type XootCredLedgerRow } from "./useXootCred";

const now = new Date("2026-06-14T12:00:00.000Z");

describe("calculateXootCredSummary", () => {
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
