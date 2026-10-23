import { useState } from "react";
import { Camera, Key, Lock, Trash2 } from "lucide-react";

/**
 * The access-window demo — ported from the 2026-09-03 handoff
 * (`design/handoff-2026-09-03/xoot/site/SiteTrust.jsx`, the card that opens `TrustMechanisms`).
 *
 * Scrubbing a timeline explains a timed release in about four seconds where a paragraph does
 * not, which is the whole reason it exists.
 *
 * ── Two decisions kept from the handoff, both deliberate ──────────────────────────────
 *
 * **Tap a stage, do not drag a slider.** There are five discrete states and nothing in
 * between them. A slider implies intermediate values that do not exist — a code is not 40%
 * released. The handoff says this in a comment and it is right.
 *
 * **The revoke switch jumps straight to gone.** Revoking is not a sixth stage in a sequence;
 * it is an interruption available at any point, and modelling it as a stage would imply it
 * happens at a particular time.
 *
 * ── The sample codes ──────────────────────────────────────────────────────────────────
 * `1408#`, `2277` and the side-gate line are the handoff's own placeholder values, and the
 * panel is labelled as an illustration. They are obviously fake and must stay obviously fake:
 * a demo that looks like a screenshot of a real customer's gate code is a worse problem than
 * a demo nobody believes.
 */

type WindowState = "locked" | "open" | "gone";

type Stage = {
  at: string;
  title: string;
  body: string;
  state: WindowState;
};

const STAGES: Stage[] = [
  {
    at: "−7 days",
    title: "You save the details",
    body: "Gate code, alarm code, where the key is. Encrypted the moment they leave your phone.",
    state: "locked",
  },
  {
    at: "−45 min",
    title: "The window opens",
    body: "Only the assigned Xooter, only for this visit. Not saved to their device.",
    state: "open",
  },
  {
    at: "During",
    title: "Every view is logged",
    body: "You can see who looked, and when. Screenshots are blocked on that screen.",
    state: "open",
  },
  {
    at: "Complete",
    title: "The window closes",
    body: "Access ends with the visit, not at the end of the day.",
    state: "locked",
  },
  {
    at: "+7 days",
    title: "The codes are deleted",
    body: "Not archived. The shortest retention of anything on the platform.",
    state: "gone",
  },
];

const SAMPLE = [
  ["Gate code", "1408#"],
  ["Alarm", "2277"],
  ["Entry", "Side gate — key under the pot"],
] as const;

export const AccessWindowTimeline = () => {
  const [stage, setStage] = useState(1);
  const [revoked, setRevoked] = useState(false);

  const shown: WindowState = revoked ? "gone" : STAGES[stage].state;
  const StateIcon = shown === "open" ? Key : shown === "gone" ? Trash2 : Lock;
  const stateLabel =
    shown === "open" ? "Unlocked" : shown === "gone" ? (revoked ? "Revoked" : "Deleted") : "Locked";

  return (
    <div className="xoot-access-window rounded-3xl border border-border bg-card p-6 shadow-lg sm:p-8">
      <div className="xoot-access-window__grid">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Access window
          </p>
          <h3 className="mt-2 font-display text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
            Your codes exist for one visit, then stop existing.
          </h3>

          <ol className="mt-6 space-y-1">
            {STAGES.map((item, index) => {
              const on = index === stage && !revoked;
              return (
                <li key={item.at}>
                  <button
                    type="button"
                    aria-current={on ? "step" : undefined}
                    onClick={() => {
                      setStage(index);
                      setRevoked(false);
                    }}
                    className={`flex w-full gap-3 rounded-xl p-3 text-left transition-colors ${
                      on ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <span
                      className={`w-16 shrink-0 pt-0.5 font-mono text-[11px] ${
                        on ? "text-primary" : "text-muted-foreground"
                      }`}
                    >
                      {item.at}
                    </span>
                    <span className="min-w-0">
                      <span
                        className={`block text-sm font-bold ${on ? "text-primary" : "text-foreground"}`}
                      >
                        {item.title}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                        {item.body}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        </div>

        <div>
          <div
            data-window-state={shown}
            className={`min-h-[232px] rounded-3xl p-6 transition-colors ${
              shown === "open"
                ? "bg-background ring-2 ring-primary/30"
                : "bg-foreground text-background"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className={`font-mono text-[10px] uppercase tracking-[0.12em] ${
                  shown === "open" ? "text-muted-foreground" : "text-background/50"
                }`}
              >
                Xooter&rsquo;s screen — illustration
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                  shown === "open"
                    ? "bg-primary/10 text-primary"
                    : "bg-background/15 text-background"
                }`}
              >
                <StateIcon className="h-3.5 w-3.5" aria-hidden="true" />
                {stateLabel}
              </span>
            </div>

            {shown === "open" ? (
              <div className="mt-5 space-y-3">
                {SAMPLE.map(([label, value]) => (
                  <div key={label}>
                    <span className="block text-[10px] font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                      {label}
                    </span>
                    <span className="font-mono text-base">{value}</span>
                  </div>
                ))}
                <p className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
                  <Camera className="h-3.5 w-3.5" aria-hidden="true" />
                  Screenshots blocked on this screen
                </p>
              </div>
            ) : (
              <p className="mt-8 text-sm leading-6 text-background/70">
                {shown === "gone"
                  ? revoked
                    ? "Access withdrawn. The Xooter is told it was withdrawn, not why."
                    : "Deleted seven days after the visit. Not archived."
                  : "Encrypted and unreadable. Nothing is released outside the window."}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setRevoked((value) => !value)}
            className="mt-4 w-full rounded-2xl border border-border px-4 py-3 text-sm font-semibold transition-colors hover:bg-muted"
          >
            {revoked ? "Undo — return to the timeline" : "Revoke access now"}
          </button>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Revoking takes effect at the next read, does not cancel the visit, and does not charge
            you.
          </p>
        </div>
      </div>
    </div>
  );
};
