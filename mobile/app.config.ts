import type { ConfigContext, ExpoConfig } from 'expo/config';

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const isProduction = appEnv === 'production';
const isPreview = appEnv === 'preview' || appEnv === 'staging';
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? 'b4c6e0b8-e2e7-40c5-b259-3b34c79be30b';
const sentryOrg = process.env.SENTRY_ORG?.trim();
const sentryAuthToken = process.env.SENTRY_AUTH_TOKEN?.trim();
const sentryUploadPlugin: NonNullable<ExpoConfig['plugins']>[number] | null =
  sentryOrg && sentryAuthToken
    ? [
        '@sentry/react-native/expo',
        {
          organization: sentryOrg,
          project: process.env.SENTRY_MOBILE_PROJECT ?? 'zoot-mobile',
          url: 'https://sentry.io/',
        },
      ]
    : null;

const bundleId = isProduction ? 'za.co.zoothome.app' : 'za.co.zoothome.app.preview';
const appName = isProduction ? 'Xoot' : 'Xoot Preview';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'zoot',
  owner: process.env.EXPO_ACCOUNT_OWNER || undefined,
  version: process.env.ZOOT_MOBILE_VERSION ?? '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'zoot',
  userInterfaceStyle: 'light',
  runtimeVersion: {
    policy: 'appVersion',
  },
  updates: {
    url: `https://u.expo.dev/${easProjectId}`,
  },
  ios: {
    ...config.ios,
    bundleIdentifier: bundleId,
    supportsTablet: false,
    usesAppleSignIn: true,
    associatedDomains: [
      'applinks:xoot.co.za',
      ...(isPreview ? ['applinks:preview.xoot.co.za'] : []),
    ],
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSCameraUsageDescription: 'Xoot uses the camera only when you choose to upload service or verification photos.',
      NSPhotoLibraryUsageDescription: 'Xoot uses your photo library only when you choose to upload service or verification photos.',
      NSLocationWhenInUseUsageDescription:
        'Xoot uses your location only when you choose location-assisted address or arrival features.',
    },
  },
  android: {
    ...config.android,
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#f5f3f2',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [
          {
            scheme: 'https',
            host: 'xoot.co.za',
            pathPrefix: '/',
          },
          ...(isPreview
            ? [
                {
                  scheme: 'https',
                  host: 'preview.xoot.co.za',
                  pathPrefix: '/',
                },
              ]
            : []),
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
      {
        action: 'VIEW',
        data: [
          {
            scheme: 'zoot',
          },
        ],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
    permissions: ['POST_NOTIFICATIONS'],
    predictiveBackGestureEnabled: true,
  },
  web: {
    bundler: 'metro',
    output: 'static',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-web-browser',
    [
      'expo-notifications',
      {
        icon: './assets/images/android-icon-monochrome.png',
        color: '#151515',
        defaultChannel: 'zoot-service-updates',
      },
    ],
    [
      'expo-splash-screen',
      {
        // One colour, not a light/dark pair. `userInterfaceStyle` above pins the app to a
        // single scheme, and `expo prebuild` warns that combining the two stops the splash
        // working at all: "The existing userInterfaceStyle property is preventing splash
        // screen from working properly."
        //
        // Light, matching the UI kit, which is light-default with a `[data-theme="dark"]`
        // opt-in (ZD-024). The value is `--background` in `src/index.css` — the kit's
        // `surface-page`, `#F5F3F2`. If the app is ever relaxed to follow the system, add
        // the `dark:` variant back and drop `userInterfaceStyle` in the same change, and
        // move this colour with it — not one without the other.
        backgroundColor: '#f5f3f2',
        image: './assets/images/splash-icon.png',
        imageWidth: 128,
        android: {
          backgroundColor: '#f5f3f2',
          image: './assets/images/splash-icon.png',
          imageWidth: 128,
        },
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsVersion: '11.20.1',
      },
    ],
    './plugins/withXootAssistantIntents.cjs',
    // Microphone string, VoIP + audio background modes, and the seven Android call permissions.
    // Makes a dev build *capable* of in-app calling; it does not switch calling on. The feature
    // stays gated on `twilio.masked_voice` until someone has placed a real call on a device.
    './plugins/withXootVoiceCalling.cjs',
    ...(sentryUploadPlugin ? [sentryUploadPlugin] : []),
  ],
  extra: {
    eas: {
      projectId: easProjectId,
    },
    zoot: {
      appEnv,
      siteUrl: process.env.EXPO_PUBLIC_SITE_URL,
      supabaseProjectId: process.env.EXPO_PUBLIC_SUPABASE_PROJECT_ID,
      mapboxEnabled: Boolean(process.env.EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN),
      turnstileEnabled: Boolean(process.env.EXPO_PUBLIC_CLOUDFLARE_TURNSTILE_SITE_KEY),
    },
  },
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
});
