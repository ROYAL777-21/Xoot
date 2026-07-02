import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const read = (path: string) => readFileSync(join(repoRoot, path), "utf8");

describe("Phase 10 Siri and Android assistant readiness", () => {
  it("wires native assistant assets through the Expo prebuild config plugin", () => {
    const appConfig = read("mobile/app.config.ts");
    const plugin = read("mobile/plugins/withZootAssistantIntents.cjs");

    expect(appConfig).toContain("./plugins/withZootAssistantIntents.cjs");
    expect(plugin).toContain("android.app.shortcuts");
    expect(plugin).toContain("zoot_assistant_shortcuts.xml");
    expect(plugin).toContain("ZootAppIntents.swift");
    expect(plugin).toContain("withXcodeProject");
  });

  it("keeps native assistant links on safe routes with no sensitive query names", () => {
    const swift = read("native/ios/ZootLiveActivities/ZootAppIntents.swift");
    const androidShortcuts = read("native/android/res/xml/shortcuts.xml");

    expect(swift).toContain("BookZootCleanerIntent");
    expect(swift).toContain("ZootAssistantDeepLinkSafety");
    expect(swift).toContain("Confirm your address, time and payment inside the app");
    expect(swift).not.toMatch(/URLQueryItem\(name:\s*"(booking_id|address|gate_code|alarm_code|access_code|payment_reference|payment_status)"/);

    expect(androidShortcuts).toContain("zoot://book?intent=book_clean");
    expect(androidShortcuts).toContain("zoot://bookings?intent=booking_status");
    expect(androidShortcuts).toContain("zoot://zooter/jobs?intent=zooter_jobs");
    expect(androidShortcuts).not.toContain("https://zoothome.co.za");
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
    const swiftWidget = read("native/ios/ZootLiveActivities/ZootBookingSummaryWidget.swift");
    const androidWidget = read("native/android/src/main/java/za/co/zoothome/widgets/ZootStatusWidgetProvider.java");

    expect(swiftWidget).toContain("Live details stay inside Zoot");
    expect(swiftWidget).toContain("Open app");
    expect(swiftWidget).not.toMatch(/\b(Nomsa|Hyde Park|R\d+|Thu\s+\d{2}:\d{2}|Friday)\b/);
    expect(androidWidget).toContain("Open Zoot for live booking status.");
    expect(androidWidget).not.toMatch(/\b(Nomsa|Hyde Park|R\d+|Thu\s+\d{2}:\d{2}|Friday)\b/);
  });
});
