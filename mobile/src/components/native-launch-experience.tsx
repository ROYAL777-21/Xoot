import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { Body, Eyebrow, PrimaryButton, SecondaryButton, StatusPill, Title } from '@/components/zoot-ui';
import { Colors, Spacing } from '@/constants/theme';
import { getNativeLaunchMode, nativeLaunchAssets, type NativeLaunchModeInput } from '@/lib/native-launch';

type NativeLaunchExperienceProps = {
  onBook: () => void;
  onConcierge: () => void;
};

export function NativeLaunchExperience({ onBook, onConcierge }: NativeLaunchExperienceProps) {
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

  const launchMode = getNativeLaunchMode({ prefersReducedMotion });

  useEffect(() => {
    if (launchMode === 'static') {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          duration: 1600,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          duration: 1200,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();

    return () => loop.stop();
  }, [launchMode, pulse]);

  const orbScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const glintOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.38, 0.88] });

  return (
    <View style={styles.shell}>
      <View pointerEvents="none" style={styles.depthBackdrop} />
      <View pointerEvents="none" style={styles.privacyVeil} />

      <Animated.View
        pointerEvents="none"
        style={[
          styles.heroOrb,
          launchMode === 'motion' && {
            opacity: glintOpacity,
            transform: [{ scale: orbScale }],
          },
        ]}>
        <View style={styles.innerOrb} />
        <View style={styles.starCore}>
          <View style={styles.starVertical} />
          <View style={styles.starHorizontal} />
        </View>
      </Animated.View>

      <View style={styles.copy}>
        <Eyebrow>Native launch</Eyebrow>
        <Title>Zoot opens calm, private and ready.</Title>
        <Body muted>
          A bundled Expo experience loads before live data. Urgent booking, Concierge and Care+ deep links bypass this screen and open the right protected route.
        </Body>
        <StatusPill tone="success">
          {launchMode === 'static' ? 'Static accessibility fallback' : 'Native motion enabled'}
        </StatusPill>
      </View>

      <View style={styles.actions}>
        <PrimaryButton onPress={onBook}>Book a clean</PrimaryButton>
        <SecondaryButton onPress={onConcierge}>Ask Zoot Concierge</SecondaryButton>
      </View>

      <View style={styles.guardRail}>
        <Text selectable style={styles.guardRailText}>
          {nativeLaunchAssets.source} - no WebView - no remote launch asset
        </Text>
      </View>
    </View>
  );
}

export const getNativeLaunchVisualMode = (input: NativeLaunchModeInput) => getNativeLaunchMode(input);

const styles = StyleSheet.create({
  shell: {
    backgroundColor: 'rgba(12, 22, 14, 0.9)',
    borderColor: 'rgba(255, 250, 242, 0.18)',
    borderRadius: 32,
    borderWidth: 1,
    gap: Spacing.four,
    overflow: 'hidden',
    padding: Spacing.four,
  },
  depthBackdrop: {
    backgroundColor: 'rgba(216, 178, 110, 0.1)',
    borderRadius: 999,
    height: 280,
    position: 'absolute',
    right: -96,
    top: -120,
    width: 280,
  },
  privacyVeil: {
    backgroundColor: 'rgba(7, 16, 10, 0.66)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  heroOrb: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderCurve: 'continuous',
    borderRadius: 48,
    borderWidth: 1,
    height: 96,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 96,
  },
  innerOrb: {
    backgroundColor: 'rgba(216, 178, 110, 0.3)',
    borderRadius: 999,
    height: 74,
    position: 'absolute',
    right: -18,
    top: -20,
    width: 74,
  },
  starCore: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  starVertical: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 46,
    position: 'absolute',
    width: 8,
  },
  starHorizontal: {
    backgroundColor: Colors.dark.accent,
    borderRadius: 999,
    height: 8,
    position: 'absolute',
    width: 46,
  },
  copy: {
    gap: Spacing.three,
  },
  actions: {
    gap: Spacing.two,
  },
  guardRail: {
    borderColor: 'rgba(255, 250, 242, 0.12)',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  guardRailText: {
    color: Colors.dark.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
});
