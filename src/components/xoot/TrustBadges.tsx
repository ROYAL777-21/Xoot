import { BadgeCheck, Crown, Heart, Home, ShieldCheck, Star } from "lucide-react";
import { TrustBadgeKind, trustBadgeLabels } from "@/lib/trust";

const iconMap = {
  verified: BadgeCheck,
  background_checked: ShieldCheck,
  top_rated: Star,
  airbnb_specialist: Home,
  premium_care_plus: Crown,
  repeat_client_favourite: Heart,
} satisfies Record<TrustBadgeKind, typeof BadgeCheck>;

const toneMap: Record<TrustBadgeKind, string> = {
  verified: "bg-sage/15 text-sage-deep border-sage/30",
  background_checked: "bg-accent-soft text-accent-ink border-accent/30",
  top_rated: "bg-primary/10 text-primary border-primary/25",
  airbnb_specialist: "bg-muted text-foreground border-border",
  premium_care_plus: "bg-foreground text-background border-foreground",
  repeat_client_favourite: "bg-primary/10 text-primary border-primary/25",
};

export const TrustBadges = ({ badges, limit = 3 }: { badges: TrustBadgeKind[]; limit?: number }) => {
  const visible = badges.slice(0, limit);
  const overflow = Math.max(0, badges.length - visible.length);

  if (!visible.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Trust badges">
      {visible.map((badge) => {
        const Icon = iconMap[badge];
        return (
          <span
            key={badge}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold leading-none ${toneMap[badge]}`}
            title={trustBadgeLabels[badge]}
          >
            <Icon className="h-3 w-3" />
            {trustBadgeLabels[badge]}
          </span>
        );
      })}
      {overflow > 0 && (
        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          +{overflow}
        </span>
      )}
    </div>
  );
};
