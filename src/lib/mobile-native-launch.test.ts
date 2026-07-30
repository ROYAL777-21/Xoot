import { describe, expect, it } from "vitest";

import {
  buildNativeLaunchTarget,
  getNativeLaunchMode,
  nativeLaunchAssets,
  resolveNativeLaunchIntent,
  shouldBypassNativeLaunchExperience,
  shouldPlayLaunchAnimation,
} from "../../mobile/src/lib/native-launch";

describe("mobile native launch experience", () => {
  it("uses bundled native launch assets only", () => {
    expect(nativeLaunchAssets).toMatchObject({
      remoteAssets: false,
      source: "bundled-native",
      webView: false,
    });
  });

  it("switches to static mode for accessibility and low-power conditions", () => {
    expect(getNativeLaunchMode({ prefersReducedMotion: true })).toBe("static");
    expect(getNativeLaunchMode({ isLowPowerMode: true })).toBe("static");
    expect(getNativeLaunchMode({ forceStatic: true })).toBe("static");
    expect(getNativeLaunchMode({})).toBe("motion");
  });

  it("bypasses the launch layer for assistant and urgent intents", () => {
    expect(shouldBypassNativeLaunchExperience(resolveNativeLaunchIntent({ intent: "book_clean" }))).toBe(true);
    expect(shouldBypassNativeLaunchExperience(resolveNativeLaunchIntent({ zootBot: "open" }))).toBe(true);
    expect(shouldBypassNativeLaunchExperience(resolveNativeLaunchIntent({ intent: "care_plus" }))).toBe(true);
    expect(shouldBypassNativeLaunchExperience(resolveNativeLaunchIntent({ intent: "booking_status" }))).toBe(true);
    expect(shouldBypassNativeLaunchExperience(resolveNativeLaunchIntent({ intent: "zooter_jobs" }))).toBe(true);
    expect(shouldBypassNativeLaunchExperience(resolveNativeLaunchIntent({}))).toBe(false);
  });

  it("preserves only safe booking context for voice booking handoff", () => {
    expect(
      buildNativeLaunchTarget("book", {
        access_code: "1234",
        area: "Rosebank",
        date: "2026-07-03",
        gate_code: "9999",
        service: "office",
      }),
    ).toBe("/book?intent=book_clean&service=office&date=2026-07-03&area=Rosebank");

    expect(
      buildNativeLaunchTarget("book", {
        area: "<script>",
        date: "tomorrow",
        service: "unknown",
      }),
    ).toBe("/book?intent=book_clean");

    const unsafeTarget = buildNativeLaunchTarget("book", {
      admin: "true",
      amount: "1",
      booking_id: "booking-1",
      payment_status: "paid",
      price: "1",
      provider_token: "token",
      role: "admin",
      service: "office",
    });

    expect(unsafeTarget).toBe("/book?intent=book_clean&service=office");
    expect(unsafeTarget).not.toContain("booking");
    expect(unsafeTarget).not.toContain("payment");
    expect(unsafeTarget).not.toContain("price");
    expect(unsafeTarget).not.toContain("token");
    expect(unsafeTarget).not.toContain("admin");
  });

  it("routes safe assistant surfaces to real Expo screens only", () => {
    expect(buildNativeLaunchTarget("concierge", {})).toBe("/concierge");
    expect(buildNativeLaunchTarget("care_plus", {})).toBe("/care-plus");
    expect(buildNativeLaunchTarget("bookings", {})).toBe("/bookings?intent=bookings");
    expect(buildNativeLaunchTarget("zooter_jobs", {})).toBe("/zooter/jobs?intent=zooter_jobs");
  });

  it("plays the launch animation only on a plain cold start", () => {
    const plain = resolveNativeLaunchIntent({});
    expect(shouldPlayLaunchAnimation({ intent: plain, launchMode: "motion" })).toBe(true);

    // Reduce Motion, Low Power and the force-static override all resolve to "static",
    // and none of them should get a 2.6-second animation at app start.
    expect(shouldPlayLaunchAnimation({ intent: plain, launchMode: "static" })).toBe(false);

    // A deep link is somewhere to arrive, not somewhere to be welcomed. Every intent
    // that bypasses the launch layer must bypass the animation too, or the flourish
    // plays over the top of the screen the link asked for.
    for (const params of [
      { intent: "book_clean" },
      { intent: "care_plus" },
      { intent: "booking_status" },
      { intent: "zooter_jobs" },
      { zootBot: "open" },
    ]) {
      const intent = resolveNativeLaunchIntent(params);
      expect(shouldBypassNativeLaunchExperience(intent)).toBe(true);
      expect(shouldPlayLaunchAnimation({ intent, launchMode: "motion" })).toBe(false);
    }
  });
});
