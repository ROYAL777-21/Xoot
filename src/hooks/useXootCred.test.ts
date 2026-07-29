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

  it("separates pending credits and current-month Care+ add-on credit", () => {
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
    expect(summary.monthlyCredit).toBe(30);
    expect(summary.monthlyCreditExpiresAt).toBe("2026-06-30T21:59:59.000Z");
  });

  it("supports signed legacy rows when direction is absent", () => {
    const rows: XootCredLedgerRow[] = [
      { id: "credit", amount: 70, reason: "loyalty_reward", created_at: "2026-06-01T08:00:00.000Z" },
      { id: "debit", amount: -20, reason: "redemption", created_at: "2026-06-02T08:00:00.000Z" },
    ];

    expect(calculateXootCredSummary(rows, now).availableBalance).toBe(50);
  });
});
