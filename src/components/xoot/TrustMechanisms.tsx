import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Camera, Info, Lock, MessageCircle, Phone, X } from "lucide-react";
import { canArmSos } from "@/lib/safety";
import { AccessWindowTimeline } from "./AccessWindowTimeline";
import "@/styles/trust-handoff.css";

/**
 * "Trust, safety and security" — ported from the 2026-09-03 handoff
 * (`design/handoff-2026-09-03/xoot/site/SiteTrust.jsx` → `TrustMechanisms`).
 *
 * This is the first section of the port whose copy needed **no correction at all**, and that
 * is worth recording. It states its own limits unprompted: that screenshot blocking is
 * detection rather than prevention on iOS, that no software stops a second phone
 * photographing a screen, that the screening pipeline exists but nobody has been through it,
 * and that the access-code encryption is deployed but not yet proven by a code stored and
 * read back — which is the same conclusion `NEEDS-FOUNDER.md` reached independently.
 *
 * ── The one change: status is read from the code, not written into the copy ───────────
 * The handoff hardcodes `status: 'launch'` on the SOS card. True today, and a literal that
 * silently becomes a lie the moment someone flips the readiness constant.
 *
 * So SOS reads `canArmSos()` instead. `SAFETY_READINESS` is `"schema_pending"`, so the card
 * renders as not-yet-on with the handoff's own explanation. Change the constant and this
 * section changes with it — the copy cannot drift from the product because it is derived
 * from the same value the feature is.
 *
 * ⚠️ **The SOS note is the most important sentence in this file.** *"A person in trouble
 * pressing something that does nothing is worse than no button."* That is the reason the
 * gate exists, and it must not be softened into a coming-soon teaser.
 *
 * The handoff's interactive access-window timeline opens this section and is ported in
 * `AccessWindowTimeline.tsx`.
 */

type Status = "live" | "built" | "launch";

type Mechanism = {
  icon: LucideIcon;
  status: Status;
  title: string;
  body: string;
  points: string[];
  note?: string;
  wash: string;
  ink: string;
};

const STATUS_LABEL: Record<Status, string> = {
  live: "Live now",
  built: "Built, not yet proven end to end",
  launch: "Not switched on yet",
};

/**
 * SOS is the only card whose state is computed. Everything else describes something already
 * shipped, so a literal is honest for it.
 */
const sosStatus: Status = canArmSos() ? "live" : "launch";

