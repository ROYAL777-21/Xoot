import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const allowedAppEnvironments = new Set(["development", "staging", "production"]);
const blockedSupabaseHosts = new Set(["preview.supabase.co", "preview.xoot.local"]);
const publicSecretNamePattern = /(?:SERVICE_ROLE|CLIENT_SECRET|AUTH_TOKEN|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET_KEY|API_SECRET)/i;
const allowedPublicSecretLikeNames = new Set(["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SENTRY_DSN"]);
const publicMapboxTokenNames = ["VITE_MAPBOX_PUBLIC_TOKEN", "VITE_MAPBOX_BROWSER_TOKEN"];
const publicPostHogTokenNames = ["VITE_POSTHOG_PROJECT_TOKEN"];

const parseEnvFile = (filename) => {
  const file = join(ROOT, filename);
  if (!existsSync(file)) return {};

  const parsed = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator <= 0) continue;
    const name = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    parsed[name] = value;
  }
  return parsed;
};

const env = {
  ...parseEnvFile(".env"),
  ...parseEnvFile(".env.local"),
  ...process.env,
};

const text = (name) => String(env[name] ?? "").trim();
const fail = (message) => {
  console.error(`Xoot environment configuration error: ${message}`);
  process.exit(1);
};

const isPlaceholderSupabaseUrl = (value) => {
  if (!value) return true;
  if (value.includes("preview") || value.includes("placeholder") || value.includes("your-project-ref")) return true;
  try {
    return blockedSupabaseHosts.has(new URL(value).hostname);
  } catch {
    return true;
  }
};

const isPlaceholderSupabaseKey = (value) =>
  !value ||
  value === "preview-anon-key" ||
  value === "preview-local-anon-key" ||
  value.includes("your-supabase") ||
  value.includes("your-anon-key") ||
  value.includes("placeholder");

/*
 * ── Derive the environment from the host, when the host actually knows ──────────────────────────
 *
 * ⚠️ This guard has now failed a build on THREE separate hosts: GitHub Actions, then Netlify, then
 * Vercel (2026-09-01, commit 950dc5d, `main`). Each time the fix was written into that one host's
 * config file — so the next host walked into the identical hole. A per-host fix cannot stop a
 * per-host bug.
 *
 * Every CI host that builds a site already knows which environment it is building; it just spells
 * it differently. Reading that signal is not a weakening of the guard — the guard exists so a build
 * never runs without knowing which environment it is, and the host's own variable answers that
 * question authoritatively. What is still refused is *guessing*: with no signal, it fails.
 *
 * A preview NEVER derives `production`. That would point branch code at the production Supabase
 * project, and is the reason `netlify.toml` chose `development` for previews by hand.
 */
const hostEnvironmentSignals = [
  // Vercel sets both CI=1 and VERCEL_ENV (production | preview | development) on every build.
  // https://vercel.com/docs/environment-variables/system-environment-variables
  { host: "Vercel", variable: "VERCEL_ENV", productionValue: "production" },
  // Netlify sets CONTEXT (production | deploy-preview | branch-deploy | dev). netlify.toml sets
  // VITE_APP_ENV explicitly, so this is a fallback that should never fire there — it exists so a
  // context added to the Netlify UI rather than the file still builds.
  { host: "Netlify", variable: "CONTEXT", productionValue: "production" },
];

const deriveAppEnv = () => {
  for (const signal of hostEnvironmentSignals) {
    const raw = String(process.env[signal.variable] ?? "").trim().toLowerCase();
    if (!raw) continue;
    return {
      ...signal,
      raw,
      value: raw === signal.productionValue ? "production" : "development",
    };
  }
  return null;
};

let appEnv = text("VITE_APP_ENV").toLowerCase();
let derived = null;

if (!appEnv) {
  derived = deriveAppEnv();
  if (derived) appEnv = derived.value;
}
const leaks = Object.keys(env)
  .filter((name) => name.startsWith("VITE_"))
  .filter((name) => publicSecretNamePattern.test(name) && !allowedPublicSecretLikeNames.has(name));

if (leaks.length > 0) {
  fail(`public VITE_ variables cannot contain secret-like names: ${leaks.join(", ")}`);
}

const unsafeMapboxTokens = publicMapboxTokenNames.filter((name) => text(name).startsWith("sk."));
if (unsafeMapboxTokens.length > 0) {
  fail(`Mapbox secret tokens cannot be used in public VITE_ variables: ${unsafeMapboxTokens.join(", ")}. Use restricted public pk.* tokens instead.`);
}

const unsafePostHogTokens = publicPostHogTokenNames.filter((name) => text(name).startsWith("phx_"));
if (unsafePostHogTokens.length > 0) {
  fail(`PostHog private API keys cannot be used in public VITE_ variables: ${unsafePostHogTokens.join(", ")}. Use the public phc_* project token only.`);
}

if (appEnv && !allowedAppEnvironments.has(appEnv)) {
  fail("VITE_APP_ENV must be one of development, staging, or production.");
}

if (process.env.CI && !appEnv) {
  fail(
    "CI builds must set VITE_APP_ENV explicitly.\n" +
      `  Accepted values: ${[...allowedAppEnvironments].join(", ")}.\n` +
      "  No host signal was found either — checked " +
      `${hostEnvironmentSignals.map((s) => `${s.variable} (${s.host})`).join(", ")}.\n` +
      "  Set VITE_APP_ENV in this host's build environment. See docs/release/deploy-hosts.md.",
  );
}

if (text("VITE_ENABLE_DEMO_MODE") === "true") {
  fail("VITE_ENABLE_DEMO_MODE is no longer supported. Configure real Supabase credentials instead.");
}

const hasRealSupabase = Boolean(
  text("VITE_SUPABASE_URL") &&
    text("VITE_SUPABASE_PUBLISHABLE_KEY") &&
    !isPlaceholderSupabaseUrl(text("VITE_SUPABASE_URL")) &&
    !isPlaceholderSupabaseKey(text("VITE_SUPABASE_PUBLISHABLE_KEY")),
);

const requiresRealSupabase =
  appEnv === "staging" ||
  appEnv === "production" ||
  text("XOOT_REQUIRE_REAL_PUBLIC_ENV") === "true";

if (requiresRealSupabase && !hasRealSupabase) {
  /*
   * This is the SECOND gate, and it is the one a host hits immediately after the first is fixed.
   * Deriving `production` from the host above makes this fire where it previously could not, so
   * the message has to say what to do rather than only what is wrong — otherwise fixing gate one
   * just moves the confusion along by one build.
   *
   * It is deliberately NOT auto-satisfiable. A production site built without real Supabase values
   * is a shell that cannot sign anyone in or take a booking, and it would deploy green.
   */
  fail(
    "staging and production builds require real VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values.\n" +
      `  VITE_APP_ENV is "${appEnv}"${derived ? ` (derived from ${derived.variable}="${derived.raw}" on ${derived.host})` : ""}, which requires them.\n` +
      "  Both are PUBLIC values that already ship inside the client bundle — this is not secrecy.\n" +
      "  Set them in the host's environment settings, not in this repo. See docs/release/deploy-hosts.md §2.",
  );
}

if (process.env.CI && !requiresRealSupabase && !hasRealSupabase) {
  console.warn(
    "Xoot environment warning: CI is running code checks without deploy Supabase config. Runtime still fails loudly until real public Supabase values are set.",
  );
}

const provenance = derived
  ? ` (derived from ${derived.variable}="${derived.raw}" on ${derived.host})`
  : "";
console.log(`Xoot public environment check passed for ${appEnv || "local"}${provenance}.`);
