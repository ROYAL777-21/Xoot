import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { ConciergeLauncher } from '@/components/concierge-launcher';
import { Body, Eyebrow, PrimaryButton, StatusPill, Title } from '@/components/zoot-ui';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getNativeLaunchMode, type NativeLaunchModeInput } from '@/lib/native-launch';

type NativeLaunchExperienceProps = {
  onBook: (service?: string) => void;
};

const services = [
  { key: 'residential', label: 'Home clean', detail: 'A reliable reset for everyday living.' },
  { key: 'deep', label: 'Deep clean', detail: 'More time for built-up or detailed work.' },
  { key: 'office', label: 'Office', detail: 'A calm, client-ready workspace.' },
  { key: 'airbnb', label: 'Airbnb', detail: 'Guest-ready turnovers between stays.' },
] as const;

export function NativeLaunchExperience({ onBook }: NativeLaunchExperienceProps) {
  const theme = useTheme();
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(true);
  const entrance = useRef(new Animated.Value(1)).current;

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

  const launchMode = getNativeLaunchMode({ prefersReducedMotion });

  useEffect(() => {
    if (launchMode === 'static') {
      entrance.stopAnimation();
      entrance.setValue(1);
      return;
    }

    entrance.setValue(0);
    Animated.timing(entrance, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [entrance, launchMode]);

  const translateY = entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <Animated.View style={[styles.section, { opacity: entrance, transform: [{ translateY }] }]}>
      <View style={styles.brandRow}>
        <View>
          <Text style={[styles.brand, { color: theme.text }]}>Zoot</Text>
          <Text style={[styles.location, { color: theme.textSecondary }]}>Johannesburg</Text>
        </View>
        <ConciergeLauncher />
      </View>

      <View style={styles.intro}>
        <Eyebrow>Home care, on your terms</Eyebrow>
        <Title>What can we take care of?</Title>
        <Body muted>Choose a service to start. You will confirm the details, price and payment before anything is booked.</Body>
        <StatusPill tone="success">Ready when you are</StatusPill>
      </View>

      <View accessibilityRole="menu" style={styles.serviceGrid}>
        {services.map((service) => (
          <Pressable
            accessibilityHint={`Start a ${service.label.toLowerCase()} request`}
            accessibilityRole="button"
            key={service.key}
            onPress={() => onBook(service.key)}
            style={({ pressed }) => [
              styles.serviceCard,
              {
                backgroundColor: pressed ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: pressed ? theme.accent : theme.border,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}>
            <View style={[styles.serviceMarker, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.serviceMarkerText, { color: theme.accent }]}>{service.label.slice(0, 1)}</Text>
            </View>
            <Text style={[styles.serviceLabel, { color: theme.text }]}>{service.label}</Text>
            <Text style={[styles.serviceDetail, { color: theme.textSecondary }]}>{service.detail}</Text>
          </Pressable>
        ))}
      </View>

      <PrimaryButton onPress={() => onBook()}>Book a clean</PrimaryButton>
    </Animated.View>
  );
}

export const getNativeLaunchVisualMode = (input: NativeLaunchModeInput) => getNativeLaunchMode(input);

const styles = StyleSheet.create({
  section: {
    gap: Spacing.four,
  },
  brandRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  brand: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 31,
  },
  location: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  intro: {
    gap: Spacing.two,
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  serviceCard: {
    borderCurve: 'continuous',
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: '46%',
    flexGrow: 1,
    gap: Spacing.two,
    minHeight: 154,
    padding: Spacing.three,
  },
  serviceMarker: {
    alignItems: 'center',
    borderRadius: 13,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  serviceMarkerText: {
    fontSize: 16,
    fontWeight: '900',
  },
  serviceLabel: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 21,
  },
  serviceDetail: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
});
