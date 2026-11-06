/**
 * What `ALLOWED_ORIGINS` should be set to, derived from the code's own fallback list.
 *
 * Separated from the CLI so the derivation can be tested without running the Supabase CLI.
 *
 * The whole point is that this is **derived, never retyped**. `xoot.co.za` already exists in
 * `_shared/action-utils.ts`, in `.env.example`, and in the deployed bundles. A hardcoded fourth
 * copy here is exactly how the deployed functions ended up serving `xoothome.co.za` while the
 * repo said otherwise — see blocker.md. Change the array in `action-utils.ts` and these follow.
 */

/** Pull the string literals out of `defaultAllowedOrigins` in `_shared/action-utils.ts`. */
export function compiledOrigins(sharedSource) {
  const block = /export const defaultAllowedOrigins = \[([^\]]*)\]/.exec(String(sharedSource ?? ""));
  if (!block) throw new Error("could not find defaultAllowedOrigins");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

/**
 * Production takes the public origins, plus the native WebView origins.
 *
 * Setting this variable REPLACES the fallback list rather than extending it, so every entry
 * here is something production will accept. A developer machine is not that, which is why
 * the port-carrying loopback origins are filtered out rather than carried across.
 *
 * The WebView origins are kept on purpose (2026-11-06): the legacy Capacitor shell loads the
 * app from `https://localhost` (Android) / `zoot://localhost` (iOS), and the WebView sends
 * that as the Origin on every fetch. Without them here, the shell gets 403 on every Edge
 * Function call — the "Edge function returned a non-2xx code" failure mode. They are not
 * remotely reachable origins, and JWT auth is still required, so they widen nothing.
 */
const NATIVE_WEBVIEW_ORIGINS = [
  "https://localhost",
  "http://localhost",
  "capacitor://localhost",
  "zoot://localhost",
  "xoot://localhost",
];

export const productionValue = (origins) => {
  const entries = [...origins.filter((origin) => origin.startsWith("https://"))];
  for (const origin of NATIVE_WEBVIEW_ORIGINS) {
    if (!entries.includes(origin)) entries.push(origin);
  }
  return entries.join(",");
};

/**
 * Staging keeps the loopback origins, because that is what staging is for, and swaps the
 * public host for the staging one.
 */
export const stagingValue = (origins) => {
  const entries = [
    ...origins.filter((o) => o.startsWith("http://localhost") || o.startsWith("http://127.0.0.1")),
    "https://staging.xoot.co.za",
  ];
  for (const origin of NATIVE_WEBVIEW_ORIGINS) {
    if (!entries.includes(origin)) entries.push(origin);
  }
  return entries.join(",");
};

export const PROJECTS = { production: "mvlrkelahhsyjrwgsxaf", staging: "fxmxyabdjqviqbcxmvlp" };
