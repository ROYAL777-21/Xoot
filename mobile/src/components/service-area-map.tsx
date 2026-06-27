import { StyleSheet, Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';
import { mobileEnv } from '@/lib/env';

const launchAreas = ['Sandton', 'Bryanston', 'Rosebank', 'Fourways', 'Midrand'];

export function ServiceAreaMap() {
  return (
    <View style={styles.fallback}>
      <Text style={styles.kicker}>Mapbox service map</Text>
      <Text style={styles.title}>{mobileEnv.mapboxPublicToken ? 'Native map ready in development builds.' : 'Add a public Mapbox token to activate maps.'}</Text>
      <Text style={styles.body}>
        Zoot maps show service coverage, safe ETA context and dispatch readiness. Exact addresses and access instructions stay inside protected booking screens.
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
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.14)',
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.two,
    minHeight: 220,
    overflow: 'hidden',
    padding: Spacing.four,
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
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  area: {
    borderColor: 'rgba(216,178,110,0.34)',
    borderRadius: 999,
    borderWidth: 1,
    color: Colors.dark.text,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
