import { StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

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
    backgroundColor: '#ffffff',
    borderColor: '#e5e5e5',
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: 220,
    overflow: 'hidden',
    padding: Spacing.xl,
  },
  kicker: {
    color: '#525252',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: '#111111',
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    color: '#525252',
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
    borderColor: '#e5e5e5',
    borderRadius: 999,
    borderWidth: 1,
    color: '#111111',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
