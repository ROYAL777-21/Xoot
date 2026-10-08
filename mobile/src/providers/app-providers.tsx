import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react-native';
import { useEffect, useState } from 'react';

import { mobileEnv } from '@/lib/env';
import { MobileAnalyticsProvider } from '@/lib/analytics';
import { scrubMobileSentryEvent } from '@/lib/monitoring-privacy';
import { AuthProvider, useAuth } from '@/providers/auth-provider';
import { NativeCoreDataProvider } from '@/components/native-core';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      retry: 2,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [sentryReady, setSentryReady] = useState(false);

  useEffect(() => {
    if (!mobileEnv.sentryDsn || sentryReady) return;
    Sentry.init({
      dsn: mobileEnv.sentryDsn,
      environment: mobileEnv.appEnv || 'development',
      enableNative: true,
      tracesSampleRate: mobileEnv.appEnv === 'production' ? 0.15 : 1,
      sendDefaultPii: false,
      beforeSend: scrubMobileSentryEvent,
    });
    setSentryReady(true);
  }, [sentryReady]);

  return (
    <QueryClientProvider client={queryClient}>
      <MobileAnalyticsProvider>
        <AuthProvider><NativeCoreSession>{children}</NativeCoreSession></AuthProvider>
      </MobileAnalyticsProvider>
    </QueryClientProvider>
  );
}

function NativeCoreSession({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  return <NativeCoreDataProvider key={user?.id ?? 'guest'}>{children}</NativeCoreDataProvider>;
}
