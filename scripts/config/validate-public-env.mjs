import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const allowedAppEnvironments = new Set(["development", "staging", "production"]);
const blockedSupabaseHosts = new Set(["preview.supabase.co", "preview.zoot.local"]);
const publicSecretNamePattern = /(?:SERVICE_ROLE|CLIENT_SECRET|AUTH_TOKEN|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET_KEY|API_SECRET)/i;
const allowedPublicSecretLikeNames = new Set(["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SENTRY_DSN"]);

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
  console.error(`Zoot environment configuration error: ${message}`);
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

const appEnv = text("VITE_APP_ENV").toLowerCase();
const leaks = Object.keys(env)
  .filter((name) => name.startsWith("VITE_"))
  .filter((name) => publicSecretNamePattern.test(name) && !allowedPublicSecretLikeNames.has(name));

if (leaks.length > 0) {
  fail(`public VITE_ variables cannot contain secret-like names: ${leaks.join(", ")}`);
}

if (appEnv && !allowedAppEnvironments.has(appEnv)) {
  fail("VITE_APP_ENV must be one of development, staging, or production.");
}

if (process.env.CI && !appEnv) {
  fail("CI builds must set VITE_APP_ENV explicitly.");
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

if ((process.env.CI || appEnv === "staging" || appEnv === "production") && !hasRealSupabase) {
  fail("builds require real VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values.");
}

console.log(`Zoot public environment check passed for ${appEnv || "local"}.`);
