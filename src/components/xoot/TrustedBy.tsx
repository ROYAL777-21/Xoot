import { BedDouble, Building2, House, KeyRound, MapPin, ShieldCheck } from "lucide-react";
import { approvedLaunchRegions } from "@/lib/operations";
import "@/styles/homepage-sections.css";

const operators = [
  [Building2, "Property managers"],
  [KeyRound, "Estate agents"],
  [BedDouble, "Airbnb hosts"],
  [ShieldCheck, "Office admins"],
  [House, "Landlords"],
] as const;

export function TrustedBy() {
  return (
    <section className="xoot-trusted" aria-labelledby="trusted-title">
      <div className="xoot-public-inner">
        <div className="xoot-trusted__intro">
          <p id="trusted-title" className="xoot-section-eyebrow">Built for real Johannesburg operating workflows</p>
          <p>Built around the real operating needs of teams and households that need cleaner handovers, protected access notes, repeatable quality, and accountable support.</p>
        </div>
        <div className="xoot-trusted__grid">
          {operators.map(([Icon, label]) => (
            <div className="xoot-trusted__item" key={label}>
              <Icon aria-hidden="true" />
              <p>{label}</p>
            </div>
          ))}
        </div>
        <div className="xoot-trusted__areas" aria-label="Current launch areas">
          <MapPin aria-hidden="true" />
          {approvedLaunchRegions.map((region) => <span key={region}>{region}</span>)}
        </div>
      </div>
    </section>
  );
}
