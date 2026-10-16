import { useCallback, useEffect, useRef, useState } from "react";
import { MapPin, Navigation, ShieldCheck } from "lucide-react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { supabase } from "@/integrations/supabase/client";
import "mapbox-gl/dist/mapbox-gl.css";

const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim() ?? "";
const ENABLED = import.meta.env.VITE_ENABLE_LIVE_JOURNEY === "true";
const REPORT_SPACING_MS = 15_000;
const READ_SPACING_MS = 15_000;

type LivePoint = { latitude: number; longitude: number; recordedAt: string; expiresAt: string };
type JourneyPayload = { success?: unknown; data?: {
  state?: unknown; latitude?: unknown; longitude?: unknown; recordedAt?: unknown; expiresAt?: unknown;
} };

function validPoint(value: unknown): LivePoint | null {
  const data = value as JourneyPayload | null;
  const payload = data?.data;
  if (data?.success !== true || payload?.state !== "current" ||
      typeof payload.latitude !== "number" || !Number.isFinite(payload.latitude) ||
      typeof payload.longitude !== "number" || !Number.isFinite(payload.longitude) ||
      Math.abs(payload.latitude) > 90 || Math.abs(payload.longitude) > 180 ||
      typeof payload.recordedAt !== "string" || typeof payload.expiresAt !== "string") return null;
  const recorded = Date.parse(payload.recordedAt), expires = Date.parse(payload.expiresAt), now = Date.now();
  if (!Number.isFinite(recorded) || !Number.isFinite(expires) ||
      now > expires || now - recorded > 60_000 || recorded > now + 30_000) return null;
  return { latitude: payload.latitude, longitude: payload.longitude,
    recordedAt: payload.recordedAt, expiresAt: payload.expiresAt };
}

