import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZooterCard, Zooter } from "@/components/zoot/ZooterCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sprout, Home as HomeIcon, Baby, Wrench, Heart, PawPrint, Hammer, MapPin, Calendar, Clock, Sparkles, ArrowRight, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

const services = [
  { id: "cleaning", label: "Cleaning", icon: HomeIcon },
  { id: "gardening", label: "Gardening", icon: Sprout },
  { id: "childcare", label: "Childcare", icon: Baby },
  { id: "handyman", label: "Handyman", icon: Wrench },
  { id: "babysitting", label: "Babysitting", icon: Heart },
  { id: "petcare", label: "Pet care", icon: PawPrint },
  { id: "maintenance", label: "Maintenance", icon: Hammer },
] as const;

const Book = () => {
  const { user } = useAuth();
  const [active, setActive] = useState<typeof services[number]["id"]>("cleaning");
  const [zooters, setZooters] = useState<(Zooter & { match_score?: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState("14:00");
  const [picked, setPicked] = useState<Zooter | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiMatched, setAiMatched] = useState(false);

  useEffect(() => {
    setLoading(true); setAiMatched(false);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ai-match", {
          body: { service: active, user_id: user?.id ?? null },
        });
        if (!error && data?.ranked?.length) {
          setZooters(data.ranked); setAiMatched(true); setLoading(false); return;
        }
      } catch { /* fall through */ }
      const { data } = await supabase.from("zooters").select("*").eq("role", active).eq("active", true).order("rating", { ascending: false });
      setZooters((data ?? []) as Zooter[]); setLoading(false);
    })();
  }, [active, user?.id]);

  const handleBook = async () => {
    if (!picked || !user) return;
    setSubmitting(true);
    const scheduled = new Date(`${date}T${time}`).toISOString();
    const price = Number(picked.hourly_rate) * 2;
    const { data: booking, error } = await supabase.from("bookings").insert({
      user_id: user.id, zooter_id: picked.id, original_zooter_id: picked.id,
      service: active, scheduled_at: scheduled, price, address, status: "pending",
    }).select("id").single();
    if (!error && booking) {
      await supabase.from("zooter_jobs").insert({ booking_id: booking.id, zooter_id: picked.id, state: "offered" });
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${picked.name} has been notified — they'll confirm shortly.`);
    setPicked(null);
  };

  return (
    <div className="container py-8 lg:py-12 max-w-7xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-3 border border-accent/20">
          <Sparkles className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Available now</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Book a Zooter</h1>
        <p className="text-muted-foreground mt-2">Pick a service, find someone nearby, book in seconds.</p>
      </div>

      <div className="rounded-3xl bg-card border border-border shadow-soft p-5 mb-8">
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
          {services.map((s) => {
            const Icon = s.icon;
            const isA = active === s.id;
            return (
              <button key={s.id} onClick={() => setActive(s.id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-all ${
                  isA ? "bg-foreground text-background shadow-warm" : "bg-muted/60 text-muted-foreground hover:bg-muted"
                }`}>
                <Icon className="h-4 w-4" /> {s.label}
              </button>
            );
          })}
        </div>
        <div className="grid md:grid-cols-3 gap-3 mt-4">
          <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Where</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Enter address" className="border-0 bg-transparent p-0 h-6 focus-visible:ring-0 text-sm font-medium" />
            </div>
          </div>
          <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-accent/15 text-sage-deep"><Calendar className="h-4 w-4" /></span>
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border-0 bg-transparent p-0 h-6 focus-visible:ring-0 text-sm font-medium" />
            </div>
          </div>
          <div className="rounded-2xl bg-muted/40 border border-border/60 p-3 flex items-center gap-3">
            <span className="grid place-items-center h-9 w-9 rounded-full bg-accent/15 text-sage-deep"><Clock className="h-4 w-4" /></span>
            <div className="flex-1 min-w-0">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Time</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="border-0 bg-transparent p-0 h-6 focus-visible:ring-0 text-sm font-medium" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between mb-4">
        <h2 className="font-display text-2xl font-bold">Nearby Zooters</h2>
        {aiMatched && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 text-sage-deep px-3 py-1 text-xs font-bold">
            <Wand2 className="h-3 w-3" /> AI-ranked for you
          </span>
        )}
      </div>
      {loading ? (
        <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {zooters.map((z) => <ZooterCard key={z.id} z={z} onBook={setPicked} />)}
        </div>
      )}

      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Confirm booking</DialogTitle>
            <DialogDescription>
              {picked?.name} · {date} at {time} · ${picked && Number(picked.hourly_rate) * 2} for 2 hours
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-muted/40 p-4 text-sm">
            <p><span className="text-muted-foreground">Service:</span> <span className="capitalize font-medium">{active}</span></p>
            <p><span className="text-muted-foreground">Address:</span> <span className="font-medium">{address || "—"}</span></p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPicked(null)}>Cancel</Button>
            <Button onClick={handleBook} disabled={submitting} className="gradient-warm">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Confirm <ArrowRight className="h-4 w-4 ml-1" /></>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Book;