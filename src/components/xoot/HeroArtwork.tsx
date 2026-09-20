import type { CSSProperties, ReactNode } from "react";

export function CleaningBrushIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m16 22-1-4" /><path d="M19 14a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2h-3a1 1 0 0 1-1-1V4a2 2 0 0 0-4 0v5a1 1 0 0 1-1 1H6a2 2 0 0 0-2 2v1a1 1 0 0 0 1 1" /><path d="M19 14H5l-1.973 6.767A1 1 0 0 0 4 22h16a1 1 0 0 0 .973-1.233z" /><path d="m8 22 1-4" /></svg>;
}

export function CarePlusGlyph() {
  return <svg viewBox="0 0 32 32" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><g transform="translate(-1 7) scale(0.7) rotate(-6 13.6 17)"><path d="M13.6,27.2 C8.4,23 3,18.6 3,13.4 C3,9.6 5.8,7 9.2,7 C11.4,7 13,8.4 13.8,10.4 C14.6,8.5 16.3,7.2 18.5,7.2 C21.8,7.2 24.3,9.8 24.2,13.4 C24.1,18.4 19,22.9 13.6,27.2 Z" /></g><path d="M24.25,1.5 V14 M18,7.75 H30.5" /></svg>;
}

// Geometry and colours from the uploaded Bloom and WashiTape components.
const flowers = [
  { size: 118, palette: "lilac", left: "-4%", top: "8%", opacity: .34 },
  { size: 74, palette: "petal", left: "11%", top: "-4%", opacity: .30 },
  { size: 92, palette: "honey", left: "86%", top: "4%", opacity: .32 },
  { size: 58, palette: "sage", left: "96%", top: "34%", opacity: .28 },
  { size: 132, palette: "mist", left: "-8%", top: "52%", opacity: .30 },
  { size: 80, palette: "petal", left: "92%", top: "70%", opacity: .28 },
  { size: 100, palette: "lilac", left: "6%", top: "84%", opacity: .30 },
  { size: 64, palette: "honey", left: "78%", top: "92%", opacity: .26 },
];

export function HandoffFlowerField({ items = flowers, className = "xoot-hero-flowers" }: { items?: typeof flowers; className?: string } = {}) {
  return (
    <div className={className} aria-hidden="true">
      {items.map(({ size, palette, ...position }, index) => {
        const width = Math.round(size * .34);
        const height = Math.round(size * .5);
        return (
          <span key={index} style={{ position: "absolute", width: size, height: size, ...position }}>
            {[0, 72, 144, 216, 288].map((angle, petal) => (
              <span key={angle} style={{
                position: "absolute", left: "50%", top: "50%", width, height,
                marginLeft: -width / 2, marginTop: -height,
                background: `var(--xoot-${palette}-mid)`, opacity: petal % 2 ? .9 : 1,
                borderRadius: `${Math.round(width * .5)}px ${Math.round(width * .5)}px ${Math.round(width * .28)}px ${Math.round(width * .28)}px`,
                transform: `rotate(${angle}deg) translateY(${Math.round(size * .05)}px)`,
                transformOrigin: "50% 100%",
              }} />
            ))}
            <span style={{
              position: "absolute", left: "50%", top: "50%",
              width: Math.round(size * .26), height: Math.round(size * .26),
              marginLeft: -Math.round(size * .13), marginTop: -Math.round(size * .13),
              borderRadius: "50%",
              background: `var(--xoot-${palette === "honey" ? "blush-500" : palette === "lilac" || palette === "mist" ? "neutral-0" : "honey-mid"})`,
              boxShadow: "inset 0 -1px 3px rgba(23,17,15,.12)",
            }} />
          </span>
        );
      })}
    </div>
  );
}

export function HandoffTape({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <span aria-hidden="true" className={`xoot-handoff-tape ${className}`} style={style} />;
}

export const HeroFlowers = HandoffFlowerField;

export function HeroArrow() {
  return (
    <svg className="xoot-hero-arrow" aria-hidden="true" viewBox="0 0 120 60" width="116" height="58" fill="none" stroke="var(--xoot-careplus-500)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4,14 C34,6 68,10 96,34" />
      <path d="M96,34 L84,20 M96,34 L78,36" />
    </svg>
  );
}

export function HandoffNote({ children }: { children: ReactNode }) {
  return (
    <div className="xoot-handoff-note">
      <HandoffTape style={{ backgroundColor: "var(--xoot-mist-mid)", width: 78, height: 26, top: -4, left: "50%", marginLeft: -39, rotate: "-3deg" }} />
      <div>{children}</div>
    </div>
  );
}
