import { type CSSProperties, type ReactNode } from "react";

/**
 * Two-column wrap of tappable chips — the kit's "pick what applies" control.
 *
 * Ported from `design/Xoot_App.html`, `components/onboarding/ChipGrid.jsx`. This is the first
 * component in the codebase to consume the `--xoot-*` layer: `src/styles/kit-tokens.css` landed
 * the kit's 339 tokens ahead of any port, and until now nothing asked for one.
 *
 * Values are read as `var(--xoot-…)` rather than translated to Tailwind classes on purpose. The
 * tokens are not in Tailwind's theme, and going through a second naming layer would make this
 * port impossible to diff against the kit source — which is the only way anyone can check that
 * what shipped is what was designed.
 */

export type ChipOption = {
  value: string;
  label: string;
  /** Optional leading glyph. Any React node; the kit uses its own 17px icon set. */
  icon?: ReactNode;
};

export type ChipGridProps = {
  /** Bare strings are shorthand for `{ value: s, label: s }`, as in the kit. */
  options: readonly (string | ChipOption)[];
  value: readonly string[];
  onChange: (next: string[]) => void;
  /**
   * The kit defaults this to `"dark"` because its onboarding runs on a dark canvas while the
   * rest of the app is light. The default here is `"light"`, matching the app's own default
   * scheme — a component that assumed dark would render white-on-white everywhere it is used
   * outside onboarding, which is most places.
   */
  theme?: "light" | "dark";
  /** Announced to screen readers as the group's purpose. */
  label?: string;
  style?: CSSProperties;
};

const normalise = (option: string | ChipOption): ChipOption =>
  typeof option === "string" ? { value: option, label: option } : option;

export function ChipGrid({
  options,
  value,
  onChange,
  theme = "light",
  label,
  style,
}: ChipGridProps) {
  const dark = theme === "dark";
  const selected = new Set(value);

  const toggle = (v: string) => {
    onChange(selected.has(v) ? value.filter((x) => x !== v) : [...value, v]);
  };

  return (
    <div
      role="group"
      aria-label={label}
      style={{ display: "flex", flexWrap: "wrap", gap: "var(--xoot-space-2)", ...style }}
    >
      {options.map((option) => {
        const { value: v, label: text, icon } = normalise(option);
        const on = selected.has(v);
        return (
          <button
            key={v}
            type="button"
            onClick={() => toggle(v)}
            // `aria-pressed`, not `aria-selected`: these are independent toggles, not a listbox.
            // A screen reader announcing "selected" on a chip you can turn off again is a lie
            // about the interaction, and the kit gets this right.
            aria-pressed={on}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              // 50, above the 44pt floor in `design-tokens.ts`. The kit chose it; do not shrink
              // it to fit more chips on a row.
              minHeight: 50,
              padding: "0 var(--xoot-space-4)",
              border: "none",
              borderRadius: "var(--xoot-radius-sm)",
              background: on
                ? dark
                  ? "var(--xoot-violet-700)"
                  : "var(--xoot-action-brand-soft)"
                : dark
                  ? "rgba(255,255,255,.07)"
                  : "var(--xoot-surface-card)",
              color: on
                ? dark
                  ? "#FFFFFF"
                  : "var(--xoot-text-brand)"
                : dark
                  ? "#FFFFFF"
                  : "var(--xoot-text-primary)",
              boxShadow: on
                ? dark
                  ? "var(--xoot-shadow-brand)"
                  : "inset 0 0 0 var(--xoot-border-thick) var(--xoot-violet-300)"
                : dark
                  ? "inset 0 0 0 1px rgba(255,255,255,.14)"
                  : "inset 0 0 0 1px var(--xoot-border-color)",
              fontFamily: "var(--xoot-font-core)",
              fontSize: "var(--xoot-body)",
              fontWeight: "var(--xoot-weight-medium)",
              cursor: "pointer",
              // `--xoot-dur-fast` is zeroed under `prefers-reduced-motion` in index.css, so this
              // honours the OS setting without a media query here.
              transition: "all var(--xoot-dur-fast) var(--xoot-ease-out)",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {icon}
            {text}
          </button>
        );
      })}
    </div>
  );
}
