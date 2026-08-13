import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const read = (path: string) => readFileSync(join(repoRoot, path), "utf8");

describe("Phase 10 Siri and Android assistant readiness", () => {
  it("wires native assistant assets through the Expo prebuild config plugin", () => {
    const appConfig = read("mobile/app.config.ts");
    const plugin = read("mobile/plugins/withXootAssistantIntents.cjs");

    expect(appConfig).toContain("./plugins/withXootAssistantIntents.cjs");
    expect(plugin).toContain("android.app.shortcuts");
    expect(plugin).toContain("zoot_assistant_shortcuts.xml");
    expect(plugin).toContain("XootAppIntents.swift");
    expect(plugin).toContain("zoot_widget_mark_background.xml");
    expect(plugin).toContain("withXcodeProject");
  });

  it("keeps native assistant links on safe routes with no sensitive query names", () => {
    const swift = read("native/ios/XootLiveActivities/XootAppIntents.swift");
    const androidShortcuts = read("native/android/res/xml/shortcuts.xml");

    expect(swift).toContain("BookXootCleanerIntent");
    expect(swift).toContain("XootAssistantDeepLinkSafety");
    expect(swift).toContain("Confirm your address, time and payment inside the app");
    expect(swift).not.toMatch(/URLQueryItem\(name:\s*"(booking_id|address|gate_code|alarm_code|access_code|payment_reference|payment_status)"/);

    // Shortcut targets moved to `xoot://` with the 2026-08-13 rename (#34). The app still
    // registers `zoot://` so older links resolve, but anything Xoot itself emits uses the
    // current scheme — a shortcut is regenerated on every install, so there is nothing to
    // preserve here.
    expect(androidShortcuts).toContain("xoot://book?intent=book_clean");
    expect(androidShortcuts).toContain("xoot://bookings?intent=booking_status");
    expect(androidShortcuts).toContain("xoot://zooter/jobs?intent=zooter_jobs");
    expect(androidShortcuts).not.toContain("https://xoot.co.za");
  });

  it("has Expo route files for every assistant shortcut destination", () => {
    for (const path of [
      "mobile/src/app/book.tsx",
      "mobile/src/app/concierge.tsx",
      "mobile/src/app/care-plus.tsx",
      "mobile/src/app/bookings.tsx",
      "mobile/src/app/zooter/jobs.tsx",
    ]) {
      expect(existsSync(join(repoRoot, path)), `${path} should exist`).toBe(true);
    }
  });

  it("keeps native widgets free of realistic fake production data", () => {
    const swiftWidget = read("native/ios/XootLiveActivities/XootBookingSummaryWidget.swift");
    const androidWidget = read("native/android/src/main/java/za/co/xoot/widgets/XootStatusWidgetProvider.java");

    expect(swiftWidget).toContain("Live details stay inside Xoot");
    expect(swiftWidget).toContain("Open app");
    expect(swiftWidget).toContain("XootRoboticStarMark");
    expect(swiftWidget).not.toMatch(/\b(Nomsa|Hyde Park|R\d+|Thu\s+\d{2}:\d{2}|Friday)\b/);
    expect(androidWidget).toContain("Open Xoot for live booking status.");
    expect(androidWidget).not.toMatch(/\b(Nomsa|Hyde Park|R\d+|Thu\s+\d{2}:\d{2}|Friday)\b/);
  });

  it("keeps widget motion and liquid-glass assets explicit", () => {
    const motionDoc = read("docs/native/native-widget-motion-system.md");
    const glass = read("native/ios/XootLiveActivities/XootLiquidGlass.swift");
    const androidLayout = read("native/android/res/layout/zoot_status_widget.xml");

    expect(motionDoc).toContain("Figma motion board");
    expect(glass).toContain("XootRoboticStarMark");
    expect(glass).toContain("topTrailing");
    expect(androidLayout).toContain("zoot_widget_star");
    expect(androidLayout).toContain("zoot_widget_mark_background");
  });
});
