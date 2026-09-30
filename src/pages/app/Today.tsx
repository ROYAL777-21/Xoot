import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { CircleUserRound, Plus, Search, X, MapPin, Repeat, Wallet, ArrowRight, Loader2, Pencil, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useXootCred } from "@/hooks/useXootCred";
import { SectionLabel } from "@/components/kit/SectionLabel";
import { ServiceIcon } from "@/components/kit/ServiceIcon";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ConciergeOmnibox } from "@/components/xoot/ConciergeOmnibox";
import { BOOKING_SERVICE_DETAILS, formatBookingMoney } from "@/lib/booking-flow";
import type { BookingService } from "@/lib/booking-contract";
import { getClientVisibleStatus, normaliseBookingStatus } from "@/lib/booking-state-machine";
import { bookingEntrySearch, bookingSlot, calendarWeek, sastDay, todayService, visibleTodayBookings, type TodayBooking, type TodaySlot } from "@/lib/today-handoff";
import "@/styles/today-handoff.css";

type Profile = { full_name: string | null; address: string | null };
type State = { kind: "loading" | "error" | "ready"; profile: Profile | null; bookings: TodayBooking[] };
const emptyState: State = { kind: "loading", profile: null, bookings: [] };
const sections: { slot: TodaySlot; label: string; empty: string }[] = [
  { slot: "anytime", label: "Anytime", empty: "Anytime today works — add something when you're ready" },
  { slot: "morning", label: "Morning", empty: "Nothing booked this morning, and that’s fine" },
  { slot: "afternoon", label: "Afternoon", empty: "Your afternoon is free" },
  { slot: "evening", label: "Evening", empty: "Evenings are yours" },
];
const serviceIcons = new Set(["regular", "airbnb", "express", "office", "moving", "laundry", "lux"]);
const repeatableServices = new Set(["regular", "airbnb", "express", "office", "moving"]);
const firstServices = ["regular", "airbnb", "express", "office"] as const;
const timeFormatter = new Intl.DateTimeFormat("en-ZA", { timeZone: "Africa/Johannesburg", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const hourFormatter = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Johannesburg", hour: "2-digit", hourCycle: "h23" });
const dayLabel = new Intl.DateTimeFormat("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
const weekdayLabel = new Intl.DateTimeFormat("en-ZA", { weekday: "long", timeZone: "UTC" });

async function loadToday(userId: string): Promise<Pick<State, "profile" | "bookings">> {
  const profileResult = await supabase.from("profiles").select("full_name,address").eq("id", userId).maybeSingle();
  if (profileResult.error) throw profileResult.error;
  const bookings: TodayBooking[] = [];
  const ids = new Set<string>();
  const pageSize = 500;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from("bookings")
      .select("id,service,service_type,scheduled_at,status").eq("user_id", userId)
      .order("scheduled_at", { ascending: true }).order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error || !Array.isArray(data)) throw error ?? new Error("Bookings unavailable");
    for (const booking of data) {
      if (!ids.has(booking.id)) { ids.add(booking.id); bookings.push(booking); }
    }
    if (data.length < pageSize) break;
  }
  return { profile: profileResult.data, bookings };
}

function bookingTitle(service: string): string {
  return Object.prototype.hasOwnProperty.call(BOOKING_SERVICE_DETAILS, service)
    ? BOOKING_SERVICE_DETAILS[service as BookingService].title
    : service.replace(/[_-]/g, " ").trim() || "Visit";
}

function BookingRow({ booking }: { booking: TodayBooking }) {
  const status = normaliseBookingStatus(booking.status);
  const service = todayService(booking);
  const completed = status === "completed" || status === "rated";
  return <Link to={`/app/bookings/${encodeURIComponent(booking.id)}`} className="xoot-today-task" aria-label={`Open ${bookingTitle(service)} visit at ${timeFormatter.format(new Date(booking.scheduled_at))}`}>
    {serviceIcons.has(service)
      ? <ServiceIcon service={service as "regular" | "airbnb" | "express" | "office" | "moving" | "laundry" | "lux"} size={40} shape="circle" />
      : <span className="xoot-today-task-icon" aria-hidden="true">✦</span>}
    <span className="xoot-today-task-copy"><strong>{bookingTitle(service)}</strong><small>{timeFormatter.format(new Date(booking.scheduled_at))} · {status ? getClientVisibleStatus(status) : booking.status.replace(/[_-]/g, " ") || "Status unavailable"}</small></span>
    {/* A completion indicator is read-only; only the fulfilment workflow changes job state. */}
    <span className={`xoot-today-completion${completed ? " is-complete" : ""}`} aria-hidden="true">{completed && <Check size={13} strokeWidth={3} />}</span>
  </Link>;
}

function BookingBar({ previous }: { previous?: TodayBooking }) {
  if (previous) {
    const service = todayService(previous) as BookingService;
    return <div className="xoot-today-rebookbar">
      <div className="xoot-today-rebook-details"><ServiceIcon service={service} size={44} shape="circle" /><span><strong>Book it again</strong><small>{bookingTitle(service)} · Choose your next date</small></span></div>
      <div className="xoot-today-rebook-actions"><Link to="/app/book"><Pencil size={15} aria-hidden="true" />Change</Link><Link to={`/app/book?service=${encodeURIComponent(service)}`}><Repeat size={15} aria-hidden="true" />Rebook</Link></div>
    </div>;
  }
  return <div className="xoot-today-bookbar">
    <div className="xoot-today-book-intro"><strong>What can we take off your plate?</strong><span>Pick one to start. Nothing is charged until you confirm.</span></div>
    <div className="xoot-today-services">{firstServices.map(service => <Link key={service} to={`/app/book?service=${service}`}><ServiceIcon service={service} size={38} /><span>{bookingTitle(service)}</span></Link>)}</div>
    <Link className="xoot-today-all-services" to="/app/book">See everything we do <ArrowRight size={15} aria-hidden="true" /></Link>
  </div>;
}

function TodayForAccount({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [day, setDay] = useState(() => sastDay(new Date()));
  const [state, setState] = useState<State>(emptyState);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<Record<TodaySlot, boolean>>({ anytime: true, morning: true, afternoon: true, evening: true });
  const [searchOpen, setSearchOpen] = useState(false);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const wallet = useXootCred();
  const refreshWallet = wallet.refresh;
  const refresh = useCallback(() => { setState(emptyState); setAttempt(value => value + 1); void refreshWallet(); }, [refreshWallet]);

  useEffect(() => {
    let active = true;
    loadToday(userId).then(data => { if (active) setState({ kind: "ready", ...data }); })
      .catch(() => { if (active) setState({ kind: "error", profile: null, bookings: [] }); });
    return () => { active = false; };
  }, [userId, attempt]);

  const week = calendarWeek(day);
  const visits = state.kind === "ready" ? visibleTodayBookings(state.bookings, day) : [];
  const names = state.profile?.full_name?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = names.slice(0, 2).map(name => name[0]).join("").toUpperCase();
  const hour = Number(hourFormatter.format(new Date()));
  const weekday = weekdayLabel.format(new Date(`${day}T12:00:00Z`));
  const canBookSelectedDay = day >= sastDay(new Date());
  const previous = state.bookings.filter(booking => Number.isFinite(Date.parse(booking.scheduled_at)) && repeatableServices.has(todayService(booking)) && ["completed", "rated"].includes(normaliseBookingStatus(booking.status) ?? ""))
    .sort((a, b) => Date.parse(b.scheduled_at) - Date.parse(a.scheduled_at))[0];
  const widgets = state.kind === "ready" ? [
    ...(!state.profile?.address?.trim() ? [{ id: "address", icon: MapPin, title: "Add your home address", to: "/app/profile" }] : []),
    { id: "weekly", icon: Repeat, title: "Set up a weekly visit", to: "/app/book?service=regular&frequency=weekly" },
    ...(!wallet.loading && !wallet.error && wallet.availableBalance > 0 ? [{ id: "credit", icon: Wallet, title: `${formatBookingMoney(Math.round(wallet.availableBalance * 100))} XootCred to use`, to: "/app/loyalty" }] : []),
  ].filter(widget => !dismissed.includes(widget.id)) : [];

  return <Dialog.Root open={searchOpen} onOpenChange={setSearchOpen}><div className="xoot-today" aria-label="Today">
    <header className="xoot-today-header">
      <div><span className="xoot-today-greeting">Good {hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening"}{names[0] ? `, ${names[0]}` : ""}</span><h1>{weekday}</h1></div>
      <div className="xoot-today-actions">
        <Dialog.Trigger asChild><button type="button" aria-label="Search"><Search size={20} aria-hidden="true" /></button></Dialog.Trigger>
        <NotificationBell key={userId} />
        <Link to="/app/profile" aria-label="Your profile" className="xoot-today-avatar">{initials || <CircleUserRound size={17} aria-hidden="true" />}</Link>
      </div>
    </header>
    <Tabs.Root value={day} onValueChange={setDay}>
      <Tabs.List className="xoot-today-week" aria-label="Days">{week.map(date => {
        const when = new Date(`${date}T12:00:00Z`);
        const hasVisit = state.kind === "ready" && visibleTodayBookings(state.bookings, date).length > 0;
        return <Tabs.Trigger key={date} value={date} aria-label={dayLabel.format(when)}><small>{weekdayLabel.format(when).slice(0, 1)}</small><strong>{Number(date.slice(8))}</strong><i className={hasVisit ? "has-visit" : ""} aria-hidden="true" /></Tabs.Trigger>;
      })}</Tabs.List>
      <Tabs.Content value={day} className="xoot-today-day">
        {state.kind === "loading" ? <p className="xoot-today-state" role="status"><Loader2 size={18} className="animate-spin" /> Loading your day…</p>
          : state.kind === "error" ? <div className="xoot-today-state" role="alert"><p>Your day could not be loaded.</p><button type="button" onClick={refresh}>Try again</button></div>
            : <>
              <div className="xoot-today-bookbar-wrap"><BookingBar previous={previous} /></div>
              {widgets.length > 0 && <div className="xoot-today-widgets" aria-label="Suggestions">{widgets.map(widget => <article key={widget.id} className={`xoot-today-widget is-${widget.id}`}><Link to={widget.to}><widget.icon size={34} strokeWidth={1.5} aria-hidden="true" /><span>{widget.title}</span></Link><button type="button" aria-label={`Dismiss ${widget.title}`} onClick={() => setDismissed(items => [...items, widget.id])}><X size={15} /></button></article>)}</div>}
              {wallet.error && <div className="xoot-today-wallet-error" role="status">XootCred could not be loaded. <button type="button" onClick={() => void wallet.refresh()}>Try again</button></div>}
              <div className="xoot-today-sections">{sections.map(({ slot, label, empty }) => {
                const rows = visits.filter(booking => bookingSlot(booking.scheduled_at) === slot);
                return <section key={slot}><SectionLabel slot={slot} label={label} count={rows.length} open={open[slot]} onToggle={() => setOpen(value => ({ ...value, [slot]: !value[slot] }))} onAdd={canBookSelectedDay ? () => navigate(`/app/book?date=${day}`) : undefined} addLabel={`Book a ${label.toLowerCase()} visit`} />
                  {open[slot] && <div className="xoot-today-section-content">{rows.length ? rows.map(booking => <BookingRow key={booking.id} booking={booking} />) : canBookSelectedDay
                    ? <Link to={`/app/book?date=${day}`} className="xoot-today-empty"><span>{empty}</span><Plus size={16} aria-hidden="true" /></Link>
                    : <p className="xoot-today-empty">No visits recorded for this time.</p>}</div>}
                </section>;
              })}</div>
              <button type="button" className="xoot-today-refresh" onClick={refresh}>Refresh your day</button>
            </>}
      </Tabs.Content>
    </Tabs.Root>
    <Dialog.Portal><Dialog.Overlay className="xoot-today-search-scrim" /><Dialog.Content className="xoot-today-search" aria-describedby={undefined}>
      <Dialog.Title className="sr-only">Search Xoot</Dialog.Title><Dialog.Close aria-label="Close search"><X size={20} /></Dialog.Close><ConciergeOmnibox onAction={() => setSearchOpen(false)} />
    </Dialog.Content></Dialog.Portal>
  </div></Dialog.Root>;
}

export default function Today() {
  const { user, loading } = useAuth();
  const { search } = useLocation();
  const bookingSearch = bookingEntrySearch(search);
  if (bookingSearch) return <Navigate to={`/app/book?${bookingSearch}`} replace />;
  if (loading) return <div className="xoot-today-state" role="status">Loading your account…</div>;
  if (!user) return <div className="xoot-today-state" role="status">Sign in to see your day.</div>;
  return <TodayForAccount key={user.id} userId={user.id} />;
}