const MECHANISMS: Mechanism[] = [
  {
    icon: Lock,
    status: "built",
    title: "Access windows",
    body: "Your gate and alarm codes are a timed release, not saved data a Xooter can browse. They unlock 45 minutes before the visit and lock again when it completes.",
    points: [
      "Encrypted at rest under a key that is different on every environment",
      "Released to one Xooter, for one visit",
      "Deleted seven days after the visit",
    ],
    note: "Deployed and encrypted. Not yet proven by a code stored and read back through the app, which is the only test that counts.",
    wash: "var(--xoot-lilac-wash)",
    ink: "var(--xoot-lilac-ink)",
  },
  {
    icon: Camera,
    status: "built",
    title: "Screenshots blocked",
    body: "Android prevents capture of the access-details screen. iOS detects capture. The screen blanks when the app goes to the background or into the app switcher.",
    points: [
      "Android: capture is prevented outright",
      "iOS: capture is detected and logged, and you are told",
      "The screen blanks on backgrounding on both",
    ],
    note: "Honest limit: on iOS the platform allows detection, not prevention, and no software stops a second phone photographing a screen. This is one layer — the seven-day deletion and the revoke switch are the ones that matter.",
    wash: "var(--xoot-mist-wash)",
    ink: "var(--xoot-mist-ink)",
  },
  {
    icon: X,
    status: "built",
    title: "Revoke access, instantly",
    body: "One switch in the app cuts a Xooter's access to your details immediately — mid-visit if you need it. No support call, no waiting.",
    points: [
      "Takes effect at the next read, not at the next sync",
      "The Xooter is told access was withdrawn, not why",
      "Revoking does not cancel the visit, and does not charge you",
    ],
    wash: "var(--xoot-blush-wash)",
    ink: "var(--xoot-blush-ink)",
  },
  {
    icon: Phone,
    status: sosStatus,
    title: "SOS — for both sides",
    body: "Hold the button and your live location goes to the Xoot safety team, with a direct line to emergency services. It is on the Xooter's screen as well as yours.",
    points: [
      "A lone worker in a stranger's home is the person most exposed here",
      "A cancel PIN is required once an alert has dispatched",
      "The Xooter can end a visit and leave, without penalty, at any time",
    ],
    note: "Deliberately switched off. It turns on when 112 has been dialled from a real handset and an ops person has confirmed they received the alert — not before. Every step has a failure mode where the button looks like it works, and a person in trouble pressing something that does nothing is worse than no button.",
    wash: "var(--xoot-careplus-50, var(--xoot-blush-wash))",
    ink: "var(--xoot-careplus-700, var(--xoot-blush-ink))",
  },
  {
    icon: MessageCircle,
    status: "built",
    title: "Nobody swaps phone numbers",
    body: "Messages are tied to your booking. Masked calling is built but remains switched off until real call acceptance checks pass.",
    points: [
      "Chat is tied to the booking and ends with it",
      "No recording and no transcription, by default and by design",
      "Reportable in one tap, read by a person",
    ],
    wash: "var(--xoot-sage-wash)",
    ink: "var(--xoot-sage-ink)",
  },
  {
    icon: BadgeCheck,
    status: "launch",
    title: "Vetted before the first door",
    body: "A South African ID or a passport with a valid work permit, proof of residence under three months old, bank details in their own name, a criminal record check, and required training completed.",
    points: [
      "Documents are certified and re-checked, not collected once",
      "Bank details must match the person — we do not pay third parties",
      "Training is a gate on accepting work, not a suggestion",
    ],
    note: "The screening pipeline is built and the queues exist. No Xooter has been through it yet, so this reads as what will be required rather than as a record we can point to.",
    wash: "var(--xoot-honey-wash)",
    ink: "var(--xoot-honey-ink)",
  },
];

export const TrustMechanisms = ({ page = false }: { page?: boolean }) => {
  const Heading = page ? "h1" : "h2";
  return (
    <section id="trust" className="xoot-public-section xoot-public-section--alt xoot-trust" aria-labelledby="trust-title">
      <div className="xoot-public-inner">
        <div className="xoot-section-head">
          <p className="xoot-section-eyebrow">
            Trust, safety and security
          </p>
          <Heading id="trust-title" className="xoot-section-title">
            Letting someone into your home is the whole ask.
          </Heading>
          <p className="xoot-section-sub">
            So the mechanisms are worth describing precisely — including the ones that are not
            switched on yet, and why.
          </p>
        </div>

        <AccessWindowTimeline />

        <div className="xoot-trust-grid">
          {MECHANISMS.map((mechanism) => {
            const Icon = mechanism.icon;
            return (
              <div
                key={mechanism.title}
                className="xoot-trust-card flex h-full flex-col rounded-3xl"
              >
                <div className="xoot-trust-card__top">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
                    style={{ background: mechanism.wash, color: mechanism.ink }}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.9} aria-hidden="true" />
                  </span>
                  <span className="xoot-trust-status" data-status={mechanism.status}>{STATUS_LABEL[mechanism.status]}</span>
                </div>
                <div><h3>{mechanism.title}</h3><p className="xoot-trust-card__body">{mechanism.body}</p></div>

                <ul>
                  {mechanism.points.map((point) => (
                    <li key={point}>
                      <span aria-hidden="true" className="xoot-trust-bullet" style={{ background: mechanism.ink }} />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>

                {mechanism.note ? (
                  <div className="xoot-trust-note"><Info size={14} aria-hidden="true" /><p>{mechanism.note}</p></div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="xoot-trust-policy"><p>For the personal information we hold, how it is used and how to request access or deletion, read our privacy policy and POPIA notice.</p><div><a className="xoot-action xoot-action--outline" href="/legal/privacy">Privacy policy</a><a className="xoot-action xoot-action--ghost" href="/legal/popia">POPIA notice</a></div></div>
      </div>
    </section>
  );
};
