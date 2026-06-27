import type { ConfigContext, ExpoConfig } from 'expo/config';

const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? 'development';
const isProduction = appEnv === 'production';
const isPreview = appEnv === 'preview' || appEnv === 'staging';
const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? 'b4c6e0b8-e2e7-40c5-b259-3b34c79be30b';

const bundleId = isProduction ? 'za.co.zoothome.app' : 'za.co.zoothome.app.preview';
const appName = isProduction ? 'Zoot' : 'Zoot Preview';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'zoot',
  owner: process.env.EXPO_ACCOUNT_OWNER || undefined,
  version: process.env.ZOOT_MOBILE_VERSION ?? '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'zoot',
  userInterfaceStyle: 'dark',
  runtimeVersion: {
    policy: 'appVersion',
  },
  ios: {
    ...config.ios,
    bundleIdentifier: bundleId,
    supportsTablet: false,
    usesAppleSignIn: true,
    associatedDomains: [
      'applinks:zoothome.co.za',
      ...(isPreview ? ['applinks:preview.zoothome.co.za'] : []),
    ],
    config: {
      usesNonExemptEncryption: false,
    },
    infoPlist: {
      NSCameraUsageDescription: 'Zoot uses the camera only when you choose to upload service or verification photos.',
      NSPhotoLibraryUsageDescription: 'Zoot uses your photo library only when you choose to upload service or verification photos.',
      NSLocationWhenInUseUsageDescription:
        'Zoot uses your location only when you choose location-assisted address or arrival features.',
    },
  },
  android: {
    ...config.android,
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#0f1711',
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
            host: 'zoothome.co.za',
            pathPrefix: '/',
          },
          ...(isPreview
            ? [
                {
                  scheme: 'https',
                  host: 'preview.zoothome.co.za',
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
        color: '#d8b26e',
        defaultChannel: 'zoot-service-updates',
      },
    ],
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0f1711',
        image: './assets/images/splash-icon.png',
        imageWidth: 88,
        android: {
          image: './assets/images/splash-icon.png',
          imageWidth: 88,
        },
      },
    ],
    [
      '@rnmapbox/maps',
      {
        RNMapboxMapsVersion: '11.20.1',
      },
    ],
    [
      '@sentry/react-native/expo',
      {
        organization: process.env.SENTRY_ORG,
        project: process.env.SENTRY_MOBILE_PROJECT ?? 'zoot-mobile',
        url: 'https://sentry.io/',
      },
    ],
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
