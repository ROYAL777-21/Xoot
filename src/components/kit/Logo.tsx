import type { CSSProperties, HTMLAttributes } from "react";

const tones = {
  ink: { fg: "var(--xoot-ink-900)", tile: "var(--xoot-violet-500)", tileFg: "#FFFFFF" },
  violet: { fg: "var(--xoot-violet-500)", tile: "var(--xoot-violet-500)", tileFg: "#FFFFFF" },
  inverse: { fg: "var(--xoot-neutral-0)", tile: "var(--xoot-neutral-0)", tileFg: "var(--xoot-violet-600)" },
};

export interface LogoProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "wordmark" | "icon" | "lockup";
  size?: number;
  tone?: keyof typeof tones;
  member?: boolean;
}

/** Original handoff components/core/Logo.jsx, with its bundled Caveat letterforms. */
export function Logo({ variant = "wordmark", size = 32, tone = "ink", member = false, style, ...rest }: LogoProps) {
  const t = tones[tone];
  const wordStyle: CSSProperties = {
    fontFamily: "var(--xoot-font-script)", fontSize: Math.round(size * 1.5), fontWeight: 600,
    lineHeight: 1, letterSpacing: "-.01em", color: t.fg, userSelect: "none", display: "inline-block",
    fontFeatureSettings: "normal",
  };
  if (variant === "icon") {
    const letterStyle = { fontFamily: "var(--xoot-font-script)", fontSize: 46, fontWeight: 600 };
    return <span aria-label="Xoot" role="img" style={{
      position: "relative", display: "grid", placeItems: "center", flex: "0 0 auto", width: size, height: size,
      borderRadius: Math.round(size * .225),
      background: `linear-gradient(168deg, color-mix(in oklch, ${t.tile} 88%, white) 0%, ${t.tile} 46%, color-mix(in oklch, ${t.tile} 82%, black) 100%)`,
      boxShadow: `inset 0 ${Math.max(1, size * .014)}px 0 rgba(255,255,255,.34), inset 0 -${Math.max(1, size * .02)}px ${Math.max(1, size * .03)}px rgba(20,18,16,.22), 0 ${Math.round(size * .05)}px ${Math.round(size * .11)}px -${Math.round(size * .04)}px rgba(70,40,160,.42)`,
      overflow: "hidden", ...style,
    }} {...rest}>
      <span aria-hidden="true" style={{ position: "absolute", left: "-18%", right: "-18%", top: -size * .42, height: size * .92, borderRadius: "50%", background: "radial-gradient(ellipse at 42% 78%, rgba(255,255,255,.42) 0%, rgba(255,255,255,.12) 46%, transparent 70%)", pointerEvents: "none" }} />
      <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true" style={{ display: "block", position: "relative" }}>
        <text x="50" y="65.6" textAnchor="middle" textLength="76" lengthAdjust="spacingAndGlyphs" fill="rgba(20,18,16,.26)" style={letterStyle}>Xoot</text>
        <text x="50" y="64" textAnchor="middle" textLength="76" lengthAdjust="spacingAndGlyphs" fill={t.tileFg} style={letterStyle}>Xoot</text>
      </svg>
    </span>;
  }
  return <span style={{ display: "inline-flex", alignItems: "center", gap: Math.round(size * .28), ...style }} {...rest}>
    <span style={wordStyle}>Xoot</span>
    {(variant === "lockup" || member) && <span style={{ display: "inline-flex", alignItems: "center", padding: `${Math.round(size * .11)}px ${Math.round(size * .26)}px`, borderRadius: "var(--xoot-radius-pill)", background: "var(--xoot-careplus-500)", color: "#FFFFFF", fontFamily: "var(--xoot-font-core)", fontSize: Math.max(9, Math.round(size * .32)), fontWeight: 700, letterSpacing: "var(--xoot-track-label)", textTransform: "uppercase", lineHeight: 1 }}>Care<span style={{ fontSize: "1.15em", lineHeight: 1 }}>+</span></span>}
  </span>;
}
