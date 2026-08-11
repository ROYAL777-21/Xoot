import { router, useLocalSearchParams } from 'expo-router';

import { ServiceAreaMap } from '@/components/service-area-map';
import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, XootScreen } from '@/components/zoot-ui';
import { useAuth } from '@/providers/auth-provider';

export default function BookScreen() {
  const { user } = useAuth();
  const params = useLocalSearchParams<{ intent?: string; service?: string; date?: string; area?: string }>();
  const serviceLabel = serviceLabels[String(params.service ?? '')] ?? 'cleaning';
  const requestedDate = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : null;
  const assistantStarted = params.intent === 'book_clean' || Boolean(params.service || requestedDate || params.area);

  return (
    <XootScreen>
      {assistantStarted ? (
        <LiquidCard>
          <Eyebrow>Siri / Gemini handoff</Eyebrow>
          <Title>Voice booking started.</Title>
          <Body muted>
            Xoot opened a {serviceLabel} request{requestedDate ? ` for ${requestedDate}` : ''}. Confirm your address,
            arrival time, Xooter and payment inside the app so private household and payment data stay protected.
          </Body>
          <StatusPill tone="success">Safe app confirmation required</StatusPill>
        </LiquidCard>
      ) : null}

      <LiquidCard>
        <Eyebrow>Booking</Eyebrow>
        <Title>Start with a server-priced booking.</Title>
        <Body muted>
          The mobile app will create booking drafts through Supabase Edge Functions. Payment provider callbacks, not app screens, confirm payment.
        </Body>
        <StatusPill tone={user ? 'success' : 'neutral'}>{user ? 'Ready for authenticated booking' : 'Sign in required'}</StatusPill>
        {user ? (
          <PrimaryButton onPress={() => router.push('/concierge')}>Ask Concierge before booking</PrimaryButton>
        ) : (
          <PrimaryButton onPress={() => router.push('/account')}>Sign in to book</PrimaryButton>
        )}
        <SecondaryButton onPress={() => router.push('/care-plus')}>View Care+ benefits</SecondaryButton>
      </LiquidCard>

      <LiquidCard>
        <Eyebrow>Production payment rule</Eyebrow>
        <Body>
          Stitch and Ozow credentials must live only in Supabase Edge Function secrets. Mobile returns can show pending status only.
        </Body>
      </LiquidCard>

      <LiquidCard>
        <Eyebrow>Coverage</Eyebrow>
        <Title>Choose a cleaner with real service-area context.</Title>
        <Body muted>
          Mapbox powers coverage and dispatch surfaces in production builds. Public maps never show private home access details.
        </Body>
        <ServiceAreaMap />
      </LiquidCard>
    </XootScreen>
  );
}

const serviceLabels: Record<string, string> = {
  residential: 'home cleaning',
  express: 'quick cleaning',
  office: 'office cleaning',
  airbnb: 'Airbnb turnover cleaning',
  moving: 'move-in or move-out cleaning',
  deep: 'deep cleaning',
  premium: 'premium home care',
};
