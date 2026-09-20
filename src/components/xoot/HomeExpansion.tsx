import { Building2, ShieldCheck } from "lucide-react";

const segments = [
  "Residential property managers", "Estate agencies", "Airbnb hosts", "Landlords",
  "Office administrators", "Guesthouse teams", "Facilities coordinators", "Body corporate trustees",
];

export function HomeExpansion() {
  return (
    <section className="xoot-public-section xoot-public-section--card" aria-labelledby="operators-title">
      <div className="xoot-public-inner xoot-expansion-grid">
        <div>
          <span className="xoot-expansion-pill"><ShieldCheck aria-hidden="true" /> Built for high-trust operators</span>
          <h2 id="operators-title">Designed for the people who cannot afford messy handovers.</h2>
          <p>Xoot is being shaped around real cleaning operations for property managers, short-term rental hosts, landlords, offices and homes. These are target operator groups, not partnership or customer-logo claims.</p>
        </div>
        <div className="xoot-expansion-segments">
          {segments.map((segment) => <div className="xoot-expansion-segment" key={segment}><Building2 aria-hidden="true" />{segment}</div>)}
        </div>
      </div>
    </section>
  );
}
