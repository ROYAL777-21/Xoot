import { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { Card, PrimaryAction, Screen } from '@/components/native-core';
import { createSessionFromUrl, getAuthRedirectUrl } from '@/lib/auth-links';

export default function AuthCallback() {
  const { code, error, error_code: errorCode } = useLocalSearchParams<{ code?: string; error?: string; error_code?: string }>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    const params = new URLSearchParams();
    if (typeof code === 'string') params.set('code', code);
    if (error || errorCode) params.set('error', 'provider_rejected');
    void createSessionFromUrl(`${getAuthRedirectUrl()}?${params}`)
      .then(ok => { if (current) { if (ok) router.replace('/'); else setFailed(true); } })
      .catch(() => { if (current) setFailed(true); });
    return () => { current = false; };
  }, [code, error, errorCode]);
  return <Screen><Card><Text accessibilityRole="header">{failed ? 'Sign-in could not finish' : 'Finishing your sign-in…'}</Text>{failed && <PrimaryAction onPress={() => router.replace('/account')}>Return to sign-in</PrimaryAction>}</Card></Screen>;
}
