import { Search, UserCheck, Sparkles } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: Search,
    title: "Tell us what you need",
    desc: "Pick a service, share your address and choose a time that works.",
  },
  {
    n: "02",
    icon: UserCheck,
    title: "Get matched instantly",
    desc: "We connect you with vetted Zooters nearby — see profiles, ratings and prices upfront.",
  },
  {
    n: "03",
    icon: Sparkles,
    title: "Sit back, it's done",
    desc: "Track arrival in real-time, pay in-app, and rate your experience.",
  },
];

export const HowItWorks = () => {
  return (
    <section id="how" className="py-20 md:py-28">
      <div className="container">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">
              How Zoot works
            </p>
            <h2 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-balance mb-5">
              Three taps. Help on the way.
            </h2>
            <p className="text-lg text-muted-foreground max-w-md">
              No phone tag, no awkward quotes. Zoot makes booking domestic help feel as easy as ordering a ride.
            </p>
          </div>

          <ol className="space-y-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.n}
                  className="group relative rounded-3xl bg-card border border-border p-6 md:p-7 shadow-card hover:shadow-warm transition-all duration-500"
                >
                  <div className="flex gap-5 items-start">
                    <div className="relative flex-shrink-0">
                      <div className="grid place-items-center h-14 w-14 rounded-2xl gradient-warm shadow-warm">
                        <Icon className="h-6 w-6 text-primary-foreground" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="font-display text-xs font-bold text-muted-foreground tracking-widest">
                          {s.n}
                        </span>
                        <h3 className="font-display text-2xl font-semibold">{s.title}</h3>
                      </div>
                      <p className="text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                  {i < steps.length - 1 && (
                    <div className="absolute left-[3.4rem] -bottom-4 w-px h-4 bg-border" />
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
};
