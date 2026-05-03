import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZooterCard, Zooter } from "@/components/zoot/ZooterCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Home as HomeIcon, Building2, BedDouble, Sparkles as SparklesIcon, MapPin, Calendar, Clock, ArrowRight, ArrowLeft, Loader2, Wand2, Plus, Minus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const services = [
  { id: "residential", label: "Residential", icon: HomeIcon },
  { id: "airbnb", label: "Airbnb turnover", icon: BedDouble },
  { id: "office", label: "Office / commercial", icon: Building2 },
  { id: "deep", label: "Deep clean", icon: Wand2 },
] as const;

const HOME_SIZES = [
  { id: "small", label: "Small home", desc: "1–2 bedrooms", hours: 4, price: 270 },
  { id: "medium", label: "Medium home", desc: "3–4 bedrooms", hours: 5.5, price: 315 },
  { id: "large", label: "Large home", desc: "5+ bedrooms", hours: 8, price: 390 },
] as const;

const EXTRAS = [
  "Inside fridge", "Inside oven", "Inside cabinets", "Interior windows",
  "Interior walls", "Water plants", "Ironing", "Laundry", "Small flatlet",
] as const;
const EXTRA_COST = 30;
const EXTRA_HOURS = 1;

const TIME_SLOTS = [
  "07:00", "07:30", "08:00", "08:30", "09:00", "09:30",
  "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
];

const allowsMultipleWorkers = (s: string) => ["airbnb", "office", "deep"].includes(s);

