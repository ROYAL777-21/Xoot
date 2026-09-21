import type { CSSProperties } from "react";

const cardTints = {
  blush: { background: "var(--xoot-blush-mid)", color: "var(--xoot-blush-ink)" },
  lilac: { background: "var(--xoot-lilac-mid)", color: "var(--xoot-lilac-ink)" },
  moss: { background: "var(--xoot-moss-mid)", color: "var(--xoot-moss-ink)" },
  petal: { background: "var(--xoot-petal-mid)", color: "var(--xoot-petal-ink)" },
  mist: { background: "var(--xoot-mist-mid)", color: "var(--xoot-mist-ink)" },
  honey: { background: "var(--xoot-honey-mid)", color: "var(--xoot-honey-ink)" },
  sage: { background: "var(--xoot-sage-mid)", color: "var(--xoot-sage-ink)" },
} as const;

/** Original handoff components/brand/gift-card/GiftCard.jsx artwork. */
export const giftCardTints = ['blush', 'lilac', 'mist', 'petal', 'moss', 'sage', 'honey'] as const;

export function GiftCard({ tint = "petal", title, note, from, className = "", style }: {
  tint?: keyof typeof cardTints;
  title: string; note?: string; from?: string; className?: string; style?: CSSProperties;
}) {
  const ink = cardTints[tint].color;
  return <div className={`xoot-gift-art ${className}`} style={{ ...cardTints[tint], ...style }}>
    <span aria-hidden="true" className="xoot-gift-art-stripes" />
    <span aria-hidden="true" className="xoot-gift-art-box">
      <span className="xoot-gift-ribbon-vertical" style={{ background: ink }} />
      <span className="xoot-gift-ribbon-horizontal" style={{ background: ink }} />
      <span className="xoot-gift-bow"><span style={{ borderColor: ink }} /><span style={{ borderColor: ink }} /></span>
    </span>
    <span className="xoot-gift-art-copy">
      <strong>{title}</strong>
      {note && <span className="xoot-gift-art-note">“{note}”</span>}
      {from && <span className="xoot-gift-art-from">from {from}</span>}
    </span>
  </div>;
}
