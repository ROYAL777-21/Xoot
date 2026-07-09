import { DarkTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';

import AppTabs from '@/components/app-tabs';
import { AppProviders } from '@/providers/app-providers';

SplashScreen.setOptions({
  duration: 650,
  fade: true,
});

export default function TabLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <AppProviders>
        <StatusBar style="light" />
        <AppTabs />
      </AppProviders>
    </ThemeProvider>
  );
}