const Book = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(0); // 0=service, 1=details, 2=worker, 3=payment
  const [active, setActive] = useState<string>("residential");
  const [frequency, setFrequency] = useState<"one_time" | "repeat">("one_time");
  const [when, setWhen] = useState<"today" | "tomorrow" | "later">("tomorrow");
  const [homeSize, setHomeSize] = useState<string>("small");
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [address, setAddress] = useState("");
  const [date, setDate] = useState(new Date(Date.now() + 864e5).toISOString().slice(0, 10));
  const [time, setTime] = useState("08:00");
  const [instructions, setInstructions] = useState("");
  const [workerCount, setWorkerCount] = useState(1);

  const [zooters, setZooters] = useState<Zooter[]>([]);
  const [loadingZooters, setLoadingZooters] = useState(false);
  const [picked, setPicked] = useState<Zooter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  const size = HOME_SIZES.find((s) => s.id === homeSize) ?? HOME_SIZES[0];
  const extraCount = extras.size;
  const estHours = size.hours + extraCount * EXTRA_HOURS;
  const basePrice = size.price + extraCount * EXTRA_COST;

  // Multi-worker discount
  const totalWorkers = Math.max(1, workerCount);
  const discount = totalWorkers >= 3 ? 0.10 : 0;
  const perWorkerPrice = Math.round(basePrice * (1 - discount));
  const totalPrice = perWorkerPrice * totalWorkers;

  // Check if late-minute (booking tomorrow selected after 19:00 today)
  const isLastMinute = useMemo(() => {
    if (when === "tomorrow" && new Date().getHours() >= 19) return true;
    return false;
  }, [when]);

  const serviceFee = Math.round(totalPrice * 0.05);
  const bookingCover = 15;
  const bookingTotal = totalPrice + serviceFee + bookingCover + (isLastMinute ? Math.round(totalPrice * 0.15) : 0);

  // Load zooters when reaching step 2
  useEffect(() => {
    if (step !== 2) return;
    setLoadingZooters(true);
    (async () => {
      const { data } = await supabase.from("zooters").select("*").eq("active", true).order("rating", { ascending: false }).limit(20);
      setZooters((data ?? []) as Zooter[]);
      setLoadingZooters(false);
    })();
  }, [step]);

  // Subscribe to booking status changes
  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase.channel(`booking-${bookingId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` },
        (payload: any) => { setBookingStatus(payload.new.status); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  const toggleExtra = (e: string) => setExtras((prev) => { const n = new Set(prev); n.has(e) ? n.delete(e) : n.add(e); return n; });

  const validateStep = (): boolean => {
    if (step === 0 && !active) { toast.error("Select a service"); return false; }
    if (step === 1) {
      if (!address.trim()) { toast.error("Please enter your address"); return false; }
      if (!date) { toast.error("Select a date"); return false; }
      if (!time) { toast.error("Select a time"); return false; }
    }
    if (step === 2 && picked.length === 0) { toast.error("Select at least one Zooter"); return false; }
    return true;
  };

  const handleBook = async () => {
    if (!user || picked.length === 0) return;
    setSubmitting(true);
    const scheduled = new Date(`${date}T${time}`).toISOString();

    for (let i = 0; i < picked.length; i++) {
      const z = picked[i];
      const { data: booking, error } = await supabase.from("bookings").insert({
        user_id: user.id, zooter_id: z.id, original_zooter_id: z.id,
        service: active as any, scheduled_at: scheduled, price: perWorkerPrice,
        address, status: "pending", frequency, duration_hours: estHours,
        notes: instructions || null,
      }).select("id").single();
      if (error) { toast.error(error.message); setSubmitting(false); return; }
      if (booking) {
        if (i === 0) { setBookingId(booking.id); setBookingStatus("pending"); }
        await supabase.from("zooter_jobs").insert({ booking_id: booking.id, zooter_id: z.id, state: "offered" });
        await supabase.from("notifications").insert({
          user_id: user.id, kind: "booking_confirmed",
          title: `Booking sent to ${z.name}`,
          body: `Your booking for ${new Date(scheduled).toLocaleDateString("en-ZA")} has been sent. We'll notify you when ${z.name} confirms.`,
          link: `/app/bookings/${booking.id}`,
        });
      }
    }
    setSubmitting(false);
    setStep(4); // success
  };

  const canPickMultiple = allowsMultipleWorkers(active);
  const maxPick = canPickMultiple ? Math.max(1, workerCount) : 1;

  const selectWorker = (z: Zooter) => {
    if (picked.find((p) => p.id === z.id)) {
      setPicked(picked.filter((p) => p.id !== z.id));
    } else if (picked.length < maxPick) {
      setPicked([...picked, z]);
    } else if (maxPick === 1) {
      setPicked([z]);
    }
  };

  return (
    <div className="container py-6 lg:py-10 max-w-4xl">
      {/* Header with notification bell */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-2 border border-accent/20">
            <SparklesIcon className="h-3 w-3 text-sage-deep" />
            <span className="text-xs font-medium text-sage-deep">Book a clean</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Book a Zooter</h1>
        </div>
        <NotificationBell />
      </div>

      {/* Progress */}
      {step < 4 && (
        <div className="mb-6">
          <div className="flex gap-1">
            {["Service", "Details", "Worker", "Payment"].map((s, i) => (
              <div key={s} className={`flex-1 h-1.5 rounded-full transition-colors ${i <= step ? "gradient-warm" : "bg-muted"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Step {step + 1} of 4 — {["Service", "Details", "Worker", "Payment"][step]}</p>
        </div>
      )}

      {/* Step 0: Service & Frequency */}
      {step === 0 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-5 md:p-7 space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold mb-3">What type of cleaning?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {services.map((s) => {
                const Icon = s.icon; const isA = active === s.id;
                return (
                  <button key={s.id} onClick={() => { setActive(s.id); if (!allowsMultipleWorkers(s.id)) setWorkerCount(1); }}
                    className={`flex flex-col items-center gap-2 rounded-2xl p-4 text-sm font-medium transition-all border ${isA ? "bg-foreground text-background border-foreground shadow-warm" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}>
                    <Icon className="h-5 w-5" />{s.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold mb-3">How often do you need help?</h2>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setFrequency("one_time")}
                className={`rounded-2xl p-4 text-left border transition-all ${frequency === "one_time" ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}>
                <p className="font-semibold">One time</p>
                <p className="text-xs opacity-80">For once-off services that do not repeat</p>
              </button>
              <button onClick={() => setFrequency("repeat")}
                className={`rounded-2xl p-4 text-left border transition-all ${frequency === "repeat" ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}>
                <p className="font-semibold">Repeat</p>
                <p className="text-xs opacity-80">For repeat services every few days/weeks</p>
              </button>
            </div>
          </div>
          {frequency === "one_time" && (
            <div>
              <h2 className="font-display text-xl font-bold mb-3">When do you need help?</h2>
              <div className="grid grid-cols-3 gap-2">
                {(["today", "tomorrow", "later"] as const).map((w) => (
                  <button key={w} onClick={() => {
                    setWhen(w);
                    if (w === "today") setDate(new Date().toISOString().slice(0, 10));
                    else if (w === "tomorrow") setDate(new Date(Date.now() + 864e5).toISOString().slice(0, 10));
                  }}
                    className={`rounded-2xl p-3 text-center border transition-all capitalize ${when === w ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}>
                    {w}
                  </button>
                ))}
              </div>
              {isLastMinute && <p className="text-xs text-primary font-semibold mt-2">⚡ Last-minute booking — a 15% surge applies</p>}
            </div>
          )}
          {allowsMultipleWorkers(active) && (
            <div>
              <h2 className="font-display text-xl font-bold mb-2">How many Zooters?</h2>
              <p className="text-xs text-muted-foreground mb-3">3+ Zooters get up to 10% off per worker</p>
              <div className="flex items-center gap-3">
                <button onClick={() => setWorkerCount(Math.max(1, workerCount - 1))} className="h-9 w-9 rounded-full border border-border grid place-items-center hover:bg-muted"><Minus className="h-4 w-4" /></button>
                <span className="font-display text-2xl font-bold w-8 text-center">{workerCount}</span>
                <button onClick={() => setWorkerCount(Math.min(5, workerCount + 1))} className="h-9 w-9 rounded-full border border-border grid place-items-center hover:bg-muted"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          )}
          <Button onClick={() => setStep(1)} className="w-full rounded-2xl h-12 gradient-warm font-semibold">
            Next <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-5 md:p-7 space-y-5">
          <div>
            <h2 className="font-display text-xl font-bold mb-1">One Time Booking</h2>
            <p className="text-sm text-muted-foreground">Get once-off help. Try a new worker. Cancel any time.</p>
          </div>
          <div>
            <h3 className="font-semibold mb-2">How big is your home?</h3>
            <div className="grid gap-2">
              {HOME_SIZES.map((s) => (
                <button key={s.id} onClick={() => setHomeSize(s.id)}
                  className={`rounded-2xl p-4 text-left border transition-all flex justify-between items-center ${homeSize === s.id ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}>
                  <div><p className="font-semibold">{s.label}</p><p className="text-xs opacity-80">{s.desc}</p></div>
                  <div className="text-right"><p className="text-xs opacity-70">est. {s.hours}h</p><p className="font-bold">{formatZAR(s.price)}</p></div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">Extra tasks <span className="text-xs text-muted-foreground font-normal">(+{formatZAR(EXTRA_COST)} / +{EXTRA_HOURS}h each)</span></h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EXTRAS.map((e) => (
                <button key={e} onClick={() => toggleExtra(e)}
                  className={`rounded-xl px-3 py-2 text-sm border transition-all ${extras.has(e) ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}>
                  {e}
                </button>
              ))}
            </div>
          </div>
          {when === "later" && (
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Select date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
            </div>
          )}
          <div>
            <h3 className="font-semibold mb-2">Select start time</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TIME_SLOTS.map((t) => (
                <button key={t} onClick={() => setTime(t)}
                  className={`rounded-xl py-2.5 text-sm font-medium border transition-all ${time === t ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}>
                  {t}
                </button>
              ))}
            </div>
            {estHours >= 4 && parseFloat(time.replace(":", ".")) > 12 && (
              <p className="text-xs text-destructive mt-1">⚠ Start time too late for a {estHours}h booking. Please select an earlier slot.</p>
            )}
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Your address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street address" className="mt-1" />
          </div>
          <div>
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Specific instructions (optional)</Label>
            <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Keys under mat, dogs in garden, etc." className="mt-1" />
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={() => { if (validateStep()) setStep(2); }} className="flex-1 rounded-2xl h-12 gradient-warm font-semibold">
              Choose a Zooter <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Worker selection */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-2xl font-bold">Choose your Zooter{maxPick > 1 ? "s" : ""}</h2>
              <p className="text-sm text-muted-foreground">{picked.length}/{maxPick} selected · within 20 km</p>
            </div>
          </div>
          {loadingZooters ? (
            <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {zooters.map((z) => {
                const isSelected = !!picked.find((p) => p.id === z.id);
                return (
                  <div key={z.id} className={`relative ${isSelected ? "ring-2 ring-primary rounded-3xl" : ""}`}>
                    <ZooterCard z={z} onBook={() => selectWorker(z)} />
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={() => { if (validateStep()) setStep(3); }} disabled={picked.length === 0} className="flex-1 rounded-2xl h-12 gradient-warm font-semibold">
              Review & Pay <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Payment */}
      {step === 3 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-5 md:p-7 space-y-5">
          <h2 className="font-display text-2xl font-bold">Price breakdown</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Booking cost ({size.label}{extraCount > 0 ? ` + ${extraCount} extras` : ""}{totalWorkers > 1 ? ` × ${totalWorkers} workers` : ""})</span><span className="font-semibold">{formatZAR(totalPrice)}</span></div>
            {discount > 0 && <div className="flex justify-between text-sage-deep"><span>Multi-worker discount ({Math.round(discount * 100)}%)</span><span>−{formatZAR(Math.round(basePrice * discount * totalWorkers))}</span></div>}
            {isLastMinute && <div className="flex justify-between text-primary"><span>Last-minute surcharge (15%)</span><span>+{formatZAR(Math.round(totalPrice * 0.15))}</span></div>}
            <div className="flex justify-between"><span>Booking cover</span><span>{formatZAR(bookingCover)}</span></div>
            <div className="flex justify-between"><span>Service fee</span><span>{formatZAR(serviceFee)}</span></div>
            <div className="h-px bg-border my-2" />
            <div className="flex justify-between font-display text-lg font-bold"><span>Total due</span><span>{formatZAR(bookingTotal)}</span></div>
          </div>

          <div className="rounded-2xl bg-muted/40 p-4 text-sm space-y-1">
            <p><span className="text-muted-foreground">Service:</span> <span className="capitalize font-medium">{active.replace("_", " ")}</span></p>
            <p><span className="text-muted-foreground">Date:</span> <span className="font-medium">{new Date(date).toLocaleDateString("en-ZA", { weekday: "short", day: "numeric", month: "short" })}</span></p>
            <p><span className="text-muted-foreground">Time:</span> <span className="font-medium">{time} ({estHours}h)</span></p>
            <p><span className="text-muted-foreground">Address:</span> <span className="font-medium">{address}</span></p>
            <p><span className="text-muted-foreground">Zooter{picked.length > 1 ? "s" : ""}:</span> <span className="font-medium">{picked.map((z) => z.name).join(", ")}</span></p>
          </div>

          <div className="rounded-2xl bg-accent-soft border border-accent/20 p-4 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-sage-deep mt-0.5" />
            <div>
              <p className="text-sm font-semibold">Happy Home Promise</p>
              <p className="text-xs text-muted-foreground">If the service doesn't meet your expectations, we'll re-clean or refund fully — no questions asked.</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">Payment collection is mocked for now — press confirm and your Zooter will be notified.</p>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            <Button onClick={handleBook} disabled={submitting} className="flex-1 rounded-2xl h-12 gradient-warm font-semibold text-base">
              {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Confirm booking <ArrowRight className="h-4 w-4 ml-1" /></>}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Success / Live status */}
      {step === 4 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-8 text-center space-y-5">
          <div className="grid place-items-center h-16 w-16 rounded-full bg-sage/15 mx-auto">
            <SparklesIcon className="h-8 w-8 text-sage-deep" />
          </div>
          <h2 className="font-display text-3xl font-bold">Booking sent!</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {picked.map((z) => z.name).join(" & ")} {picked.length === 1 ? "has" : "have"} been notified. We'll keep you updated on their response.
          </p>
          {bookingStatus && (
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" /><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" /></span>
              Status: <span className="capitalize">{bookingStatus}</span>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => { setStep(0); setPicked([]); setBookingId(null); setBookingStatus(null); }} variant="outline" className="rounded-full">Book another</Button>
            <Button asChild className="rounded-full gradient-warm"><a href={bookingId ? `/app/bookings/${bookingId}` : "/app/bookings"}>View booking</a></Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Book;