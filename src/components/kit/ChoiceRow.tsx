import { Check } from "lucide-react";
import { type CSSProperties, type ReactNode, useState } from "react";

/**
 * The kit's question row: a wide pill you tap, with a check ring on the right.
 *
 * Ported from `design/Xoot_App.html`, `components/onboarding/ChoiceRow.jsx`. Used wherever a
 * screen asks something with a small set of answers — onboarding questions, the Care+ retention
 * offer, cancellation reasons.
 *
 * `multi` squares the ring, which is the only affordance distinguishing "pick one" from "pick
 * several" before you tap. It is not decoration.
 *
 * The kit's own note on the dark variant, kept because the reasoning is not obvious from the
 * values: on a dark canvas a *selected* row fills with brand violet, because white type on
 * violet reads cleanly where a translucent tint left the label washed out.
 */

export type ChoiceRowProps = {
  label: ReactNode;
  description?: ReactNode;
  selected?: boolean;
  onClick?: () => void;
  /** See `ChipGrid` — the kit defaults to dark for its onboarding canvas; the app is light. */
  theme?: "light" | "dark";
  /** Square the ring to signal that more than one answer is allowed. */
  multi?: boolean;
  style?: CSSProperties;
};

export function ChoiceRow({
  label,
  description,
  selected = false,
  onClick,
  theme = "light",
  multi = false,
  style,
}: ChoiceRowProps) {
  const [hover, setHover] = useState(false);
  const dark = theme === "dark";

  const background = dark
    ? selected
      ? "var(--xoot-violet-700)"
      : hover
        ? "rgba(255,255,255,.11)"
        : "rgba(255,255,255,.07)"
    : selected
      ? "var(--xoot-action-brand-soft)"
      : hover
        ? "var(--xoot-neutral-50)"
        : "var(--xoot-surface-card)";

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--xoot-space-3)",
        width: "100%",
        minHeight: 62,
        padding: "12px var(--xoot-space-5)",
        textAlign: "left",
        border: "none",
        borderRadius: "var(--xoot-radius-pill)",
        background,
        cursor: "pointer",
        boxShadow: selected
          ? `inset 0 0 0 var(--xoot-border-thick) ${dark ? "var(--xoot-lilac-mid)" : "var(--xoot-violet-400)"}`
          : dark
            ? "none"
            : "inset 0 0 0 1px var(--xoot-border-color)",
        transition:
          "background var(--xoot-dur-fast) var(--xoot-ease-out), box-shadow var(--xoot-dur-fast) var(--xoot-ease-out)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span
          style={{
            fontFamily: "var(--xoot-font-core)",
            fontSize: "var(--xoot-body-lg)",
            fontWeight: "var(--xoot-weight-medium)",
            letterSpacing: "var(--xoot-track-tight)",
            color: dark ? "#FFFFFF" : selected ? "var(--xoot-text-brand)" : "var(--xoot-text-primary)",
          }}
        >
          {label}
        </span>
        {description ? (
          <span
            style={{
              fontSize: "var(--xoot-body-sm)",
              color: dark
                ? selected
                  ? "rgba(255,255,255,.94)"
                  : "rgba(255,255,255,.6)"
                : "var(--xoot-text-muted)",
            }}
          >
            {description}
          </span>
        ) : null}
      </span>
      <span
        // Decorative: `aria-pressed` on the button already carries the state, and a second
        // announcement of it is noise.
        aria-hidden
        style={{
          display: "grid",
          placeItems: "center",
          width: 26,
          height: 26,
          flex: "0 0 auto",
          borderRadius: multi ? "var(--xoot-radius-xs)" : "50%",
          background: selected
            ? dark
              ? "var(--xoot-neutral-0)"
              : "var(--xoot-action-primary)"
            : dark
              ? "rgba(255,255,255,.14)"
              : "transparent",
          boxShadow: selected
            ? "none"
            : `inset 0 0 0 2px ${dark ? "rgba(255,255,255,.28)" : "var(--xoot-neutral-300)"}`,
          transition: "background var(--xoot-dur-fast) var(--xoot-ease-spring)",
        }}
      >
        {selected ? (
          <Check
            size={15}
            strokeWidth={3}
            color={dark ? "var(--xoot-violet-700)" : "#fff"}
            style={{ animation: "xoot-pop var(--xoot-dur-fast) var(--xoot-ease-spring)" }}
          />
        ) : null}
      </span>
    </button>
  );
}
