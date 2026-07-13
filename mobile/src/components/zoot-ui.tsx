import { GlassView, isGlassEffectAPIAvailable } from 'expo-glass-effect';
import { Platform, Pressable, ScrollView, StyleSheet, Text, type PressableProps, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ConciergeLauncher } from '@/components/concierge-launcher';
import { Colors, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ZootScreen({
  children,
  scrollRef,
  showConciergeLauncher = true,
}: {
  children: React.ReactNode;
  scrollRef?: React.RefObject<ScrollView | null>;
  showConciergeLauncher?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {showConciergeLauncher ? (
          <View style={styles.toolbar}>
            <ConciergeLauncher />
          </View>
        ) : null}
        <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

export function LiquidCard({ children, style }: ViewProps) {
  const theme = useTheme();
  const glassAvailable = isGlassEffectAPIAvailable();

  return (
    <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.backgroundElement }, style]}>
      {glassAvailable ? (
        <GlassView
          colorScheme={theme.background === Colors.dark.background ? 'dark' : 'light'}
          glassEffectStyle="clear"
          tintColor={theme.background === Colors.dark.background ? 'rgba(216, 178, 110, 0.18)' : 'rgba(255, 255, 255, 0.28)'}
          style={StyleSheet.absoluteFill}
          isInteractive
        />
      ) : null}
      <View style={styles.glassEdgeLight} />
      <View style={styles.cardContent}>{children}</View>
    </View>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.eyebrow, { color: theme.accent }]}>{children}</Text>;
}

export function Title({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return <Text style={[styles.title, { color: theme.text }]}>{children}</Text>;
}

export function Body({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  const theme = useTheme();
  return <Text style={[styles.body, { color: muted ? theme.textSecondary : theme.text }]}>{children}</Text>;
}

export function PrimaryButton({
  children,
  style,
  accessibilityRole = 'button',
  ...props
}: PressableProps & { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      {...props}
      style={(state) => [
        styles.primaryButton,
        { backgroundColor: state.pressed ? theme.accentSoft : theme.accent },
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}>
      {({ pressed }) => (
        <>
          <View style={[styles.buttonGlint, pressed && styles.buttonGlintPressed]} />
          <Text style={[styles.primaryButtonText, { color: '#ffffff' }]}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  children,
  style,
  accessibilityRole = 'button',
  ...props
}: PressableProps & { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      {...props}
      style={(state) => [
        styles.secondaryButton,
        { borderColor: theme.border, backgroundColor: state.pressed ? theme.backgroundSelected : 'transparent' },
        state.pressed && styles.pressed,
        typeof style === 'function' ? style(state) : style,
      ]}>
      {({ pressed }) => (
        <>
          <View style={[styles.buttonGlint, pressed && styles.buttonGlintPressed]} />
          <Text style={[styles.secondaryButtonText, { color: theme.text }]}>{children}</Text>
        </>
      )}
    </Pressable>
  );
}

export function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'danger' }) {
  const theme = useTheme();
  const color = tone === 'success' ? theme.success : tone === 'danger' ? theme.danger : theme.accent;
  return (
    <View style={[styles.pill, { borderColor: color, backgroundColor: theme.accentSoft }]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  toolbar: {
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
  },
  content: {
    alignSelf: 'center',
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    padding: Spacing.four,
    paddingBottom: 112,
    width: '100%',
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    overflow: 'hidden',
    ...Platform.select({
      web: { boxShadow: '0 18px 30px rgba(0, 0, 0, 0.34)' },
      default: {
        shadowColor: '#000',
        shadowOpacity: 0.34,
        shadowRadius: 30,
        shadowOffset: { width: 0, height: 18 },
      },
    }),
  },
  glassEdgeLight: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 28,
    borderTopColor: 'rgba(255, 255, 255, 0.48)',
    borderRightColor: 'rgba(255, 255, 255, 0.34)',
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    borderLeftColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1,
    pointerEvents: 'none',
  },
  cardContent: {
    gap: Spacing.three,
    padding: Spacing.four,
    zIndex: 1,
  },
  eyebrow: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: 18,
    overflow: 'hidden',
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    zIndex: 1,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    minHeight: 52,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    zIndex: 1,
  },
  buttonGlint: {
    position: 'absolute',
    right: 14,
    top: 6,
    width: 44,
    height: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    opacity: 0.42,
    pointerEvents: 'none',
    transform: [{ rotate: '-12deg' }],
  },
  buttonGlintPressed: {
    opacity: 0.82,
    transform: [{ translateX: -6 }, { translateY: 4 }, { rotate: '-12deg' }],
  },
  pressed: {
    transform: [{ scale: 0.99 }],
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pillText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
