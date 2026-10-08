import { ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

const proof = [
  ["Admin review", "Before activation"],
  ["Screening", "Recorded status"],
  ["Training", "Required modules"],
  ["Continuity", "Repeat-client signals"],
] as const;

export function BecomeXooter() {
  return (
    <section id="pro" className="xoot-public-section xoot-public-section--alt" aria-labelledby="pro-title">
      <div className="xoot-public-inner">
        <div className="xoot-pro-panel">
          <div>
            <span className="xoot-pro-kicker">Become a Xooter</span>
            <h2 id="pro-title">Build a stronger contractor profile.</h2>
            <p className="xoot-pro-panel__copy">Xoot helps independent contractors show experience, suburb coverage, reliability, repeat-client history, training and approved trust signals.</p>
            <div className="xoot-pro-panel__actions">
              <Link className="xoot-action xoot-action--lg xoot-action--cream" to="/xooter/apply">Become a Xooter <ArrowRight size={20} /></Link>
              <Link className="xoot-action xoot-action--lg xoot-action--outline" to="/xooter/training"><GraduationCap size={20} /> See training</Link>
            </div>
          </div>
          <div className="xoot-pro-proof">
            {proof.map(([stat, label]) => <div className="xoot-pro-proof__item" key={stat}><strong>{stat}</strong><span>{label}</span></div>)}
          </div>
        </div>
      </div>
    </section>
  );
}
