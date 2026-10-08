import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Uploaded TextFlip.jsx phrases; the unverified price claim is excluded.
// Fit with the font's real size so text stays sharp at every viewport.
const PHRASES = [
  "Built on trust",
  "Your Home Handled",
  "quality services",
  "the Xoot way",
  "Experience the difference",
] as const;

export const HeroWordFlip = () => {
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState(1);
  const [reducedMotion, setReducedMotion] = useState(
    () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const host = useRef<HTMLSpanElement>(null);
  const sizer = useRef<HTMLSpanElement>(null);
  const phrase = PHRASES[index];

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % PHRASES.length), 3000);
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const fit = () => {
      if (!host.current || !sizer.current || !sizer.current.scrollWidth) return;
      setRatio(Math.min(1, host.current.clientWidth * .995 / sizer.current.scrollWidth));
    };
    fit();
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null;
    if (host.current) observer?.observe(host.current);
    if (sizer.current) observer?.observe(sizer.current);
    window.addEventListener("resize", fit);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", fit);
    };
  }, [phrase]);

  return (
    <span ref={host} className="xoot-flip-host">
      <span ref={sizer} aria-hidden="true" className="xoot-flip-sizer">{phrase}</span>
      <span className="xoot-flip-phrase whitespace-nowrap" style={{ fontSize: ratio < 1 ? `${ratio * 100}%` : undefined }}>
        <span key={phrase} className="motion-safe:animate-fade-in">{phrase}</span>
      </span>
    </span>
  );
};
