import { ArrowRight, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { AppAvailability } from "@/components/xoot/AppAvailability";
import { useConcierge } from "@/contexts/ConciergeContext";
import { XootCharacter } from "@/components/kit/XootCharacter";

export function CtaBand() {
  const concierge = useConcierge();
  return (
    <section className="xoot-public-section" aria-labelledby="closing-title">
      <div className="xoot-public-inner">
        <div className="xoot-download-band">
          <div className="xoot-download-band__copy">
            <h2>Book here now. Keep the app for later.</h2>
            <p>The website supports the current booking flow. Mobile store listings are not live yet.</p>
            <div className="xoot-app-links"><AppAvailability /></div>
          </div>
          <div className="xoot-download-band__actions">
            <Link className="xoot-action xoot-action--lg" to="/app">Book a clean now <ArrowRight size={19} /></Link>
            <small>No app needed.</small>
          </div>
        </div>
        <div className="xoot-closing-panel">
          <XootCharacter scene="xooter" garment="sage" castIndex={1} size={200} motion="none" className="xoot-closing-panel__figure" />
          <h2 id="closing-title">Your home. Handled.</h2>
          <p>Choose a service, confirm your address and continue through the secure booking flow.</p>
          <div className="xoot-closing-panel__actions">
            <Link className="xoot-action xoot-action--lg" to="/app">Book a clean <ArrowRight size={20} /></Link>
            <button className="xoot-action xoot-action--lg xoot-action--outline" type="button" onClick={() => concierge?.openConcierge()}><MessageCircle size={20} /> Ask Concierge</button>
          </div>
        </div>
      </div>
    </section>
  );
}
