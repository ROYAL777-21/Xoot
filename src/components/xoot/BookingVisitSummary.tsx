import { CalendarDays, Clock, MapPin, ShieldCheck } from "lucide-react";
import { ServiceIcon } from "@/components/kit/ServiceIcon";
import { HandoffFlowerField } from "./HeroArtwork";
import { BOOKING_SERVICE_DETAILS } from "@/lib/booking-flow";
import type { BookingService } from "@/lib/booking-contract";
import { getClientVisibleStatus, normaliseBookingStatus } from "@/lib/booking-state-machine";
import { formatZAR } from "@/lib/format";

export type VisitPayment = { id: string; amount: number; status: string; currency: string };
type Visit = { service_type?: string; service?: string; status: string; scheduled_at?: string;
  duration_hours?: number; address?: string; crew_size?: number };
const date = new Intl.DateTimeFormat("en-ZA", { weekday: "short", day: "numeric", month: "long", timeZone: "Africa/Johannesburg" });
const time = new Intl.DateTimeFormat("en-ZA", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Africa/Johannesburg" });

/** VisitScreen's dawn card and real visit facts. A return URL never establishes payment. */
export function BookingVisitSummary({ booking, payment, returnedFromPayfast }: {
  booking: Visit; payment: VisitPayment | null; returnedFromPayfast: boolean;
}) {
  const rawService = booking.service_type || booking.service || "regular";
  const service = ["airbnb", "office", "moving", "express", "laundry"].includes(rawService)
    ? rawService as BookingService | "laundry" : "regular";
  const serviceTitle = service === "laundry" ? "Laundry & ironing" : BOOKING_SERVICE_DETAILS[service].title;
  const status = normaliseBookingStatus(booking.status);
  const cancelled = status === "cancelled";
  const pending = !cancelled && (payment?.status === "pending" || status === "draft" || status === "pending_payment");
  const paid = payment?.status === "paid" || payment?.status === "admin_confirmed";
  const headline = pending ? returnedFromPayfast ? "Checking your payment" : "Finish your booking"
    : status ? getClientVisibleStatus(status) : "Your visit";
  const description = pending
    ? returnedFromPayfast ? "Your booking is saved. We’ll update it when PayFast confirms your payment."
      : "Your visit details are saved. Finish payment when you’re ready."
    : cancelled ? "Your visit has been cancelled. You can still view its details here."
      : status === "awaiting_assignment" ? "We’ll let you know when a Xooter is confirmed for your visit."
        : "Your visit details and updates, together in one place.";
  const when = new Date(booking.scheduled_at ?? "");
  const hasDate = Number.isFinite(when.getTime());
  const amount = payment?.currency === "ZAR" && Number.isFinite(Number(payment.amount)) && Number(payment.amount) >= 0
    ? Number(payment.amount) : null;

  return <>
    <section className="xoot-visit-detail-hero" aria-labelledby="visit-headline">
      <HandoffFlowerField className="xoot-visit-detail-flowers" items={[
        { size: 124, palette: "petal", left: "84%", top: "-24%", opacity: .48 },
        { size: 68, palette: "lilac", left: "92%", top: "66%", opacity: .3 },
      ]} />
      <ServiceIcon service={service} size={58} shape="circle" />
      <div className="xoot-visit-detail-hero-copy">
        <p className="xoot-visit-detail-eyebrow">Your visit</p>
        <h1 id="visit-headline">{headline}</h1>
        <p role={pending && returnedFromPayfast ? "status" : undefined}>{description}</p>
      </div>
    </section>
    <section className="xoot-visit-detail-card" aria-labelledby="visit-service">
      <div className="xoot-visit-detail-card-head"><h2 id="visit-service">{serviceTitle}</h2>
        <span className="xoot-visit-detail-pill">{booking.crew_size && booking.crew_size > 1 ? `${booking.crew_size} Xooters` : "1 Xooter"}</span>
      </div>
      <dl className="xoot-visit-detail-facts">
        <div><CalendarDays aria-hidden="true" /><dt>When</dt><dd>{hasDate ? `${date.format(when)} · ${time.format(when)}` : "Date to be confirmed"}</dd></div>
        {booking.duration_hours && booking.duration_hours > 0 ? <div><Clock aria-hidden="true" /><dt>Visit length</dt><dd>About {booking.duration_hours} hours</dd></div> : null}
        {booking.address && <div><MapPin aria-hidden="true" /><dt>Where</dt><dd>{booking.address}</dd></div>}
      </dl>
      {payment && amount !== null && <div className="xoot-visit-detail-payment" aria-label="Payment summary">
        <div><span>Total for this visit</span><strong>{formatZAR(amount)}</strong></div>
        <p><ShieldCheck size={15} aria-hidden="true" />{paid ? "Payment received" : cancelled ? "Booking cancelled" : "Payment pending"}</p>
      </div>}
    </section>
  </>;
}
