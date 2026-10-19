import { useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import Mapbox from '@rnmapbox/maps';

import { nativePalette } from '@/components/native-core';
import { mobileEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { readFreshJobPosition, type FreshJobPosition } from '@/lib/private-job-journey';
import { buildSafeTravelUpdate, readPrivateRoadEstimate, type LiveRoadEstimate } from '@/lib/mapbox-live-routing';

// Deliberately opt-in twice: the release must enable this flag, and the
// authenticated customer must explicitly choose to open the private map.
const ENABLED = process.env.EXPO_PUBLIC_ENABLE_LIVE_JOURNEY === 'true';
const POLL_MS = 15_000;
/**
 * Customer-only native viewer. The route supplies an owner-scoped booking ID,
 * but the Edge Function independently verifies the JWT and booking owner.
 * Never query public GPS tables or retain a location beyond this component.
 */
export function PrivateJobJourney({ bookingId }: { bookingId: string; destinationAddress?: string | null }) {
  const [viewing, setViewing] = useState(false);
  const [point, setPoint] = useState<FreshJobPosition | null>(null);
  const [message, setMessage] = useState('Live location not requested');
  const [roadEstimate, setRoadEstimate] = useState<LiveRoadEstimate | null>(null);
  const lastRouteAt = useRef(0);
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
        const next = !error ? readFreshJobPosition(data) : null;
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

  // Client submits only the booking ID: authenticated Xoot Edge reads the
  // accepted job, current shared fix and saved destination on the server.
  // No untrusted client-supplied coordinates/address can alter the ETA.
  useEffect(() => {
    if (!viewing || !point || !configured) {
      setRoadEstimate(null);
      if (!point || !viewing) lastRouteAt.current = 0;
      return;
    }
    if (Date.now() - lastRouteAt.current < 60_000) return;
    lastRouteAt.current = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    void supabase.functions.invoke('xoot-job-location', {
      body: { action: 'eta', bookingId }, signal: controller.signal,
    }).then(({ data, error }) => {
      if (!controller.signal.aborted) setRoadEstimate(!error ? readPrivateRoadEstimate(data) : null);
    }).catch(() => {
      if (!controller.signal.aborted) setRoadEstimate(null);
    }).finally(() => clearTimeout(timeout));
    return () => { controller.abort(); clearTimeout(timeout); };
  }, [bookingId, point, viewing, configured]);

  const freshEta = point && roadEstimate && Number.isFinite(Date.parse(roadEstimate.calculatedAt)) &&
    Date.now() - Date.parse(roadEstimate.calculatedAt) < 60_000 &&
    Date.parse(roadEstimate.fixRecordedAt) >= Date.parse(point.recordedAt) - 60_000
    ? roadEstimate : null;

  const shareEta = async () => {
    if (!freshEta || !point || AppState.currentState !== 'active') return;
    const message = buildSafeTravelUpdate(freshEta);
    if (!message) { setRoadEstimate(null); setMessage('Estimate expired. Wait for a fresh route.'); return; }
    // Do not include a GPS coordinate, household address, or public private-tracking URL.
    try { await Share.share({ message, title: 'Xoot travel update' }); }
    catch { setMessage('Could not open sharing. Your private journey remains available.'); }
  };

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
  // Native map credentials belong to the installed SDK, not a browser token
  // or an unauthenticated HTTP request. Match the proven service-area map setup.
  Mapbox.setAccessToken(token);
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
      {shape && freshEta ? <Text style={styles.eta}>
        Traffic-based estimate: about {freshEta.minutes} minutes · {freshEta.kilometres} km.
        Calculated at {new Date(freshEta.calculatedAt).toLocaleTimeString('en-ZA')}.
        Not a guaranteed arrival time.
      </Text> : null}
      {shape && freshEta && <Pressable accessibilityRole="button" accessibilityLabel="Share current estimated travel time" style={styles.action}
        onPress={() => void shareEta()}><Text style={styles.actionText}>Share travel estimate</Text></Pressable>}
      {shape && !freshEta ? <Text style={styles.status}>Road estimate unavailable.</Text> : null}
      {shape ? <View style={styles.mapFrame}>
        <Mapbox.MapView style={styles.map} logoEnabled attributionEnabled
          onMapLoadingError={() => setMessage('Map tiles unavailable; visit details remain accessible.')}>
          <Mapbox.Camera centerCoordinate={[point!.longitude, point!.latitude]} zoomLevel={13} />
          <Mapbox.ShapeSource id="private-xooter-location" shape={shape}>
            <Mapbox.CircleLayer id="private-xooter-point" style={{
              circleRadius: 8,
              circleColor: nativePalette.violet,
              circleStrokeWidth: 3,
              circleStrokeColor: nativePalette.card,
            }} />
          </Mapbox.ShapeSource>
        </Mapbox.MapView>
      </View> : null}
    </> : null}
  </View>;
}

const styles = StyleSheet.create({
  shell: { backgroundColor: nativePalette.violetWash, borderRadius: 20, gap: 10, padding: 16 },
  heading: { fontSize: 18, fontWeight: '700', color: nativePalette.ink },
  description: { fontSize: 12, color: nativePalette.inkSoft, lineHeight: 19 },
  action: { borderRadius: 22, borderWidth: 1, borderColor: nativePalette.border,
    paddingVertical: 12, paddingHorizontal: 18, alignSelf: 'flex-start' },
  actionText: { fontSize: 13, fontWeight: '700', color: nativePalette.violetDark },
  status: { fontSize: 12, color: nativePalette.inkSoft },
  eta: { fontSize: 13, fontWeight: '700', color: nativePalette.ink, lineHeight: 20 },
  mapFrame: { height: 245, borderRadius: 14, overflow: 'hidden' },
  map: { flex: 1 },
});
