import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import w1 from "@/assets/worker-1.jpg";
import w2 from "@/assets/worker-2.jpg";
import w3 from "@/assets/worker-3.jpg";
import w4 from "@/assets/worker-4.jpg";

const workers = [
  { name: "Maria S.", role: "House cleaning", rating: 4.95, jobs: 312, distance: "0.8 mi", price: 28, img: w1, tags: ["Eco-friendly", "Pet-safe"] },
  { name: "Diego R.", role: "Gardening", rating: 4.98, jobs: 248, distance: "1.2 mi", price: 32, img: w2, tags: ["Landscaping", "Pruning"] },
  { name: "Aisha K.", role: "Childcare", rating: 4.92, jobs: 186, distance: "0.5 mi", price: 22, img: w3, tags: ["CPR certified", "Bilingual"] },
  { name: "Tom W.", role: "Handyman", rating: 4.89, jobs: 421, distance: "1.7 mi", price: 45, img: w4, tags: ["Plumbing", "Electric"] },
];

export const NearbyWorkers = () => {
  return (
    <section id="workers" className="py-20 md:py-28 bg-secondary/40 border-y border-border">
      <div className="container">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="text-sm font-semibold text-sage-deep uppercase tracking-wider mb-3">
              Nearby pros
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">
              Vetted, rated, and ready to help today.
            </h2>
          </div>
          <Button variant="outline" className="rounded-full self-start md:self-auto">
            View all pros
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {workers.map((w) => (
            <article
              key={w.name}
              className="group rounded-3xl bg-card border border-border overflow-hidden shadow-card hover:shadow-warm transition-all duration-500 hover:-translate-y-1"
            >
              <div className="relative aspect-[4/5] overflow-hidden">
                <img
                  src={w.img}
                  alt={`${w.name}, ${w.role}`}
                  loading="lazy"
                  width={640}
                  height={640}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-background/95 backdrop-blur px-2.5 py-1 text-xs font-semibold shadow-card">
                  <Star className="h-3 w-3 fill-primary text-primary" />
                  {w.rating}
                </div>
                <div className="absolute top-3 right-3 grid place-items-center h-7 w-7 rounded-full bg-sage text-primary-foreground shadow-card">
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <div className="absolute bottom-3 left-3 right-3 text-primary-foreground">
                  <p className="font-display font-bold text-lg leading-tight">{w.name}</p>
                  <p className="text-xs opacity-90">{w.role} · {w.jobs} jobs</p>
                </div>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {w.tags.map((t) => (
                    <span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {w.distance}
                  </span>
                  <span className="font-display font-bold">
                    ${w.price}
                    <span className="text-xs font-medium text-muted-foreground">/hr</span>
                  </span>
                </div>
                <Button className="w-full mt-3 rounded-xl" size="sm">
                  Book {w.name.split(" ")[0]}
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};
