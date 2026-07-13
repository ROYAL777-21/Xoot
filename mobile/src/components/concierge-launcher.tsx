import { usePathname, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

function RoboticStar() {
  const theme = useTheme();
  return (
    <View style={styles.star}>
      <View style={[styles.rayVertical, { backgroundColor: theme.accent }]} />
      <View style={[styles.rayHorizontal, { backgroundColor: theme.accent }]} />
      <View style={[styles.rayDiagonalA, { backgroundColor: theme.accent }]} />
      <View style={[styles.rayDiagonalB, { backgroundColor: theme.accent }]} />
      <View style={[styles.face, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <View style={styles.eyes}>
          <View style={[styles.eye, { backgroundColor: theme.accent }]} />
          <View style={[styles.eye, { backgroundColor: theme.accent }]} />
        </View>
        <View style={[styles.mouth, { backgroundColor: theme.accent }]} />
      </View>
    </View>
  );
}

export function ConciergeLauncher() {
  const theme = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const isOpen = pathname === '/concierge';

  const onPress = () => {
    if (!isOpen) {
      router.push('/concierge');
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  return (
    <Pressable
      accessibilityLabel={isOpen ? 'Close Zoot Concierge' : 'Open Zoot Concierge'}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.launcher,
        {
          backgroundColor: theme.backgroundElement,
          borderColor: theme.border,
          transform: [{ scale: pressed ? 0.94 : 1 }],
        },
      ]}>
      {isOpen ? <Text style={[styles.close, { color: theme.text }]}>X</Text> : <RoboticStar />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  launcher: {
    alignItems: 'center',
    borderCurve: 'continuous',
    borderRadius: 24,
    borderWidth: 1,
    elevation: 12,
    height: 48,
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 10px 18px rgba(0, 0, 0, 0.18)' },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
    }),
    width: 48,
  },
  close: {
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 28,
  },
  star: {
    alignItems: 'center',
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  rayVertical: {
    borderRadius: 999,
    height: 36,
    position: 'absolute',
    width: 7,
  },
  rayHorizontal: {
    borderRadius: 999,
    height: 7,
    position: 'absolute',
    width: 36,
  },
  rayDiagonalA: {
    borderRadius: 999,
    height: 6,
    position: 'absolute',
    transform: [{ rotate: '45deg' }],
    width: 29,
  },
  rayDiagonalB: {
    borderRadius: 999,
    height: 6,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
    width: 29,
  },
  face: {
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    gap: 3,
    height: 21,
    justifyContent: 'center',
    width: 24,
  },
  eyes: {
    flexDirection: 'row',
    gap: 5,
  },
  eye: {
    borderRadius: 999,
    height: 3,
    width: 3,
  },
  mouth: {
    borderRadius: 999,
    height: 2,
    width: 9,
  },
});
