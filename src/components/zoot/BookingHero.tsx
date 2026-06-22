import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, MapPin, Calendar, Clock, Home, Building2, BedDouble, Wand2, ArrowRight, Truck, TimerReset } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { approvedLaunchRegions } from "@/lib/operations";
import heroImg from "@/assets/hero-zoot.jpg";

const services = [
  { id: "residential", label: "Residential", icon: Home },
  { id: "express", label: "Express", icon: TimerReset },
  { id: "office", label: "Office", icon: Building2 },
  { id: "airbnb", label: "Airbnb", icon: BedDouble },
  { id: "deep", label: "Deep clean", icon: Wand2 },
  { id: "moving", label: "Moving", icon: Truck },
];

export const BookingHero = () => {
  const [active, setActive] = useState("residential");
  const [address, setAddress] = useState("");
  const [activeZooters, setActiveZooters] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    supabase.from("zooters").select("id", { count: "exact", head: true }).eq("active", true).then(({ count }) => {
      setActiveZooters(count ?? 0);
    });
  }, []);

  const startBooking = () => {
    const target = `/app?service=${active}${address.trim() ? `&address=${encodeURIComponent(address.trim())}` : ""}`;
    if (!user) {
      navigate("/auth", { state: { from: { pathname: target } } });
      return;
    }
    navigate(target);
  };

  return (
    <section className="relative overflow-hidden gradient-hero">
      <div className="container grid lg:grid-cols-2 gap-8 lg:gap-8 py-8 lg:py-20 items-center">
        <div className="relative z-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 mb-4 lg:mb-6 border border-accent/20">
            <Sparkles className="h-3.5 w-3.5 text-sage-deep" />
            <span className="text-[11px] sm:text-xs font-medium text-sage-deep">Launching in selected Johannesburg suburbs</span>
          </div>
          <h1 className="font-display text-[2.25rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] tracking-tight text-balance text-foreground">
            Premium home care,<br />
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">built on trust</span>
              <span className="absolute bottom-2 left-0 right-0 h-3 bg-primary/15 -z-0" />
            </span>
          </h1>
          <p className="mt-4 lg:mt-5 text-base sm:text-lg text-muted-foreground max-w-md">Book vetted independent Zooters for homes, Airbnbs, offices, moving cleans and premium resets in the current launch area.</p>

          <div className="mt-6 lg:mt-8 rounded-3xl bg-card border border-border shadow-soft p-4 sm:p-5 md:p-6">
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {services.map((s) => {
                const Icon = s.icon;
                const isActive = active === s.id;
                return (
                  <button key={s.id} onClick={() => setActive(s.id)} className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all duration-300 ${isActive ? "bg-foreground text-background shadow-warm" : "bg-muted/60 text-muted-foreground hover:bg-muted"}`}>
                    <Icon className="h-4 w-4" />{s.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 grid gap-3">
              <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3">
                <span className="grid place-items-center h-9 w-9 rounded-full bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
                <div className="flex-1">
                  <Label htmlFor="addr" className="text-[10px] uppercase tracking-wider text-muted-foreground">Where</Label>
                  <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Sandton, Midrand, Rosebank..." className="border-0 bg-transparent p-0 h-6 focus-visible:ring-0 text-sm font-medium" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3">
                  <span className="grid place-items-center h-9 w-9 rounded-full bg-accent/15 text-sage-deep"><Calendar className="h-4 w-4" /></span>
                  <div className="flex-1 min-w-0"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</Label><p className="text-sm font-medium truncate">Choose in booking</p></div>
                </div>
                <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3">
                  <span className="grid place-items-center h-9 w-9 rounded-full bg-accent/15 text-sage-deep"><Clock className="h-4 w-4" /></span>
                  <div className="flex-1 min-w-0"><Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</Label><p className="text-sm font-medium truncate">Tracked in app</p></div>
                </div>
              </div>
              <Button size="lg" onClick={startBooking} className="rounded-2xl h-14 text-base font-semibold gradient-warm hover:opacity-95 shadow-warm group">
                {user ? "Start a booking" : "Sign up to book"}
                <ArrowRight className="ml-1 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Launch areas include {approvedLaunchRegions.slice(0, 6).map((region) => region.replace(/\b\w/g, (c) => c.toUpperCase())).join(", ")} and nearby approved suburbs.
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <span><span className="font-semibold text-foreground">{activeZooters}</span> approved Zooters currently live</span>
            <span><span className="font-semibold text-foreground">MIE-ready</span> trust workflow</span>
          </div>
        </div>

        <div className="relative animate-scale-in hidden md:block">
          <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-warm">
            <img src={heroImg} alt="Friendly Zoot cleaner finishing a residential clean" className="h-full w-full object-cover" width={1280} height={1600} />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-transparent" />
            <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
              <div className="rounded-2xl bg-background/95 backdrop-blur-md p-3 shadow-card flex items-center gap-3 animate-fade-in">
                <div className="relative"><span className="absolute inset-0 rounded-full bg-accent animate-pulse-ring" /><span className="relative grid place-items-center h-9 w-9 rounded-full bg-accent text-accent-foreground text-xs font-bold">{activeZooters}</span></div>
                <div><p className="text-xs text-muted-foreground">Live Zooters</p><p className="text-sm font-semibold">After verification</p></div>
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="rounded-2xl bg-background/95 backdrop-blur-md p-4 shadow-card flex items-center justify-between animate-fade-up">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-full gradient-sage grid place-items-center"><Home className="h-5 w-5 text-primary-foreground" /></div>
                  <div><p className="text-sm font-semibold">Arrival timeline</p><p className="text-xs text-muted-foreground">On the way, arrived, started, completed</p></div>
                </div>
                <span className="text-xs font-bold text-primary px-3 py-1.5 rounded-full bg-primary/10">TRUST</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
