import { motion, type Variants } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Icon-specific micro-interactions. Each `kind` maps to motion that matches
 * what the icon depicts. Animations run on hover/tap and are dialled down only
 * by the OS `prefers-reduced-motion` setting.
 */

export type IconMotion =
  | "bounce"
  | "twinkle"
  | "drive"
  | "drip"
  | "wave"
  | "sweep"
  | "flicker"
  | "wag"
  | "flip"
  | "pop"
  | "spin"
  | "ring"
  | "none";

const VARIANTS: Record<IconMotion, Variants> = {
  bounce:  { rest: { y: 0 },                    play: { y: [0, -4, 0, -1.5, 0] } },
  twinkle: { rest: { scale: 1, opacity: 1 },    play: { scale: [1, 1.18, 0.96, 1.08, 1], opacity: [1, 0.7, 1] } },
  drive:   { rest: { x: 0 },                    play: { x: [-8, 2, 0] } },
  drip:    { rest: { y: 0 },                    play: { y: [0, 3, -2, 0], scaleY: [1, 1.12, 0.94, 1] } },
  wave:    { rest: { y: 0 },                    play: { y: [0, -2, 2, -1, 0], rotate: [0, -3, 3, 0] } },
  sweep:   { rest: { x: 0 },                    play: { x: [0, 5, -3, 0], opacity: [1, 0.65, 1] } },
  flicker: { rest: { opacity: 1 },              play: { opacity: [1, 0.25, 1, 0.4, 1], scale: [1, 1.12, 1] } },
  wag:     { rest: { rotate: 0 },               play: { rotate: [0, -9, 7, -4, 0] } },
  flip:    { rest: { rotateY: 0 },              play: { rotateY: [0, -35, 0] } },
  pop:     { rest: { scale: 1 },                play: { scale: [1, 1.22, 0.95, 1] } },
  spin:    { rest: { rotate: 0 },               play: { rotate: [0, 25, -18, 0] } },
  ring:    { rest: { rotate: 0 },               play: { rotate: [0, -14, 12, -8, 5, 0] } },
  none:    { rest: {}, play: {} },
};

const DURATION: Partial<Record<IconMotion, number>> = { twinkle: 0.7, flicker: 0.5, ring: 0.6, drive: 0.45 };

export function AnimatedIcon({
  icon: Icon,
  kind = "pop",
  className,
  style,
  strokeWidth = 1.75,
  active = false,
}: {
  icon: LucideIcon;
  kind?: IconMotion;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
  /** When true the motion loops gently (e.g. unread chat, live status). */
  active?: boolean;
}) {
  return (
    <motion.span
      className={cn("inline-flex", className)}
      style={{ transformStyle: "preserve-3d" }}
      variants={VARIANTS[kind]}
      initial="rest"
      animate={active ? "play" : "rest"}
      whileHover="play"
      whileTap="play"
      transition={{
        duration: DURATION[kind] ?? 0.55,
        ease: "easeInOut",
        repeat: active ? Infinity : 0,
        repeatDelay: active ? 2.2 : 0,
      }}
    >
      <Icon className="size-full" style={style} strokeWidth={strokeWidth} />
    </motion.span>
  );
}
