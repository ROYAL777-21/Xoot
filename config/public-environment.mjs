const allowedAppEnvironments = new Set(["development", "staging", "production"]);
const blockedSupabaseHosts = new Set(["preview.supabase.co", "preview.xoot.local"]);
const publicSecretNamePattern = /(?:SERVICE_ROLE|CLIENT_SECRET|AUTH_TOKEN|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET_KEY|API_SECRET)/i;
const allowedPublicSecretLikeNames = new Set(["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SENTRY_DSN"]);
const publicMapboxTokenNames = ["VITE_MAPBOX_PUBLIC_TOKEN", "VITE_MAPBOX_BROWSER_TOKEN"];
const publicPostHogTokenNames = ["VITE_POSTHOG_PROJECT_TOKEN"];

const text = (env, name) => {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
};

export const normaliseAppEnvironment = (value) => value?.trim().toLowerCase() ?? "";

export const deriveAppEnvironment = (env) => {
  const vercelEnvironment = text(env, "VERCEL_ENV").toLowerCase();
  if (vercelEnvironment) {
    return { value: vercelEnvironment === "production" ? "production" : "development", source: "VERCEL_ENV" };
  }

  const netlifyContext = text(env, "CONTEXT").toLowerCase();
  if (netlifyContext) {
    return { value: netlifyContext === "production" ? "production" : "development", source: "CONTEXT" };
  }

  return null;
};

export const getPublicEnvironmentDefaults = (defaults, appEnv) => {
  const name = normaliseAppEnvironment(appEnv);
  if (!name || name.startsWith("$")) return {};
  const block = defaults[name];
  return block && typeof block === "object" && !Array.isArray(block) ? block : {};
};

export const resolvePublicEnvironment = (input, defaults) => {
  const env = { ...input };
  const explicitAppEnv = normaliseAppEnvironment(text(env, "VITE_APP_ENV"));
  const derived = explicitAppEnv ? null : deriveAppEnvironment(env);
  const appEnv = explicitAppEnv || derived?.value || "";
  if (appEnv) env.VITE_APP_ENV = appEnv;

  const appliedDefaults = [];
  for (const [name, value] of Object.entries(getPublicEnvironmentDefaults(defaults, appEnv))) {
    if (!text(env, name)) {
      env[name] = value;
      appliedDefaults.push(name);
    }
  }

  return { env, derived, appliedDefaults };
};

export const isPlaceholderSupabaseUrl = (value) => {
  if (!value) return true;
  const normalized = value.toLowerCase();
  if (normalized.includes("preview") || normalized.includes("placeholder") || normalized.includes("your-project-ref")) return true;
  try {
    return blockedSupabaseHosts.has(new URL(value).hostname);
  } catch {
    return true;
  }
};

export const isPlaceholderSupabaseKey = (value) => {
  if (!value) return true;
  const normalized = value.toLowerCase();
  return (
    normalized === "preview-anon-key" ||
    normalized === "preview-local-anon-key" ||
    normalized.includes("your-supabase") ||
    normalized.includes("your-anon-key") ||
    normalized.includes("placeholder")
  );
};

export const isSupabasePublicConfigComplete = (env) => {
  const url = text(env, "VITE_SUPABASE_URL");
  const key = text(env, "VITE_SUPABASE_PUBLISHABLE_KEY");
  return Boolean(url && key && !isPlaceholderSupabaseUrl(url) && !isPlaceholderSupabaseKey(key));
};

export const getPublicSecretLeaks = (env) =>
  Object.keys(env)
    .filter((name) => name.startsWith("VITE_"))
    .filter((name) => publicSecretNamePattern.test(name) && !allowedPublicSecretLikeNames.has(name));

export const isUnsafePublicMapboxToken = (value) => (value?.trim() ?? "").startsWith("sk.");
export const getUnsafePublicMapboxTokenNames = (env) =>
  publicMapboxTokenNames.filter((name) => isUnsafePublicMapboxToken(text(env, name)));

export const isUnsafePublicPostHogToken = (value) => (value?.trim() ?? "").startsWith("phx_");
export const getUnsafePublicPostHogTokenNames = (env) =>
  publicPostHogTokenNames.filter((name) => isUnsafePublicPostHogToken(text(env, name)));

export const getPublicConfigIssue = (env, flags = {}) => {
  const appEnv = normaliseAppEnvironment(text(env, "VITE_APP_ENV"));
  const leaks = getPublicSecretLeaks(env);
  const unsafeMapboxTokens = getUnsafePublicMapboxTokenNames(env);
  const unsafePostHogTokens = getUnsafePublicPostHogTokenNames(env);

  if (leaks.length > 0) return `Public VITE_ variables cannot contain secret-like names: ${leaks.join(", ")}`;
  if (unsafeMapboxTokens.length > 0) {
    return `Mapbox secret tokens cannot be used in public VITE_ variables: ${unsafeMapboxTokens.join(", ")}. Use restricted public pk.* tokens instead.`;
  }
  if (unsafePostHogTokens.length > 0) {
    return `PostHog private API keys cannot be used in public VITE_ variables: ${unsafePostHogTokens.join(", ")}. Use the public phc_* project token only.`;
  }
  if (appEnv && !allowedAppEnvironments.has(appEnv)) {
    return "VITE_APP_ENV must be one of development, staging, or production.";
  }
  if (flags.ci && !appEnv) {
    return "CI builds must set VITE_APP_ENV explicitly. No host signal was found; checked VERCEL_ENV and CONTEXT. See docs/release/deploy-hosts.md.";
  }
  if (flags.prod && !appEnv) {
    return "VITE_APP_ENV is required for CI and production-mode builds.";
  }
  if (text(env, "VITE_ENABLE_DEMO_MODE") === "true") {
    return "VITE_ENABLE_DEMO_MODE is no longer supported. Configure real Supabase credentials instead.";
  }

  const hasSupabase = isSupabasePublicConfigComplete(env);
  const requiresRealSupabase = appEnv === "staging" || appEnv === "production" || flags.requireReal;
  if (requiresRealSupabase && !hasSupabase) {
    return "Builds require real VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values for staging and production.";
  }
  if (!hasSupabase && appEnv !== "development" && !flags.dev) {
    return "Runtime requires real VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values; placeholder Supabase mode is disabled.";
  }

  return null;
};

export const publicViteEnvironment = (env) =>
  Object.fromEntries(Object.entries(env).filter(([name, value]) => name.startsWith("VITE_") && typeof value === "string"));
