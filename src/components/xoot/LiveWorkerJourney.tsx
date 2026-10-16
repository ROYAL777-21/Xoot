import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker as MapboxMarker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";

const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim() ?? "";
type SafePosition = { latitude: number; longitude: number; received_at: string; accuracy_m: number };

function verifyFreshPosition(value: unknown): SafePosition | null {
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  if (typeof p.latitude !== "number" || !Number.isFinite(p.latitude) || p.latitude < -35 || p.latitude > -22 ||
      typeof p.longitude !== "number" || !Number.isFinite(p.longitude) || p.longitude < 16 || p.longitude > 33.5 ||
      typeof p.accuracy_m !== "number" || p.accuracy_m < 1 || p.accuracy_m > 200 ||
      typeof p.received_at !== "string") return null;
  const ms = Date.parse(p.received_at);
  if (!Number.isFinite(ms) || Date.now() - ms > 60_000 || ms > Date.now() + 5000) return null;
  return p as SafePosition;
}

export function LiveWorkerJourney({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<SafePosition | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unavailable">("idle");
  const root = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const marker = useRef<MapboxMarker | null>(null);

  useEffect(() => {
    setOpen(false);
    setPosition(null);
  }, [bookingId]);

  useEffect(() => {
    if (!open) { setPosition(null); setState("idle"); return; }
    let active = true;
    async function loadPosition() {
      const { data, error } = await supabase.functions.invoke("job-live-location", {
        body: { action: "read", bookingId },
      });
      if (!active) return;
      const p = !error && data?.success === true && data?.data?.available === true
        ? verifyFreshPosition(data.data.position) : null;
      setPosition(p);
      setState(p ? "ready" : "unavailable");
    }
    setState("loading");
    void loadPosition();
    const poll = window.setInterval(() => { if (!document.hidden) void loadPosition(); }, 20_000);
    return () => { active = false; window.clearInterval(poll); };
  }, [bookingId, open]);

  useEffect(() => {
    if (!open || !position || !token.startsWith("pk.")) {
      // Never leave an expired position visible on an old map.
      marker.current?.remove(); marker.current = null;
      map.current?.remove(); map.current = null;
      return;
    }
    if (map.current) {
      map.current.setCenter([position.longitude, position.latitude]);
      marker.current?.setLngLat([position.longitude, position.latitude]);
      return;
    }
    let cancelled = false;
    void import("mapbox-gl").then(module => {
      if (cancelled || !root.current) return;
      const mapboxgl = module.default;
      mapboxgl.accessToken = token;
      map.current = new mapboxgl.Map({
        container: root.current, style: "mapbox://styles/mapbox/streets-v12",
        center: [position.longitude, position.latitude], zoom: 13, attributionControl: true,
      });
      const dot = document.createElement("span");
      dot.setAttribute("aria-label", "Most recently shared assigned Xooter location");
      dot.style.cssText = "display:block;width:17px;height:17px;background:#6954be;border:3px solid white;border-radius:50%;box-shadow:0 1px 5px #0007";
      marker.current = new mapboxgl.Marker({element: dot})
        .setLngLat([position.longitude, position.latitude]).addTo(map.current);
    }).catch(() => { if (!cancelled) setState("unavailable"); });
    return () => { cancelled = true; };
  }, [position, open]);

  useEffect(() => () => {
    marker.current?.remove(); marker.current = null;
    map.current?.remove(); map.current = null;
  }, []);

  const close = () => {
    setOpen(false);
    marker.current?.remove(); marker.current = null;
    map.current?.remove(); map.current = null;
    setPosition(null);
  };
  if (!token.startsWith("pk.")) return null;
  return <div className="rounded-2xl border border-border bg-background p-4">
    <h3 className="mb-2 text-sm font-bold">Assigned Xooter journey</h3>
    <p className="mb-3 text-xs text-muted-foreground">When your assigned Xooter explicitly shares their foreground position, you can view the latest update. This is not a continuous arrival-time promise.</p>
    <button type="button" className="rounded-full border border-border px-4 py-2 text-sm font-semibold"
      aria-pressed={open} onClick={() => open ? close() : setOpen(true)}>
      {open ? "Close worker location map" : "View available worker location"}
    </button>
    {open && <div className="mt-3 space-y-2">
      <div ref={root} role="region" aria-label="Authorised live Xooter position on Mapbox" className="w-full overflow-hidden rounded-xl" style={{ height: 230 }} />
      <p role="status" className="text-xs text-muted-foreground">
        {state === "loading" ? "Checking for a recent, authorised worker location…" :
          state === "ready" && position ? `Last verified position: ${new Date(position.received_at).toLocaleTimeString("en-ZA")}. Approximate GPS accuracy ±${Math.ceil(position.accuracy_m)} m.` :
          "Live location currently unavailable. Booking status remains available below."}
      </p>
    </div>}
  </div>;
}
