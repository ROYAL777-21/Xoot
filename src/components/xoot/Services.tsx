import { BedDouble, Building2, KeyRound, Rabbit, Shirt, Sparkles } from "lucide-react";
import { CleaningBrushIcon } from "@/components/xoot/HeroArtwork";
import { Link } from "react-router-dom";

const services = [
  { icon: CleaningBrushIcon, title: "Regular cleaning", desc: "Weekly tidies, fortnightly deep cleans, and one-off resets.", tint: "blush" },
  { icon: Rabbit, title: "Express cleaning", desc: "Focused resets for smaller spaces and tighter windows.", tint: "red" },
  { icon: Building2, title: "Office & commercial", desc: "Office, estate and small commercial cleans with admin follow-up.", tint: "mist" },
  { icon: BedDouble, title: "Airbnb turnovers", desc: "Turnovers with host notes, readiness checks and photo proof.", tint: "lilac" },
  { icon: KeyRound, title: "Moving cleans", desc: "Move-in and move-out cleans with before-and-after proof.", tint: "sage" },
  { icon: Shirt, title: "Laundry & ironing", desc: "Washed, dried and pressed — folded the way you like it. Bookings open once the service is ready.", tint: "moss" },
] as const;

export function Services() {
  return (
    <section id="services" className="xoot-public-section" aria-labelledby="services-title">
      <div className="xoot-public-inner">
        <div className="xoot-section-head">
          <p className="xoot-section-eyebrow">What we clean</p>
          <h2 id="services-title" className="xoot-section-title">Specialists in cleaning the spaces you <span className="xoot-squiggle">live, host and work in</span>.</h2>
          <p className="xoot-section-sub">Homes, offices and Airbnbs in the current Xoot launch area, with vetting, ratings, arrival tracking and completion proof where required.</p>
        </div>
        <div className="xoot-services__grid">
          {services.map(({ icon: Icon, title, desc, tint }, index) => (
            <article className="xoot-card xoot-card--flat xoot-card--pad xoot-service-card" key={title}>
              <span className={`xoot-washi xoot-washi--${index}`} aria-hidden="true" />
              <span className={`xoot-service-icon xoot-service-icon--${tint}`} aria-hidden="true"><Icon /></span>
              <div><h3>{title}</h3><p>{desc}</p></div>
            </article>
          ))}
          <article className="xoot-card xoot-card--pad xoot-service-card" style={{ background: "var(--xoot-ink-900)", color: "#fff", boxShadow: "var(--xoot-shadow-4)" }}>
            <span className="xoot-service-icon xoot-service-icon--moss" aria-hidden="true"><Sparkles /></span>
            <div>
              <h3 style={{ color: "#fff" }}>The standard, held higher</h3>
              <p style={{ color: "rgba(255,255,255,.7)" }}>A future high-attention cleaning option for delicate finishes and homes with more detailed care requirements.</p>
            </div>
            <p style={{ marginTop: "auto", color: "var(--xoot-honey-mid)", fontWeight: 700 }}>Xoot Lux · availability under review</p>
          </article>
        </div>
        <div className="xoot-services__actions">
          <Link className="xoot-action xoot-action--lg" to="/app">Book a clean</Link>
          <span className="xoot-coming-soon">Find full-time help <small>Coming soon</small></span>
        </div>
      </div>
    </section>
  );
}
