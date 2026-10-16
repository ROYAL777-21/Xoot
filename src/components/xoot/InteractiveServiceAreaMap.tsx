import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const token = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim() ?? "";

/** Only public suburb reference positions. Never add customer or worker coordinates here. */
const neighbourhoods: ReadonlyArray<{ name: string; lng: number; lat: number }> = [
  { name: "Sandton", lng: 28.056, lat: -26.107 },
  { name: "Bryanston", lng: 28.020, lat: -26.060 },
  { name: "Rosebank", lng: 28.041, lat: -26.146 },
  { name: "Fourways", lng: 28.010, lat: -26.020 },
  { name: "Midrand", lng: 28.130, lat: -25.990 },
];

export function InteractiveServiceAreaMap() {
  const element = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "error" | "unconfigured">(
    token.startsWith("pk.") ? "loading" : "unconfigured",
  );

  useEffect(() => {
    if (!token.startsWith("pk.")) return;
    let disposed = false;
    let map: MapboxMap | null = null;
    setStatus("loading");
    const watchdog = window.setTimeout(() => { if (!disposed) setStatus(current => current === "ready" ? current : "error"); }, 15000);

    void import("mapbox-gl").then(module => {
      if (disposed || !element.current) return;
      const mapboxgl = module.default;
      mapboxgl.accessToken = token;
      map = new mapboxgl.Map({
        container: element.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [28.06, -26.08],
        zoom: 10.2,
        attributionControl: true,
      });
      map.on("load", () => { if (!disposed) { window.clearTimeout(watchdog); setStatus("ready"); } });
      map.on("error", () => { if (!disposed) setStatus(current => current === "ready" ? current : "error"); });
      neighbourhoods.forEach(area => {
        const pin = document.createElement("span");
        pin.title = area.name;
        pin.setAttribute("aria-label", `${area.name} reference location`);
        pin.style.cssText = "display:block;width:13px;height:13px;border-radius:100%;border:2px solid #fff;background:#6954be;box-shadow:0 1px 5px #0006";
        new mapboxgl.Marker({ element: pin }).setLngLat([area.lng, area.lat]).addTo(map!);
      });
    }).catch(() => { if (!disposed) setStatus("error"); });

    return () => {
      disposed = true;
      window.clearTimeout(watchdog);
      map?.remove();
    };
  }, [attempt]);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Interactive Mapbox reference map. These five pins are neighbourhood centres, not customer addresses or proof a Xooter is available.</p>
      <div className="relative overflow-hidden rounded-xl border border-border" style={{ height: 260 }}>
        <div ref={element} role="region" aria-label="Interactive Mapbox map showing five Johannesburg reference suburbs"
          className="h-full w-full" />
        {status !== "ready" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/95 p-5 text-center text-sm" role="status">
            <span>{status === "loading" ? "Loading Johannesburg map…" : "Interactive map unavailable. You can continue to book without it."}</span>
            {status === "error" && <button type="button" onClick={() => setAttempt(v => v + 1)}
              className="rounded-full border border-border px-4 py-2 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">Try map again</button>}
          </div>
        )}
      </div>
    </div>
  );
}
