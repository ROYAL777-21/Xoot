import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ProfileDetail } from "./ProfileParts";
import { getClientVisibleStatus, normaliseBookingStatus } from "@/lib/booking-state-machine";

type Visit = { id: string; service: string; scheduled_at: string; status: string };
const upcomingStatuses = ["pending_payment", "payment_confirmed", "awaiting_assignment", "assigned", "contractor_accepted", "en_route", "in_progress", "replacement_required", "replacement_offered", "reassigned", "pending", "confirmed", "enroute", "arrived"] as const;
function NextVisit({ ownerId }: { ownerId: string }) {
  const [visit, setVisit] = useState<Visit | null>(null);
  const [state, setState] = useState("loading");
  useEffect(() => {
    let current = true;
    void (async () => {
      try {
        const { data, error } = await supabase.from("bookings").select("id,service,scheduled_at,status")
          .eq("user_id", ownerId).gte("scheduled_at", new Date().toISOString())
          .in("status", upcomingStatuses)
          .order("scheduled_at").limit(1).maybeSingle();
        if (!current) return;
        if (error || (data && (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(data.id) || !Number.isFinite(Date.parse(data.scheduled_at))))) { setState("error"); return; }
        setVisit(data); setState("ready");
      } catch { if (current) setState("error"); }
    })();
    return () => { current = false; };
  }, [ownerId]);
  const status = visit ? normaliseBookingStatus(visit.status) : null;
  return <section className="xoot-you-card" aria-label="Next visit widget"><CalendarClock size={25} aria-hidden="true" /><h2 className="font-display text-2xl mt-3">Your next visit</h2>
    {state !== "ready" ? <p className="mt-2" role="status">{state === "error" ? "Your next visit could not be loaded." : "Loading your next visit…"}</p> : visit ? <>
      <p className="mt-2 font-semibold">{visit.service.replace(/_/g, " ")}</p>
      <p>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(visit.scheduled_at))}</p>
      <p className="my-2">{status ? getClientVisibleStatus(status) : visit.status.replace(/_/g, " ")}</p><Link className="underline" to={`/app/bookings/${visit.id}`}>Open visit status</Link>
    </> : <p className="mt-2">No upcoming visit yet. <Link className="underline" to="/app/book">Book a visit</Link></p>}
  </section>;
}

export default function Widgets() {
  const { user, loading } = useAuth();
  return <ProfileDetail title="Widgets"><div className="xoot-you-content">
    <p>Keep your next visit close, without putting your street address or private home notes on display.</p>
    {loading || !user ? <p role="status">Sign in to view your next visit.</p> : <NextVisit key={user.id} ownerId={user.id} />}
    <section className="xoot-you-card"><h2 className="font-display text-2xl">On your laptop or Mac</h2><p className="my-3">Install Xoot for quick access from your taskbar or Dock.</p><Link to="/install" className="underline">Set up desktop access</Link></section>
    <p className="text-sm text-muted-foreground">This card is inside Xoot. Desktop OS widgets are not available yet. Live ETA will appear only when your assigned Xooter’s location sharing is available.</p>
  </div></ProfileDetail>;
}
