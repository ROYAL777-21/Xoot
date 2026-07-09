import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { NativeLaunchExperience } from '@/components/native-launch-experience';
import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { mobileEnv } from '@/lib/env';
import {
  buildNativeLaunchTarget,
  type NativeLaunchQueryParams,
  resolveNativeLaunchIntent,
  shouldBypassNativeLaunchExperience,
} from '@/lib/native-launch';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const { user, isLoading } = useAuth();
  const params = useLocalSearchParams();
  const launchParams = params as NativeLaunchQueryParams;
  const nativeLaunchIntent = resolveNativeLaunchIntent(launchParams);
  const bypassLaunch = shouldBypassNativeLaunchExperience(nativeLaunchIntent);
  const launchTarget = buildNativeLaunchTarget(nativeLaunchIntent, launchParams);

  useEffect(() => {
    if (!bypassLaunch) return;
    router.replace(launchTarget);
  }, [bypassLaunch, launchTarget]);

  if (bypassLaunch) {
    return (
      <ZootScreen>
        <LiquidCard>
          <Eyebrow>Opening Zoot</Eyebrow>
          <Title>Taking you to the right place.</Title>
          <Body muted>Voice and urgent app links skip the launch layer and open the protected Zoot route.</Body>
          <StatusPill tone="success">Safe handoff</StatusPill>
        </LiquidCard>
      </ZootScreen>
    );
  }

  return (
    <ZootScreen>
      <NativeLaunchExperience onBook={() => router.push('/book')} onConcierge={() => router.push('/concierge')} />

      <LiquidCard>
        <Eyebrow>Zoot mobile</Eyebrow>
        <Title>Premium home care, ready for native launch.</Title>
        <Body muted>
          Book, manage Care+, speak to Zoot Concierge, and keep sensitive home details inside the authenticated Zoot app.
        </Body>
        <StatusPill tone={user ? 'success' : 'neutral'}>
          {isLoading ? 'Checking session' : user ? 'Signed in' : 'Guest mode'}
        </StatusPill>
        <PrimaryButton onPress={() => router.push('/book')}>Book a clean</PrimaryButton>
        <SecondaryButton onPress={() => router.push('/concierge')}>Ask Zoot Concierge</SecondaryButton>
      </LiquidCard>

      <LiquidCard>
        <Eyebrow>Release guard</Eyebrow>
        <Body>
          Environment: {mobileEnv.appEnv || 'not set'}. Mobile production builds require real Supabase public config, EAS project ID, store credentials, and server-side Edge Function secrets.
        </Body>
        <Body muted>
          Payment success, masked calling, email, AI support, and admin operations stay behind Supabase Edge Functions.
        </Body>
      </LiquidCard>
    </ZootScreen>
  );
}
