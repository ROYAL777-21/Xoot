import { describe, expect, it } from "vitest";

import {
  buildNativeLaunchTarget,
  getNativeLaunchMode,
  nativeLaunchAssets,
  resolveNativeLaunchIntent,
  shouldBypassNativeLaunchExperience,
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
  });
});
