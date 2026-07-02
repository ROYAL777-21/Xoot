import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';

import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { Colors, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { invokeZootFunction } from '@/lib/edge-functions';
import { getLocalZootConciergeReply } from '@/lib/zoot-concierge-fallback';
import { useAuth } from '@/providers/auth-provider';

type SupportResponse = {
  response: string;
  escalated: boolean;
  source: 'knowledge_base' | 'openai_responses' | 'human_escalation' | 'local_knowledge';
  openai_request_id?: string | null;
};

type ConciergeMessage = {
  id: string;
  role: 'assistant' | 'user' | 'system';
  body: string;
  source?: SupportResponse['source'];
  escalated?: boolean;
};

const secretLikePattern =
  /\b(password|passcode|otp|one[-\s]?time code|card number|cvv|cvc|gate code|access code|alarm code|lockbox|private key|service role)\b/i;

const quickPrompts = [
  'How do I book a cleaner?',
  'How long should I book for?',
  'Can Zoot help my office?',
  'What should I prepare before a Zooter arrives?',
  'What does Care+ include?',
];

const firstMessage: ConciergeMessage = {
  id: 'welcome',
  role: 'assistant',
  body: 'Hi, I am Zoot Concierge. Ask me about cleaning, booking prep, Care+, ZootCred, launch areas, office resets, Airbnb turnovers or becoming a Zooter. Keep private booking, payment, address and access details inside the signed-in app.',
  source: 'local_knowledge',
};

const createMessageId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

function RoboticStarMark() {
  return (
    <View style={styles.starShell}>
      <View style={styles.starRayVertical} />
      <View style={styles.starRayHorizontal} />
      <View style={styles.starRayDiagonalA} />
      <View style={styles.starRayDiagonalB} />
      <View style={styles.starFace}>
        <View style={styles.starEyes}>
          <View style={styles.starEye} />
          <View style={styles.starEye} />
        </View>
        <View style={styles.starMouth} />
      </View>
    </View>
  );
}

export default function ConciergeScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ConciergeMessage[]>([firstMessage]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setPrefersReducedMotion(Boolean(enabled));
      })
      .catch(() => {
        if (mounted) setPrefersReducedMotion(true);
      });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setPrefersReducedMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1450,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [prefersReducedMotion, pulse]);

  const appendMessage = (nextMessage: Omit<ConciergeMessage, 'id'>) => {
    setMessages((currentMessages) => [...currentMessages, { id: createMessageId(), ...nextMessage }]);
  };

  const askConcierge = async () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 3 || isSubmitting) return;

    setMessage('');
    appendMessage({ role: 'user', body: trimmedMessage });

    if (secretLikePattern.test(trimmedMessage)) {
      appendMessage({
        role: 'system',
        body: 'For safety, do not send passwords, OTPs, card details, gate codes, alarm codes or lockbox details to chat. Keep private access details inside protected booking fields.',
        escalated: true,
        source: 'local_knowledge',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await invokeZootFunction<SupportResponse>('support-respond', {
        subject: 'Mobile concierge question',
        body: trimmedMessage,
        role: 'user',
        guest: !user,
      });
      appendMessage({
        role: 'assistant',
        body: response.response,
        source: response.source,
        escalated: response.escalated,
      });
      if (response.escalated) {
        appendMessage({
          role: 'system',
          body: 'This needs protected human review before any booking, payment, refund, safety or account-impacting action changes.',
          source: response.source,
          escalated: true,
        });
      }
    } catch {
      const localReply = getLocalZootConciergeReply(trimmedMessage, Boolean(user));
      appendMessage({
        role: 'assistant',
        body: `${localReply?.response ?? 'I can help with general Zoot questions, but I cannot reach live support right now.'} Live support is not reachable in this session, so I cannot perform account, booking, payment or admin actions here.`,
        source: localReply?.source ?? 'local_knowledge',
        escalated: localReply?.escalated ?? true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const starScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.055] });
  const starGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.72] });

  return (
    <ZootScreen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LiquidCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <Animated.View style={[styles.starWrap, !prefersReducedMotion && { opacity: starGlow, transform: [{ scale: starScale }] }]}>
              <RoboticStarMark />
            </Animated.View>
            <View style={styles.heroCopy}>
              <Eyebrow>Zoot Concierge</Eyebrow>
              <Title>Ask before you book.</Title>
            </View>
          </View>
          <Body muted>
            Guests get useful general guidance. Booking, payment, address, support ticket and private account help stays inside authenticated app screens.
          </Body>
          <StatusPill tone={user ? 'success' : 'neutral'}>{user ? 'Signed-in support boundary' : 'Guest guidance boundary'}</StatusPill>
        </LiquidCard>

        <LiquidCard>
          <View style={styles.messageList}>
            {messages.map((item, index) => (
              <View key={item.id} style={[styles.messageRow, item.role === 'user' ? styles.userRow : styles.assistantRow]}>
                <View
                  style={[
                    styles.messageBubble,
                    {
                      backgroundColor:
                        item.role === 'user' ? theme.accent : item.role === 'system' ? 'rgba(181, 71, 71, 0.18)' : theme.backgroundElement,
                      borderColor: item.role === 'system' ? theme.danger : theme.border,
                    },
                  ]}>
                  <Text selectable style={[styles.messageText, { color: item.role === 'user' ? Colors.dark.background : theme.text }]}>
                    {item.body}
                  </Text>
                  {item.source ? (
                    <Text style={[styles.messageMeta, { color: item.role === 'user' ? 'rgba(7, 16, 10, 0.68)' : theme.textSecondary }]}>
                      {item.source.replace(/_/g, ' ')}
                      {item.escalated ? ' - human review' : ''}
                    </Text>
                  ) : null}
                </View>
              </View>
            ))}
            {isSubmitting ? (
              <View style={styles.assistantRow}>
                <View style={[styles.messageBubble, styles.typingBubble, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
                  <Text style={[styles.messageText, { color: theme.textSecondary }]}>Checking Zoot's playbook...</Text>
                </View>
              </View>
            ) : null}
          </View>
        </LiquidCard>

        {messages.length <= 1 ? (
          <View style={styles.quickPrompts}>
            {quickPrompts.map((prompt) => (
              <SecondaryButton key={prompt} onPress={() => setMessage(prompt)} style={styles.quickPrompt}>
                {prompt}
              </SecondaryButton>
            ))}
          </View>
        ) : null}

        <LiquidCard>
          <TextInput
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="Ask about cleaning, Care+, office service, Airbnb turnovers..."
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundElement }]}
            textAlignVertical="top"
            returnKeyType="send"
          />
          <View style={styles.inputActions}>
            <Body muted>No passwords, OTPs, access codes or card details.</Body>
            <PrimaryButton disabled={isSubmitting || message.trim().length < 3} onPress={askConcierge}>
              {isSubmitting ? 'Asking' : 'Send'}
            </PrimaryButton>
          </View>
        </LiquidCard>

        <View style={styles.supportNote}>
          <Text selectable style={styles.supportNoteText}>
            Refunds, payments, damage, theft, safety, legal or account-risk issues need protected human support.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ZootScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    minHeight: 232,
  },
  heroRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.three,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.two,
  },
  starWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(216, 178, 110, 0.18)',
    borderColor: 'rgba(255, 248, 236, 0.42)',
    borderCurve: 'continuous',
    borderRadius: 30,
    borderWidth: 1,
    height: 78,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 78,
  },
  starShell: {
    alignItems: 'center',
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  starRayVertical: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 52,
    position: 'absolute',
    width: 9,
  },
  starRayHorizontal: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 9,
    position: 'absolute',
    width: 52,
  },
  starRayDiagonalA: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 8,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 42,
  },
  starRayDiagonalB: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 8,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: 42,
  },
  starFace: {
    alignItems: 'center',
    backgroundColor: 'rgba(7, 16, 10, 0.86)',
    borderColor: 'rgba(255, 248, 236, 0.34)',
    borderRadius: 16,
    borderWidth: 1,
    gap: 5,
    height: 31,
    justifyContent: 'center',
    width: 35,
  },
  starEyes: {
    flexDirection: 'row',
    gap: 8,
  },
  starEye: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 4,
    width: 4,
  },
  starMouth: {
    backgroundColor: 'rgba(216, 178, 110, 0.82)',
    borderRadius: 999,
    height: 3,
    width: 13,
  },
  messageList: {
    gap: Spacing.two,
  },
  messageRow: {
    flexDirection: 'row',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  assistantRow: {
    justifyContent: 'flex-start',
  },
  messageBubble: {
    borderRadius: 21,
    borderWidth: 1,
    maxWidth: '88%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  messageText: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 22,
  },
  messageMeta: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    textTransform: 'uppercase',
  },
  typingBubble: {
    opacity: 0.84,
  },
  quickPrompts: {
    gap: Spacing.two,
  },
  quickPrompt: {
    alignItems: 'flex-start',
    minHeight: 46,
  },
  input: {
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 120,
    padding: 16,
  },
  inputActions: {
    gap: Spacing.three,
  },
  supportNote: {
    borderColor: 'rgba(255, 250, 242, 0.14)',
    borderRadius: 18,
    borderWidth: 1,
    padding: Spacing.three,
  },
  supportNoteText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 18,
    textAlign: 'center',
  },
});
