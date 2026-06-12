type PublicEnvironment = Record<string, string | boolean | undefined>;

type RuntimeFlags = {
  prod?: boolean;
  dev?: boolean;
};

const allowedAppEnvironments = new Set(["development", "preview", "staging", "production"]);
const previewSupabaseHosts = new Set(["preview.supabase.co", "preview.zoot.local"]);
const publicSecretNamePattern = /(?:SERVICE_ROLE|CLIENT_SECRET|AUTH_TOKEN|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET_KEY|API_SECRET)/i;
const allowedPublicSecretLikeNames = new Set(["VITE_SUPABASE_PUBLISHABLE_KEY", "VITE_SENTRY_DSN"]);

const envText = (env: PublicEnvironment, name: string) => {
  const value = env[name];
  return typeof value === "string" ? value.trim() : "";
};

export const normaliseAppEnvironment = (value: string | undefined) => value?.trim().toLowerCase() ?? "";

export const isPlaceholderSupabaseUrl = (value?: string) => {
  if (!value) return true;
  if (value.includes("preview") || value.includes("placeholder") || value.includes("your-project-ref")) return true;

  try {
    return previewSupabaseHosts.has(new URL(value).hostname);
  } catch {
    return true;
  }
};

export const isPlaceholderSupabaseKey = (value?: string) =>
  !value ||
  value === "preview-anon-key" ||
  value === "preview-local-anon-key" ||
  value.includes("your-supabase") ||
  value.includes("your-anon-key") ||
  value.includes("placeholder");

export const isSupabasePublicConfigComplete = (env: PublicEnvironment) => {
  const supabaseUrl = envText(env, "VITE_SUPABASE_URL");
  const publishableKey = envText(env, "VITE_SUPABASE_PUBLISHABLE_KEY");
  return Boolean(supabaseUrl && publishableKey && !isPlaceholderSupabaseUrl(supabaseUrl) && !isPlaceholderSupabaseKey(publishableKey));
};

export const isDemoModeAllowedForEnv = (env: PublicEnvironment, flags: RuntimeFlags = {}) => {
  const appEnv = normaliseAppEnvironment(envText(env, "VITE_APP_ENV"));
  const explicitDemo = envText(env, "VITE_ENABLE_DEMO_MODE") === "true";
  return Boolean(flags.dev || appEnv === "development" || appEnv === "preview" || explicitDemo);
};

export const getPublicSecretLeaks = (env: PublicEnvironment) =>
  Object.keys(env)
    .filter((name) => name.startsWith("VITE_"))
    .filter((name) => publicSecretNamePattern.test(name) && !allowedPublicSecretLikeNames.has(name));

export const getPublicConfigIssueForEnv = (env: PublicEnvironment, flags: RuntimeFlags = {}) => {
  const appEnv = normaliseAppEnvironment(envText(env, "VITE_APP_ENV"));
  const isProdBuild = Boolean(flags.prod);
  const leaks = getPublicSecretLeaks(env);

  if (leaks.length > 0) {
    return `Public VITE_ variables cannot contain secret-like names: ${leaks.join(", ")}`;
  }

  if (appEnv && !allowedAppEnvironments.has(appEnv)) {
    return "VITE_APP_ENV must be one of development, preview, staging, or production.";
  }

  if (isProdBuild && !appEnv) {
    return "VITE_APP_ENV is required for production-mode builds so preview/demo mode cannot ship silently.";
  }

  if (appEnv === "production" && envText(env, "VITE_ENABLE_DEMO_MODE") === "true") {
    return "VITE_ENABLE_DEMO_MODE must not be true when VITE_APP_ENV=production.";
  }

  const hasSupabase = isSupabasePublicConfigComplete(env);
  if ((appEnv === "staging" || appEnv === "production") && !hasSupabase) {
    return "Staging and production require real VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY values.";
  }

  if (!hasSupabase && !isDemoModeAllowedForEnv(env, flags)) {
    return "Preview Supabase mode is only allowed in development, preview, or explicitly enabled demo mode.";
  }

  return null;
};

export const assertValidPublicConfig = () => {
  const issue = getPublicConfigIssueForEnv(import.meta.env, {
    prod: import.meta.env.PROD,
    dev: import.meta.env.DEV,
  });

  if (issue) throw new Error(`Zoot environment configuration error: ${issue}`);
};
