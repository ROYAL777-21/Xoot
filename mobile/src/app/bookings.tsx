import { router } from 'expo-router';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { useAuth } from '@/providers/auth-provider';

export default function BookingsScreen() {
  const { user } = useAuth();

  return (
    <ZootScreen>
      <LiquidCard>
        <Eyebrow>Siri / Gemini handoff</Eyebrow>
        <Title>Booking status opens inside Zoot.</Title>
        <Body muted>
          Voice assistants can open this safe route, but booking details, addresses, payment status and support history
          stay behind your signed-in Zoot account.
        </Body>
        <StatusPill tone={user ? 'success' : 'neutral'}>
          {user ? 'Authenticated booking surface' : 'Sign in required'}
        </StatusPill>
        {user ? (
          <PrimaryButton onPress={() => router.push('/concierge')}>Ask Concierge about a booking</PrimaryButton>
        ) : (
          <PrimaryButton onPress={() => router.push('/account')}>Sign in to view bookings</PrimaryButton>
        )}
        <SecondaryButton onPress={() => router.push('/book')}>Start a new booking</SecondaryButton>
      </LiquidCard>
    </ZootScreen>
  );
}
