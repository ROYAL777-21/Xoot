import { router } from 'expo-router';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { useAuth } from '@/providers/auth-provider';

export default function ZooterJobsScreen() {
  const { user } = useAuth();

  return (
    <ZootScreen>
      <LiquidCard>
        <Eyebrow>Zooter assistant handoff</Eyebrow>
        <Title>Zooter jobs open in the app.</Title>
        <Body muted>
          Siri and Android assistant shortcuts can bring Zooters here. Client addresses and access details are only
          revealed inside approved booking windows and logged sensitive-access flows.
        </Body>
        <StatusPill tone={user ? 'success' : 'neutral'}>
          {user ? 'Signed-in Zooter route' : 'Sign in required'}
        </StatusPill>
        {user ? (
          <PrimaryButton onPress={() => router.push('/concierge')}>Ask Concierge for job help</PrimaryButton>
        ) : (
          <PrimaryButton onPress={() => router.push('/account')}>Sign in as a Zooter</PrimaryButton>
        )}
        <SecondaryButton onPress={() => router.push('/')}>Back to Zoot</SecondaryButton>
      </LiquidCard>
    </ZootScreen>
  );
}
