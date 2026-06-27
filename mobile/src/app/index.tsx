import { router } from 'expo-router';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { mobileEnv } from '@/lib/env';
import { useAuth } from '@/providers/auth-provider';

export default function HomeScreen() {
  const { user, isLoading } = useAuth();

  return (
    <ZootScreen>
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
