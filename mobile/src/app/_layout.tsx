import { DarkTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import AppTabs from '@/components/app-tabs';
import { AppProviders } from '@/providers/app-providers';

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
