export type AppleAuthReadiness = Readonly<{
  providerConfigured: boolean;
  webAccepted: boolean;
  iosSignedBuildAccepted: boolean;
  androidBrowserAccepted: boolean;
}>;

/**
 * Reviewed release evidence, not an OS capability or an auth-provider enable switch.
 * Change only after the configured provider and the relevant surface have passed
 * real acceptance. A platform being capable of displaying Apple's UI is insufficient.
 * See docs/release/evidence/2026-11-02/apple-auth-readiness.md before opening a surface.
 */
export const APPLE_AUTH_READINESS: AppleAuthReadiness = Object.freeze({
  providerConfigured: false,
  webAccepted: false,
  iosSignedBuildAccepted: false,
  androidBrowserAccepted: false,
});

export function isAppleSignInReady(surface: string, readiness = APPLE_AUTH_READINESS): boolean {
  if (readiness.providerConfigured !== true) return false;
  if (surface === "web") return readiness.webAccepted === true;
  if (surface === "ios") return readiness.iosSignedBuildAccepted === true;
  if (surface === "android") return readiness.androidBrowserAccepted === true;
  return false;
}
