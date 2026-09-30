import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import * as Tabs from "@radix-ui/react-tabs";
import { Check, Loader2, MessageCircle, Repeat2, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SectionLabel } from "@/components/kit/SectionLabel";
import { ServiceIcon } from "@/components/kit/ServiceIcon";
import { supabase } from "@/integrations/supabase/client";
import { getClientVisibleStatus, normaliseBookingStatus } from "@/lib/booking-state-machine";
import { BOOKING_SERVICE_DETAILS } from "@/lib/booking-flow";
import type { BookingService } from "@/lib/booking-contract";
import "@/styles/visits-handoff.css";

type BookingRecord = {
  id: string; xooter_id: string | null; service: string; service_type: string | null; scheduled_at: string;
  duration_hours: number; status: string;
};
type XooterProfile = {
  booking_id: string | null; id: string | null; name: string | null;
  photo_url: string | null; verified: boolean | null;
};
type Visit = BookingRecord & { xooter: XooterProfile | null; rating: number | null; visitsTogether: number; paidCents: number | null };
type ListState = { kind: "loading" | "error" | "ready"; visits: Visit[] };
type Tab = "upcoming" | "past";

const pastStatuses = new Set(["completed", "rated", "cancelled"]);
const serviceIcons = new Set(["regular", "airbnb", "express", "office", "moving", "laundry", "lux"]);
const prefillableServices = new Set(["regular", "airbnb", "express", "office", "moving"]);
const dateFormatter = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", weekday: "short", day: "numeric", month: "short" });
const timeFormatter = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hour12: false });
const dayFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", year: "numeric", month: "2-digit", day: "2-digit" });

