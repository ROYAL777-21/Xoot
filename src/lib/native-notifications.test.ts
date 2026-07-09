import { describe, expect, it } from "vitest";

import {
  buildNativePushSubscriptionRecord,
  normalisePermissionStatus,
  normalisePushPlatform,
  normaliseTokenType,
} from "./native-notifications";

describe("native notification helpers", () => {
  it("normalises platform, permission, and token types", () => {
    expect(normalisePushPlatform("ios")).toBe("ios");
    expect(normalisePushPlatform("android")).toBe("android");
    expect(normalisePushPlatform("desktop")).toBe("unknown");
    expect(normalisePermissionStatus("prompt-with-rationale")).toBe("prompt-with-rationale");
    expect(normalisePermissionStatus("blocked")).toBe("unknown");
    expect(normaliseTokenType("expo_push")).toBe("expo_push");
    expect(normaliseTokenType("web_push")).toBe("web_push");
    expect(normaliseTokenType("provider-secret")).toBe("unknown");
  });

  it("builds a safe granted subscription record", () => {
    const record = buildNativePushSubscriptionRecord({
      userId: "user-123",
      deviceId: "device-123456",
      platform: "ios",
      pushToken: "apns-token-123456789",
      permissionStatus: "granted",
      appVersion: "0.1.0",
      now: "2026-06-08T12:00:00.000Z",
    });

    expect(record).toEqual({
      user_id: "user-123",
      device_id: "device-123456",
      platform: "ios",
      push_token: "apns-token-123456789",
      token_type: "expo_push",
      permission_status: "granted",
      app_version: "0.1.0",
      last_seen_at: "2026-06-08T12:00:00.000Z",
      revoked_at: null,
    });
  });

  it("allows denied permission status without a token", () => {
    const record = buildNativePushSubscriptionRecord({
      userId: "user-123",
      deviceId: "device-123456",
      platform: "android",
      permissionStatus: "denied",
      now: "2026-06-08T12:00:00.000Z",
    });

    expect(record?.permission_status).toBe("denied");
    expect(record?.push_token).toBeNull();
  });

  it("rejects granted records without usable tokens", () => {
    expect(
      buildNativePushSubscriptionRecord({
        userId: "user-123",
        deviceId: "device-123456",
        permissionStatus: "granted",
        pushToken: "short",
      }),
    ).toBeNull();
  });

  it("rejects missing users and short device ids", () => {
    expect(buildNativePushSubscriptionRecord({ userId: "", deviceId: "device-123456" })).toBeNull();
    expect(buildNativePushSubscriptionRecord({ userId: "user-123", deviceId: "short" })).toBeNull();
  });
});
