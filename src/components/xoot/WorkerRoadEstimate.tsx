import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import {
  mapboxDirectionsUrl, mapboxRoutingDestinationUrl,
  parseMapboxRoadEstimate, readTemporaryDestination,
} from "@/lib/mapbox-directions";

const mapboxToken = import.meta.env.VITE_MAPBOX_PUBLIC_TOKEN?.trim() ?? "";

/** Only mount for JWT-verified assigned worker in an active job; never show on public routes. */
export function WorkerRoadEstimate({ destinationAddress, bookingId }: {
  destinationAddress: string; bookingId: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [estimate, setEstimate] = useState<{ minutes: number; kilometres: number } | null>(null);
  const [message, setMessage] = useState("");
  const currentRequest = useRef<AbortController | null>(null);
  useEffect(() => () => currentRequest.current?.abort(), []);
  useEffect(() => {
    currentRequest.current?.abort();
    setEstimate(null); setState("idle"); setMessage("");
  }, [bookingId, destinationAddress]);

  const calculate = async () => {
    if (state === "loading") return;
    setState("loading"); setEstimate(null); setMessage("");
    currentRequest.current?.abort();
    const controller = new AbortController();
    currentRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      if (!navigator.geolocation) throw new Error("Location permission unavailable");
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true, maximumAge: 0, timeout: 10000,
        }));
      // A nearby road estimate requires a relatively accurate actual position.
      // Do not pass approximate country/city position as a live worker position.
      if (!Number.isFinite(position.coords.accuracy) || position.coords.accuracy > 200) {
        throw new Error("Position insufficiently accurate");
      }
      const query = mapboxRoutingDestinationUrl(destinationAddress, mapboxToken);
      if (!query) throw new Error("Mapbox routing is not configured");
      const found = await fetch(query, { signal: controller.signal, cache: "no-store" });
      if (!found.ok) throw new Error("Address could not be resolved");
      const destination = readTemporaryDestination(await found.json());
      if (!destination) throw new Error("Destination needs manual confirmation");
      const routeUrl = mapboxDirectionsUrl({
        longitude: position.coords.longitude, latitude: position.coords.latitude,
      }, destination, mapboxToken);
      if (!routeUrl) throw new Error("Routing parameters unavailable");
      const result = await fetch(routeUrl, { signal: controller.signal, cache: "no-store" });
      if (!result.ok) throw new Error("Road routing unavailable");
      const road = parseMapboxRoadEstimate(await result.json());
      if (!road) throw new Error("No supported driving route");
      if (controller.signal.aborted) return;
      setEstimate(road);
      setState("ready");
    } catch {
      if (!controller.signal.aborted) {
        setMessage("Route estimate unavailable. You can use the Directions link or try again.");
        setState("error");
      }
    } finally {
      window.clearTimeout(timeout);
      if (currentRequest.current === controller) currentRequest.current = null;
    }
  };

  if (!mapboxToken.startsWith("pk.")) return null;
  return <section aria-label="Your route to this booking" className="rounded-2xl border border-border bg-background p-4">
    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><Navigation size={18} /> Your private road estimate</h3>
    <p className="mb-3 text-xs text-muted-foreground">Only when you tap below, your current device position and this assigned job's address are sent to Mapbox to calculate a one-off route. Neither is stored by this feature or shared as customer live tracking.</p>
    <button type="button" disabled={state === "loading"} onClick={() => void calculate()}
      className="rounded-full border border-border px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      <span className="inline-flex items-center gap-2"><MapPin size={14}/>
        {state === "loading" ? "Calculating route…" : state === "error" ? "Try road estimate again" : "Calculate road estimate"}
      </span>
    </button>
    {state === "ready" && estimate && <p role="status" className="mt-3 text-sm font-semibold">
      {estimate.kilometres} km by road · approximately {estimate.minutes} minutes (at request time)
    </p>}
    {state === "error" && <p role="status" className="mt-3 text-xs text-muted-foreground">{message}</p>}
    <p className="mt-2 text-xs text-muted-foreground">Travel estimates are not arrival commitments. They cannot be shared as a live customer ETA without an authorised location feed.</p>
  </section>;
}
