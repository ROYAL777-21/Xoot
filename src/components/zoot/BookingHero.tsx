import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, MapPin, Calendar, Clock, Sprout, Home, Baby, Wrench, ArrowRight } from "lucide-react";
import heroImg from "@/assets/hero-zoot.jpg";

const services = [
  { id: "cleaning", label: "House cleaning", icon: Home },
  { id: "gardening", label: "Gardening", icon: Sprout },
  { id: "childcare", label: "Childcare", icon: Baby },
  { id: "handyman", label: "Handyman", icon: Wrench },
];

export const BookingHero = () => {
  const [active, setActive] = useState("cleaning");

  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="container grid lg:grid-cols-2 gap-12 lg:gap-8 py-12 lg:py-20 items-center">
        {/* Left — Booking form */}
        <div className="relative z-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-4 py-1.5 mb-6 border border-accent/20">
            <Sparkles className="h-3.5 w-3.5 text-sage-deep" />
            <span className="text-xs font-medium text-sage-deep">Trusted help, on demand</span>
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tight text-balance text-foreground">
            Help at home,
            <br />
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">whenever</span>
              <span className="absolute bottom-2 left-0 right-0 h-3 bg-primary/15 -z-0" />
            </span>{" "}
            you need it.
          </h1>

          <p className="mt-5 text-lg text-muted-foreground max-w-md">
            Book vetted cleaners, gardeners and helpers nearby. Same-day availability, transparent pricing.
          </p>

          {/* Booking card */}
          <div className="mt-8 rounded-3xl bg-card border border-border shadow-soft p-5 md:p-6">
            {/* Service tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {services.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => setActive(s.id)}
                    className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      isActive
                        ? "bg-foreground text-background shadow-warm"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3 focus-within:border-primary transition-colors">
                <span className="grid place-items-center h-9 w-9 rounded-full bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <Label htmlFor="addr" className="text-[10px] uppercase tracking-wider text-muted-foreground">Where</Label>
                  <Input
                    id="addr"
                    placeholder="Enter your address"
                    className="border-0 bg-transparent p-0 h-6 focus-visible:ring-0 text-sm font-medium placeholder:text-muted-foreground/60"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3">
                  <span className="grid place-items-center h-9 w-9 rounded-full bg-accent/15 text-sage-deep">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</Label>
                    <p className="text-sm font-medium truncate">Today</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3">
                  <span className="grid place-items-center h-9 w-9 rounded-full bg-accent/15 text-sage-deep">
                    <Clock className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Time</Label>
                    <p className="text-sm font-medium truncate">2:00 PM</p>
                  </div>
                </div>
              </div>

              <Button size="lg" className="rounded-2xl h-14 text-base font-semibold gradient-warm hover:opacity-95 shadow-warm group">
                Find help nearby
                <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                <div className="h-7 w-7 rounded-full bg-primary border-2 border-background" />
                <div className="h-7 w-7 rounded-full bg-accent border-2 border-background" />
                <div className="h-7 w-7 rounded-full bg-primary-glow border-2 border-background" />
              </div>
              <span><span className="font-semibold text-foreground">12,000+</span> happy homes</span>
            </div>
            <div className="hidden sm:flex items-center gap-1">
              <span className="text-primary">★★★★★</span>
              <span className="font-semibold text-foreground">4.9</span>
            </div>
          </div>
        </div>

        {/* Right — Visual */}
        <div className="relative animate-scale-in">
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-warm">
            <img
              src={heroImg}
              alt="Friendly Zoot pro tending a sunlit garden"
              className="h-full w-full object-cover"
              width={1280}
              height={1600}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />

            {/* Floating live card */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
              <div className="rounded-2xl bg-background/95 backdrop-blur-md p-3 shadow-card flex items-center gap-3 animate-fade-in">
                <div className="relative">
                  <span className="absolute inset-0 rounded-full bg-accent animate-pulse-ring" />
                  <span className="relative grid place-items-center h-9 w-9 rounded-full bg-accent text-accent-foreground text-xs font-bold">
                    23
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pros nearby</p>
                  <p className="text-sm font-semibold">Available now</p>
                </div>
              </div>
            </div>

            {/* Bottom card */}
            <div className="absolute bottom-6 left-6 right-6">
              <div className="rounded-2xl bg-background/95 backdrop-blur-md p-4 shadow-card flex items-center justify-between animate-fade-up">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full gradient-sage grid place-items-center">
                    <Sprout className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Maria is on the way</p>
                    <p className="text-xs text-muted-foreground">Arriving in 12 min · ★ 4.95</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary px-3 py-1.5 rounded-full bg-primary/10">
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Decorative blobs */}
          <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-accent/30 blur-3xl -z-10" />
          <div className="absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-primary/30 blur-3xl -z-10" />
        </div>
      </div>
    </section>
  );
};
