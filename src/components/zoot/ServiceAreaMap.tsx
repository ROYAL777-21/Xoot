import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Map as MapboxMap } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ArrowRight, LocateFixed, MapPin, ShieldCheck } from "lucide-react";
import { approvedLaunchRegions } from "@/lib/operations";

const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim();

const serviceAreas = [
  { name: "Sandton", coordinates: [28.0573, -26.1076], note: "Office resets and apartments" },
  { name: "Bryanston", coordinates: [28.0061, -26.0507], note: "Family homes and estates" },
  { name: "Rosebank", coordinates: [28.0416, -26.1467], note: "Apartments and workspaces" },
  { name: "Fourways", coordinates: [28.0068, -26.0206], note: "Townhouses and estates" },
  { name: "Midrand", coordinates: [28.128, -25.9992], note: "Homes, offices and turns" },
] satisfies Array<{ name: string; coordinates: [number, number]; note: string }>;

export const ServiceAreaMap = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!mapboxToken || !mapContainerRef.current || mapRef.current) return;

    let disposed = false;

    const initialiseMap = async () => {
      const { default: mapboxgl } = await import("mapbox-gl");
      if (disposed || !mapContainerRef.current || mapRef.current) return;

      mapboxgl.accessToken = mapboxToken;
      const map = new mapboxgl.Map({
        attributionControl: false,
        bearing: -12,
        center: [28.0473, -26.108],
        container: mapContainerRef.current,
        pitch: 42,
        style: "mapbox://styles/mapbox/standard",
        zoom: 10.25,
      });

      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");
      map.addControl(new mapboxgl.NavigationControl({ showCompass: true, visualizePitch: true }), "bottom-right");
      map.on("load", () => setMapReady(true));

      serviceAreas.forEach((area) => {
        const marker = document.createElement("div");
        marker.className = "grid h-9 w-9 place-items-center rounded-full border border-white/60 bg-primary text-primary-foreground shadow-warm";
        const markerDot = document.createElement("span");
        markerDot.className = "h-2.5 w-2.5 rounded-full bg-current";
        marker.appendChild(markerDot);

        const popupContent = document.createElement("div");
        const popupTitle = document.createElement("strong");
        popupTitle.textContent = area.name;
        const popupNote = document.createElement("span");
        popupNote.textContent = area.note;
        popupContent.append(popupTitle, document.createElement("br"), popupNote);

        new mapboxgl.Marker({ element: marker, anchor: "center" })
          .setLngLat(area.coordinates)
          .setPopup(new mapboxgl.Popup({ closeButton: false, offset: 18 }).setDOMContent(popupContent))
          .addTo(map);
      });

      mapRef.current = map;
    };

    void initialiseMap();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <section className="overflow-hidden border-y border-border bg-background py-14">
      <div className="container grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <LocateFixed className="h-3.5 w-3.5" />
            Mapbox-powered coverage
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            See where Zoot is launching, then book from the same flow.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Zoot uses map-aware coverage checks for launch suburbs, contractor dispatch, ETA surfaces and safe route context. Public maps show service areas only; exact customer addresses and access notes stay inside protected booking screens.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {approvedLaunchRegions.slice(0, 8).map((region) => (
              <span key={region} className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold capitalize text-foreground/75 shadow-card">
                {region}
              </span>
            ))}
          </div>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link to="/app" className="interactive-press inline-flex h-12 items-center justify-center rounded-full bg-primary px-5 text-sm font-bold text-primary-foreground shadow-warm">
              Check prices in my area
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link to="/care-plus" className="liquid-glass-interactive inline-flex h-12 items-center justify-center rounded-full px-5 text-sm font-bold text-foreground shadow-card">
              Keep my favourite Zooter
            </Link>
          </div>
        </div>

        <div className="liquid-glass-shell relative min-h-[22rem] overflow-hidden rounded-[2rem] shadow-warm">
          {mapboxToken ? (
            <>
              <div ref={mapContainerRef} className="absolute inset-0" aria-label="Zoot service area map" />
              {!mapReady && (
                <div className="liquid-glass-readable absolute inset-4 grid place-items-center rounded-[1.5rem] bg-background/70 text-sm font-semibold text-muted-foreground">
                  Loading service map
                </div>
              )}
            </>
          ) : (
            <div className="liquid-glass-readable absolute inset-0 grid place-items-center p-6">
              <div className="max-w-sm text-center">
                <MapPin className="mx-auto mb-4 h-8 w-8 text-primary" />
                <h3 className="font-display text-2xl font-bold">Mapbox is ready for activation.</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Add `VITE_MAPBOX_PUBLIC_TOKEN` in the host or GitHub repository variables to render the live coverage map.
                </p>
              </div>
            </div>
          )}
          <div className="liquid-glass-readable absolute bottom-4 left-4 right-4 flex flex-col gap-2 rounded-3xl border border-white/35 bg-background/78 p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/15 text-sage-deep">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-bold">Privacy-first dispatch</p>
                <p className="text-xs text-muted-foreground">Public coverage, private addresses.</p>
              </div>
            </div>
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">No live tracking on public pages</span>
          </div>
        </div>
      </div>
    </section>
  );
};
