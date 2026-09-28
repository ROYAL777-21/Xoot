import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, MapPin, ShieldCheck, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { loadXooterDirectory } from "@/lib/xooter-directory";
import type { Xooter } from "@/components/xoot/XooterCard";
import { sortXootersForMarketplace, xooterDistanceKm } from "@/lib/trust";
import { formatDistanceKm } from "@/lib/geo";
import { useProximity } from "@/hooks/useProximity";

type LoadState = "loading" | "ready" | "empty" | "error";

export function NearbyWorkers() {
  const [workers, setWorkers] = useState<Xooter[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const proximity = useProximity();

  useEffect(() => {
    if (!isSupabaseConfigured) { setState("empty"); return; }
    let mounted = true;
    loadXooterDirectory()
      .then(({ xooters }) => {
        if (!mounted) return;
        const live = xooters;
        setWorkers(live);
        setState(live.length ? "ready" : "empty");
      }, () => { if (mounted) setState("error"); });
    return () => { mounted = false; };
  }, []);

  const ranked = useMemo(() => sortXootersForMarketplace(workers, proximity).slice(0, 4), [workers, proximity]);

  return (
    <section id="workers" className="xoot-public-section" aria-labelledby="workers-title">
      <div className="xoot-public-inner">
        <div className="xoot-nearby__head">
          <div>
            <p className="xoot-section-eyebrow xoot-section-eyebrow--sage">Nearby Xooters</p>
            <h2 id="workers-title" className="xoot-section-title">Approved Xooters appear here when they are live in your launch area.</h2>
          </div>
          <Link className="xoot-action xoot-action--outline" to="/book">View all Xooters</Link>
        </div>

        {state === "loading" && <p className="xoot-nearby__status" role="status">Checking the approved Xooter roster…</p>}
        {state === "ready" && (
          <div className="xoot-nearby__grid">
            {ranked.map((worker) => {
              const distance = formatDistanceKm(xooterDistanceKm(worker, proximity));
              const initials = worker.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("");
              const approved = Boolean(worker.verified || worker.background_checked || worker.background_check_status === "approved");
              return (
                <article className="xoot-card xoot-card--pad" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 11, textAlign: "center" }} key={worker.id}>
                  <span style={{ position: "relative", display: "grid", width: 80, height: 80, placeItems: "center", overflow: "hidden", borderRadius: "50%", background: "var(--xoot-violet-100)", color: "var(--xoot-violet-700)", fontFamily: "var(--xoot-font-display)", fontSize: 28 }}>
                    {worker.photo_url ? <img src={worker.photo_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
                    {approved && <BadgeCheck aria-label="Approved profile" style={{ position: "absolute", right: 0, bottom: 0, width: 24, height: 24, padding: 3, borderRadius: "50%", background: "var(--xoot-sage-500)", color: "white" }} />}
                  </span>
                  <div>
                    <h3 style={{ margin: 0, fontFamily: "var(--xoot-font-display)", fontSize: "var(--xoot-title-3)", fontWeight: 500 }}>{worker.name}</h3>
                    <p style={{ margin: "2px 0 0", color: "var(--xoot-text-muted)", fontSize: "var(--xoot-caption)" }}>{worker.role || "Xooter"}</p>
                  </div>
                  <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--xoot-text-secondary)", fontSize: "var(--xoot-body-sm)" }}>{worker.rating == null ? "Not yet reviewed" : <><Star size={15} fill="var(--xoot-honey-500)" color="var(--xoot-honey-500)" />{Number(worker.rating).toFixed(1)}</>}</span>
                  <p style={{ margin: 0, color: "var(--xoot-text-secondary)", fontSize: "var(--xoot-body-sm)", lineHeight: 1.5 }}><MapPin size={14} style={{ display: "inline", marginRight: 4 }} />{distance ?? worker.suburb_coverage?.slice(0, 2).join(", ") ?? "Coverage on request"}</p>
                  <Link className="xoot-action" style={{ width: "100%", marginTop: "auto" }} to={`/book?xooter=${encodeURIComponent(worker.id)}`}>Book {worker.name.split(" ")[0]}</Link>
                </article>
              );
            })}
          </div>
        )}
        {(state === "empty" || state === "error") && (
          <div className="xoot-card xoot-nearby__empty" role="status">
            <span><ShieldCheck size={23} aria-hidden="true" /></span>
            <h3>{state === "error" ? "The roster could not be loaded" : "Xooter profiles are being verified"}</h3>
            <p>{state === "error" ? "Open the booking flow to check current availability for your address." : "Profiles appear here only after required checks, training and admin activation."}</p>
          </div>
        )}
        <p style={{ margin: "22px 0 0", color: "var(--xoot-text-muted)", fontSize: "var(--xoot-body-sm)", textAlign: "center" }}>Profiles appear only after admin-reviewed verification, training and activation.</p>
      </div>
    </section>
  );
}
