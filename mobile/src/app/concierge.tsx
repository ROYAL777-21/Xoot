import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { invokeZootFunction } from '@/lib/edge-functions';
import { getLocalZootConciergeReply } from '@/lib/zoot-concierge-fallback';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

type SupportResponse = {
  response: string;
  escalated: boolean;
  source: 'knowledge_base' | 'openai_responses' | 'human_escalation' | 'local_knowledge';
  openai_request_id?: string | null;
};

const secretLikePattern =
  /\b(password|passcode|otp|one[-\s]?time code|card number|cvv|cvc|gate code|access code|alarm code|lockbox|private key|service role)\b/i;

const quickPrompts = [
  'How do I book a cleaner?',
  'What does Care+ include?',
  'What should I prepare before a Zooter arrives?',
  'Can Zoot help my office or Airbnb?',
];

export default function ConciergeScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [message, setMessage] = useState('What areas does Zoot launch in first?');
  const [reply, setReply] = useState<SupportResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const askConcierge = async () => {
    const trimmedMessage = message.trim();
    if (secretLikePattern.test(trimmedMessage)) {
      setReply({
        response:
          'For safety, do not send passwords, OTPs, card details, gate codes, alarm codes or lockbox details to chat. Keep private access details inside protected booking fields.',
        escalated: true,
        source: 'local_knowledge',
      });
      setError(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await invokeZootFunction<SupportResponse>('support-respond', {
        subject: 'Mobile concierge question',
        body: trimmedMessage,
        role: 'user',
        guest: !user,
      });
      setReply(response);
    } catch (nextError) {
      const localReply = getLocalZootConciergeReply(trimmedMessage, Boolean(user));
      if (localReply) {
        setReply({
          ...localReply,
          response: `${localReply.response} Live support is not reachable in this session, so I cannot perform account, booking, payment or admin actions here.`,
        });
        return;
      }

      setError(nextError instanceof Error ? nextError.message : 'Concierge could not respond.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ZootScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LiquidCard>
          <Eyebrow>Zoot Concierge</Eyebrow>
          <Title>Ask before you book.</Title>
          <Body muted>
            Guests can ask general Zoot questions. Booking, payment, address, support ticket, and private account help requires sign-in.
          </Body>
          <StatusPill tone={user ? 'success' : 'neutral'}>{user ? 'Authenticated context available' : 'Guest guidance only'}</StatusPill>
          <TextInput
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="Ask about cleaning, Care+, office service, Airbnb turnovers..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
          />
          <View style={styles.quickPrompts}>
            {quickPrompts.map((prompt) => (
              <SecondaryButton key={prompt} onPress={() => setMessage(prompt)} style={styles.quickPrompt}>
                {prompt}
              </SecondaryButton>
            ))}
          </View>
          <PrimaryButton disabled={isSubmitting || message.trim().length < 3} onPress={askConcierge}>
            {isSubmitting ? 'Asking Concierge' : 'Ask Concierge'}
          </PrimaryButton>
        </LiquidCard>
      </KeyboardAvoidingView>

      {reply ? (
        <LiquidCard>
          <Eyebrow>{reply.source.replace(/_/g, ' ')}</Eyebrow>
          <Body>{reply.response}</Body>
          {reply.escalated ? <StatusPill tone="danger">Human review needed</StatusPill> : null}
        </LiquidCard>
      ) : null}

      {error ? (
        <LiquidCard>
          <Eyebrow>Could not answer</Eyebrow>
          <Body>{error}</Body>
        </LiquidCard>
      ) : null}

      <View style={styles.bottomSpacer} />
    </ZootScreen>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 128,
    padding: 16,
    textAlignVertical: 'top',
  },
  quickPrompts: {
    gap: 10,
  },
  quickPrompt: {
    alignItems: 'flex-start',
    minHeight: 46,
  },
  bottomSpacer: {
    height: 16,
  },
});
