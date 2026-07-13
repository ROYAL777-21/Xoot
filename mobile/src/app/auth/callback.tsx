import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { Body, Eyebrow, LiquidCard, PrimaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { createSessionFromUrl } from '@/lib/auth-links';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const currentUrl = Linking.useURL();
  const handledUrl = useRef<string | null>(null);
  const [status, setStatus] = useState('Verifying your secure Zoot sign-in...');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;

    const completeSignIn = async () => {
      const url = currentUrl ?? await Linking.getInitialURL();
      if (!url || handledUrl.current === url) return;
      handledUrl.current = url;

      try {
        const session = await createSessionFromUrl(url);
        if (!session) throw new Error('The sign-in link did not include a valid verification code.');
        if (!mounted) return;
        setStatus('You are signed in. Opening your Zoot account...');
        setFailed(false);
        router.replace('/account');
      } catch (error) {
        if (!mounted) return;
        setFailed(true);
        setStatus(error instanceof Error ? error.message : 'Zoot could not verify this sign-in link.');
      }
    };

    void completeSignIn();
    return () => {
      mounted = false;
    };
  }, [currentUrl, router]);

  return (
    <ZootScreen>
      <LiquidCard>
        <Eyebrow>Secure sign-in</Eyebrow>
        <Title>{failed ? 'This link could not be verified.' : 'Finishing your sign-in.'}</Title>
        <Body muted>{status}</Body>
        <StatusPill tone={failed ? 'danger' : 'success'}>{failed ? 'Verification needed' : 'Protected callback'}</StatusPill>
        {failed ? <PrimaryButton onPress={() => router.replace('/account')}>Request a new link</PrimaryButton> : null}
      </LiquidCard>
    </ZootScreen>
  );
}
