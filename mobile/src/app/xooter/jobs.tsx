import { router } from 'expo-router';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, XootScreen } from '@/components/xoot-ui';
import { useAuth } from '@/providers/auth-provider';

export default function XooterJobsScreen() {
  const { user } = useAuth();

  return (
    <XootScreen>
      <LiquidCard>
        <Eyebrow>Xooter assistant handoff</Eyebrow>
        <Title>Xooter jobs open in the app.</Title>
        <Body muted>
          Siri and Android assistant shortcuts can bring Xooters here. Client addresses and access details are only
          revealed inside approved booking windows and logged sensitive-access flows.
        </Body>
        <StatusPill tone={user ? 'success' : 'neutral'}>
          {user ? 'Signed-in Xooter route' : 'Sign in required'}
        </StatusPill>
        {user ? (
          <PrimaryButton onPress={() => router.push('/concierge')}>Ask Concierge for job help</PrimaryButton>
        ) : (
          <PrimaryButton onPress={() => router.push('/account')}>Sign in as a Xooter</PrimaryButton>
        )}
        <SecondaryButton onPress={() => router.push('/')}>Back to Xoot</SecondaryButton>
      </LiquidCard>
    </XootScreen>
  );
}
