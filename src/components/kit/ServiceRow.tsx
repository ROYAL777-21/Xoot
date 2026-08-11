import { ChevronRight } from "lucide-react";
import { type CSSProperties, type ReactNode } from "react";

/**
 * The kit's list row: tinted icon, title, right-aligned meta, description, chevron.
 *
 * Ported from `design/Xoot_App.html`, `components/patterns/ServiceRow.jsx`. It is the shape
 * behind most of the app's lists — the five services in the booking flow, search results,
 * settings groups — which is why it is worth porting once rather than per screen.
 *
 * Two things carried over deliberately:
 *
 * - **`fontVariantNumeric: "tabular-nums"` on the meta slot.** Prices in a vertical list jitter
 *   without it, because proportional digits are different widths. It is the difference between a
 *   price column and a price mess, and it costs nothing.
 * - **The icon tint is `color-mix` on the accent**, not a second token per service. That is what
 *   lets a new service ship with one colour rather than a palette entry.
 */

export type ServiceRowProps = {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned on the title line — the kit uses it for price or duration. */
  meta?: ReactNode;
  /** Drives the icon tile tint. Any CSS colour; defaults to the kit's brand violet. */
  accent?: string;
  selected?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
};

export function ServiceRow({
  icon,
  title,
  description,
  meta,
  accent = "var(--xoot-violet-500)",
  selected = false,
  onClick,
  style,
}: ServiceRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected || undefined}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "var(--xoot-space-3)",
        width: "100%",
        padding: "var(--xoot-space-3) var(--xoot-space-4)",
        textAlign: "left",
        border: "none",
        borderRadius: "var(--xoot-radius-sm)",
        cursor: "pointer",
        background: selected ? "var(--xoot-action-brand-soft)" : "var(--xoot-surface-card)",
        boxShadow: selected
          ? "inset 0 0 0 var(--xoot-border-thick) var(--xoot-violet-500)"
          : "none",
        transition: "background var(--xoot-dur-fast) var(--xoot-ease-out)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
    >
      <span
        aria-hidden
        style={{
          display: "grid",
          placeItems: "center",
          width: 40,
          height: 40,
          flex: "0 0 auto",
          borderRadius: "var(--xoot-radius-key)",
          color: accent,
          background: `color-mix(in oklch, ${accent} 13%, var(--xoot-neutral-0))`,
        }}
      >
        {icon}
      </span>

      <span style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "var(--xoot-space-2)",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: "var(--xoot-body)",
              fontWeight: "var(--xoot-weight-strong)",
              color: "var(--xoot-text-primary)",
            }}
          >
            {title}
          </span>
          {meta ? (
            <span
              style={{
                fontSize: "var(--xoot-body-sm)",
                fontWeight: "var(--xoot-weight-strong)",
                color: "var(--xoot-text-primary)",
                whiteSpace: "nowrap",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {meta}
            </span>
          ) : null}
        </span>
        {description ? (
          <span
            style={{
              fontSize: "var(--xoot-body-sm)",
              color: "var(--xoot-text-muted)",
              lineHeight: "var(--xoot-body-sm-lh)",
            }}
          >
            {description}
          </span>
        ) : null}
      </span>

      <ChevronRight
        aria-hidden
        size={18}
        color="var(--xoot-neutral-400)"
        style={{ marginTop: 11, flex: "0 0 auto" }}
      />
    </button>
  );
}
