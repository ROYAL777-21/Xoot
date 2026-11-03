import { describe, expect, it } from "vitest";
import { APPLE_AUTH_READINESS, isAppleSignInReady, type AppleAuthReadiness } from "./apple-auth-readiness";

const accepted: AppleAuthReadiness = { providerConfigured: true, webAccepted: true, iosSignedBuildAccepted: true, androidBrowserAccepted: true };
const surfaces = ["web", "ios", "android"] as const;
const acceptanceKeys = ["webAccepted", "iosSignedBuildAccepted", "androidBrowserAccepted"] as const;

describe("reviewed Apple surface readiness", () => {
  it.each(surfaces)("keeps %s closed in the current release", surface => {
    expect(isAppleSignInReady(surface)).toBe(false);
  });
  it.each(surfaces)("does not mistake acceptance alone for a configured %s provider", surface => {
    expect(isAppleSignInReady(surface, { ...accepted, providerConfigured: false })).toBe(false);
  });
  it.each(surfaces)("does not mistake provider enablement for %s acceptance", surface => {
    expect(isAppleSignInReady(surface, { providerConfigured: true, webAccepted: false, iosSignedBuildAccepted: false, androidBrowserAccepted: false })).toBe(false);
  });
  it.each(surfaces.map((surface, i) => [surface, acceptanceKeys[i]] as const))("opens only the independently accepted %s surface", (surface, key) => {
    const ready = { providerConfigured: true, webAccepted: false, iosSignedBuildAccepted: false, androidBrowserAccepted: false, [key]: true };
    expect(surfaces.filter(candidate => isAppleSignInReady(candidate, ready))).toEqual([surface]);
  });
  it("keeps unsupported platforms and malformed truthy configuration closed", () => {
    expect(isAppleSignInReady("windows", accepted)).toBe(false);
    expect(isAppleSignInReady("web", { ...accepted, providerConfigured: "true" } as unknown as AppleAuthReadiness)).toBe(false);
    expect(isAppleSignInReady("web", { ...accepted, webAccepted: "true" } as unknown as AppleAuthReadiness)).toBe(false);
    expect(Object.isFrozen(APPLE_AUTH_READINESS)).toBe(true);
  });
});
