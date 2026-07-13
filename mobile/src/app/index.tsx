import { type Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { NativeLaunchExperience } from '@/components/native-launch-experience';
import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
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
    router.replace(launchTarget as Href);
  }, [bypassLaunch, launchTarget]);

  if (bypassLaunch) {
    return (
      <ZootScreen showConciergeLauncher={false}>
        <LiquidCard>
          <Eyebrow>Opening Zoot</Eyebrow>
          <Title>Your request is ready to continue.</Title>
          <Body muted>Complete the private details and final confirmation inside Zoot.</Body>
          <StatusPill tone="success">Opening securely</StatusPill>
        </LiquidCard>
      </ZootScreen>
    );
  }

  return (
    <ZootScreen showConciergeLauncher={false}>
      <NativeLaunchExperience
        onBook={(service) => router.push({ pathname: '/book', params: service ? { service } : {} })}
      />

      <LiquidCard>
        <Eyebrow>Your next clean</Eyebrow>
        <Title>{user ? 'Everything in one place.' : 'Make every visit easier.'}</Title>
        <Body muted>
          {user
            ? 'Upcoming bookings, arrival updates and support will appear here as soon as they are available.'
            : 'Sign in to save household preferences, manage bookings and receive private service updates.'}
        </Body>
        <StatusPill tone={user ? 'success' : 'neutral'}>
          {isLoading ? 'Checking your account' : user ? 'Account connected' : 'Guest access'}
        </StatusPill>
        {user ? (
          <PrimaryButton onPress={() => router.push('/bookings')}>View my bookings</PrimaryButton>
        ) : (
          <PrimaryButton onPress={() => router.push('/account')}>Sign in to Zoot</PrimaryButton>
        )}
      </LiquidCard>

      <LiquidCard>
        <Eyebrow>Care+</Eyebrow>
        <Title>A home-care rhythm that remembers.</Title>
        <Body muted>Keep preferences close, get priority support and review current membership benefits before joining.</Body>
        <SecondaryButton onPress={() => router.push('/care-plus')}>Join Care+ membership</SecondaryButton>
      </LiquidCard>
    </ZootScreen>
  );
}
