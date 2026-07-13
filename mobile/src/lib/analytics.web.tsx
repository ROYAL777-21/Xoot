import type { ReactNode } from 'react';

// The browser product uses the React/Vite PostHog integration. Avoid bundling
// the native SDK into Expo web previews, where it would duplicate tracking.
export function MobileAnalyticsProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
