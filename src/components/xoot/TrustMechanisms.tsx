import type { CSSProperties } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Camera, Info, Lock, MessageCircle, Phone, X } from "lucide-react";
import { AccessWindowTimeline } from "./AccessWindowTimeline";
import "@/styles/homepage-sections.css";
import "@/styles/public-editorial.css";

// SiteTrust.jsx supplies the composition; readiness is not inferred from it.
const mechanisms = [
  {
    icon: Lock, tint: "lilac", title: "Access windows",
    body: "The planned access window limits gate and alarm details to the assigned Xooter for one visit.",
    points: ["A window before arrival", "Access closes when the visit ends", "Codes kept separate from everyday messages"],
    note: "Protected access sharing is not available for bookings yet.",
  },
  {
    icon: Camera, tint: "mist", title: "Screen privacy",
    body: "Native screen protections are planned for the view containing sensitive access details.",
    points: ["Android capture prevention", "iOS capture detection", "A hidden view when the app goes into the background"],
    note: "These protections are not available yet. No software can stop another phone photographing a screen.",
  },
  {
    icon: X, tint: "blush", title: "Withdraw access",
    body: "The intended control lets you withdraw access to gate and alarm details without treating the visit itself as cancelled.",
    points: ["A separate control for sensitive details", "A clear indication when access ends", "Booking-day directions handled separately"],
    note: "Withdrawal during a visit is not available yet.",
  },
  {
    icon: Phone, tint: "petal", title: "SOS — for both sides",
    body: "An emergency feature is planned for customers and Xooters. It is currently switched off.",
    points: ["Designed for both sides of a visit", "Separate from routine support", "Emergency services remain your first contact"],
    note: "Do not rely on Xoot for emergency assistance.",
  },
  {
    icon: MessageCircle, tint: "sage", title: "Keep conversations together",
    body: "Booking chat is designed to keep visit messages inside Xoot, without exchanging personal phone numbers.",
    points: ["Messages connected to the visit", "Sensitive codes belong outside chat", "Calls are not available yet"],
    note: "Booking communication will be available when bookings open.",
  },
  {
    icon: BadgeCheck, tint: "honey", title: "Checked before the first door",
    body: "Xooter approval is intended to include identity, address, screening and training review before work can be accepted.",
    points: ["Identity and work eligibility", "Required documents reviewed", "Approval before accepting bookings"],
    note: "There are no approved Xooters available to book yet.",
  },
] as const;

export function TrustMechanisms({ page = false }: { page?: boolean }) {
  const Heading = page ? "h1" : "h2";
  return <section id="trust" className="xoot-public-section xoot-public-section--alt" aria-labelledby="trust-title">
    <div className="xoot-public-inner">
      <div className="xoot-section-head">
        <p className="xoot-section-eyebrow">Trust, safety and security</p>
        <Heading id="trust-title" className="xoot-section-title">Letting someone into your home is the whole ask.</Heading>
        <p className="xoot-section-sub">How your home details should be protected, and what is available. Bookings are not open yet.</p>
      </div>
      <AccessWindowTimeline />
      <div className="xoot-trust-grid">
        {mechanisms.map(({ icon: Icon, tint, title, body, points, note }) => <article className="xoot-card xoot-trust-card" key={title} style={{ "--trust-wash": `var(--xoot-${tint}-wash)`, "--trust-ink": `var(--xoot-${tint}-ink)` } as CSSProperties}>
          <div className="xoot-trust-card__top">
            <span className="xoot-trust-icon"><Icon size={20} strokeWidth={1.9} aria-hidden="true" /></span>
            <span className="xoot-availability">Not available yet</span>
          </div>
          <div className="xoot-trust-card__copy"><h3>{title}</h3><p>{body}</p></div>
          <ul>{points.map(point => <li key={point}><span aria-hidden="true" />{point}</li>)}</ul>
          <p className="xoot-trust-note"><Info size={14} aria-hidden="true" /><span>{note}</span></p>
        </article>)}
      </div>
      <div className="xoot-card xoot-card--flat xoot-trust-policy">
        <p>Read more about personal information, privacy and your rights.</p>
        <div>{!page && <Link className="xoot-action xoot-action--outline" to="/trust-centre">Trust centre</Link>}<Link className="xoot-action xoot-action--outline" to="/legal/privacy">Privacy policy</Link><Link className="xoot-action xoot-action--outline" to="/legal/popia">POPIA notice</Link></div>
      </div>
    </div>
  </section>;
}