/** Authenticated, job-scoped transport; OFF by default until real RLS/device sign-off. */
export function LiveJobJourney({ bookingId, isAssignedWorker }: { bookingId: string; isAssignedWorker: boolean }) {
  const [enabled, setEnabled] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [position, setPosition] = useState<LivePoint | null>(null);
  const [status, setStatus] = useState("Live journey not started");
  const watch = useRef<number | null>(null);
  const lastPublish = useRef(0);
  const saving = useRef(false);
  const reading = useRef(false);
  const sharingActive = useRef(false);
  const inFlightPublish = useRef<Promise<unknown> | null>(null);
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const map = useRef<MapboxMap | null>(null);
  const marker = useRef<MapboxMarker | null>(null);

  const stopSharing = useCallback(async () => {
    // Stop accepting GPS callbacks first, then wait for any in-flight report before
    // revoking the server row. Otherwise a late publish could undo Stop sharing.
    sharingActive.current = false;
    if (watch.current !== null && navigator.geolocation) {
      navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    }
    setSharing(false);
    lastPublish.current = 0;
    const pending = inFlightPublish.current;
    if (pending) await pending.catch(() => null);
    // Stop is best effort; server expiry and booking lifecycle also revoke access.
    await supabase.functions.invoke("xoot-job-location", { body: { action: "stop", bookingId } }).catch(() => null);
  }, [bookingId]);

  useEffect(() => {
    return () => {
      if (watch.current !== null && navigator.geolocation) navigator.geolocation.clearWatch(watch.current);
      // No asynchronous teardown dependency. Even if this network call fails, server-side
      // expiry and booking status gates revoke access within a minute.
      if (isAssignedWorker && watch.current !== null) {
        void supabase.functions.invoke("xoot-job-location", { body: { action: "stop", bookingId } });
      }
      map.current?.remove();
      map.current = null;
      marker.current = null;
    };
  }, [bookingId, isAssignedWorker]);

  // A hidden tab must never continue publishing foreground positions.
  useEffect(() => {
    if (!sharing) return;
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        void stopSharing();
        setStatus("Sharing stopped when the page was hidden.");
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, [sharing, stopSharing]);

  // A stale fix removes the marker and map immediately. The map container is
  // conditionally mounted, so reusing the old Mapbox instance would leave a blank map.
  useEffect(() => {
    if (enabled && position) return;
    map.current?.remove();
    map.current = null;
    marker.current = null;
  }, [enabled, position]);

  useEffect(() => {
    if (!enabled || isAssignedWorker) return;
    let cancelled = false;
    const read = async () => {
      if (document.visibilityState === "hidden" || reading.current) return;
      reading.current = true;
      try {
        const { data, error } = await supabase.functions.invoke("xoot-job-location", {
          body: { action: "read", bookingId },
        });
        if (cancelled) return;
        const current = !error ? validPoint(data) : null;
        setPosition(current);
        setStatus(current ? "Recent en-route position — not a guaranteed arrival time" : "Live location unavailable");
      } catch {
        if (!cancelled) { setPosition(null); setStatus("Live location unavailable"); }
      } finally { reading.current = false; }
    };
    void read();
    const timer = window.setInterval(() => void read(), READ_SPACING_MS);
    return () => { cancelled = true; window.clearInterval(timer); setPosition(null); };
  }, [bookingId, enabled, isAssignedWorker]);

  useEffect(() => {
    if (!enabled || !position || !mapContainer.current || !mapboxToken.startsWith("pk.")) return;
    let cancelled = false;
    void import("mapbox-gl").then(module => {
      if (cancelled || !mapContainer.current) return;
      const mapboxgl = module.default;
      mapboxgl.accessToken = mapboxToken;
      if (!map.current) {
        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [position.longitude, position.latitude], zoom: 12,
          attributionControl: true,
        });
      }
      if (!marker.current) marker.current = new mapboxgl.Marker({ color: "#6954be" })
        .setLngLat([position.longitude, position.latitude]).addTo(map.current);
      else marker.current.setLngLat([position.longitude, position.latitude]);
      map.current.easeTo({ center: [position.longitude, position.latitude], duration: 350 });
    }).catch(() => { if (!cancelled) setStatus("Map unavailable. Recorded booking status is still accessible."); });
    return () => { cancelled = true; };
  }, [enabled, position]);

  if (!ENABLED || !mapboxToken.startsWith("pk.")) return null;

  const startSharing = () => {
    if (!navigator.geolocation || document.visibilityState !== "visible") {
      setStatus("Location unavailable. Keep the app open and allow foreground location.");
      return;
    }
    if (watch.current !== null) return;
    setEnabled(true);
    setSharing(true);
    setStatus("Requesting your location for this one active booking…");
    sharingActive.current = true;
    watch.current = navigator.geolocation.watchPosition(async fix => {
      if (!sharingActive.current || document.visibilityState !== "visible" || saving.current || Date.now() - lastPublish.current < REPORT_SPACING_MS) return;
      if (!Number.isFinite(fix.coords.accuracy) || fix.coords.accuracy > 100) {
        setStatus("Waiting for a more accurate location fix…");
        return;
      }
      saving.current = true;
      lastPublish.current = Date.now();
      const request = supabase.functions.invoke("xoot-job-location", {
        body: { action: "publish", bookingId, consent: true,
          latitude: fix.coords.latitude, longitude: fix.coords.longitude,
          accuracyM: fix.coords.accuracy, capturedAt: new Date(fix.timestamp).toISOString() },
      });
      inFlightPublish.current = request;
      try {
        const { data, error } = await request;
        if (!sharingActive.current) return;
        if (error || !(data as JourneyPayload | null)?.success || (data as JourneyPayload).data?.state !== "accepted") {
          setStatus("Location sharing could not be confirmed. Check your connection.");
        } else setStatus("Position shared for this booking while the page is open.");
      } catch { if (sharingActive.current) setStatus("Location sharing unavailable. Try again."); }
      finally { if (inFlightPublish.current === request) inFlightPublish.current = null; saving.current = false; }
    }, () => { setStatus("Location permission denied or position unavailable."); void stopSharing(); },
    { enableHighAccuracy: true, maximumAge: 0, timeout: 10_000 });
  };

  return (
    <section aria-label="Private live job journey" className="rounded-2xl border border-border bg-background p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Navigation size={18} /> Private journey</h3>
      {isAssignedWorker ? <>
        <p className="mb-3 text-xs text-muted-foreground">Optional foreground-only sharing for this accepted job. While this page is visible, your current location is sent to Xoot. Your assigned customer can view a fresh position; location is cleared after the journey or when you stop sharing.</p>
        <button type="button" className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          onClick={() => sharing ? void stopSharing() : startSharing()}>
          {sharing ? "Stop sharing my location" : "Share my location for this booking"}
        </button>
      </> : <>
        <p className="mb-3 text-xs text-muted-foreground">Only for your currently assigned Xooter while en route. When enabled, the displayed map location is sent to Mapbox for map tiles. No exact arrival estimate is implied.</p>
        <button type="button" className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
          aria-pressed={enabled} onClick={() => { setEnabled(value => !value); setPosition(null); }}>
          {enabled ? "Hide live journey" : "View en-route location"}
        </button>
        {enabled && position && <div ref={mapContainer} role="region" aria-label="Latest authorised Xooter location, not a live arrival ETA"
          className="mt-3 h-64 overflow-hidden rounded-xl" />}
      </>}
      <p role="status" className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck size={14}/><MapPin size={14}/>{status}
      </p>
    </section>
  );
}
