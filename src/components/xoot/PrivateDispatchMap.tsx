import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import { MapPin, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "mapbox-gl/dist/mapbox-gl.css";

const TOKEN = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim() ?? "";
const ENABLED = import.meta.env.VITE_ENABLE_LIVE_JOURNEY === "true";
type DispatchPoint = { bookingId: string; latitude: number; longitude: number; expiresAt: string; recordedAt: string };

function parseDispatch(response: unknown): DispatchPoint[] | null {
  if (!response || typeof response !== "object") return null;
  const envelope = response as { success?: unknown; data?: { state?: unknown; points?: unknown } };
  if (envelope.success !== true || envelope.data?.state !== "available" ||
      !Array.isArray(envelope.data.points) || envelope.data.points.length > 30) return null;
  const now = Date.now();
  const seen = new Set<string>();
  const points: DispatchPoint[] = [];
  for (const item of envelope.data.points) {
    if (!item || typeof item !== "object") return null;
    const p = item as Record<string, unknown>;
    if (typeof p.bookingId !== "string" || !/^[0-9a-f-]{36}$/i.test(p.bookingId) ||
        seen.has(p.bookingId) || typeof p.latitude !== "number" ||
        typeof p.longitude !== "number" || !Number.isFinite(p.latitude) ||
        !Number.isFinite(p.longitude) || Math.abs(p.latitude) > 90 ||
        Math.abs(p.longitude) > 180 || typeof p.expiresAt !== "string" ||
        typeof p.recordedAt !== "string") return null;
    const recorded = Date.parse(p.recordedAt), expiry = Date.parse(p.expiresAt);
    if (!Number.isFinite(recorded) || !Number.isFinite(expiry) ||
        expiry <= now || now - recorded > 60_000 || recorded > now + 30_000) continue;
    seen.add(p.bookingId);
    points.push({ bookingId: p.bookingId, latitude: p.latitude, longitude: p.longitude,
      expiresAt: p.expiresAt, recordedAt: p.recordedAt });
  }
  return points;
}

/** MFA-protected admin workspace mounts this only after explicit opt-in. */
export function PrivateDispatchMap() {
  const [show, setShow] = useState(false);
  const [points, setPoints] = useState<DispatchPoint[]>([]);
  const [message, setMessage] = useState("Dispatch map is closed.");
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const markers = useRef<MapboxMarker[]>([]);
  const latest = useRef<DispatchPoint[]>([]);
  latest.current = points;

  useEffect(() => {
    if (!show) { setPoints([]); return; }
    let cancelled = false, reading = false;
    const update = async () => {
      if (document.visibilityState !== "visible" || reading) return;
      reading = true;
      try {
        const { data, error } = await supabase.functions.invoke("xoot-job-location", { body: { action: "dispatch" } });
        if (cancelled) return;
        const valid = !error ? parseDispatch(data) : null;
        setPoints(valid ?? []);
        setMessage(valid ? `${valid.length} currently sharing en-route journey(s).` :
          "Dispatch feed unavailable. No positions shown.");
      } catch {
        if (!cancelled) { setPoints([]); setMessage("Dispatch feed unavailable."); }
      } finally { reading = false; }
    };
    const hidden = () => {
      if (document.visibilityState !== "visible") {
        setShow(false);
        setPoints([]);
        setMessage("Dispatch map closed while window was hidden.");
      }
    };
    document.addEventListener("visibilitychange", hidden);
    void update();
    const timer = window.setInterval(() => void update(), 15_000);
    const expiry = window.setInterval(() => {
      if (!cancelled) setPoints(current => current.filter(p => Date.parse(p.expiresAt) > Date.now()));
    }, 1000);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", hidden);
      window.clearInterval(timer); window.clearInterval(expiry);
      setPoints([]);
    };
  }, [show]);

  useEffect(() => {
    if (!show || !container.current || !TOKEN.startsWith("pk.") || points.length === 0) {
      markers.current.forEach(marker => marker.remove()); markers.current = [];
      if (!show || points.length === 0) { map.current?.remove(); map.current = null; }
      return;
    }
    let cancelled = false;
    void import("mapbox-gl").then(module => {
      if (cancelled || !container.current) return;
      const lib = module.default;
      lib.accessToken = TOKEN;
      if (!map.current) {
        map.current = new lib.Map({
          container: container.current, style: "mapbox://styles/mapbox/streets-v12",
          center: [points[0].longitude, points[0].latitude], zoom: 10.5,
          attributionControl: true,
        });
      }
      markers.current.forEach(marker => marker.remove()); markers.current = [];
      points.forEach(p => {
        const pin = document.createElement("span");
        pin.setAttribute("aria-label", "Consenting active job location");
        pin.style.cssText = "width:15px;height:15px;display:block;border-radius:50%;background:#6954be;border:2px solid white";
        markers.current.push(new lib.Marker({ element: pin })
          .setLngLat([p.longitude,p.latitude]).addTo(map.current!));
      });
    }).catch(() => {
      if (!cancelled) { setPoints([]); setMessage("Map tiles unavailable; no positions shown."); }
    });
    return () => { cancelled = true; };
  }, [show, points]);

  useEffect(() => () => {
    markers.current.forEach(marker => marker.remove()); markers.current = [];
    map.current?.remove(); map.current = null;
  }, []);

  if (!ENABLED || !TOKEN.startsWith("pk.")) return null;
  return <section aria-label="Private live dispatch map" className="mb-8 rounded-3xl border border-border bg-background p-5">
    <h2 className="mb-2 flex items-center gap-2 font-display text-xl font-bold">
      <MapPin className="h-5 w-5" /> Active journey dispatch
    </h2>
    <p className="mb-3 text-xs text-muted-foreground">Administrative, MFA-gated view of workers who explicitly share during active jobs. Only the latest short-lived location is visible; no historical routes, home addresses or customer details are included. Opening the map sends displayed points to Mapbox.</p>
    <button type="button" onClick={() => { setShow(v => !v); setPoints([]); }}
      className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
      {show ? "Close dispatch map" : "View live dispatch"}
    </button>
    {show && <><p className="my-3 flex items-center gap-2 text-xs text-muted-foreground" role="status">
      <ShieldCheck className="h-4 w-4" />{message}</p>
      {points.length > 0 && <div ref={container} className="h-72 overflow-hidden rounded-2xl"
        role="region" aria-label="Latest current consenting worker positions" />}
    </>}
  </section>;
}
