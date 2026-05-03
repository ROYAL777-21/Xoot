import { Star, MapPin, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import w1 from "@/assets/worker-1.jpg";
import w2 from "@/assets/worker-2.jpg";
import w3 from "@/assets/worker-3.jpg";
import w4 from "@/assets/worker-4.jpg";

const workers = [
  { name: "Maria S.", rating: 4.95, jobs: 312, distance: "0.8 km", img: w1, tags: ["Eco-friendly", "Pet-safe"] },
  { name: "Thandi R.", rating: 4.98, jobs: 248, distance: "1.2 km", img: w2, tags: ["Airbnb turnover", "Deep clean"] },
  { name: "Aisha K.", rating: 4.92, jobs: 186, distance: "0.5 km", img: w3, tags: ["Office cleaning", "Bilingual"] },
  { name: "Zinhle W.", rating: 4.89, jobs: 421, distance: "1.7 km", img: w4, tags: ["Deep clean", "Hospitality trained"] },
];

export const NearbyWorkers = () => (
  <section id="workers" className="py-20 md:py-28 bg-secondary/40 border-y border-border">
    <div className="container">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div className="max-w-xl">
          <p className="text-sm font-semibold text-sage-deep uppercase tracking-wider mb-3">Nearby Zooters</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance">Vetted, rated and ready to clean today.</h2>
        </div>
        <Button asChild variant="outline" className="rounded-full self-start md:self-auto"><Link to="/app">View all Zooters</Link></Button>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {workers.map((w) => (
          <article key={w.name} className="group rounded-3xl bg-card border border-border overflow-hidden shadow-card hover:shadow-warm transition-all duration-500 hover:-translate-y-1 flex flex-col">
            <div className="relative aspect-[4/5] overflow-hidden">
              <img src={w.img} alt={`${w.name}, professional cleaner`} loading="lazy" width={640} height={640} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
              <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-background/95 backdrop-blur px-2.5 py-1 text-xs font-semibold shadow-card">
                <Star className="h-3 w-3 fill-primary text-primary" />{w.rating}
              </div>
              <div className="absolute top-3 right-3 grid place-items-center h-7 w-7 rounded-full bg-sage text-primary-foreground shadow-card"><BadgeCheck className="h-4 w-4" /></div>
              <div className="absolute bottom-3 left-3 right-3 text-primary-foreground">
                <p className="font-display font-bold text-lg leading-tight">{w.name}</p>
                <p className="text-xs opacity-90">Cleaning · {w.jobs} jobs</p>
              </div>
            </div>
            <div className="p-4 flex flex-col flex-1">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {w.tags.map((t) => (<span key={t} className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">{t}</span>))}
              </div>
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3 w-3" />{w.distance}</span>
              <Button asChild className="w-full mt-auto rounded-xl" size="sm"><Link to="/app">Book {w.name.split(" ")[0]}</Link></Button>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);
