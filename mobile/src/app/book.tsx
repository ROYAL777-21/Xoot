import { router, useLocalSearchParams } from 'expo-router';
import { useRef } from 'react';

import { NativeBookingFlow } from '@/components/booking-flow';
import { Card, DisplayTitle, PrimaryAction, Screen, Wordmark } from '@/components/native-core';
import type { NativeBookingParams } from '@/lib/native-booking-input';
import { useAuth } from '@/providers/auth-provider';

export default function BookScreen() {
  const { user, isLoading } = useAuth();
  const params = useLocalSearchParams<NativeBookingParams>();
  const paramsKey = JSON.stringify({ service: params.service, date: params.date, area: params.area, intent: params.intent });
  const account = useRef<{ id: string | null; blockedParams: string | null }>({ id: null, blockedParams: null });
  if (!isLoading && account.current.id !== (user?.id ?? null)) {
    account.current = { id: user?.id ?? null, blockedParams: account.current.id !== null ? paramsKey : account.current.blockedParams };
  }

  if (isLoading || !user) return (
    <Screen>
      <Wordmark />
      <Card>
        <DisplayTitle>{isLoading ? 'Getting ready…' : 'A fresh start awaits.'}</DisplayTitle>
        {!isLoading && <PrimaryAction onPress={() => router.push('/account')}>Sign in to book</PrimaryAction>}
      </Card>
    </Screen>
  );

  // An account change destroys the form, including private address/notes and in-flight review.
  // Compare values, not object identity: Expo may return a fresh params object each render.
  // A later, different deep link starts its own draft without restoring the previous account's input.
  const activeParams = account.current.blockedParams === paramsKey ? {} : params;
  return <NativeBookingFlow key={`${user.id}:${JSON.stringify(activeParams)}`} params={activeParams} />;
}
