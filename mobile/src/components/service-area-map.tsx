import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing, alpha } from '@/constants/theme';

const launchAreas = ['Sandton', 'Bryanston', 'Rosebank', 'Fourways', 'Midrand'];

export function ServiceAreaMap() {
  return (
    <View style={styles.fallback}>
      <Text style={styles.kicker}>Your neighbourhood</Text>
      <Text style={styles.title}>Service areas</Text>
      <Text style={styles.body}>
        These are reference locations, not a promise of live availability or a real-time journey. Your exact booking address and access instructions remain private.
      </Text>
      <View style={styles.areas}>
        {launchAreas.map((area) => (
          <Text key={area} style={styles.area}>
            {area}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: alpha('dark', 'foreground', 0.06),
    borderColor: alpha('dark', 'foreground', 0.14),
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: 220,
    overflow: 'hidden',
    padding: Spacing.xl,
  },
  kicker: {
    color: Colors.dark.accent,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.dark.text,
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    color: Colors.dark.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  areas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  area: {
    borderColor: alpha('dark', 'accent', 0.34),
    borderRadius: 999,
    borderWidth: 1,
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
