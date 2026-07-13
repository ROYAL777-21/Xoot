import { DarkTheme, DefaultTheme, Slot, ThemeProvider, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import AppTabs from '@/components/app-tabs';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppProviders } from '@/providers/app-providers';

SplashScreen.setOptions({
  duration: 650,
  fade: true,
});

export default function RootLayout() {
  const scheme = useColorScheme();
  const segments = useSegments();
  const isDark = scheme === 'dark';
  const isAuthRoute = segments[0] === 'auth';

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <AppProviders>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {isAuthRoute ? <Slot /> : <AppTabs />}
      </AppProviders>
    </ThemeProvider>
  );
}
