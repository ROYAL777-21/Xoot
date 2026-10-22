type PublicEnvironment = Record<string, string | undefined>;

const allowedAppEnvironments = new Set(['development', 'preview', 'staging', 'production']);
const publicSecretNamePattern =
  /(?:SERVICE_ROLE|CLIENT_SECRET|AUTH_TOKEN|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET_KEY|API_SECRET|OPENAI|TWILIO|BREVO|KIE|AIRTABLE|HOSTINGER|CLOUDFLARE|STITCH|OZOW)/i;
const allowedPublicSecretLikeNames = new Set([
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN',
  'EXPO_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY',
]);
const publicMapboxTokenNames = ['EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN', 'EXPO_PUBLIC_MAPBOX_TOKEN'];
const publicPostHogTokenNames = ['EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN'];

const envText = (env: PublicEnvironment, name: string) => env[name]?.trim() ?? '';

const getSupabaseHostedProjectRef = (value?: string) => {
  try {
    const host = new URL(value ?? '').hostname;
    return /^([a-z0-9]{20})\.supabase\.co$/i.exec(host)?.[1] ?? '';
  } catch {
    return '';
  }
};

export const mobileEnv = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV?.trim() || 'development',
  siteUrl: process.env.EXPO_PUBLIC_SITE_URL?.trim() ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
  supabaseProjectId: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID?.trim() ?? '',
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '',
  mapboxPublicToken: process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN?.trim() ?? '',
  mapboxAddressSuggestionsEnabled: process.env.EXPO_PUBLIC_MAPBOX_ADDRESS_SUGGESTIONS_ENABLED === 'true',
  cloudflareTurnstileSiteKey: process.env.EXPO_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ?? '',
  posthogProjectToken: process.env.EXPO_PUBLIC_POSTHOG_PROJECT_TOKEN?.trim() ?? '',
  posthogHost: process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() || 'https://us.i.posthog.com',
};

export const isPlaceholderValue = (value?: string) =>
  !value ||
  value.includes('your-project-ref') ||
  value.includes('your-publishable-key') ||
  value.includes('placeholder') ||
  value.includes('preview.supabase.co');

export const getPublicSecretLeaks = (env: PublicEnvironment) =>
  Object.keys(env)
    .filter((name) => name.startsWith('EXPO_PUBLIC_'))
    .filter((name) => publicSecretNamePattern.test(name) && !allowedPublicSecretLikeNames.has(name));

export const isUnsafePublicMapboxToken = (value?: string) => {
  const token = value?.trim() ?? '';
  return Boolean(token) && !token.startsWith('pk.');
};

export const getUnsafePublicMapboxTokenNames = (env: PublicEnvironment) =>
  publicMapboxTokenNames.filter((name) => isUnsafePublicMapboxToken(envText(env, name)));

export const isUnsafePublicPostHogToken = (value?: string) => {
  const token = value?.trim() ?? '';
  return token.startsWith('phx_');
};

export const getUnsafePublicPostHogTokenNames = (env: PublicEnvironment) =>
  publicPostHogTokenNames.filter((name) => isUnsafePublicPostHogToken(envText(env, name)));

export const getMobileConfigIssue = (env: PublicEnvironment = process.env) => {
  const appEnv = envText(env, 'EXPO_PUBLIC_APP_ENV') || 'development';
  const leaks = getPublicSecretLeaks(env);
  const unsafeMapboxTokens = getUnsafePublicMapboxTokenNames(env);
  const unsafePostHogTokens = getUnsafePublicPostHogTokenNames(env);

  if (leaks.length > 0) {
    return `Public EXPO_PUBLIC_ variables cannot contain secret-like names: ${leaks.join(', ')}`;
  }

  if (unsafeMapboxTokens.length > 0) {
    return `Mapbox values in public EXPO_PUBLIC_ variables must use restricted public pk.* tokens, not secret or malformed tokens: ${unsafeMapboxTokens.join(', ')}.`;
  }

  if (unsafePostHogTokens.length > 0) {
    return `PostHog private API keys cannot be used in public EXPO_PUBLIC_ variables: ${unsafePostHogTokens.join(', ')}. Use the public phc_* project token only.`;
  }

  if (!allowedAppEnvironments.has(appEnv)) {
    return 'EXPO_PUBLIC_APP_ENV must be one of development, preview, staging, or production.';
  }

  if (appEnv === 'preview' || appEnv === 'staging' || appEnv === 'production') {
    for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_SUPABASE_PROJECT_ID']) {
      if (isPlaceholderValue(envText(env, name))) {
        return `${name} must be set to a real Supabase value. Placeholder Supabase mode is disabled for ${appEnv}.`;
      }
    }

    const supabaseProjectId = envText(env, 'EXPO_PUBLIC_SUPABASE_PROJECT_ID');
    const supabaseUrlRef = getSupabaseHostedProjectRef(envText(env, 'EXPO_PUBLIC_SUPABASE_URL'));
    if (!supabaseUrlRef) {
      return 'EXPO_PUBLIC_SUPABASE_URL must be a valid hosted Supabase project URL for preview/staging/production builds.';
    }

    if (supabaseUrlRef !== supabaseProjectId) {
      return 'EXPO_PUBLIC_SUPABASE_PROJECT_ID must match the project ref in EXPO_PUBLIC_SUPABASE_URL.';
    }
  }

  if ((appEnv === 'preview' || appEnv === 'staging' || appEnv === 'production') && !envText(env, 'EXPO_PUBLIC_EAS_PROJECT_ID')) {
    return 'EXPO_PUBLIC_EAS_PROJECT_ID is required for preview/staging/production builds.';
  }

  // Store builds must not silently replace the advertised map with a fallback.
  // Preview/development deliberately allow a missing token so other journeys remain testable.
  if (appEnv === 'production' && !envText(env, 'EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN')) {
    return 'EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN is required for a production native build. Use a public pk.* token without browser-only URL restrictions.';
  }

  return null;
};

export const assertValidMobileConfig = () => {
  const issue = getMobileConfigIssue();
  if (issue) throw new Error(`[Xoot mobile] ${issue}`);
};
