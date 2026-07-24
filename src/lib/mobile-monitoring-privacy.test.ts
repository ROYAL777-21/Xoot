import { describe, expect, it } from "vitest";

import {
  scrubMobileMonitoringString,
  scrubMobileMonitoringValue,
  scrubMobileSentryEvent,
} from "../../mobile/src/lib/monitoring-privacy";

describe("mobile monitoring privacy", () => {
  it("redacts credentials, contact details, access codes, addresses, and payment-like numbers from strings", () => {
    const result = scrubMobileMonitoringString(
      "Email user@example.com, phone +27 82 123 4567, gate code 1234, address 8 Oxford Road, card 4111 1111 1111 1111, token sb_secret_test",
    );

    expect(result).toContain("[email redacted]");
    expect(result).toContain("[phone redacted]");
    expect(result).toContain("gate code [redacted]");
    expect(result).toContain("[address redacted]");
    expect(result).toContain("[number redacted]");
    expect(result).toContain("[credential redacted]");
    expect(result).not.toContain("user@example.com");
    expect(result).not.toContain("1234");
    expect(result).not.toContain("8 Oxford Road");
  });

  it("filters sensitive nested monitoring keys", () => {
    expect(
      scrubMobileMonitoringValue({
        safe_status: "queued",
        support_message: "Broken gate at 8 Oxford Road",
        nested: {
          booking_id: "public-safe-id",
          access_instructions: "lockbox 2468",
        },
      }),
    ).toEqual({
      safe_status: "queued",
      support_message: "[Filtered]",
      nested: {
        booking_id: "public-safe-id",
        access_instructions: "[Filtered]",
      },
    });
  });

  it("scrubs Sentry-like mobile events before sending", () => {
    const event = scrubMobileSentryEvent<any>({
      message: "Failed booking for user@example.com at 12 Main Road",
      user: { id: "admin-user", email: "admin@example.com" },
      request: {
        headers: { authorization: "Bearer token", accept: "json" },
        data: { payment_card: "4111111111111111" },
      },
      breadcrumbs: [
        {
          message: "Gate code 1234 visible",
          data: { phone: "+27821234567", safe: "status" },
        },
      ],
      exception: {
        values: [{ value: "Alarm code 9876 leaked" }],
      },
    });

    expect(event.tags?.app).toBe("zoot-mobile");
    expect(event.user).toEqual({ id: "admin-user" });
    expect(JSON.stringify(event)).not.toContain("admin@example.com");
    expect(JSON.stringify(event)).not.toContain("4111111111111111");
    expect(JSON.stringify(event)).not.toContain("1234");
    expect(JSON.stringify(event)).not.toContain("9876");
    expect(JSON.stringify(event)).toContain("[Filtered]");
  });
});
