import { Link } from "react-router-dom";
import { CalendarCheck, Check, Heart, MessageCircle, Repeat, TicketPercent, Wallet, Zap } from "lucide-react";
import { CARE_PLUS_MONTHLY_CENTS, CARE_PLUS_WELCOME_CREDIT_CENTS } from "@/lib/care-plus";
import { BOOKING_FEE_CENTS, formatRand } from "@/lib/xoot-pricing";
import { CarePlusGlyph } from "./HeroArtwork";
import "@/styles/gift-care-handoff.css";

const perks = [
  { icon: TicketPercent, title: "No booking fee", detail: `The ${formatRand(BOOKING_FEE_CENTS)} fee is waived on each visit for active members.` },
  { icon: Wallet, title: `${formatRand(CARE_PLUS_WELCOME_CREDIT_CENTS)} welcome add-on credit`, detail: "A once-off welcome credit, tracked in your account." },
  { icon: Repeat, title: "Your favourite Xooter", detail: "Keep a preferred person close for repeat bookings, subject to availability." },
  { icon: Zap, title: "Priority booking support", detail: "Your membership travels with your booking request." },
  { icon: CalendarCheck, title: "Manage your visits", detail: "Review upcoming bookings and request a schedule change." },
  { icon: MessageCircle, title: "Priority support", detail: "Raise a support case with your membership context included." },
];
const comparison: [string, boolean | string, boolean | string][] = [
  ["Book, track and chat", true, true], ["Saved home details", true, true],
  ["Booking fee", formatRand(BOOKING_FEE_CENTS), "None"],
  ["Welcome add-on credit", "—", formatRand(CARE_PLUS_WELCOME_CREDIT_CENTS)],
  ["Save a favourite Xooter", true, true], ["Priority booking support", false, true],
  ["Priority support", false, true], ["Membership", "Free", `${formatRand(CARE_PLUS_MONTHLY_CENTS)}/mo`],
];

/** Source SiteFoot.jsx CarePlusBand, retaining the approved membership rules. */
export function CarePlusBand({ headingAs: Heading = "h2", actions, detailsId }: { headingAs?: "h1" | "h2"; actions?: import("react").ReactNode; detailsId?: string } = {}) {
  const visits = 4;
  const feesSaved = visits * BOOKING_FEE_CENTS;
  return <section id="careplus" className="xoot-care-section"><div className="xoot-care-inner"><div className="xoot-care-panel"><div className="xoot-care-grid">
    <div>
      <span className="xoot-care-badge"><CarePlusGlyph /> Care+</span>
      <Heading>For homes that would rather not think about it.</Heading>
      <p className="xoot-care-intro">Care+ is {formatRand(CARE_PLUS_MONTHLY_CENTS)} a month, with booking-fee savings and continuity for repeat home care. Booking, tracking and chat are available to everyone.</p>
      <div className="xoot-care-arithmetic"><span className="xoot-care-label">Someone booking {visits} visits a month</span><div><strong>{formatRand(feesSaved)}</strong><span>in booking fees saved</span></div><p>{formatRand(feesSaved)} in waived booking fees, or {formatRand(feesSaved - CARE_PLUS_MONTHLY_CENTS)} after the monthly membership. A once-off {formatRand(CARE_PLUS_WELCOME_CREDIT_CENTS)} add-on credit is separate.</p></div>
      <div className="xoot-care-actions">{actions ?? <><Link to="/care-plus" className="xoot-source-button xoot-source-button-care"><Heart size={20} /> Explore Care+</Link><Link to="/care-plus#included" className="xoot-source-button xoot-source-button-outline">See what’s included</Link></>}</div>
      <p className="xoot-care-note">Review the membership terms and current activation status before joining.</p>
    </div>
    <div id={detailsId} className="xoot-care-details"><div className="xoot-care-perks">{perks.map(({ icon: Icon, title, detail }) => <div key={title}><span className="xoot-care-perk-icon"><Icon size={18} strokeWidth={1.9} /></span><p><strong>{title}</strong><small>{detail}</small></p></div>)}</div>
      <div className="xoot-care-comparison" role="table" aria-label="Free and Care+ comparison"><div role="row"><span role="columnheader" className="sr-only">Feature</span><span aria-hidden="true" /><span role="columnheader">Free</span><span role="columnheader">Care+</span></div>{comparison.map(([label, ...values]) => <div role="row" key={label}><strong role="rowheader">{label}</strong>{values.map((value, index) => <span role="cell" key={index}>{value === true ? <Check size={17} strokeWidth={2.6} aria-label="Included" /> : value === false ? <span aria-label="Not included">—</span> : value}</span>)}</div>)}</div>
    </div>
  </div></div></div></section>;
}
