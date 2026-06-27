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

const envText = (env: PublicEnvironment, name: string) => env[name]?.trim() ?? '';

export const mobileEnv = {
  appEnv: process.env.EXPO_PUBLIC_APP_ENV?.trim() || 'development',
  siteUrl: process.env.EXPO_PUBLIC_SITE_URL?.trim() ?? '',
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '',
  supabaseProjectId: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID?.trim() ?? '',
  easProjectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim() ?? '',
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? '',
  mapboxPublicToken: process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN?.trim() ?? '',
  cloudflareTurnstileSiteKey: process.env.EXPO_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY?.trim() ?? '',
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
  return token.startsWith('sk.');
};

export const getUnsafePublicMapboxTokenNames = (env: PublicEnvironment) =>
  publicMapboxTokenNames.filter((name) => isUnsafePublicMapboxToken(envText(env, name)));

export const getMobileConfigIssue = (env: PublicEnvironment = process.env) => {
  const appEnv = envText(env, 'EXPO_PUBLIC_APP_ENV') || 'development';
  const leaks = getPublicSecretLeaks(env);
  const unsafeMapboxTokens = getUnsafePublicMapboxTokenNames(env);

  if (leaks.length > 0) {
    return `Public EXPO_PUBLIC_ variables cannot contain secret-like names: ${leaks.join(', ')}`;
  }

  if (unsafeMapboxTokens.length > 0) {
    return `Mapbox secret tokens cannot be used in public EXPO_PUBLIC_ variables: ${unsafeMapboxTokens.join(', ')}. Use restricted public pk.* tokens instead.`;
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
  }

  if ((appEnv === 'preview' || appEnv === 'staging' || appEnv === 'production') && !envText(env, 'EXPO_PUBLIC_EAS_PROJECT_ID')) {
    return 'EXPO_PUBLIC_EAS_PROJECT_ID is required for preview/staging/production builds.';
  }

  return null;
};

export const assertValidMobileConfig = () => {
  const issue = getMobileConfigIssue();
  if (issue) throw new Error(`[Zoot mobile] ${issue}`);
};
