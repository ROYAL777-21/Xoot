import { Star, ShieldCheck, Quote } from "lucide-react";

export interface ReviewItem {
  name: string;
  where: string;
  service: string;
  stars: number;
  text: string;
}

export const REVIEWS: ReviewItem[] = [
  {
    name: "Thandi M.",
    where: "Bryanston",
    service: "Regular cleaning",
    stars: 5,
    text: "I stopped dreading Sunday nights. Nomsa knows the house now — I do not have to explain anything.",
  },
  {
    name: "Ruan V.",
    where: "Rosebank",
    service: "Airbnb turnover",
    stars: 5,
    text: "Turnovers timed to my checkout. Three years of guests and not one complaint about the place being dirty.",
  },
  {
    name: "Sipho D.",
    where: "Sandton",
    service: "Office cleaning",
    stars: 4,
    text: "Office is spotless every Monday. Only knock is I wish I could book further ahead than a month.",
  },
  {
    name: "Nadia K.",
    where: "Fourways",
    service: "Moving clean",
    stars: 5,
    text: "Booked the day before I moved out. Got my full deposit back, which has never once happened to me.",
  },
  {
    name: "Lerato P.",
    where: "Melville",
    service: "Laundry & ironing",
    stars: 5,
    text: "The ironing alone gives me back two hours a week. That is the whole review, really.",
  },
  {
    name: "Johan B.",
    where: "Midrand",
    service: "Express cleaning",
    stars: 5,
    text: "Booked at 8am, someone was there by 11. I had family arriving and Xoot genuinely saved me.",
  },
];

export function Reviews() {
  return (
    <section id="reviews" className="py-20 bg-background border-t border-border/60 relative overflow-hidden">
      <div className="container max-w-7xl px-4 sm:px-6 relative z-10">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-3">
            <Quote className="h-3.5 w-3.5" />
            <span>Customer stories</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-foreground">
            Booked, cleaned, and left alone.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-2">
            Real feedback from verified visits across our launch suburbs.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {REVIEWS.map((r) => (
            <div
              key={r.name}
              className="flex flex-col justify-between p-6 rounded-2xl border border-border bg-card/60 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < r.stars
                            ? "fill-amber-500 text-amber-500"
                            : "fill-muted text-muted"
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
                    {r.service}
                  </span>
                </div>

                <p className="text-sm text-foreground/90 leading-relaxed mb-6 italic">
                  "{r.text}"
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-border/70 pt-4 mt-auto">
                <div>
                  <span className="text-sm font-bold text-foreground block">{r.name}</span>
                  <span className="text-xs text-muted-foreground block">{r.where}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Verified client</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
