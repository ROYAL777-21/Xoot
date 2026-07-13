import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ServiceAreaMap } from '@/components/service-area-map';
import { Body, Eyebrow, LiquidCard, PrimaryButton, SecondaryButton, StatusPill, Title, ZootScreen } from '@/components/zoot-ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/auth-provider';

type ServiceKey = 'residential' | 'deep' | 'office' | 'airbnb';
type DurationKey = '2' | '3' | '4' | '6';

const serviceOptions: Array<{ key: ServiceKey; label: string; detail: string }> = [
  { key: 'residential', label: 'Home clean', detail: 'Everyday home care' },
  { key: 'deep', label: 'Deep clean', detail: 'Built-up and detailed work' },
  { key: 'office', label: 'Office', detail: 'A client-ready workspace' },
  { key: 'airbnb', label: 'Airbnb', detail: 'A guest-ready turnover' },
];

const durationOptions: Array<{ key: DurationKey; label: string; detail: string }> = [
  { key: '2', label: 'Quick reset', detail: '2 hours - focused essentials' },
  { key: '3', label: 'Standard clean', detail: '3 hours - the everyday favourite' },
  { key: '4', label: 'Detailed clean', detail: '4 hours - extra room for detail' },
  { key: '6', label: 'Deep reset', detail: '6 hours - a fuller home reset' },
];

const dateOptions = [
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'weekend', label: 'This weekend' },
  { key: 'custom', label: 'Choose a day' },
] as const;

const normalizeService = (value: string | undefined): ServiceKey =>
  serviceOptions.some((option) => option.key === value) ? (value as ServiceKey) : 'residential';

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export default function BookScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ intent?: string; service?: string; date?: string; area?: string }>();
  const requestedDate = typeof params.date === 'string' && isIsoDate(params.date) ? params.date : '';
  const assistantStarted = params.intent === 'book_clean' || Boolean(params.service || requestedDate || params.area);
  const [step, setStep] = useState(params.service ? 1 : 0);
  const [service, setService] = useState<ServiceKey>(normalizeService(params.service));
  const [duration, setDuration] = useState<DurationKey>('3');
  const [datePreference, setDatePreference] = useState(requestedDate ? 'custom' : 'tomorrow');
  const [customDate, setCustomDate] = useState(requestedDate);
  const [location, setLocation] = useState(typeof params.area === 'string' ? params.area : '');
  const [notice, setNotice] = useState<string | null>(null);
  const { animatedStyle } = useStepMotion(step);

  const selectedService = useMemo(
    () => serviceOptions.find((option) => option.key === service) ?? serviceOptions[0],
    [service],
  );
  const selectedDuration = useMemo(
    () => durationOptions.find((option) => option.key === duration) ?? durationOptions[1],
    [duration],
  );
  const selectedDate = datePreference === 'custom' ? customDate : dateOptions.find((option) => option.key === datePreference)?.label ?? '';
  const customDateReady = datePreference !== 'custom' || isIsoDate(customDate);
  const stepReady = step === 0 || step === 1 || (step === 2 && customDateReady) || (step === 3 && location.trim().length >= 3);

  const goForward = () => {
    setNotice(null);
    setStep((current) => Math.min(current + 1, 4));
  };

  const goBack = () => {
    setNotice(null);
    setStep((current) => Math.max(current - 1, 0));
  };

  return (
    <ZootScreen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Eyebrow>Request draft</Eyebrow>
          <Title>Book without the form fatigue.</Title>
          <Body muted>One choice at a time. Nothing is booked or charged until live details are confirmed.</Body>
        </View>
        <Text style={[styles.progressLabel, { color: theme.textSecondary }]}>Step {step + 1} of 5</Text>
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View style={[styles.progressValue, { backgroundColor: theme.accent, width: `${((step + 1) / 5) * 100}%` }]} />
        </View>
      </View>

      {assistantStarted ? (
        <View style={[styles.assistantNotice, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}>
          <Text style={[styles.assistantTitle, { color: theme.text }]}>Your assistant started this request.</Text>
          <Text style={[styles.assistantBody, { color: theme.textSecondary }]}>Review each preference before continuing in Zoot.</Text>
        </View>
      ) : null}

      <Animated.View style={animatedStyle}>
        <LiquidCard>
          {step === 0 ? (
            <BookingStep title="What needs care?" description="Choose the closest match. You can clarify details later.">
              <View accessibilityRole="radiogroup" style={styles.optionGrid}>
                {serviceOptions.map((option) => (
                  <ChoiceSegment
                    detail={option.detail}
                    key={option.key}
                    label={option.label}
                    onPress={() => setService(option.key)}
                    selected={service === option.key}
                  />
                ))}
              </View>
            </BookingStep>
          ) : null}

          {step === 1 ? (
            <BookingStep title="How much time feels right?" description="This is a preference, not a price or availability promise.">
              <View accessibilityRole="radiogroup" style={styles.optionStack}>
                {durationOptions.map((option) => (
                  <ChoiceSegment
                    detail={option.detail}
                    key={option.key}
                    label={option.label}
                    onPress={() => setDuration(option.key)}
                    selected={duration === option.key}
                  />
                ))}
              </View>
            </BookingStep>
          ) : null}

          {step === 2 ? (
            <BookingStep title="Choose a day" description="Tell us what suits you. Live availability is checked later.">
              <View accessibilityRole="radiogroup" style={styles.dateRow}>
                {dateOptions.map((option) => (
                  <ChoiceChip
                    key={option.key}
                    label={option.label}
                    onPress={() => setDatePreference(option.key)}
                    selected={datePreference === option.key}
                  />
                ))}
              </View>
              {datePreference === 'custom' ? (
                <TextInput
                  accessibilityLabel="Preferred date"
                  keyboardType="numbers-and-punctuation"
                  onChangeText={setCustomDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                  value={customDate}
                />
              ) : null}
            </BookingStep>
          ) : null}

          {step === 3 ? (
            <BookingStep title="Confirm the location" description="Enter the service address or suburb. Coverage is verified before confirmation.">
              <TextInput
                accessibilityLabel="Service location"
                autoComplete="street-address"
                onChangeText={setLocation}
                placeholder="Address or suburb"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                value={location}
              />
              <ServiceAreaMap />
            </BookingStep>
          ) : null}

          {step === 4 ? (
            <BookingStep title="Review your request" description="We will still confirm availability, exact price, your Zooter and payment before booking.">
              <View style={styles.summary}>
                <SummaryRow label="Service" value={selectedService.label} />
                <SummaryRow label="Time" value={selectedDuration.detail} />
                <SummaryRow label="Day" value={selectedDate || 'Choose a day'} />
                <SummaryRow label="Location" value={location || 'Add a location'} />
              </View>
              <StatusPill tone={user ? 'success' : 'neutral'}>{user ? 'Ready to check availability' : 'Sign in to continue'}</StatusPill>
              {user ? (
                <PrimaryButton
                  onPress={() => setNotice('Live availability and pricing are not connected in this preview yet. Nothing has been booked or charged.')}>
                  Check availability
                </PrimaryButton>
              ) : (
                <PrimaryButton onPress={() => router.push('/account')}>Sign in to continue</PrimaryButton>
              )}
              <SecondaryButton onPress={() => router.push('/concierge')}>Ask Concierge</SecondaryButton>
              {notice ? <Body>{notice}</Body> : null}
            </BookingStep>
          ) : null}

          {step < 4 ? <PrimaryButton disabled={!stepReady} onPress={goForward}>Continue</PrimaryButton> : null}
          {step > 0 ? <SecondaryButton onPress={goBack}>Back</SecondaryButton> : null}
        </LiquidCard>
      </Animated.View>
    </ZootScreen>
  );
}

function BookingStep({ children, description, title }: { children: React.ReactNode; description: string; title: string }) {
  const theme = useTheme();
  return (
    <View style={styles.step}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.stepDescription, { color: theme.textSecondary }]}>{description}</Text>
      {children}
    </View>
  );
}

