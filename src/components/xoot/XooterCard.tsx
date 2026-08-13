import { Star, MapPin, BadgeCheck, Heart, Crown, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import { formatZAR } from "@/lib/format";
import { formatDistanceKm } from "@/lib/geo";
import { deriveXooterBadges, shouldFlagXooterForReview } from "@/lib/trust";
import { TrustBadges } from "@/components/xoot/TrustBadges";
import w1 from "@/assets/worker-1.jpg";
import w2 from "@/assets/worker-2.jpg";
import w3 from "@/assets/worker-3.jpg";
import w4 from "@/assets/worker-4.jpg";

export type Xooter = {
  id: string;
  name: string;
  role: string;
  rating: number;
  jobs_completed: number;
  hourly_rate: number;
  photo_url: string | null;
  tags: string[];
  /**
   * Kilometres from the booking address to this Xooter's nearest covered suburb, computed by
   * `ai-match`. Null when the address or the coverage could not be resolved — which means
   * "unknown", never "far", and the card shows coverage instead.
   */
  distance_km?: number | null;
  is_zotm: boolean;
  verified?: boolean | null;
  background_checked?: boolean | null;
  background_check_status?: string | null;
  airbnb_specialist?: boolean | null;
  premium_care_plus?: boolean | null;
  repeat_client_count?: number | null;
  job_completion_rate?: number | null;
  reliability_score?: number | null;
  years_experience?: number | null;
  suburb_coverage?: string[] | null;
  transport?: string | null;
  supplies_owned?: string[] | null;
  languages_spoken?: string[] | null;
  pet_comfort?: string | null;
};

const imgMap: Record<string, string> = {
  "/src/assets/worker-1.jpg": w1,
  "/src/assets/worker-2.jpg": w2,
  "/src/assets/worker-3.jpg": w3,
  "/src/assets/worker-4.jpg": w4,
};
export const resolvePhoto = (p?: string | null) => (p && (imgMap[p] || p)) || w1;

const fmtPct = (value?: number | null) => `${Math.round(Number(value ?? 0))}%`;

export const XooterCard = ({
  z,
  onBook,
  actionLabel,
  distanceKm,
}: {
  z: Xooter;
  onBook?: (z: Xooter) => void;
  actionLabel?: string;
  /**
   * Distance computed by the caller, for screens that rank client-side.
   *
   * `ai-match` puts the number on the row as `distance_km`, but the surfaces that rank locally —
   * `NearbyWorkers`, `Favorites` — compute it themselves from `useProximity` and have nowhere to
   * put it. Passing it in keeps one rule: **the card shows the number the list was sorted by.** A
   * list ordered on one distance and labelled with another is worse than an unordered list,
   * because it looks considered.
   *
   * Takes precedence over `z.distance_km`. Both null means unknown, and unknown falls back to
   * coverage — never to a guess.
   */
  distanceKm?: number | null;
}) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(z.id);
  const badges = deriveXooterBadges(z);
  const reliability = z.reliability_score ?? 100;
  const firstName = z.name.split(" ")[0];

  return (
    <article className="group rounded-3xl bg-card border border-border overflow-hidden shadow-card transition-all duration-500 hover:-translate-y-1 flex flex-col">
      <div className="relative aspect-4/5 overflow-hidden">
        <img src={resolvePhoto(z.photo_url)} alt={`${z.name}, professional cleaner`} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-background/95 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold shadow-card">
          <Star className="h-3 w-3 fill-primary text-primary" />{Number(z.rating).toFixed(2)}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {z.is_zotm && (<div className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold shadow-warm"><Crown className="h-3 w-3" /> ZOTM</div>)}
          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(z.id); }} className="grid place-items-center h-8 w-8 rounded-full bg-background/95 backdrop-blur-sm shadow-card hover:scale-110 transition-transform" aria-label={fav ? "Unfavorite" : "Favorite"}>
            <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
          <div className="grid place-items-center h-7 w-7 rounded-full bg-sage text-primary-foreground shadow-card"><BadgeCheck className="h-4 w-4" /></div>
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-primary-foreground">
          <p className="font-display font-bold text-lg leading-tight">{z.name}</p>
          <p className="text-xs opacity-90">Cleaning · {z.jobs_completed} jobs · {z.years_experience ?? 3}+ yrs</p>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1 gap-3">
        <TrustBadges badges={badges} limit={3} />

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-muted/45 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">Reliable</p>
            <p className={`font-display text-lg font-bold ${shouldFlagXooterForReview(reliability) ? "text-destructive" : "text-foreground"}`}>{reliability}</p>
          </div>
          <div className="rounded-xl bg-muted/45 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">Complete</p>
            <p className="font-display text-lg font-bold">{fmtPct(z.job_completion_rate ?? 98)}</p>
          </div>
          <div className="rounded-xl bg-muted/45 px-2 py-2">
            <p className="text-[10px] text-muted-foreground">Repeats</p>
            <p className="font-display text-lg font-bold">{z.repeat_client_count ?? 0}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
          {z.tags.slice(0, 3).map((t) => (<span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{t}</span>))}
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
          {/*
            Real distance when `ai-match` computed one, coverage when it did not.

            The fallback used to be `${z.distance_mi} km` — a static seeded column, the same value
            for every customer in the country. It read as a promise about this Xooter's travel to
            *your* home, and it was not one. A fabricated distance is worse than no distance: it is
            a specific, checkable claim that happens to be false.
          */}
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {formatDistanceKm(distanceKm ?? z.distance_km ?? null) ??
              z.suburb_coverage?.slice(0, 2).join(", ") ??
              "Coverage on request"}
          </span>
          <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" />{z.transport || "Own transport"}</span>
          <span>{z.languages_spoken?.slice(0, 2).join(", ") || "English"}</span>
          <span>{z.pet_comfort || "Pet friendly"}</span>
        </div>

        <div className="flex items-center justify-between pt-1 mt-auto">
          <span className="font-display font-bold">{formatZAR(z.hourly_rate)}<span className="text-xs font-medium text-muted-foreground">/hr</span></span>
          {(z.repeat_client_count ?? 0) > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary"><RotateCcw className="h-3 w-3" /> Repeat favourite</span>}
        </div>
        <Button onClick={() => onBook?.(z)} className="w-full rounded-xl" size="sm">{actionLabel ?? `Book ${firstName}`}</Button>
      </div>
    </article>
  );
};
