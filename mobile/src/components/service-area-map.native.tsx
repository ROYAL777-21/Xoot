import { Colors, Spacing, alpha } from '@/constants/theme';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { mobileEnv } from '@/lib/env';
import { MONOCHROME_MAP_STYLE_JSON } from '@/lib/mapbox-theme';

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
  const [mapStatus, setMapStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  // Do not leave customers on a blank tile surface when an offline/blocked map stalls.
  // The Mapbox native SDK can emit tile errors even after the style has loaded, so
  // a transient error must not hide an already-visible usable map.
  useEffect(() => {
    if (!token.startsWith('pk.') || mapStatus !== 'loading') return;
    const timeout = setTimeout(() => setMapStatus(current => current === 'loading' ? 'error' : current), 15000);
    return () => clearTimeout(timeout);
  }, [attempt, mapStatus, token]);
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

  if (!token || !token.startsWith('pk.')) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.kicker}>Your neighbourhood</Text>
        <Text style={styles.title}>Map preview unavailable</Text>
        <Text style={styles.body}>
          Browse our service areas while we make the interactive map available. Your booking address remains private.
        </Text>
      </View>
    );
  }

  if (mapStatus === 'error') {
    return (
      <View style={styles.fallback}>
        <Text style={styles.kicker}>Your neighbourhood</Text>
        <Text style={styles.title}>Map preview unavailable</Text>
        <Text style={styles.body}>The map could not load. You can still enter your address and continue your booking.</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Retry service area map"
          style={styles.retry} onPress={() => { setMapStatus('loading'); setAttempt(current => current + 1); }}>
          <Text style={styles.retryText}>Try map again</Text>
        </Pressable>
      </View>
    );
  }

  Mapbox.setAccessToken(token);

  return (
    <View style={styles.shell}>
      <Mapbox.MapView key={attempt} style={styles.map} styleJSON={MONOCHROME_MAP_STYLE_JSON} logoEnabled attributionEnabled compassEnabled scaleBarEnabled={false}
        onDidFinishLoadingMap={() => setMapStatus('ready')}
        onMapLoadingError={() => setMapStatus(current => current === 'ready' ? current : 'error')}>
        <Mapbox.Camera centerCoordinate={center} zoomLevel={10.2} pitch={0} animationMode="flyTo" animationDuration={850} />
        <Mapbox.ShapeSource id="xoot-launch-areas" shape={shape}>
          <Mapbox.CircleLayer
            id="xoot-launch-points"
            style={{
              circleColor: Colors.light.text,
              circleOpacity: 0.92,
              circleRadius: 8,
              circleStrokeColor: Colors.light.backgroundElement,
              circleStrokeWidth: 2,
            }}
          />
          <Mapbox.SymbolLayer
            id="xoot-launch-labels"
            style={{
              textColor: Colors.light.text,
              textField: ['get', 'name'],
              textHaloColor: Colors.light.backgroundElement,
              textHaloWidth: 1.5,
              textOffset: [0, 1.25],
              textSize: 12,
            }}
          />
        </Mapbox.ShapeSource>
      </Mapbox.MapView>
      <View pointerEvents="none" style={styles.overlay}>
        <Text style={styles.kicker}>Five launch neighbourhoods</Text>
        <Text style={styles.body}>Reference locations only. Booking confirms availability.</Text>
      </View>
      {mapStatus === 'loading' && <View pointerEvents="none" style={styles.loading}>
        <ActivityIndicator color={Colors.light.text} />
        <Text style={styles.body} accessibilityLiveRegion="polite">Loading service area map…</Text>
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderColor: alpha('light', 'foreground', 0.14),
    backgroundColor: Colors.light.backgroundElement,
    borderRadius: 20,
    borderWidth: 1,
    height: 320,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  overlay: {
    backgroundColor: alpha('light', 'card', 0.95),
    borderColor: alpha('light', 'foreground', 0.14),
    borderRadius: 16,
    borderWidth: 1,
    top: Spacing.lg,
    left: Spacing.lg,
    padding: Spacing.lg,
    position: 'absolute',
    right: 68, // Leave the native compass accessible at the upper-right corner.
  },
  loading: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: alpha('light', 'card', 0.95),
  },
  retry: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.light.text,
    borderRadius: 22,
    minHeight: 44,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    marginTop: Spacing.sm,
  },
  retryText: {
    color: Colors.light.backgroundElement,
    fontWeight: '800',
    fontSize: 14,
  },
  fallback: {
    backgroundColor: Colors.light.backgroundElement,
    borderColor: alpha('light', 'foreground', 0.14),
    borderRadius: 24,
    borderWidth: 1,
    gap: Spacing.sm,
    minHeight: 220,
    padding: Spacing.xl,
  },
  kicker: {
    color: alpha('light', 'foreground', 0.72),
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    color: Colors.light.text,
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    color: alpha('light', 'foreground', 0.72),
    fontSize: 14,
    lineHeight: 21,
  },
});
