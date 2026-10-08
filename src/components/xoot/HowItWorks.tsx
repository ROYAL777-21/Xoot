import { BadgeCheck, Search, Sparkles } from "lucide-react";
import { XootCharacter } from "@/components/kit/XootCharacter";

const steps = [
  ["01", Search, "Tell us about the place", "Choose a service, confirm the address and time, and add anything a Xooter should know before arrival."],
  ["02", BadgeCheck, "Pick a Xooter, or let us", "Choose from approved profiles, or continue without selecting a specific Xooter and let the matching workflow help."],
  ["03", Sparkles, "Track and review", "Follow the arrival timeline, keep messages on-platform, upload proof where required, and rate the job."],
] as const;

const stepCast = [
  { scene: "customer", garment: "violet" },
  { scene: "pair", garment: "blush" },
  { scene: "host", garment: "honey" },
] as const;

export function HowItWorks() {
  return (
    <section id="how" className="xoot-public-section xoot-public-section--alt" aria-labelledby="how-title">
      <div className="xoot-public-inner xoot-how-grid">
        <div className="xoot-how-sticky">
          <div className="xoot-section-head">
            <p className="xoot-section-eyebrow">How Xoot works</p>
            <h2 id="how-title" className="xoot-section-title">Book with the details that <span className="xoot-squiggle">protect quality</span>.</h2>
            <p className="xoot-section-sub">Xoot keeps service details, household preferences, payment status, contractor updates and support follow-ups in one place.</p>
          </div>
        </div>
        <ol className="xoot-how-list">
          {steps.map(([number, Icon, title, description], index) => (
            <li className="xoot-card xoot-card--pad xoot-how-card" key={number}>
              <span className="xoot-how-card__icon" aria-hidden="true"><Icon /></span>
              <div className="xoot-how-card__copy">
                <div className="xoot-how-card__title"><span>{number}</span><h3>{title}</h3></div>
                <p>{description}</p>
              </div>
              <XootCharacter {...stepCast[index]} castIndex={index + 1} size={92} motion="none" className="xoot-how-figure" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
