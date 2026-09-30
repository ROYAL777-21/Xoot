import { describe, expect, it } from "vitest";
import {
  calculateNativeXootCredSummary,
  xootCredReasonLabel,
} from "../../mobile/src/lib/native-xootcred";

describe("native XootCred presentation", () => {
  it("uses only live ledger rows for the available balance", () => {
    const summary = calculateNativeXootCredSummary(
      [
        {
          id: "credit",
          amount: 100,
          direction: "credit",
          status: "available",
          reason: "loyalty_reward",
          created_at: "2026-09-01T00:00:00Z",
        },
        {
          id: "debit",
          amount: 25,
          direction: "debit",
          status: "redeemed",
          reason: "redemption",
          created_at: "2026-09-02T00:00:00Z",
        },
        {
          id: "pending",
          amount: 40,
          direction: "credit",
          status: "pending",
          reason: "referral",
          created_at: "2026-09-03T00:00:00Z",
        },
        {
          id: "redeemed-credit",
          amount: 50,
          direction: "credit",
          status: "redeemed",
          reason: "loyalty_reward",
          created_at: "2026-09-04T00:00:00Z",
        },
        {
          id: "expired",
          amount: 20,
          direction: "credit",
          status: "available",
          reason: "refund",
          created_at: "2026-08-01T00:00:00Z",
          expires_at: "2026-09-05T00:00:00Z",
        },
      ],
      new Date("2026-09-20T00:00:00Z"),
    );
    expect(summary.availableBalance).toBe(75);
    expect(summary.pendingBalance).toBe(40);
    expect(summary.welcomeCredit).toBe(100);
  });
  it("turns backend reason keys into honest readable labels", () => {
    expect(xootCredReasonLabel("booking_redemption")).toBe("Used on a booking");
    expect(xootCredReasonLabel("manual_adjustment")).toBe("Manual Adjustment");
  });
});
