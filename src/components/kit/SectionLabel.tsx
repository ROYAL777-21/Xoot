import { ChevronDown, ChevronUp, Circle, Clock, type LucideIcon, Moon, Plus, Sun, Sunrise, Triangle } from "lucide-react";
import { type CSSProperties } from "react";

/**
 * The kit's collapsible section header — a tinted uppercase pill with an optional count, a
 * disclosure chevron, and an add button.
 *
 * Ported from `design/Xoot_App.html`, `components/calendar/SectionLabel.jsx`. It is what gives
 * the Tiimo-style calendar home its time-of-day structure, and it is the only place the
 * `--xoot-time-*` tokens are consumed.
 *
 * The slot table is the kit's, verbatim. Do not add a slot without a matching pair of tokens:
 * the whole point of `--xoot-time-morning` / `--xoot-time-morning-ink` existing as a pair is that
 * the foreground is chosen against its own background rather than assumed to be readable.
 */

export type SectionSlot =
  | "anytime"
  | "morning"
  | "afternoon"
  | "evening"
  | "high"
  | "medium"
  | "low"
  | "plain";

type SlotStyle = {
  /** `LucideIcon`, not a hand-written signature — lucide's `size` accepts a string too. */
  icon: LucideIcon | null;
  bg: string;
  fg: string;
};

const SLOTS: Record<SectionSlot, SlotStyle> = {
  anytime: { icon: Clock, bg: "var(--xoot-time-anytime)", fg: "var(--xoot-time-anytime-ink)" },
  morning: { icon: Sunrise, bg: "var(--xoot-time-morning)", fg: "var(--xoot-time-morning-ink)" },
  afternoon: { icon: Sun, bg: "var(--xoot-time-afternoon)", fg: "var(--xoot-time-afternoon-ink)" },
  evening: { icon: Moon, bg: "var(--xoot-time-evening)", fg: "var(--xoot-time-evening-ink)" },
  high: { icon: Triangle, bg: "var(--xoot-violet-50)", fg: "var(--xoot-violet-700)" },
  medium: { icon: Circle, bg: "var(--xoot-honey-wash)", fg: "var(--xoot-honey-ink)" },
  low: { icon: ChevronDown, bg: "var(--xoot-mist-wash)", fg: "var(--xoot-mist-ink)" },
  plain: { icon: null, bg: "var(--xoot-neutral-100)", fg: "var(--xoot-text-secondary)" },
};

export type SectionLabelProps = {
  slot?: SectionSlot;
  label?: string;
  count?: number;
  open?: boolean;
  /** Omit to render a static label rather than a disclosure control. */
  onToggle?: () => void;
  /** Omit to hide the add button. */
  onAdd?: () => void;
  /** Accessible name for the add button — "Add" alone is ambiguous in a list of sections. */
  addLabel?: string;
  style?: CSSProperties;
};

export function SectionLabel({
  slot = "plain",
  label,
  count,
  open = true,
  onToggle,
  onAdd,
  addLabel = "Add",
  style,
}: SectionLabelProps) {
  const s = SLOTS[slot] ?? SLOTS.plain;
  const SlotIcon = s.icon;
  const Chevron = open ? ChevronUp : ChevronDown;
  const text = label ?? slot;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--xoot-space-2)", ...style }}>
      <button
        type="button"
        onClick={onToggle}
        // Only a disclosure when it can actually disclose. Rendering `aria-expanded` on a
        // non-interactive label tells a screen reader there is something to open that is not.
        aria-expanded={onToggle ? open : undefined}
        disabled={!onToggle}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 34,
          padding: "0 12px",
          border: "none",
          borderRadius: "var(--xoot-radius-pill)",
          background: s.bg,
          color: s.fg,
          fontFamily: "var(--xoot-font-core)",
          fontSize: "var(--xoot-label)",
          fontWeight: "var(--xoot-weight-strong)",
          letterSpacing: "var(--xoot-track-label)",
          textTransform: "uppercase",
          cursor: onToggle ? "pointer" : "default",
        }}
      >
        {SlotIcon ? <SlotIcon size={13} strokeWidth={2} /> : null}
        {text}
        {count != null ? ` (${count})` : null}
        {onToggle ? <Chevron size={13} strokeWidth={2.2} style={{ marginLeft: 1 }} /> : null}
      </button>

      <span style={{ flex: 1 }} />

      {onAdd ? (
        <button
          type="button"
          aria-label={addLabel}
          onClick={onAdd}
          style={{
            display: "grid",
            placeItems: "center",
            width: 26,
            height: 26,
            border: "none",
            borderRadius: "50%",
            cursor: "pointer",
            background: "var(--xoot-neutral-100)",
            color: "var(--xoot-text-secondary)",
          }}
        >
          <Plus size={13} strokeWidth={2.2} />
        </button>
      ) : null}
    </div>
  );
}
