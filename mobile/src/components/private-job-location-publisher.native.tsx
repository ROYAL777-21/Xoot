import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Mapbox, { type Location } from '@rnmapbox/maps';

import { nativePalette } from '@/components/native-core';
import { mobileEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { validateForegroundWorkerFix, WORKER_REPORT_SPACING_MS } from '@/lib/private-job-location-publisher';

// Available only in signed native builds after privacy/security/physical-device approval.
// Explicit tap is required for each job and foreground session, never background tracking.
const ENABLED = process.env.EXPO_PUBLIC_ENABLE_LIVE_JOURNEY === 'true';

export function PrivateJobLocationPublisher({ bookingId }: { bookingId: string }) {
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState('You are not sharing your location');
  const allowed = useRef(false);
  const saving = useRef(false);
  const lastPublished = useRef(0);
  const pending = useRef<Promise<unknown> | null>(null);
  const token = mobileEnv.mapboxPublicToken;
  const configured = ENABLED && token.startsWith('pk.');

  const stop = useCallback(async () => {
    allowed.current = false;
    setSharing(false);
    // Wait for an in-flight publish to finish, then revoke the row. An
    // out-of-order Stop must never be overwritten by an older GPS callback.
    const outstanding = pending.current;
    if (outstanding) await outstanding.catch(() => null);
    await supabase.functions.invoke('xoot-job-location', {
      body: { action: 'stop', bookingId },
    }).catch(() => null);
    lastPublished.current = 0;
    setStatus('Location sharing stopped');
  }, [bookingId]);

  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active' && allowed.current) void stop();
    });
    return () => {
      listener.remove();
      if (allowed.current) void stop();
    };
  }, [stop]);

  const start = async () => {
    if (!configured || AppState.currentState !== 'active' || allowed.current) return;
    // Android requires an explicit system permission prompt; iOS UserLocation
    // requests When In Use via NSLocationWhenInUseUsageDescription in app.config.
    try {
      if (Platform.OS === 'android' && !(await Mapbox.requestAndroidLocationPermissions())) {
        setStatus('Location permission was not granted. Sharing remains off.');
        return;
      }
    } catch {
      setStatus('Location permission is unavailable. Sharing remains off.');
      return;
    }
    if (AppState.currentState !== 'active') return;
    Mapbox.setAccessToken(token);
    lastPublished.current = 0;
    allowed.current = true;
    setSharing(true);
    setStatus('Waiting for a precise, recent foreground location fix…');
  };

  const onFix = (fix: Location) => {
    if (!allowed.current || AppState.currentState !== 'active' || saving.current ||
        Date.now() - lastPublished.current < WORKER_REPORT_SPACING_MS) return;
    const position = validateForegroundWorkerFix(fix);
    if (!position) {
      setStatus('Waiting for a more accurate and recent location fix…');
      return;
    }
    lastPublished.current = Date.now();
    saving.current = true;
    const request = supabase.functions.invoke('xoot-job-location', {
      body: { action: 'publish', bookingId, consent: true, ...position },
    });
    pending.current = request;
    void request.then(({ data, error }) => {
      if (!allowed.current) return;
      const reply = data as { success?: unknown; data?: { state?: unknown } } | null;
      if (error || reply?.success !== true || reply.data?.state !== 'accepted') {
        // If the booking is no longer active, clear the last position and revoke.
        setStatus('This job cannot share a location. Sharing has stopped.');
        void stop();
      } else {
        setStatus('Your location is shared for this booking while this screen is visible.');
      }
    }).catch(() => {
      if (allowed.current) {
        setStatus('Connection lost. Sharing has stopped.');
        void stop();
      }
    }).finally(() => {
      if (pending.current === request) pending.current = null;
      saving.current = false;
    });
  };

  if (!configured) return null;
  return <View style={styles.shell}>
    <Text style={styles.heading}>Share your journey</Text>
    <Text style={styles.detail}>Optional, only while you are on your way to this accepted
      booking. Your customer can see a recent position while this screen is open.
      No past route is stored. Switching apps or stopping sharing revokes the current position.</Text>
    <Pressable accessibilityRole="button"
      accessibilityLabel={sharing ? 'Stop sharing location' : 'Start sharing location'}
      style={styles.action}
      onPress={() => sharing ? void stop() : void start()}>
      <Text style={styles.actionText}>{sharing ? 'Stop sharing my location' : 'Share my location'}</Text>
    </Pressable>
    <Text accessibilityLiveRegion="polite" style={styles.status}>{status}</Text>
    {sharing && <View style={styles.mapFrame}>
      <Mapbox.MapView style={styles.map} logoEnabled attributionEnabled
        onMapLoadingError={() => setStatus('Map tiles unavailable. Stop sharing if your location cannot be verified.')}>
        <Mapbox.Camera followUserLocation followZoomLevel={14} />
        <Mapbox.UserLocation onUpdate={onFix} visible requestsAlwaysUse={false} />
      </Mapbox.MapView>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  shell: { backgroundColor: nativePalette.violetWash, borderRadius: 20, gap: 10, padding: 16 },
  heading: { fontSize: 18, fontWeight: '700', color: nativePalette.ink },
  detail: { color: nativePalette.inkSoft, fontSize: 12, lineHeight: 19 },
  action: { borderRadius: 20, borderWidth: 1, borderColor: nativePalette.border,
    alignSelf: 'flex-start', paddingHorizontal: 17, paddingVertical: 12 },
  actionText: { fontSize: 13, fontWeight: '700', color: nativePalette.violetDark },
  status: { fontSize: 12, color: nativePalette.inkSoft },
  mapFrame: { height: 240, borderRadius: 14, overflow: 'hidden' },
  map: { flex: 1 },
});
