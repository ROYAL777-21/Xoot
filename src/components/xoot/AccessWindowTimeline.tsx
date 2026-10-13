import { useId, useState } from "react";
import { Key, Lock, Trash2 } from "lucide-react";

// Five discrete stages from SiteTrust.jsx. This explains the intended schedule, not a live account.
const stages = [
  { at: "Save", title: "You save the details", body: "Gate, alarm and key instructions belong in protected fields.", state: "locked" },
  { at: "−45 min", title: "The window opens", body: "The planned window releases details only to the assigned Xooter.", state: "open" },
  { at: "During", title: "Access stays limited", body: "Sensitive details are intended for this visit, with each view logged.", state: "open" },
  { at: "Complete", title: "The window closes", body: "The intended access ends with the visit, not at the end of the day.", state: "locked" },
  { at: "+7 days", title: "Codes are removed", body: "The planned retention period removes codes seven days later.", state: "gone" },
] as const;

export function AccessWindowTimeline() {
  const [stage, setStage] = useState(1);
  const [revoked, setRevoked] = useState(false);
  const panelId = useId();
  const shown = revoked ? "gone" : stages[stage].state;
  const StateIcon = shown === "open" ? Key : shown === "gone" ? Trash2 : Lock;
  const stateLabel = shown === "open" ? "Window open" : shown === "gone" ? (revoked ? "Withdrawn" : "Removed") : "Locked";

  return <div className="xoot-card xoot-access-window">
    <div className="xoot-access-grid">
      <div>
        <p className="xoot-access-label">Access window · explanation</p>
        <h3>Your codes are for one visit.</h3>
        <p className="xoot-access-intro">Explore the intended timing below. Protected sharing and scheduled deletion are not available yet.</p>
        <ol className="xoot-access-stages">{stages.map((item, index) => <li key={item.at}>
          <button type="button" aria-current={index === stage && !revoked ? "step" : undefined} aria-controls={panelId} onClick={() => { setStage(index); setRevoked(false); }}>
            <span className="xoot-access-stages__time">{item.at}</span>
            <span><strong>{item.title}</strong><span className="xoot-access-stages__body">{item.body}</span></span>
          </button>
        </li>)}</ol>
      </div>
      <div>
        <div id={panelId} className="xoot-access-preview" data-state={shown} aria-live="polite" aria-atomic="true">
          <div className="xoot-access-preview__top"><span>Illustrative view</span><span className="xoot-access-state"><StateIcon size={14} aria-hidden="true" />{stateLabel}</span></div>
          {shown === "open" ? <div className="xoot-access-example">
            {[["Gate code", "EXAMPLE#"], ["Alarm", "EXAMPLE"], ["Entry", "Example key instructions"]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            <p>Example details only · no home or booking connected</p>
          </div> : <div className="xoot-access-hidden">
            {[0, 1, 2].map(index => <div key={index} aria-hidden="true"><span /><span /></div>)}
            <p><Lock size={14} aria-hidden="true" />{shown === "gone" ? revoked ? "In this explanation, access has been withdrawn." : "In this explanation, the codes have been removed." : "In this explanation, the window is closed."}</p>
          </div>}
        </div>
        <div className="xoot-card xoot-card--flat xoot-access-control">
          <label><span><strong>Illustrate withdrawn access</strong><span>Changes this explanation only.</span></span><input type="checkbox" role="switch" checked={revoked} onChange={event => setRevoked(event.target.checked)} /><span className="xoot-access-switch" aria-hidden="true" /></label>
        </div>
      </div>
    </div>
  </div>;
}
