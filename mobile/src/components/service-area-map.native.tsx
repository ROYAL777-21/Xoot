import { COLOR, hsl, alpha, Colors, Spacing } from '@/constants/theme';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { mobileEnv } from '@/lib/env';

const center: [number, number] = [28.0473, -26.108];
const launchAreas = [
  { name: 'Sandton', coordinates: [28.0573, -26.1076] },
  { name: 'Bryanston', coordinates: [28.0061, -26.0507] },
  { name: 'Rosebank', coordinates: [28.0416, -26.1467] },
  { name: 'Fourways', coordinates: [28.0068, -26.0206] },
  { name: 'Midrand', coordinates: [28.128, -25.9992] },
] satisfies Array<{ name: string; coordinates: [number, number] }>;

export function ServiceAreaMap() {
  const token = mobileEnv.mapboxPublicToken;
  const shape = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: launchAreas.map((area) => ({
        type: 'Feature' as const,
        id: area.name,
        properties: { name: area.name },
        geometry: {
          type: 'Point' as const,
          coordinates: area.coordinates,
        },
      })),
    }),
    [],
  );

  if (!token) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.kicker}>Mapbox service map</Text>
        <Text style={styles.title}>Add `EXPO_PUBLIC_MAPBOX_PUBLIC_TOKEN` to activate native maps.</Text>
        <Text style={styles.body}>
          Maps are configured for EAS development, preview and production builds. Expo Go cannot load this native Mapbox module.
        </Text>
      </View>
    );
  }

  Mapbox.setAccessToken(token);

  return (
    <View style={styles.shell}>
      <Mapbox.MapView style={styles.map} logoEnabled={false} attributionEnabled={false} compassEnabled scaleBarEnabled={false}>
        <Mapbox.Camera centerCoordinate={center} zoomLevel={10.2} pitch={34} animationMode="flyTo" animationDuration={850} />
        <Mapbox.ShapeSource id="zoot-launch-areas" shape={shape}>
          <Mapbox.CircleLayer
            id="zoot-launch-points"
            style={{
              circleColor: Colors.dark.accent,
              circleOpacity: 0.92,
              circleRadius: 8,
              circleStrokeColor: hsl(COLOR.dark.foreground),
              circleStrokeWidth: 2,
            }}
          />
          <Mapbox.SymbolLayer
            id="zoot-launch-labels"
            style={{
              textColor: Colors.dark.text,
              textField: ['get', 'name'],
              textHaloColor: hsl(COLOR.dark.background),
              textHaloWidth: 1.5,
              textOffset: [0, 1.25],
              textSize: 12,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
      <View pointerEvents="none" style={styles.overlay}>
        <Text style={styles.kicker}>Privacy-first dispatch</Text>
        <Text style={styles.body}>Public service areas only. Exact addresses stay protected.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderColor: alpha('dark', 'foreground', 0.14),
    borderRadius: 24,
    borderWidth: 1,
    height: 260,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  overlay: {
    backgroundColor: alpha('dark', 'background', 0.72),
    borderColor: alpha('dark', 'foreground', 0.16),
    borderRadius: 20,
    borderWidth: 1,
    bottom: Spacing.lg,
    left: Spacing.lg,
    padding: Spacing.lg,
    position: 'absolute',
    right: Spacing.lg,
  },
  fallback: {
    backgroundColor: alpha('dark', 'foreground', 0.06),
    borderColor: alpha('dark', 'foreground', 0.14),
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: 220,
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
});
