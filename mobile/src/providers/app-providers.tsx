import { useEffect, useRef } from 'react';

import { mobileEnv } from '@/lib/env';
import { MobileAnalyticsProvider } from '@/lib/analytics';
import { scrubMobileSentryEvent } from '@/lib/monitoring-privacy';
import { AuthProvider } from '@/providers/auth-provider';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const sentryReady = useRef(false);

  useEffect(() => {
    if (!mobileEnv.sentryDsn || sentryReady.current) return;

    let cancelled = false;
    const initializeSentry = async () => {
      try {
        const Sentry = await import('@sentry/react-native');
        if (cancelled || sentryReady.current) return;
        Sentry.init({
          dsn: mobileEnv.sentryDsn,
          environment: mobileEnv.appEnv || 'development',
          enableNative: true,
          tracesSampleRate: mobileEnv.appEnv === 'production' ? 0.15 : 1,
          sendDefaultPii: false,
          beforeSend: scrubMobileSentryEvent,
        });
        sentryReady.current = true;
      } catch (error) {
        console.warn('[Zoot mobile] Sentry initialisation failed.', error);
      }
    };

    void initializeSentry();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <MobileAnalyticsProvider>
      <AuthProvider>{children}</AuthProvider>
    </MobileAnalyticsProvider>
  );
}
