import {
  Home, Sparkles, Briefcase, Sofa, Wind, Wrench, Zap, Trees,
  Bug, Waves, PawPrint, Truck, ClipboardCheck, Hammer, Paintbrush, Droplets,
  type LucideIcon,
} from "lucide-react";
import type { IconMotion } from "@/components/zoot/AnimatedIcon";

export type ServiceVisual = { icon: LucideIcon; accent: string; tint: string; motion: IconMotion };

// Vibrant accent per service. `accent` is icon/text color, `tint` the soft bg,
// `motion` the micro-interaction that matches what the icon depicts.
const DEFAULT: ServiceVisual = { icon: Home, accent: "#C6812B", tint: "#FDF2DF", motion: "bounce" };

const MAP: Record<string, ServiceVisual> = {
  regular:      { icon: Home,           accent: "#0FA3A3", tint: "#DCF6F5", motion: "bounce" },
  deep:         { icon: Sparkles,       accent: "#B8348A", tint: "#FADFEF", motion: "twinkle" },
  "move-in-out":{ icon: Truck,          accent: "#4C5FD5", tint: "#E2E6FA", motion: "drive" },
  airbnb:       { icon: Sparkles,       accent: "#E85D3B", tint: "#FBE0D5", motion: "twinkle" },
  office:       { icon: Briefcase,      accent: "#2E7EE0", tint: "#DDEAFB", motion: "pop" },
  carpet:       { icon: Sofa,           accent: "#C74A28", tint: "#FADED2", motion: "bounce" },
  windows:      { icon: Wind,           accent: "#3AA9C7", tint: "#DDF1F6", motion: "sweep" },
  laundry:      { icon: Droplets,       accent: "#8069C9", tint: "#E7E2F5", motion: "drip" },
  plumbing:     { icon: Wrench,         accent: "#1F70C7", tint: "#DBEAF7", motion: "wag" },
  electrical:   { icon: Zap,            accent: "#E4A017", tint: "#FBEED0", motion: "flicker" },
  gardening:    { icon: Trees,          accent: "#2F9E5D", tint: "#DBF1E4", motion: "wag" },
  pest:         { icon: Bug,            accent: "#7C4CC7", tint: "#E6DCF6", motion: "wag" },
  pool:         { icon: Waves,          accent: "#0E9BD1", tint: "#D5EEF8", motion: "wave" },
  pet:          { icon: PawPrint,       accent: "#E0568A", tint: "#FADDE7", motion: "wag" },
  furniture:    { icon: Sofa,           accent: "#B15A2E", tint: "#F7E1D3", motion: "bounce" },
  moving:       { icon: Truck,          accent: "#4C5FD5", tint: "#E2E6FA", motion: "drive" },
  inspection:   { icon: ClipboardCheck, accent: "#4B5A6B", tint: "#E1E5EA", motion: "flip" },
  repair:       { icon: Hammer,         accent: "#D4670E", tint: "#FADFC3", motion: "wag" },
  painting:     { icon: Paintbrush,     accent: "#C438A0", tint: "#F7DAEE", motion: "sweep" },
};

export function serviceVisual(slug?: string | null): ServiceVisual {
  if (!slug) return DEFAULT;
  return MAP[slug] ?? MAP[slug.split("-")[0]] ?? DEFAULT;
}
