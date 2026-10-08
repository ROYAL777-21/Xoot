import {
  BedDouble,
  Building2,
  Key,
  Rabbit,
  Shirt,
  Sparkles,
} from "lucide-react";
import { CleaningBrushIcon } from "@/components/xoot/HeroArtwork";

const services = {
  regular: { icon: CleaningBrushIcon, tint: "blush" },
  express: { icon: Rabbit, tint: "violet" },
  office: { icon: Building2, tint: "mist" },
  airbnb: { icon: BedDouble, tint: "lilac" },
  moving: { icon: Key, tint: "sage" },
  laundry: { icon: Shirt, tint: "moss" },
  lux: { icon: Sparkles, tint: "honey" },
};

/** Original ServiceIcon.jsx tile, blob and outline glyph geometry. */
export function ServiceIcon({
  service,
  size = 56,
  shape = "tile",
}: {
  service: keyof typeof services;
  size?: number;
  shape?: "tile" | "circle";
}) {
  const { icon: Icon, tint } = services[service];
  const wash =
    tint === "violet" ? "var(--xoot-violet-50)" : `var(--xoot-${tint}-wash)`;
  const blob =
    tint === "violet" ? "var(--xoot-violet-200)" : `var(--xoot-${tint}-mid)`;
  return (
    <span
      aria-hidden="true"
      style={{
        position: "relative",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        width: size,
        height: size,
        borderRadius: shape === "circle" ? "50%" : "var(--xoot-radius-key)",
        background: wash,
      }}
    >
      <span
        style={{
          position: "absolute",
          width: Math.round(size * 0.44),
          height: Math.round(size * 0.44),
          right: Math.round(size * 0.12),
          bottom: Math.round(size * 0.13),
          borderRadius: `${Math.round(size * 0.18)}px ${Math.round(size * 0.22)}px ${Math.round(size * 0.15)}px ${Math.round(size * 0.24)}px`,
          background: blob,
          opacity: 0.92,
        }}
      />
      <Icon
        size={Math.round(size * 0.52)}
        strokeWidth={2.25}
        style={{ position: "relative", color: "var(--xoot-icon-on-tint)" }}
      />
    </span>
  );
}
