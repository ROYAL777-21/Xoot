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
 * Production takes the public origins only.
 *
 * Setting this variable REPLACES the fallback list rather than extending it, so every entry
 * here is something production will accept from a browser. A developer machine is not that,
 * which is why localhost is filtered out rather than carried across.
 */
export const productionValue = (origins) =>
  origins.filter((origin) => origin.startsWith("https://")).join(",");

/**
 * Staging keeps the loopback origins, because that is what staging is for, and swaps the
 * public host for the staging one.
 */
export const stagingValue = (origins) =>
  [
    ...origins.filter((o) => o.startsWith("http://localhost") || o.startsWith("http://127.0.0.1")),
    "https://staging.xoot.co.za",
    "http://127.0.0.1:4199",
    "https://xoot-git-codex-xoot-production-20260911-royal777-21s-projects.vercel.app",
  ].join(",");

export const PROJECTS = { production: "mvlrkelahhsyjrwgsxaf", staging: "fxmxyabdjqviqbcxmvlp" };
