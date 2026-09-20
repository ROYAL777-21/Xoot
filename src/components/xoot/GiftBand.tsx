import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Gift, CreditCard, MessageCircle, CalendarCheck, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GiftCard } from "@/components/kit/GiftCard";
import { HandoffNote } from "./HeroArtwork";
import { estimateGift, giftBundles, giftOccasions, giftServices, giftSetupPath, type GiftSelection } from "@/lib/gift-selection";
import { formatRand } from "@/lib/xoot-pricing";
import "@/styles/gift-care-handoff.css";

const steps = [
  { icon: Gift, title: "Choose your gift", body: "Pick the visits, service and occasion. Your choices follow you into gift setup." },
  { icon: MessageCircle, title: "Make it personal", body: "Add the recipient and your message, then review the full details." },
  { icon: CreditCard, title: "Review before payment", body: "A gift is not paid or delivered until its payment has been confirmed." },
  { icon: CalendarCheck, title: "Keep track of the gift", body: "Your account shows the actual order status. Gift checkout and redemption are still being connected." },
];

export function GiftBand() {
  const [selection, setSelection] = useState<GiftSelection>({ service: "regular", count: 4, occasion: 0 });
  const [how, setHow] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const occasion = giftOccasions[selection.occasion];
  const estimate = estimateGift(selection);
  const startGift = () => {
    const target = giftSetupPath(selection);
    if (user) navigate(target);
    else navigate("/auth", { state: { from: { pathname: target } } });
  };
  return <section id="gift" className="xoot-gift-band">
    <div className="xoot-gift-inner">
      <div>
        <span className="xoot-gift-badge"><Gift size={14} strokeWidth={2} /> Gift a clean</span>
        <h2 className="xoot-gift-heading">Give someone their<br /><span>weekend back.</span></h2>
        <p className="xoot-gift-description">A thoughtful gift of home care. Choose the visits, add a personal note and review the recipient’s details. Payment and delivery status stay visible in your account.</p>
        <div className="xoot-gift-options">
          <fieldset><legend>How many visits</legend><div className="xoot-gift-bundles">
            {giftBundles.map((bundle) => <button key={bundle.count} type="button" aria-pressed={selection.count === bundle.count} onClick={() => setSelection({ ...selection, count: bundle.count })}><strong>{bundle.label}</strong><span>{bundle.detail}</span></button>)}
          </div></fieldset>
          <fieldset><legend>What kind of visit</legend><div className="xoot-gift-services">
            {giftServices.map((service) => <button key={service.key} type="button" aria-pressed={selection.service === service.key} onClick={() => setSelection({ ...selection, service: service.key })}>{service.label}</button>)}
          </div></fieldset>
          <div className="xoot-gift-quote" aria-live="polite"><span><strong>{selection.count} {selection.count === 1 ? "visit" : "visits"} · {estimate.service.label} · {estimate.service.hours} hrs</strong><small>{estimate.perVisitCents === null ? "Quote unavailable" : `${formatRand(estimate.perVisitCents)} estimated per visit, booking fee included`}</small></span><span className="xoot-gift-total">{estimate.totalCents === null ? "—" : formatRand(estimate.totalCents)}</span></div>
          <div className="xoot-gift-actions"><button type="button" className="xoot-source-button" onClick={startGift}><Gift size={20} /> Set up this gift</button><button type="button" className="xoot-source-button xoot-source-button-outline" aria-expanded={how} aria-controls="gift-how-detail" onClick={() => setHow(!how)}>{how ? "Hide the detail" : "How gifting works"}</button></div>
          {how && <div id="gift-how-detail" className="xoot-gift-steps">{steps.map(({ icon: Icon, title, body }, index) => <div key={title}><span><Icon size={15} /></span><p><strong>{index + 1}. {title}</strong><small>{body}</small></p></div>)}</div>}
          <p className="xoot-gift-availability"><Check size={14} /> An estimate from the booking catalogue. Gift payment and redemption are not available yet.</p>
        </div>
      </div>
      <div className="xoot-gift-preview">
        <div className="xoot-gift-art-tilt"><GiftCard tint={occasion.tint} title={occasion.title} note={occasion.note} from={user?.user_metadata?.full_name || "you"} /></div>
        <div className="xoot-gift-occasions" role="group" aria-label="Gift occasion">{giftOccasions.map((item, index) => <button key={item.label} type="button" aria-pressed={selection.occasion === index} onClick={() => setSelection({ ...selection, occasion: index })}>{item.label}</button>)}</div>
        <HandoffNote>{occasion.hint}</HandoffNote>
      </div>
    </div>
  </section>;
}
