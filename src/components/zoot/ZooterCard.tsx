import { Star, MapPin, BadgeCheck, Heart, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/hooks/useFavorites";
import w1 from "@/assets/worker-1.jpg";
import w2 from "@/assets/worker-2.jpg";
import w3 from "@/assets/worker-3.jpg";
import w4 from "@/assets/worker-4.jpg";

export type Zooter = {
  id: string;
  name: string;
  role: string;
  rating: number;
  jobs_completed: number;
  hourly_rate: number;
  photo_url: string | null;
  tags: string[];
  distance_mi: number;
  is_zotm: boolean;
};

const imgMap: Record<string, string> = {
  "/src/assets/worker-1.jpg": w1,
  "/src/assets/worker-2.jpg": w2,
  "/src/assets/worker-3.jpg": w3,
  "/src/assets/worker-4.jpg": w4,
};

export const resolvePhoto = (p?: string | null) =>
  (p && imgMap[p]) || w1;

export const ZooterCard = ({ z, onBook }: { z: Zooter; onBook?: (z: Zooter) => void }) => {
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(z.id);
  return (
    <article className="group rounded-3xl bg-card border border-border overflow-hidden shadow-card hover:shadow-warm transition-all duration-500 hover:-translate-y-1">
      <div className="relative aspect-[4/5] overflow-hidden">
        <img
          src={resolvePhoto(z.photo_url)}
          alt={`${z.name}, ${z.role}`}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-background/95 backdrop-blur px-2.5 py-1 text-xs font-semibold shadow-card">
          <Star className="h-3 w-3 fill-primary text-primary" />
          {Number(z.rating).toFixed(2)}
        </div>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
          {z.is_zotm && (
            <div className="flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-2 py-0.5 text-[10px] font-bold shadow-warm">
              <Crown className="h-3 w-3" /> ZOTM
            </div>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); toggleFavorite(z.id); }}
            className="grid place-items-center h-8 w-8 rounded-full bg-background/95 backdrop-blur shadow-card hover:scale-110 transition-transform"
            aria-label={fav ? "Unfavorite" : "Favorite"}
          >
            <Heart className={`h-4 w-4 ${fav ? "fill-primary text-primary" : "text-muted-foreground"}`} />
          </button>
          <div className="grid place-items-center h-7 w-7 rounded-full bg-sage text-primary-foreground shadow-card">
            <BadgeCheck className="h-4 w-4" />
          </div>
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-primary-foreground">
          <p className="font-display font-bold text-lg leading-tight">{z.name}</p>
          <p className="text-xs opacity-90 capitalize">{z.role} · {z.jobs_completed} jobs</p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex flex-wrap gap-1.5 mb-3 min-h-[24px]">
          {z.tags.slice(0, 3).map((t) => (
            <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{t}</span>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" /> {z.distance_mi} mi
          </span>
          <span className="font-display font-bold">
            ${Number(z.hourly_rate).toFixed(0)}<span className="text-xs font-medium text-muted-foreground">/hr</span>
          </span>
        </div>
        <Button onClick={() => onBook?.(z)} className="w-full mt-3 rounded-xl" size="sm">
          Book {z.name.split(" ")[0]}
        </Button>
      </div>
    </article>
  );
};