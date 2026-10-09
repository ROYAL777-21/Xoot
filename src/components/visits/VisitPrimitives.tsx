import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";

export function VisitHeader({ title, back, trailing }: { title: string; back: string; trailing?: ReactNode }) {
  return <header className="xoot-detail-header"><Link to={back} className="xoot-detail-icon" aria-label="Back"><ArrowLeft size={20} /></Link><h1>{title}</h1>{trailing}</header>;
}
export function VisitCard({ children, tone = "surface", className = "" }: { children: ReactNode; tone?: "surface" | "flat" | "dawn"; className?: string }) {
  return <section className={`xoot-detail-card is-${tone} ${className}`}>{children}</section>;
}
export function RatingStars({ value, onChange }: { value: number; onChange?: (value: number) => void }) {
  return onChange ? <div className="xoot-rate-stars" role="group" aria-label="Rate this visit">
    {[1, 2, 3, 4, 5].map(star => <button key={star} type="button" aria-label={`${star} ${star === 1 ? "star" : "stars"}`} aria-pressed={value === star} onClick={() => onChange(star)}><Star size={40} strokeWidth={2} color={value >= star ? "var(--xoot-honey-500)" : "var(--xoot-neutral-300)"} fill={value >= star ? "var(--xoot-honey-500)" : "none"} /></button>)}
  </div> : <div className="xoot-rate-stars" aria-label={`Recorded rating: ${value} out of 5 stars`}>{[1, 2, 3, 4, 5].map(star => <Star key={star} size={40} strokeWidth={2} color={value >= star ? "var(--xoot-honey-500)" : "var(--xoot-neutral-300)"} fill={value >= star ? "var(--xoot-honey-500)" : "none"} />)}</div>;
}
/** Five petals and palette from the original components/brand/bloom/Bloom.jsx. */
export function VisitBloom() {
  return <span className="xoot-rate-bloom" aria-hidden="true">{[0, 72, 144, 216, 288].map((deg, index) => <span key={deg} style={{ transform: `rotate(${deg}deg) translateY(4px)`, opacity: index % 2 ? .9 : 1 }} />)}<i /></span>;
}
