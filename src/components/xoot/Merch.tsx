import { Droplet, Shirt, SprayCan } from "lucide-react";
import { HandoffTape } from "./HeroArtwork";
import "@/styles/merch-handoff.css";

// SiteExtra.jsx / Merch. This is a coming-soon showcase; there is no unconnected email form.
const MERCH = [
  { icon: SprayCan, name: "Xoot Home Fragrance", detail: "A little Xoot, beyond the clean. A home fragrance in development.", tag: "Home", palette: "sage" },
  { icon: Shirt, name: "Xooter attire", detail: "A considered collection for the people who care for your space.", tag: "For Xooters", palette: "lilac" },
  { icon: Droplet, name: "Surface kit", detail: "A future collection for everyday care between visits. Product details will follow at launch.", tag: "Home", palette: "mist" },
] as const;

export const Merch = () => <section id="merch" className="xoot-public-section xoot-merch" aria-labelledby="merch-title">
  <div className="container">
    <header className="xoot-merch-heading"><p className="xoot-section-eyebrow">Coming soon</p><h2 id="merch-title" className="xoot-section-title">Xoot, <span className="xoot-squiggle">as an object.</span></h2><p>Home fragrance, Xooter attire and everyday surface care. A collection taking shape. Not on sale yet.</p></header>
    <div className="xoot-merch-grid">{MERCH.map(({ icon: Icon, name, detail, tag, palette }, index) => <article key={name} className="xoot-merch-card">
      <HandoffTape style={{ backgroundColor: `var(--xoot-${palette}-mid)`, transform: `rotate(${index % 2 ? 19 : -18}deg)`, [index % 2 ? "right" : "left"]: -14 }} />
      <div className="xoot-merch-art" style={{ background: `linear-gradient(145deg,var(--xoot-${palette}-wash),var(--xoot-${palette}-mid))`, color: `var(--xoot-${palette}-ink)` }}><Icon size={54} strokeWidth={1.4} aria-hidden="true" /><span>{tag}</span></div>
      <div className="xoot-merch-copy"><h3>{name}</h3><p>{detail}</p></div>
    </article>)}</div>
  </div>
</section>;
