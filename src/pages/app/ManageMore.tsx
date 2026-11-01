import { useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Briefcase, CalendarCheck, House, Plus, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ProfileDetail, ProfileGroup, ProfileRow, ProfileState } from "./ProfileParts";
import { readPlaces } from "./profile-data";
import { useProfileResource } from "./useProfileResource";

async function readManageMore(owner: string) {
  const loadVisits = async () => {
    // Six calendar months; paginate instead of silently treating a partial list as a total.
    const first = new Date(); first.setUTCDate(1); first.setUTCHours(0, 0, 0, 0); first.setUTCMonth(first.getUTCMonth() - 5);
    const visits: { id: string; scheduled_at: string; duration_hours: number; status: string }[] = [];
    for (let start = 0; ; start += 100) {
      const result = await supabase.from("bookings").select("id,scheduled_at,duration_hours,status")
        .eq("user_id", owner).gte("scheduled_at", first.toISOString()).in("status", ["completed", "rated"])
        .order("scheduled_at").order("id").range(start, start + 99);
      if (result.error || !result.data) throw new Error("Your visit history could not be loaded.");
      visits.push(...result.data); if (result.data.length < 100) break;
    }
    return visits;
  };
  const [places, visits] = await Promise.all([readPlaces(owner), loadVisits()]);
  return { places, visits };
}

export default function ManageMore() {
  const resource = useProfileResource(readManageMore);
  const [tab, setTab] = useState<"overview" | "places" | "team">("overview");
  const data = resource.data;
  return <ProfileDetail title="Manage more" subtitle="Your places, dashboards and visits"><div className="xoot-you-content px-5 pb-8">
    <div className="xoot-manage-tabs" role="group" aria-label="Manage more">{(["overview", "places", "team"] as const).map(value => <button type="button" key={value} id={`manage-${value}`} aria-pressed={tab === value} aria-controls="manage-content" onClick={() => setTab(value)}>{value[0].toUpperCase() + value.slice(1)}</button>)}</div>
    {!data ? <ProfileState loading={resource.authLoading || resource.owner !== null && resource.status === "loading"} error={resource.error} retry={resource.refresh} /> : <section id="manage-content" aria-labelledby={`manage-${tab}`} className="xoot-manage-panel">
      {tab === "overview" && <>
        <div className="xoot-manage-stats">{[[data.places.length, "saved places"], [data.visits.length, "visits completed"], [data.visits.reduce((sum, visit) => sum + (Number.isFinite(visit.duration_hours) && visit.duration_hours > 0 ? visit.duration_hours : 0), 0), "hours booked"]].map(([value, label]) => <section key={label} className="xoot-you-card"><strong>{value}</strong><span>{label}</span></section>)}</div>
        <p className="text-sm text-muted-foreground">Visit totals cover the last six calendar months. Hours show the booked duration.</p>
        <ProfileGroup title="Your dashboards"><ProfileRow icon={BedDouble} title="Airbnb host dashboard" detail="Short-lets and turnovers" to="/app/properties/airbnb" /><ProfileRow icon={Briefcase} title="Small office dashboard" detail="Workplaces and recurring visits" to="/app/properties/office" /><ProfileRow icon={House} title="Property accounts" detail="Billing and operations details" to="/app/properties/accounts" /></ProfileGroup>
        <ProfileGroup title="Plan ahead"><ProfileRow icon={CalendarCheck} title="Your calendar" detail="Add a visit to Apple, Google or Outlook" to="/app/calendar" /><ProfileRow icon={Plus} title="Plan a visit" detail="Choose your place and schedule" to="/app/book" /></ProfileGroup>
      </>}
      {tab === "places" && <ProfileGroup title="Your places">{data.places.length === 0 && <p className="xoot-you-empty">No places saved yet.</p>}{data.places.map(place => <ProfileRow key={place.id} icon={House} title={place.label} detail={place.address ?? "Add an address"} to={`/app/profile/homes/${place.id}`} />)}<ProfileRow icon={Plus} title="Add a place" to="/app/profile/homes/new" /></ProfileGroup>}
      {tab === "team" && <section className="xoot-you-card"><Users aria-hidden="true" /><h2 className="font-display text-2xl mt-3">Your account, your places</h2><p className="my-3">Shared team access is not available yet. Your places and bookings stay private to your account.</p><Link className="underline" to="/app/support">Talk to Xoot about your team</Link></section>}
    </section>}
  </div></ProfileDetail>;
}
