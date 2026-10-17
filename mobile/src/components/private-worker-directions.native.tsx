import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Mapbox, { type Location } from '@rnmapbox/maps';

import { nativePalette } from '@/components/native-core';
import { mobileEnv } from '@/lib/env';
import { supabase } from '@/lib/supabase';
import { validateForegroundWorkerFix } from '@/lib/private-job-location-publisher';
import { requestLiveRoadEstimate, type LiveRoadEstimate } from '@/lib/mapbox-live-routing';

const ENABLED = process.env.EXPO_PUBLIC_ENABLE_LIVE_JOURNEY === 'true';

/** One-off route after worker opt-in; the accepted job destination never enters app storage. */
export function PrivateWorkerDirections({ jobId, bookingId }: { jobId: string; bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [estimate, setEstimate] = useState<LiveRoadEstimate | null>(null);
  const [status, setStatus] = useState('Only you can request your route.');
  const [address, setAddress] = useState<string | null>(null);
  const loading = useRef(false);
  const abort = useRef<AbortController | null>(null);
  const token = mobileEnv.mapboxPublicToken;
  const ready = ENABLED && token.startsWith('pk.');

  const hide = () => {
    abort.current?.abort(); abort.current = null;
    setAddress(null); setEstimate(null); setOpen(false);
  };
  useEffect(() => {
    const listener = AppState.addEventListener('change', state => {
      if (state !== 'active') hide();
    });
    return () => { listener.remove(); abort.current?.abort(); };
  }, []);

  const activate = async () => {
    if (!ready || AppState.currentState !== 'active') return;
    hide();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setStatus('Verifying your accepted booking and requesting foreground location…');
    try {
      if (Platform.OS === 'android' && !(await Mapbox.requestAndroidLocationPermissions())) {
        setStatus('Foreground location permission was denied. No routing request was made.');
        return;
      }
      // A fresh authenticated response is the source of truth, never a client-
      // supplied address or cached private job data.
      const { data, error } = await supabase.functions.invoke('get-xooter-job-cards', {
        body: {}, signal: ctrl.signal,
      });
      if (ctrl.signal.aborted || error || data?.success !== true ||
          !Array.isArray(data?.data?.jobs)) throw new Error('unavailable');
      const matches = data.data.jobs.filter((item: Record<string, unknown>) =>
        item.job_id === jobId && item.booking_id === bookingId && item.state === 'accepted' &&
        ['en_route', 'enroute'].includes(String(item.status)));
      if (matches.length !== 1) throw new Error('unavailable');
      const destination = matches[0].destination_address;
      if (typeof destination !== 'string' || destination.trim().length < 4 ||
          destination.length > 256) throw new Error('unavailable');
      if (AppState.currentState !== 'active' || ctrl.signal.aborted) return;
      Mapbox.setAccessToken(token);
      setAddress(destination);
      setOpen(true);
      setStatus('Waiting for a current device fix…');
    } catch {
      if (!ctrl.signal.aborted) setStatus('Private route unavailable. Use the approved web job workspace.');
    }
  };

  const onFix = (sensor: Location) => {
    if (!open || !address || loading.current || AppState.currentState !== 'active') return;
    const origin = validateForegroundWorkerFix(sensor);
    if (!origin) { setStatus('Waiting for an accurate current position…'); return; }
    const ctrl = abort.current;
    if (!ctrl || ctrl.signal.aborted) return;
    loading.current = true;
    setStatus('Calculating Mapbox road traffic…');
    void requestLiveRoadEstimate(
      { latitude: origin.latitude, longitude: origin.longitude },
      address, token, origin.capturedAt, ctrl.signal,
    ).then(value => {
      if (ctrl.signal.aborted) return;
      setEstimate(value);
      setStatus(value ? 'Estimate calculated at your request, not a guaranteed arrival time.' :
        'Driving estimate unavailable. Try again or use the authorised web workspace.');
      // This is a one-off journey check, not ongoing GPS tracking.
      setOpen(false); setAddress(null);
    }).finally(() => { loading.current = false; });
  };

  if (!ready) return null;
  return <View style={styles.shell}>
    <Text style={styles.heading}>Your road estimate</Text>
    <Text style={styles.copy}>Only for your accepted en-route booking. On request,
      your current device position and the authorised job destination are sent to Mapbox
      to calculate traffic-based driving time. Neither location nor route is saved here.</Text>
    <Pressable accessibilityRole="button" style={styles.action}
      accessibilityLabel={open ? 'Cancel private road estimate' : 'Calculate private road estimate'}
      onPress={() => open ? hide() : void activate()}>
      <Text style={styles.actionText}>{open ? 'Cancel route request' : 'Calculate route'}</Text>
    </Pressable>
    <Text accessibilityLiveRegion="polite" style={styles.copy}>{status}</Text>
    {estimate && <Text style={styles.eta}>Approximately {estimate.minutes} minutes · {estimate.kilometres} km by road.</Text>}
    {open && <View style={styles.mapFrame}>
      <Mapbox.MapView style={styles.map} logoEnabled attributionEnabled>
        <Mapbox.Camera followUserLocation followZoomLevel={14} />
        <Mapbox.UserLocation onUpdate={onFix} requestsAlwaysUse={false} visible />
      </Mapbox.MapView>
    </View>}
  </View>;
}
const styles = StyleSheet.create({
  shell: { padding: 16, borderRadius: 20, gap: 10, backgroundColor: nativePalette.violetWash },
  heading: { fontSize: 18, fontWeight: '700', color: nativePalette.ink },
  copy: { fontSize: 12, lineHeight: 18, color: nativePalette.inkSoft },
  action: { alignSelf: 'flex-start', borderRadius: 22, paddingVertical: 11, paddingHorizontal: 17, borderWidth: 1, borderColor: nativePalette.border },
  actionText: { fontSize: 13, fontWeight: '700', color: nativePalette.violetDark },
  eta: { fontSize: 13, fontWeight: '700', color: nativePalette.ink },
  mapFrame: { height: 205, overflow: 'hidden', borderRadius: 12 },
  map: { flex: 1 },
});
