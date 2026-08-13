import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, TextInput } from 'react-native';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, XootScreen } from '@/components/xoot-ui';
import { getAuthRedirectUrl, startOAuth } from '@/lib/auth-links';
import { isAppleSignInAvailable, isAppleSignInCancellation, signInWithApple } from '@/lib/apple-auth';
import { supabase } from '@/lib/supabase';
import { registerForXootPushNotifications } from '@/lib/push-notifications';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function AccountScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Hidden rather than disabled where the native sheet does not exist — Android, and
  // iOS below 13. A dead "Continue with Apple" button is worse than no button.
  const [appleAvailable, setAppleAvailable] = useState(false);

  useEffect(() => {
    let mounted = true;
    isAppleSignInAvailable()
      .then((available) => mounted && setAppleAvailable(available))
      .catch(() => mounted && setAppleAvailable(false));
    return () => {
      mounted = false;
    };
  }, []);

  const continueWithApple = useCallback(async () => {
    try {
      await signInWithApple();
    } catch (error) {
      // Dismissing the sheet is a decision, not a failure.
      if (isAppleSignInCancellation(error)) return;
      setStatus(error instanceof Error ? error.message : 'Could not sign in with Apple.');
    }
  }, []);

  const sendMagicLink = async () => {
    setIsSubmitting(true);
    setStatus(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: getAuthRedirectUrl(),
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setStatus('Check your email to finish signing in to Xoot.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not send sign-in email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enablePush = async () => {
    if (!user) return;
    setIsSubmitting(true);
    setStatus(null);
    try {
      await registerForXootPushNotifications(user.id);
      setStatus('Push notifications are connected for safe Xoot service updates.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Push setup failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return (
      <XootScreen>
        <LiquidCard>
          <Eyebrow>Account</Eyebrow>
          <Title>Your Xoot session is active.</Title>
          <Body muted>{user.email ?? user.id}</Body>
          <StatusPill tone="success">Secure session storage enabled</StatusPill>
          <PrimaryButton disabled={isSubmitting} onPress={enablePush}>Enable service notifications</PrimaryButton>
          <SecondaryButton onPress={signOut}>Sign out</SecondaryButton>
          {status ? <Body>{status}</Body> : null}
        </LiquidCard>
      </XootScreen>
    );
  }

  return (
    <XootScreen>
      <LiquidCard>
        <Eyebrow>Sign in</Eyebrow>
        <Title>Use Xoot with protected account access.</Title>
        <Body muted>
          General Concierge questions work for guests. Bookings, Care+, payment status, support tickets, and saved home details require sign-in.
        </Body>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        />
        <PrimaryButton disabled={isSubmitting || !email.includes('@')} onPress={sendMagicLink}>
          {isSubmitting ? 'Sending link' : 'Send secure sign-in link'}
        </PrimaryButton>
        <SecondaryButton disabled={isSubmitting} onPress={() => startOAuth('google').catch((error) => setStatus(error.message))}>
          Continue with Google
        </SecondaryButton>
        {appleAvailable ? (
          <SecondaryButton disabled={isSubmitting} onPress={continueWithApple}>
            Continue with Apple
          </SecondaryButton>
        ) : null}
        {status ? <Body>{status}</Body> : null}
      </LiquidCard>
    </XootScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 18,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
});