function ChoiceSegment({
  detail,
  label,
  onPress,
  selected,
}: {
  detail: string;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.background,
          borderColor: selected ? theme.accent : theme.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      <View style={[styles.selectionDot, { borderColor: selected ? theme.accent : theme.border }]}>
        {selected ? <View style={[styles.selectionDotCore, { backgroundColor: theme.accent }]} /> : null}
      </View>
      <View style={styles.optionCopy}>
        <Text style={[styles.optionLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.optionDetail, { color: theme.textSecondary }]}>{detail}</Text>
      </View>
    </Pressable>
  );
}

function ChoiceChip({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dateChip,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.background,
          borderColor: selected ? theme.accent : theme.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}>
      <Text style={[styles.dateChipText, { color: theme.text }]}>{label}</Text>
    </Pressable>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.summaryRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.summaryLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.text }]}>{value}</Text>
    </View>
  );
}

function useStepMotion(step: number) {
  const [reduceMotion, setReduceMotion] = useState(true);
  const progress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => setReduceMotion(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    Animated.timing(progress, {
      delay: 42,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [progress, reduceMotion, step]);

  return {
    animatedStyle: {
      opacity: progress,
      transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }],
    },
  };
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.three,
  },
  headerCopy: {
    gap: Spacing.two,
  },
  progressLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressTrack: {
    borderRadius: 999,
    height: 6,
    overflow: 'hidden',
  },
  progressValue: {
    borderRadius: 999,
    height: '100%',
  },
  assistantNotice: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 3,
    padding: Spacing.three,
  },
  assistantTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  assistantBody: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  step: {
    gap: Spacing.three,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 29,
  },
  stepDescription: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  optionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  optionStack: {
    gap: Spacing.two,
  },
  option: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    flexGrow: 1,
    flexBasis: '46%',
    gap: Spacing.three,
    minHeight: 72,
    padding: Spacing.three,
  },
  selectionDot: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1.5,
    height: 20,
    justifyContent: 'center',
    width: 20,
  },
  selectionDotCore: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  optionCopy: {
    flex: 1,
    gap: 3,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '800',
  },
  optionDetail: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  dateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  dateChip: {
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  dateChipText: {
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  summary: {
    gap: 0,
  },
  summaryRow: {
    borderBottomWidth: 1,
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 21,
  },
});
