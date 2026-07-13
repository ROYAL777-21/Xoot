import { useState } from 'react';
import { router } from 'expo-router';
import { Platform, StyleSheet, Text, TextInput } from 'react-native';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { getAuthRedirectUrl, oauthProviderAvailability, startOAuth } from '@/lib/auth-links';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

export default function AccountScreen() {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setStatus('Check your email to finish signing in to Zoot.');
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
      if (Platform.OS === 'web') {
        throw new Error('Service notifications are available in the Zoot iOS and Android apps.');
      }
      const { registerForZootPushNotifications } = await import('@/lib/push-notifications');
      await registerForZootPushNotifications(user.id);
      setStatus('Push notifications are connected for safe Zoot service updates.');
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Push setup failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user) {
    return (
      <ZootScreen>
        <LiquidCard>
          <Eyebrow>Account</Eyebrow>
          <Title>You are signed in.</Title>
          <Body muted>{user.email ?? user.id}</Body>
          <StatusPill tone="success">Ready for private booking updates</StatusPill>
          <PrimaryButton disabled={isSubmitting} onPress={enablePush}>Enable service notifications</PrimaryButton>
          <SecondaryButton onPress={signOut}>Sign out</SecondaryButton>
          {status ? <Body>{status}</Body> : null}
        </LiquidCard>
      </ZootScreen>
    );
  }

  return (
    <ZootScreen>
      <LiquidCard>
        <Eyebrow>Sign in</Eyebrow>
        <Title>Sign in when you are ready to confirm.</Title>
         <Body muted>
           Browse services and ask Concierge as a guest. Sign in only to confirm a booking, save a home, or see private updates.
         </Body>
        <Text nativeID="zoot-sign-in-email-label" style={[styles.label, { color: theme.text }]}>Email address</Text>
         <TextInput
          accessibilityLabel="Email address"
          accessibilityLabelledBy="zoot-sign-in-email-label"
           autoCapitalize="none"
           autoComplete="email"
           keyboardType="email-address"
          textContentType="emailAddress"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
        />
        <PrimaryButton disabled={isSubmitting || !email.includes('@')} onPress={sendMagicLink}>
          {isSubmitting ? 'Sending link' : 'Send secure sign-in link'}
        </PrimaryButton>
        {oauthProviderAvailability.google ? (
          <SecondaryButton disabled={isSubmitting} onPress={() => startOAuth('google').catch((error) => setStatus(error.message))}>
            Continue with Google
          </SecondaryButton>
        ) : null}
        {Platform.OS === 'ios' && oauthProviderAvailability.apple ? (
          <SecondaryButton disabled={isSubmitting} onPress={() => startOAuth('apple').catch((error) => setStatus(error.message))}>
            Continue with Apple
          </SecondaryButton>
        ) : null}
        <SecondaryButton disabled={isSubmitting} onPress={() => router.replace('/')}>
          Continue as guest
        </SecondaryButton>
        {status ? <Body>{status}</Body> : null}
      </LiquidCard>
    </ZootScreen>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderRadius: 18,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 16,
  },
});
