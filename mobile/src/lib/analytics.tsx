import type { ReactNode } from 'react';
import { PostHogProvider } from 'posthog-react-native';

import { mobileEnv } from '@/lib/env';

const posthogOptions = {
  host: mobileEnv.posthogHost || 'https://us.i.posthog.com',
  captureAppLifecycleEvents: false,
  enableSessionReplay: false,
  setDefaultPersonProperties: false,
  persistence: 'file' as const,
};

export function MobileAnalyticsProvider({ children }: { children: ReactNode }) {
  if (!mobileEnv.posthogProjectToken.startsWith('phc_')) return <>{children}</>;

  return (
    <PostHogProvider
      apiKey={mobileEnv.posthogProjectToken}
      options={posthogOptions}
      autocapture={false}
      debug={mobileEnv.appEnv === 'development'}
    >
      {children}
    </PostHogProvider>
  );
}
