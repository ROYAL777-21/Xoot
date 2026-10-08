import { XootCharacter } from "@/components/kit/XootCharacter";
import "@/styles/homepage-sections.css";

const people = [
  { scene: "xooter", garment: "sage", title: "Checked before they start", body: "An admin reviews every Xooter's ID, proof of address and references before they can take a booking." },
  { scene: "customer", garment: "violet", title: "You, doing nothing", body: "Follow arrival status in the app, so you can see when your Xooter is on the way." },
  { scene: "host", garment: "honey", title: "Built around a turnover", body: "Choose a morning window for your Airbnb turnover and add the details for your next check-in." },
  { scene: "pair", garment: "blush", title: "Someone to talk to", body: "Contact support from the booking to keep help and updates together." },
] as const;

/** Original PeopleBand geometry and original XootCharacter artwork from SiteBody.jsx. */
export function PeopleBand() {
  return <section id="people" className="xoot-public-section">
    <div className="xoot-public-inner">
      <div className="xoot-section-head xoot-section-head--center" style={{maxWidth: 560}}>
        <p className="xoot-section-eyebrow">Who turns up</p>
        <h2 className="xoot-section-title">Real people, <span className="xoot-squiggle">checked properly.</span></h2>
        <p className="xoot-section-sub">An admin reviews every Xooter before they can take their first booking.</p>
      </div>
      <div className="xoot-people-grid">{people.map((person, index) => <div className="xoot-card xoot-card--pad xoot-people-card" key={person.title}>
        <XootCharacter scene={person.scene} garment={person.garment} castIndex={index} size={132} motion="none" />
        <h3>{person.title}</h3><p>{person.body}</p>
      </div>)}</div>
    </div>
  </section>;
}
