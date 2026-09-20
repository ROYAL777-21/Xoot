import { Briefcase, Search, ShieldCheck, Star } from "lucide-react";

const items = [
  [Star, "Visible quality signals", "Profiles show ratings, reliability score, completion rate, repeat-client count and trust badges."],
  [Search, "Admin-reviewed vetting", "An admin reviews ID, selfie, proof of address, banking details and references before activation."],
  [Briefcase, "Training gate", "Required modules cover cleaning standards, hospitality and communication, child-safety essentials, eco-friendly practice and garden work."],
  [ShieldCheck, "Incident system", "Lateness, quality complaints, damage and escalations have a route into an admin trust-review queue."],
] as const;

export function SafetyTrust() {
  return (
    <section id="safety" className="xoot-public-section xoot-public-section--alt" aria-labelledby="safety-title">
      <div className="xoot-public-inner">
        <div className="xoot-section-head">
          <p className="xoot-section-eyebrow xoot-section-eyebrow--sage">Safety &amp; security</p>
          <h2 id="safety-title" className="xoot-section-title">Trust is built into the workflow, not added as decoration.</h2>
          <p className="xoot-section-sub">Xoot combines admin vetting, required training, reliability scoring, arrival status and admin review queues to protect marketplace quality.</p>
        </div>
        <div className="xoot-trust-grid">
          {items.map(([Icon, title, description]) => (
            <article className="xoot-card xoot-card--pad xoot-trust-card" key={title}>
              <span className="xoot-trust-card__icon" aria-hidden="true"><Icon /></span>
              <div><h3>{title}</h3><p>{description}</p></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
