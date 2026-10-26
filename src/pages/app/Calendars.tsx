import { useState } from "react";
import { Link } from "react-router-dom";
import { CalendarCheck, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { downloadVisitCalendar, visitCalendar, type CalendarVisit } from "@/lib/visit-calendar";
import { getClientVisibleStatus, normaliseBookingStatus } from "@/lib/booking-state-machine";
import { ProfileDetail, ProfileState } from "./ProfileParts";
import { useProfileResource } from "./useProfileResource";

async function readVisits(owner: string): Promise<CalendarVisit[]> {
  const result = await supabase.from("bookings").select("id,service,scheduled_at,duration_hours,status,updated_at")
    .eq("user_id", owner).gte("scheduled_at", new Date().toISOString()).not("status", "in", "(draft,cancelled,completed,rated)")
    .order("scheduled_at").limit(100);
  if (result.error || !result.data) throw new Error("Your visits could not be loaded.");
  for (const visit of result.data) visitCalendar(visit);
  return result.data;
}

export default function Calendars() {
  const resource = useProfileResource(readVisits);
  const [error, setError] = useState<string | null>(null);
  return <ProfileDetail title="Your calendar" subtitle="Your visits, in the calendar you already use"><div className="xoot-you-content px-5 pb-8">
    <section className="xoot-you-card"><CalendarCheck aria-hidden="true" /><h2 className="font-display text-2xl mt-3">Apple, Google or Outlook</h2><p className="my-3">Choose a visit below to download its calendar file, then open or import it into your calendar.</p><p className="text-sm text-muted-foreground">This adds a copy of one visit. Changes and cancellations stay in Xoot; check your booking and update your calendar if plans change. Your address and home access notes stay in Xoot.</p></section>
    {!resource.data ? <ProfileState loading={resource.authLoading || resource.owner !== null && resource.status === "loading"} error={resource.error} retry={resource.refresh} /> : resource.data.length === 0 ? <section className="xoot-you-card"><h2 className="font-display text-2xl">No upcoming visits</h2><p className="my-3">Your scheduled visits will appear here.</p><Link className="underline" to="/app/book">Plan a visit</Link></section> : resource.data.map(visit => {
      const status = normaliseBookingStatus(visit.status);
      return <section className="xoot-you-card" key={visit.id}><h2 className="font-display text-2xl">{visit.service.replace(/_/g, " ")}</h2><p className="my-2">{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(visit.scheduled_at))}</p><p className="text-sm text-muted-foreground mb-4">{status ? getClientVisibleStatus(status) : "Check your visit"} · estimated {visit.duration_hours} hours</p><button className="xoot-you-primary" type="button" onClick={() => { if (!resource.isCurrent()) return; try { downloadVisitCalendar(visit); setError(null); } catch { setError("This visit does not have a complete calendar schedule yet."); } }}><Download size={17} className="mr-2" aria-hidden="true" />Add to calendar</button><Link className="underline block mt-4" to={`/app/bookings/${visit.id}`}>Open visit</Link></section>;
    })}
    {error && <p role="alert" className="xoot-you-error">{error}</p>}
  </div></ProfileDetail>;
}
