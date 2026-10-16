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

const allowedEnvironments = new Set(['development', 'preview', 'staging', 'production']);

const text = (name: string) => process.env[name]?.trim() ?? '';

const getSupabaseHostedProjectRef = (value: string) => {
  try {
    const host = new URL(value).hostname;
    return /^([a-z0-9]{20})\.supabase\.co$/i.exec(host)?.[1] ?? '';
  } catch {
    return '';
  }
};

const isPlaceholder = (value: string) =>
  !value ||
  value.includes('your-project-ref') ||
  value.includes('your-publishable-key') ||
  value.includes('placeholder') ||
  value.includes('preview.supabase.co');

const fail = (message: string): never => {
  console.error(`[Xoot mobile config] ${message}`);
  process.exit(1);
  throw new Error(message);
};

/*
 * ── The web bug's silent twin ───────────────────────────────────────────────────────────────────
 *
 * `EXPO_PUBLIC_APP_ENV` used to fall back to `'development'` whenever it was unset. On a laptop
 * that is right. On EAS it was dangerous, because `eas.json` sets `"environment": "production"` —
 * which selects which EAS *environment variables* to load, and has nothing to do with this value.
 *
 * So a `--profile production` store build with `EXPO_PUBLIC_APP_ENV` unset in the EAS environment
 * evaluated as `development`, which skips every real-Supabase assertion below. It would not fail.
 * It would build, sign, and submit an app pointing at nothing.
 *
 * That is strictly worse than the web failure that prompted this: the web one was loud and stopped
 * the deploy; this one is silent and reaches the App Store. Same root cause both times — the build
 * host knows which environment it is and nobody asked it.
 *
 * EAS sets `EAS_BUILD=true` and `EAS_BUILD_PROFILE` to the profile name on every build.
 * https://docs.expo.dev/build-reference/variables/
 */
const easProfileEnvironments: Record<string, string> = {
  production: 'production',
  preview: 'preview',
  'preview-simulator': 'preview',
  development: 'development',
};

const deriveAppEnv = () => {
  const profile = text('EAS_BUILD_PROFILE');
  if (!profile) return '';
  const derived = easProfileEnvironments[profile];
  if (!derived) {
    fail(
      `EAS_BUILD_PROFILE="${profile}" is not a profile this script knows. ` +
        `Add it to easProfileEnvironments, or set EXPO_PUBLIC_APP_ENV explicitly for that profile.`,
    );
  }
  return derived;
};

const explicitAppEnv = text('EXPO_PUBLIC_APP_ENV');
const derivedAppEnv = explicitAppEnv ? '' : deriveAppEnv();
const appEnv = explicitAppEnv || derivedAppEnv || 'development';
if (text('EAS_BUILD_PROFILE') === 'production' && appEnv !== 'production') {
  fail('EAS production builds must set EXPO_PUBLIC_APP_ENV=production, not preview or development.');
}
const publicLeaks = Object.keys(process.env)
  .filter((name) => name.startsWith('EXPO_PUBLIC_'))
  .filter((name) => publicSecretNamePattern.test(name) && !allowedPublicSecretLikeNames.has(name));

if (publicLeaks.length > 0) {
  fail(`public Expo variables cannot contain secret-like names: ${publicLeaks.join(', ')}`);
}

const unsafeMapboxTokens = publicMapboxTokenNames.filter((name) => Boolean(text(name)) && !text(name).startsWith('pk.'));
if (unsafeMapboxTokens.length > 0) {
  fail(`Mapbox values in public EXPO_PUBLIC_ variables must use restricted public pk.* tokens, not secret or malformed tokens: ${unsafeMapboxTokens.join(', ')}.`);
}

const unsafePostHogTokens = publicPostHogTokenNames.filter((name) => text(name).startsWith('phx_'));
if (unsafePostHogTokens.length > 0) {
  fail(`PostHog private API keys cannot be used in public EXPO_PUBLIC_ variables: ${unsafePostHogTokens.join(', ')}. Use the public phc_* project token only.`);
}

if (!allowedEnvironments.has(appEnv)) {
  fail('EXPO_PUBLIC_APP_ENV must be one of development, preview, staging, or production.');
}

if (appEnv === 'preview' || appEnv === 'staging' || appEnv === 'production') {
  for (const name of ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'EXPO_PUBLIC_SUPABASE_PROJECT_ID']) {
    if (isPlaceholder(text(name))) fail(`${name} must be a real value for ${appEnv} builds.`);
  }

  const supabaseProjectId = text('EXPO_PUBLIC_SUPABASE_PROJECT_ID');
  const supabaseUrlRef = getSupabaseHostedProjectRef(text('EXPO_PUBLIC_SUPABASE_URL'));
  if (!supabaseUrlRef) {
    fail('EXPO_PUBLIC_SUPABASE_URL must be a valid hosted Supabase project URL for preview/staging/production builds.');
  }

  if (supabaseUrlRef !== supabaseProjectId) {
    fail('EXPO_PUBLIC_SUPABASE_PROJECT_ID must match the project ref in EXPO_PUBLIC_SUPABASE_URL.');
  }
}

if (appEnv === 'production' && !text('EXPO_PUBLIC_EAS_PROJECT_ID')) {
  fail('EXPO_PUBLIC_EAS_PROJECT_ID is required for production push notifications and EAS release tracing.');
}

if (appEnv === 'production' && !text('EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN')) {
  fail('EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN is required for a production native build. Use a public pk.* token without browser-only URL restrictions.');
}

const provenance = derivedAppEnv ? ` (derived from EAS_BUILD_PROFILE="${text('EAS_BUILD_PROFILE')}")` : '';
console.log(`[Xoot mobile config] ${appEnv} configuration shape is valid${provenance}.`);