function localDay(value: Date): string {
  const parts = Object.fromEntries(dayFormatter.formatToParts(value).map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function weekStart(day: string): number {
  const date = new Date(`${day}T12:00:00Z`);
  const weekday = (date.getUTCDay() + 6) % 7;
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - weekday) / 86_400_000;
}
function weekGroup(visit: Visit, today: Date): string {
  const when = new Date(visit.scheduled_at);
  if (Number.isNaN(when.getTime())) return "Date to confirm";
  const weeks = (weekStart(localDay(when)) - weekStart(localDay(today))) / 7;
  if (weeks < 0) return "Earlier";
  if (weeks === 0) return "This week";
  if (weeks === 1) return "Next week";
  return "Later";
}
function serviceTitle(service: string): string {
  return Object.prototype.hasOwnProperty.call(BOOKING_SERVICE_DETAILS, service)
    ? BOOKING_SERVICE_DETAILS[service as BookingService].title
    : service.replace(/[_-]/g, " ").trim() || "Visit";
}
function visitService(booking: BookingRecord): string {
  const service = booking.service_type?.trim() || booking.service.trim();
  return ["residential", "deep", "premium"].includes(service) ? "regular" : service;
}
function statusLabel(status: string): string {
  const canonical = normaliseBookingStatus(status);
  return canonical ? getClientVisibleStatus(canonical) : status.replace(/[_-]/g, " ").trim() || "Status unavailable";
}
function statusTone(status: string): string {
  const canonical = normaliseBookingStatus(status);
  if (canonical === "completed" || canonical === "rated" || canonical === "contractor_accepted") return "success";
  if (canonical === "cancelled") return "danger";
  if (canonical === "awaiting_assignment" || canonical === "replacement_required" || canonical === "pending_payment") return "warning";
  return "neutral";
}
function visitWhen(visit: Visit): string {
  const when = new Date(visit.scheduled_at);
  return Number.isNaN(when.getTime()) ? "Date to confirm" : `${dateFormatter.format(when)} · ${timeFormatter.format(when)}`;
}
function visitMeta(visit: Visit): string {
  const duration = Number.isFinite(visit.duration_hours) && visit.duration_hours > 0 ? ` · ${visit.duration_hours} hrs` : "";
  const xooter = visit.xooter?.name ? ` · ${visit.xooter.name}` : "";
  return `${visitWhen(visit)}${duration}${xooter}`;
}
async function loadVisits(userId: string): Promise<Visit[]> {
  const bookings: BookingRecord[] = [];
  const bookingIds = new Set<string>();
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from("bookings")
      .select("id,xooter_id,service,service_type,scheduled_at,duration_hours,status")
      .eq("user_id", userId).order("scheduled_at", { ascending: false }).order("id", { ascending: false })
      .range(from, from + pageSize - 1);
    if (error || !Array.isArray(data)) throw error ?? new Error("Visits unavailable");
    const page = data as BookingRecord[];
    for (const booking of page) {
      if (!bookingIds.has(booking.id)) { bookingIds.add(booking.id); bookings.push(booking); }
    }
    if (page.length < pageSize) break;
  }
  const profiles = new Map<string, XooterProfile>();
  const assigned = bookings.filter((booking) => booking.xooter_id);
  for (let from = 0; from < assigned.length; from += 50) {
    const ids = assigned.slice(from, from + 50).map((booking) => booking.id);
    const { data, error } = await supabase.from("booking_xooter_profiles")
      .select("booking_id,id,name,photo_url,verified").in("booking_id", ids);
    if (error || !Array.isArray(data)) throw error ?? new Error("Xooter details unavailable");
    for (const profile of data as XooterProfile[]) {
      if (profile.booking_id) profiles.set(profile.booking_id, profile);
    }
  }
  const ratings = new Map<string, number>();
  const paidCents = new Map<string, number | null>();
  const paymentIds = new Set<string>();
  if (bookings.some((booking) => pastStatuses.has(normaliseBookingStatus(booking.status) ?? ""))) {
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase.from("post_job_reviews").select("booking_id,rating")
        .eq("user_id", userId).order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !Array.isArray(data)) throw error ?? new Error("Visit ratings unavailable");
      for (const review of data) {
        if (!ratings.has(review.booking_id) && Number.isInteger(review.rating) && review.rating >= 1 && review.rating <= 5)
          ratings.set(review.booking_id, review.rating);
      }
      if (data.length < pageSize) break;
    }
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await supabase.from("payment_records")
        .select("id,booking_id,amount,currency,status,payment_kind")
        .eq("user_id", userId).eq("payment_kind", "booking").in("status", ["paid", "admin_confirmed"])
        .order("created_at", { ascending: false }).order("id", { ascending: false })
        .range(from, from + pageSize - 1);
      if (error || !Array.isArray(data)) throw error ?? new Error("Visit payments unavailable");
      for (const payment of data) {
        if (paymentIds.has(payment.id)) continue;
        paymentIds.add(payment.id);
        if (!payment.booking_id || payment.payment_kind !== "booking" || !["paid", "admin_confirmed"].includes(payment.status)) continue;
        const cents = Math.round(payment.amount * 100);
        const previous = paidCents.get(payment.booking_id);
        const total = (previous ?? 0) + cents;
        // Unknown currencies or malformed amounts must not become a partial Rand total.
        paidCents.set(payment.booking_id, previous === null || payment.currency !== "ZAR" || typeof payment.amount !== "number" || payment.amount < 0 || !Number.isSafeInteger(cents) || !Number.isSafeInteger(total) ? null : total);
      }
      if (data.length < pageSize) break;
    }
  }
  const visitsTogether = new Map<string, number>();
  for (const booking of assigned) {
    const status = normaliseBookingStatus(booking.status);
    if (booking.xooter_id && (status === "completed" || status === "rated"))
      visitsTogether.set(booking.xooter_id, (visitsTogether.get(booking.xooter_id) ?? 0) + 1);
  }
  return bookings.map((booking) => ({
    ...booking,
    service: visitService(booking),
    xooter: profiles.get(booking.id)?.id === booking.xooter_id ? profiles.get(booking.id)! : null,
    rating: ratings.get(booking.id) ?? null,
    visitsTogether: booking.xooter_id ? visitsTogether.get(booking.xooter_id) ?? 0 : 0,
    paidCents: paidCents.get(booking.id) ?? null,
  }));
}
function VisitIcon({ service }: { service: string }) {
  return serviceIcons.has(service)
    ? <ServiceIcon service={service as "regular" | "airbnb" | "express" | "office" | "moving" | "laundry" | "lux"} size={40} shape="circle" />
    : <span className="xoot-visit-icon-fallback" aria-hidden="true">✦</span>;
}
function UpcomingVisit({ visit }: { visit: Visit }) {
  return <Link className="xoot-visit-task" to={`/app/bookings/${encodeURIComponent(visit.id)}`} aria-label={`Open ${serviceTitle(visit.service)} on ${visitWhen(visit)}`}>
    <VisitIcon service={visit.service} />
    <span className="xoot-visit-task-copy"><strong>{serviceTitle(visit.service)}</strong><small>{visitMeta(visit)}</small></span>
    <span className={`xoot-visit-badge is-${statusTone(visit.status)}`}>{statusLabel(visit.status)}</span>
  </Link>;
}
function PastVisit({ visit }: { visit: Visit }) {
  const profile = visit.xooter;
  const canRebook = prefillableServices.has(visit.service);
  return <article className="xoot-visit-past">
    <Link className="xoot-visit-past-main" to={`/app/bookings/${encodeURIComponent(visit.id)}`} aria-label={`Open ${serviceTitle(visit.service)} on ${visitWhen(visit)}`}>
      <VisitIcon service={visit.service} />
      <span className="xoot-visit-past-copy"><strong>{serviceTitle(visit.service)}</strong><small>{visitWhen(visit)}{visit.paidCents !== null ? ` · You paid R${(visit.paidCents / 100).toLocaleString("en-ZA", { maximumFractionDigits: 2 })}` : ""}</small></span>
      {visit.rating !== null ? <span className="xoot-visit-rating" role="img" aria-label={`Your rating: ${visit.rating} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => <Star key={i} size={12} aria-hidden="true" fill={i < visit.rating! ? "currentColor" : "none"} style={{ color: i < visit.rating! ? "var(--xoot-honey-500)" : "var(--xoot-neutral-300)" }} />)}
      </span> : <span className={`xoot-visit-badge is-${statusTone(visit.status)}`}>{statusLabel(visit.status)}</span>}
    </Link>
    {profile?.name ? <div className="xoot-visit-xooter">
      <span className="xoot-visit-avatar" aria-hidden="true">{profile.name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}
        {profile.photo_url && <img src={profile.photo_url} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />}
        {profile.verified && <span className="xoot-visit-verified"><Check size={7} strokeWidth={3.5} /></span>}
      </span>
      <span className="xoot-visit-xooter-name"><strong>{profile.name}</strong>{profile.verified && <span className="sr-only">Verified Xooter</span>}<small>{visit.visitsTogether} {visit.visitsTogether === 1 ? "visit" : "visits"} together</small></span>
      <span className="xoot-visit-actions">
        <Link to={`/app/bookings/${encodeURIComponent(visit.id)}`} className="xoot-visit-message" aria-label={`Open visit to message ${profile.name}`}><MessageCircle size={16} /></Link>
        {canRebook && <Link to={`/app/book?service=${encodeURIComponent(visit.service)}`} className="xoot-visit-rebook" aria-label={`Book ${serviceTitle(visit.service)} again`}><Repeat2 size={14} /> Rebook</Link>}
      </span>
    </div> : <div className="xoot-visit-xooter xoot-visit-xooter-unassigned"><span>Xooter details unavailable for this visit</span>{canRebook && <Link to={`/app/book?service=${encodeURIComponent(visit.service)}`} className="xoot-visit-rebook"><Repeat2 size={14} /> Rebook service</Link>}</div>}
  </article>;
}
function VisitsForAccount({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [state, setState] = useState<ListState>({ kind: "loading", visits: [] });
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => {
    setState({ kind: "loading", visits: [] });
    setAttempt((current) => current + 1);
  }, []);
  useEffect(() => {
    let current = true;
    loadVisits(userId).then((visits) => {
      if (current) setState({ kind: "ready", visits });
    }).catch(() => {
      if (current) setState({ kind: "error", visits: [] });
    });
    return () => { current = false; };
  }, [userId, attempt]);
  const upcoming = state.visits.filter((visit) => !pastStatuses.has(normaliseBookingStatus(visit.status) ?? ""))
    .sort((a, b) => Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at));
  const past = state.visits.filter((visit) => pastStatuses.has(normaliseBookingStatus(visit.status) ?? ""))
    .sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at));
  const now = new Date();
  const groups = ["Earlier", "This week", "Next week", "Later", "Date to confirm"]
    .map((label) => ({ label, visits: upcoming.filter((visit) => weekGroup(visit, now) === label) }))
    .filter((group) => group.visits.length > 0);
  return <section className="xoot-visits" aria-label="Visits">
    <header className="xoot-visits-heading"><h1>Visits</h1></header>
    <Tabs.Root value={tab} onValueChange={(value) => setTab(value as Tab)}>
      <div className="xoot-visits-tabs-wrap">
        <Tabs.List className="xoot-visits-tabs" aria-label="Visit history">
          <Tabs.Trigger value="upcoming">Upcoming</Tabs.Trigger>
          <Tabs.Trigger value="past">Past</Tabs.Trigger>
        </Tabs.List>
      </div>
      {(["upcoming", "past"] as const).map((value) => <Tabs.Content key={value} value={value} className="xoot-visits-list">
      {state.kind === "loading" ? <p className="xoot-visits-state" role="status"><Loader2 size={20} className="animate-spin" /> Loading visits…</p>
        : state.kind === "error" ? <div className="xoot-visits-state" role="alert"><p>Your visits could not be loaded.</p><button type="button" onClick={retry}>Try again</button></div>
          : value === "upcoming" ? groups.length ? groups.map((group) => <div className="xoot-visit-group" key={group.label}><SectionLabel slot="plain" label={group.label} count={group.visits.length} />{group.visits.map((visit) => <UpcomingVisit key={visit.id} visit={visit} />)}</div>)
            : <div className="xoot-visits-state"><p>No upcoming visits.</p><Link to="/app/book">Book a visit</Link></div>
            : past.length ? past.map((visit) => <PastVisit key={visit.id} visit={visit} />)
              : <p className="xoot-visits-state">No past visits yet.</p>}
      </Tabs.Content>)}
    </Tabs.Root>
  </section>;
}
export default function Bookings() {
  const { user, loading } = useAuth();
  if (loading) return <div className="xoot-visits-state" role="status">Loading your account…</div>;
  if (!user) return <div className="xoot-visits-state" role="status">Sign in to see your visits.</div>;
  return <VisitsForAccount key={user.id} userId={user.id} />;
}
