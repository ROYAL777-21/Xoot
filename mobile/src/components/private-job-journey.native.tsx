import { useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { mobileEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';

// Deliberately opt-in twice: the release must enable this flag, and the
// authenticated customer must explicitly choose to open the private map.
const ENABLED = process.env.EXPO_PUBLIC_ENABLE_LIVE_JOURNEY === 'true';
const POLL_MS = 15_000;
const MAX_FIX_AGE_MS = 60_000;
type Point = { latitude: number; longitude: number; expiresAt: string };

function readFreshPosition(payload: unknown): Point | null {
  if (!payload || typeof payload !== 'object') return null;
  const envelope = payload as { success?: unknown; data?: unknown };
  if (envelope.success !== true || !envelope.data || typeof envelope.data !== 'object') return null;
  const fix = envelope.data as Record<string, unknown>;
  if (fix.state !== 'current' || typeof fix.latitude !== 'number' ||
      typeof fix.longitude !== 'number' || !Number.isFinite(fix.latitude) ||
      !Number.isFinite(fix.longitude) || Math.abs(fix.latitude) > 90 ||
      Math.abs(fix.longitude) > 180 || typeof fix.recordedAt !== 'string' ||
      typeof fix.expiresAt !== 'string') return null;
  const recorded = Date.parse(fix.recordedAt);
  const expires = Date.parse(fix.expiresAt);
  const now = Date.now();
  if (!Number.isFinite(recorded) || !Number.isFinite(expires) ||
      recorded > now + 30_000 || now - recorded > MAX_FIX_AGE_MS || expires <= now) return null;
  return { latitude: fix.latitude, longitude: fix.longitude, expiresAt: fix.expiresAt };
}

/**
 * Customer-only native viewer. The route supplies an owner-scoped booking ID,
 * but the Edge Function independently verifies the JWT and booking owner.
 * Never query public GPS tables or retain a location beyond this component.
 */
export function PrivateJobJourney({ bookingId }: { bookingId: string }) {
  const [viewing, setViewing] = useState(false);
  const [point, setPoint] = useState<Point | null>(null);
  const [message, setMessage] = useState('Live location not requested');
  const token = mobileEnv.mapboxPublicToken;
  const configured = ENABLED && token.startsWith('pk.');

  useEffect(() => {
    if (!viewing) { setPoint(null); return; }
    // Going inactive immediately hides precise coordinates and requires
    // another explicit customer opt-in after foregrounding.
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') {
        setPoint(null);
        setViewing(false);
      }
    });
    return () => listener.remove();
  }, [viewing]);

  useEffect(() => {
    if (!viewing || !configured || AppState.currentState !== 'active') return;
    let cancelled = false;
    let busy = false;
    const read = async () => {
      if (busy || AppState.currentState !== 'active') return;
      busy = true;
      try {
        const { data, error } = await supabase.functions.invoke('xoot-job-location', {
          body: { action: 'read', bookingId },
        });
        if (cancelled) return;
        const next = !error ? readFreshPosition(data) : null;
        setPoint(next);
        setMessage(next ? 'Latest available position — not an arrival estimate' :
          'Live location is currently unavailable');
      } catch {
        if (!cancelled) {
          setPoint(null);
          setMessage('Live location is currently unavailable');
        }
      } finally {
        busy = false;
      }
    };
    void read();
    const timer = setInterval(() => void read(), POLL_MS);
    return () => { cancelled = true; clearInterval(timer); setPoint(null); };
  }, [bookingId, configured, viewing]);

  // Hide the precise marker as soon as its own server expiry is reached,
  // even if there has not yet been another network response.
  useEffect(() => {
    if (!point) return;
    const remaining = Date.parse(point.expiresAt) - Date.now();
    if (remaining <= 0) { setPoint(null); return; }
    const timeout = setTimeout(() => setPoint(null), remaining);
    return () => clearTimeout(timeout);
  }, [point]);

  const shape = useMemo(() => point ? ({
    type: 'FeatureCollection' as const,
    features: [{
      type: 'Feature' as const,
      properties: {},
      geometry: {
        type: 'Point' as const,
        coordinates: [point.longitude, point.latitude],
      },
    }],
  }) : null, [point]);

  if (!configured) return null;
  return <View style={styles.shell}>
    <Text style={styles.heading}>Private journey</Text>
    <Text style={styles.description}>If your Xooter chooses to share while travelling,
      you can view their recent location for this booking. Opening this map sends its
      displayed coordinates to Mapbox. No exact arrival time is promised.</Text>
    <Pressable accessibilityRole="button"
      accessibilityLabel={viewing ? 'Hide private live journey' : 'View private live journey'}
      accessibilityState={{ selected: viewing }}
      style={styles.action}
      onPress={() => { setViewing(value => !value); setPoint(null); }}>
      <Text style={styles.actionText}>{viewing ? 'Hide live journey' : 'View live journey'}</Text>
    </Pressable>
    {viewing ? <>
      <Text accessibilityLiveRegion="polite" style={styles.status}>{message}</Text>
      {shape ? <View style={styles.mapFrame}>
        <Mapbox.MapView style={styles.map} logoEnabled attributionEnabled
          onMapLoadingError={() => setMessage('Map tiles unavailable; visit details remain accessible.')}>
          <Mapbox.Camera centerCoordinate={[point!.longitude, point!.latitude]} zoomLevel={13} />
          <Mapbox.ShapeSource id="private-xooter-location" shape={shape}>
            <Mapbox.CircleLayer id="private-xooter-point" style={{
              circleRadius: 8,
              circleColor: '#6855BB',
              circleStrokeWidth: 3,
              circleStrokeColor: '#FFFFFF',
            }} />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      </View> : null}
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  shell: { backgroundColor: '#F6F3FA', borderRadius: 20, gap: 10, padding: 16 },
  heading: { fontSize: 18, fontWeight: '700', color: '#1F1C25' },
  description: { fontSize: 12, color: '#55505B', lineHeight: 19 },
  action: { borderRadius: 22, borderWidth: 1, borderColor: '#D7CFE8',
    paddingVertical: 12, paddingHorizontal: 18, alignSelf: 'flex-start' },
  actionText: { fontSize: 13, fontWeight: '700', color: '#59419D' },
  status: { fontSize: 12, color: '#55505B' },
  mapFrame: { height: 245, borderRadius: 14, overflow: 'hidden' },
  map: { flex: 1 },
});
