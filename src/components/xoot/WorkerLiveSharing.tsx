import { useEffect, useRef, useState } from "react";
import { MapPin, RadioTower } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const idShape = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Deliberately foreground-only; there is no silent, automatic, or background GPS sharing. */
export function WorkerLiveSharing({ jobId }: { jobId: string }) {
  const [state, setState] = useState<"idle" | "starting" | "sharing" | "stopping" | "error">("idle");
  const [message, setMessage] = useState("");
  const watch = useRef<number | null>(null);
  const session = useRef<string | null>(null);
  const lastPublish = useRef(0);
  const publishing = useRef(false);
  const mounted = useRef(true);

  const stopDevice = () => {
    if (watch.current !== null) {
      navigator.geolocation.clearWatch(watch.current);
      watch.current = null;
    }
    lastPublish.current = 0;
  };

  async function stop() {
    stopDevice();
    const sessionId = session.current;
    session.current = null;
    setState("stopping");
    if (!sessionId) { setState("idle"); return; }
    const { error } = await supabase.functions.invoke("job-live-location", {
      body: { action: "stop", jobId, sessionId },
    });
    if (!mounted.current) return;
    setState(error ? "error" : "idle");
    setMessage(error
      ? "Your device stopped sharing. The last server position expires automatically within 90 seconds."
      : "Sharing stopped. Your latest coordinate was revoked.");
  }

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      stopDevice();
      const sessionId = session.current;
      session.current = null;
      if (sessionId) {
        // Best effort on navigation/unmount. The server enforces expiry regardless.
        void supabase.functions.invoke("job-live-location", {
          body: { action: "stop", jobId, sessionId },
        });
      }
    };
  }, [jobId]);

  async function start() {
    if (state === "starting" || state === "sharing") return;
    if (!navigator.geolocation || !idShape.test(jobId)) {
      setMessage("Location access is not available. You can still update your booking status.");
      setState("error");
      return;
    }
    setState("starting"); setMessage("");
    const { data, error } = await supabase.functions.invoke("job-live-location", {
      body: { action: "start", jobId, sharingConsent: true },
    });
    const payload = data?.data as { sessionId?: unknown } | undefined;
    const sessionId = payload?.sessionId;
    if (error || data?.success !== true || typeof sessionId !== "string" || !idShape.test(sessionId)) {
      setState("error");
      setMessage("Location sharing has not been enabled or the session could not start.");
      return;
    }
    session.current = sessionId;
    setState("sharing");
    setMessage("Sharing only while this page is open and the visit is on the way.");

    watch.current = navigator.geolocation.watchPosition(
      position => {
        if (session.current !== sessionId || publishing.current || Date.now() - lastPublish.current < 12_000) return;
        const { latitude, longitude, accuracy } = position.coords;
        if (![latitude, longitude, accuracy].every(Number.isFinite) || accuracy < 1 || accuracy > 200) return;
        publishing.current = true;
        lastPublish.current = Date.now();
        void supabase.functions.invoke("job-live-location", {
          body: { action: "publish", jobId, sessionId,
            position: { latitude, longitude, accuracy_m: accuracy, sharingConsent: true } },
        }).then(({ data: result, error: uploadError }) => {
          if (!mounted.current || session.current !== sessionId) return;
          if (uploadError || result?.success !== true) {
            stopDevice();
            setState("error");
            setMessage("Location stopped because the job or connection could not be verified. Previous coordinates expire automatically.");
          }
        }).finally(() => { publishing.current = false; });
      },
      () => {
        stopDevice();
        if (mounted.current) {
          setState("error");
          setMessage("Location permission or GPS was unavailable. Sharing stopped on this device.");
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  return <section className="rounded-2xl border border-border bg-background p-4" aria-label="Xooter location sharing">
    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold"><RadioTower size={17}/> Optional live journey sharing</h3>
    <p className="mb-3 text-xs text-muted-foreground">Only the customer assigned to this active job can see your recent position. Your location is not used for the public Xooter directory. Sharing expires and stops at cancellation, reassignment or arrival.</p>
    <button type="button" onClick={() => void (state === "sharing" ? stop() : start())}
      disabled={state === "starting" || state === "stopping"}
      aria-pressed={state === "sharing"} className="rounded-full border border-border px-4 py-2 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary">
      <span className="inline-flex items-center gap-2"><MapPin size={15}/>{state === "sharing" ? "Stop sharing location" : state === "starting" ? "Starting…" : "Start sharing for this visit"}</span>
    </button>
    {message && <p className="mt-3 text-xs text-muted-foreground" role="status">{message}</p>}
    <p className="mt-2 text-xs text-muted-foreground">Foreground web sharing requires device permission and a verified, active job; no background location is requested.</p>
  </section>;
}
