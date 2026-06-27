const publicSecretNamePattern =
  /(?:SERVICE_ROLE|CLIENT_SECRET|AUTH_TOKEN|PRIVATE_KEY|WEBHOOK_SECRET|SIGNING_SECRET|SECRET_KEY|API_SECRET|OPENAI|TWILIO|BREVO|KIE|AIRTABLE|HOSTINGER|CLOUDFLARE|STITCH|OZOW)/i;

const allowedPublicSecretLikeNames = new Set([
  'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'EXPO_PUBLIC_SENTRY_DSN',
  'EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN',
  'EXPO_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY',
]);
const publicMapboxTokenNames = ['EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN', 'EXPO_PUBLIC_MAPBOX_TOKEN'];

const allowedEnvironments = new Set(['development', 'preview', 'staging', 'production']);

const text = (name: string) => process.env[name]?.trim() ?? '';

const isPlaceholder = (value: string) =>
  !value ||
  value.includes('your-project-ref') ||
  value.includes('your-publishable-key') ||
  value.includes('placeholder') ||
  value.includes('preview.supabase.co');

const fail = (message: string): never => {
  console.error(`[Zoot mobile config] ${message}`);
  process.exit(1);
  throw new Error(message);
};

const appEnv = text('EXPO_PUBLIC_APP_ENV') || 'development';
const publicLeaks = Object.keys(process.env)
  .filter((name) => name.startsWith('EXPO_PUBLIC_'))
  .filter((name) => publicSecretNamePattern.test(name) && !allowedPublicSecretLikeNames.has(name));

if (publicLeaks.length > 0) {
  fail(`public Expo variables cannot contain secret-like names: ${publicLeaks.join(', ')}`);
}

const unsafeMapboxTokens = publicMapboxTokenNames.filter((name) => text(name).startsWith('sk.'));
if (unsafeMapboxTokens.length > 0) {
  fail(`Mapbox secret tokens cannot be used in public EXPO_PUBLIC_ variables: ${unsafeMapboxTokens.join(', ')}. Use restricted public pk.* tokens instead.`);
}

if (!allowedEnvironments.has(appEnv)) {
  fail('EXPO_PUBLIC_APP_ENV must be one of development, preview, staging, or production.');
}

if (appEnv === 'preview' || appEnv === 'staging' || appEnv === 'production') {
  for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_SUPABASE_PROJECT_ID']) {
    if (isPlaceholder(text(name))) fail(`${name} must be a real value for ${appEnv} builds.`);
  }
}

if (appEnv === 'production' && !text('EXPO_PUBLIC_EAS_PROJECT_ID')) {
  fail('EXPO_PUBLIC_EAS_PROJECT_ID is required for production push notifications and EAS release tracing.');
}

console.log(`[Zoot mobile config] ${appEnv} configuration shape is valid.`);
