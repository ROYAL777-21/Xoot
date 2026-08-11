import { DarkTheme, ThemeProvider, useGlobalSearchParams } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'react-native-reanimated';

import AppTabs from '@/components/app-tabs';
import { SplashAnimation } from '@/components/splash-animation';
import {
  getNativeLaunchMode,
  resolveNativeLaunchIntent,
  shouldPlayLaunchAnimation,
  type NativeLaunchQueryParams,
} from '@/lib/native-launch';
import { AppProviders } from '@/providers/app-providers';

/**
 * The native launch screen is held until the first frame is ready, then handed
 * straight to the animation — one continuous moment rather than a static mark, a
 * flash of app, and then a flourish.
 *
 * `duration: 0` because the fade is no longer wanted: the static mark and the first
 * frame of the animation are the same picture on the same background, so swapping
 * between them instantly is invisible, while fading would reveal the app underneath.
 */
SplashScreen.setOptions({ duration: 0, fade: false });

// Failing to hold it is not a reason to fail to start.
void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function TabLayout() {
  const params = useGlobalSearchParams();
  // Reanimated reads this synchronously from a cached value, so the decision is
  // available on the first render — `AccessibilityInfo.isReduceMotionEnabled()` is a
  // promise, and waiting on it would mean a frame of animation before deciding not
  // to animate.
  const launchMode = getNativeLaunchMode({ prefersReducedMotion: useReducedMotion() });

  const [playing, setPlaying] = useState(() =>
    shouldPlayLaunchAnimation({
      intent: resolveNativeLaunchIntent(params as NativeLaunchQueryParams),
      launchMode,
    }),
  );

  useEffect(() => {
    // Hand over on the next frame, so the app has painted behind the animation and
    // there is nothing to see underneath when it finishes.
    const id = requestAnimationFrame(() => {
      void SplashScreen.hideAsync().catch(() => {});
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const done = useCallback(() => setPlaying(false), []);

  return (
    <ThemeProvider value={DarkTheme}>
      <AppProviders>
        <StatusBar style="light" />
        <AppTabs />
        {playing ? <SplashAnimation onDone={done} /> : null}
      </AppProviders>
    </ThemeProvider>
  );
}
