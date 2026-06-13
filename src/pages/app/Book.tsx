import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ZooterCard, Zooter } from "@/components/zoot/ZooterCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home as HomeIcon, Building2, BedDouble, Sparkles, ArrowRight, ArrowLeft, Loader2, Wand2, Plus, Minus, ShieldCheck, Repeat, Truck, TimerReset } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { getSmartRecurringSuggestion, requiresCompletionPhotos, sortZootersForMarketplace } from "@/lib/trust";
import { calculateBookingQuote, isApprovedLaunchRegion } from "@/lib/operations";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitiseSearchParam } from "@/lib/sanitise";
import { BookingInput } from "@/lib/validators";

const services = [
  { id: "residential", label: "Residential", icon: HomeIcon },
  { id: "express", label: "Express clean", icon: TimerReset },
  { id: "airbnb", label: "Airbnb turnover", icon: BedDouble },
  { id: "office", label: "Office / commercial", icon: Building2 },
  { id: "deep", label: "Deep clean", icon: Wand2 },
  { id: "moving", label: "Moving clean", icon: Truck },
  { id: "premium", label: "Premium clean", icon: Sparkles },
] as const;

const HOME_SIZES = [
  { id: "small", label: "Small home", desc: "1-2 bedrooms", hours: 4, price: 270 },
  { id: "medium", label: "Medium home", desc: "3-4 bedrooms", hours: 5.5, price: 315 },
  { id: "large", label: "Large home", desc: "5+ bedrooms", hours: 8, price: 390 },
] as const;

const EXTRAS = ["Inside fridge", "Inside oven", "Inside cabinets", "Interior windows", "Interior walls", "Water plants", "Ironing", "Laundry", "Small flatlet"] as const;
const EXTRA_HOURS = 1;
const TIME_SLOTS = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "15:00", "16:00", "17:00"];
const allowsMultipleWorkers = (s: string) => ["airbnb", "office", "deep", "moving", "premium"].includes(s);
const serviceMultiplier: Record<string, number> = {
  residential: 1,
  express: 0.85,
  airbnb: 1.15,
  office: 1.2,
  deep: 1.35,
  moving: 1.4,
  premium: 1.55,
};

const Book = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preferredZooterId = sanitiseSearchParam(searchParams.get("zooter"));
  const requestedService = sanitiseSearchParam(searchParams.get("service"));
  const requestedAddress = sanitiseSearchParam(searchParams.get("address"));
  const [step, setStep] = useState(0);
  const [active, setActive] = useState<string>(services.some((s) => s.id === requestedService) ? requestedService : "residential");
  const [frequency, setFrequency] = useState<"one_time" | "repeat">("one_time");
  const [homeSize, setHomeSize] = useState<string>("small");
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [address, setAddress] = useState(requestedAddress ?? "");
  const [date, setDate] = useState(new Date(Date.now() + 864e5).toISOString().slice(0, 10));
  const [time, setTime] = useState("08:00");
  const [instructions, setInstructions] = useState("");
  const [householdNotes, setHouseholdNotes] = useState("");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [smartSuggestion, setSmartSuggestion] = useState("");
  const [bookingCoverOptIn, setBookingCoverOptIn] = useState(true);
  const [workerCount, setWorkerCount] = useState(1);
  const [zooters, setZooters] = useState<Zooter[]>([]);
  const [loadingZooters, setLoadingZooters] = useState(false);
  const [picked, setPicked] = useState<Zooter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  const size = HOME_SIZES.find((s) => s.id === homeSize) ?? HOME_SIZES[0];
  const totalWorkers = Math.max(1, workerCount);
  const serviceBasePrice = Math.round(size.price * (serviceMultiplier[active] ?? 1));
  const estHours = size.hours + extras.size * EXTRA_HOURS;
  const discount = totalWorkers >= 3 ? 0.1 : 0;
  const discountedBase = Math.round(serviceBasePrice * (1 - discount)) * totalWorkers;
  const quote = calculateBookingQuote({
    basePrice: discountedBase,
    addOnCount: extras.size,
    frequency,
    time,
    bookingCoverOptIn,
  });
  const totalPrice = quote.basePrice + quote.addOnsTotal;
  const serviceFee = quote.serviceFee;
  const bookingCover = quote.bookingCover;
  const bookingTotal = quote.total;
  const highDemandPremium = quote.highDemandPremium;
  const perWorkerPrice = Math.max(1, Math.round(totalPrice / totalWorkers));
  const photoRequired = requiresCompletionPhotos(active);
  const inLaunchRegion = address.trim().length > 0 && isApprovedLaunchRegion(address);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      (supabase as any).from("household_profiles").select("*").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
      supabase.from("bookings").select("scheduled_at").eq("user_id", user.id).order("scheduled_at", { ascending: false }).limit(6),
    ]).then(([homeResult, bookingResult]) => {
      const home = homeResult.data;
      if (home) {
        setHouseholdId(home.id ?? null);
        if (!requestedAddress) setAddress(home.address ?? "");
        const notes = [
          home.pet_notes && `Pets: ${home.pet_notes}`,
          home.parking_instructions && `Parking: ${home.parking_instructions}`,
          home.gate_code && `Gate: ${home.gate_code}`,
          home.cleaning_preferences && `Preferences: ${home.cleaning_preferences}`,
          home.fragile_areas && `Fragile: ${home.fragile_areas}`,
          home.favourite_products && `Products: ${home.favourite_products}`,
          home.access_notes && `Access: ${home.access_notes}`,
        ].filter(Boolean).join("\n");
        setHouseholdNotes(notes);
        if (notes) setInstructions(notes);
      }
      setSmartSuggestion(getSmartRecurringSuggestion((bookingResult.data ?? []) as any[]));
    });
  }, [user, requestedAddress]);

  useEffect(() => {
    if (step !== 2) return;
    setLoadingZooters(true);
    (supabase as any).from("zooters_public").select("*").eq("active", true).limit(30).then(({ data }) => {
      const ranked = sortZootersForMarketplace((data ?? []) as Zooter[]);
      const preferred = preferredZooterId ? ranked.find((z) => z.id === preferredZooterId) : null;
      setZooters(ranked);
      if (preferred) setPicked((current) => current.some((z) => z.id === preferred.id) ? current : [preferred]);
      setLoadingZooters(false);
    });
  }, [step, preferredZooterId]);

  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase.channel(`booking-${bookingId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` }, (payload: any) => setBookingStatus(payload.new.status))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);

  const toggleExtra = (e: string) => setExtras((prev) => { const n = new Set(prev); n.has(e) ? n.delete(e) : n.add(e); return n; });

  const validateStep = () => {
    if (step === 1 && !address.trim()) { toast.error("Please enter your address"); return false; }
    if (step === 1 && !isApprovedLaunchRegion(address)) { toast.error("Zoot is currently available in the approved launch suburbs only."); return false; }
    if (step === 2 && picked.length === 0) { toast.error("Select at least one Zooter"); return false; }
    return true;
  };

  const selectWorker = (z: Zooter) => {
    const maxPick = allowsMultipleWorkers(active) ? workerCount : 1;
    if (picked.find((p) => p.id === z.id)) setPicked(picked.filter((p) => p.id !== z.id));
    else if (picked.length < maxPick) setPicked([...picked, z]);
    else if (maxPick === 1) setPicked([z]);
  };

  const handleBook = async () => {
    if (!user || picked.length === 0) return;
    const bookingInput = BookingInput.safeParse({
      service_type: active,
      home_size: homeSize,
      address,
      date,
      time,
      extras: Array.from(extras),
    });
    if (!bookingInput.success) {
      toast.error(bookingInput.error.issues[0]?.message ?? "Please check your booking details.");
      return;
    }
    const safeBooking = bookingInput.data;
    if (!checkRateLimit("booking", 3, 300_000)) {
      toast.error("Too many booking attempts. Please wait a few minutes before trying again.");
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("create-booking", {
      body: {
        serviceType: safeBooking.service_type,
        frequency,
        homeSize: safeBooking.home_size,
        time: safeBooking.time,
        date: safeBooking.date,
        address: safeBooking.address,
        instructions,
        householdProfileId: householdId,
        workerCount: totalWorkers,
        zooterIds: picked.map((z) => z.id),
        addOns: safeBooking.extras,
        bookingCoverOptIn,
      },
    });

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    const actionResult = data as { success?: boolean; error?: string; data?: { booking_ids?: string[]; booking_id?: string; status?: string } } | null;
    if (actionResult?.success === false) {
      toast.error(actionResult.error ?? "Booking request failed");
      setSubmitting(false);
      return;
    }
    const result = actionResult?.data ?? (data as { booking_ids?: string[]; booking_id?: string; status?: string } | null);
    const firstBookingId = result?.booking_id ?? result?.booking_ids?.[0] ?? null;
    if (firstBookingId) {
      setBookingId(firstBookingId);
      setBookingStatus(result?.status ?? "draft");
    }
    setSubmitting(false);
    setStep(4);
  };

  const maxPick = allowsMultipleWorkers(active) ? workerCount : 1;

  return (
    <div className="container py-6 lg:py-10 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-2 border border-accent/20">
            <Sparkles className="h-3 w-3 text-sage-deep" />
            <span className="text-xs font-medium text-sage-deep">Book a clean</span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight">Book a Zooter</h1>
        </div>
        <NotificationBell />
      </div>

      {step < 4 && (
        <div className="mb-6">
          <div className="flex gap-1">{["Service", "Details", "Worker", "Payment"].map((s, i) => <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? "gradient-warm" : "bg-muted"}`} />)}</div>
          <p className="text-xs text-muted-foreground mt-1.5">Step {step + 1} of 4 - {["Service", "Details", "Worker", "Payment"][step]}</p>
        </div>
      )}

      {step === 0 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-5 md:p-7 space-y-6">
          <div>
            <h2 className="font-display text-xl font-bold mb-3">What type of cleaning?</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {services.map((s) => {
                const Icon = s.icon;
                const selected = active === s.id;
                return <button key={s.id} onClick={() => { setActive(s.id); if (!allowsMultipleWorkers(s.id)) setWorkerCount(1); }} className={`flex flex-col items-center gap-2 rounded-2xl p-4 text-sm font-medium border ${selected ? "bg-foreground text-background border-foreground shadow-warm" : "bg-muted/40 text-muted-foreground border-border hover:bg-muted"}`}><Icon className="h-5 w-5" />{s.label}</button>;
              })}
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold mb-3">How often do you need help?</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["one_time", "repeat"] as const).map((f) => <button key={f} onClick={() => setFrequency(f)} className={`rounded-2xl p-4 text-left border ${frequency === f ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}><p className="font-semibold">{f === "one_time" ? "One time" : "Repeat"}</p><p className="text-xs opacity-80">{f === "one_time" ? "For once-off services" : "Lock a recurring rhythm"}</p></button>)}
            </div>
            {smartSuggestion && <p className="mt-3 rounded-2xl bg-primary/10 px-4 py-3 text-sm text-primary flex items-start gap-2"><Repeat className="h-4 w-4 mt-0.5" />{smartSuggestion}</p>}
          </div>
          {allowsMultipleWorkers(active) && <div><h2 className="font-display text-xl font-bold mb-2">How many Zooters?</h2><div className="flex items-center gap-3"><button onClick={() => setWorkerCount(Math.max(1, workerCount - 1))} className="h-9 w-9 rounded-full border grid place-items-center"><Minus className="h-4 w-4" /></button><span className="font-display text-2xl font-bold w-8 text-center">{workerCount}</span><button onClick={() => setWorkerCount(Math.min(5, workerCount + 1))} className="h-9 w-9 rounded-full border grid place-items-center"><Plus className="h-4 w-4" /></button></div></div>}
          <Button onClick={() => setStep(1)} className="w-full rounded-2xl h-12 gradient-warm font-semibold">Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
        </div>
      )}

      {step === 1 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-5 md:p-7 space-y-5">
          <h2 className="font-display text-xl font-bold">Visit details</h2>
          <div className="grid gap-2">{HOME_SIZES.map((s) => <button key={s.id} onClick={() => setHomeSize(s.id)} className={`rounded-2xl p-4 text-left border flex justify-between items-center ${homeSize === s.id ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}><div><p className="font-semibold">{s.label}</p><p className="text-xs opacity-80">{s.desc}</p></div><div className="text-right"><p className="text-xs opacity-70">est. {s.hours}h</p><p className="font-bold">{formatZAR(s.price)}</p></div></button>)}</div>
          <div><h3 className="font-semibold mb-2">Extra tasks</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{EXTRAS.map((e) => <button key={e} onClick={() => toggleExtra(e)} className={`rounded-xl px-3 py-2 text-sm border ${extras.has(e) ? "bg-foreground text-background border-foreground" : "bg-muted/40 border-border hover:bg-muted"}`}>{e}</button>)}</div></div>
          <div className="grid sm:grid-cols-2 gap-3"><div><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div><div><Label>Time</Label><select value={time} onChange={(e) => setTime(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">{TIME_SLOTS.map((slot) => <option key={slot}>{slot}</option>)}</select></div></div>
          <div>
            <Label>Your address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street address in Sandton, Midrand, Rosebank..." />
            {address.trim() && <p className={`text-xs mt-1 ${inLaunchRegion ? "text-sage-deep" : "text-destructive"}`}>{inLaunchRegion ? "Inside current Zoot launch coverage." : "Outside current launch coverage. Use one of the approved launch suburbs."}</p>}
          </div>
          {householdNotes && <div className="rounded-2xl bg-accent-soft border border-accent/20 p-4 text-xs text-muted-foreground"><p className="font-semibold text-foreground mb-1">Household profile applied</p><pre className="whitespace-pre-wrap font-sans">{householdNotes}</pre></div>}
          <div><Label>Specific instructions</Label><Textarea rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Keys, dogs, product preferences, fragile areas" /></div>
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button><Button onClick={() => validateStep() && setStep(2)} className="flex-1 rounded-2xl h-12 gradient-warm font-semibold">Choose a Zooter <ArrowRight className="h-4 w-4 ml-1" /></Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div><h2 className="font-display text-2xl font-bold">Choose your Zooter{maxPick > 1 ? "s" : ""}</h2><p className="text-sm text-muted-foreground">{picked.length}/{maxPick} selected - low reliability contractors are automatically ranked lower</p></div>
          {loadingZooters ? (
            <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : zooters.length === 0 ? (
            <Card className="rounded-3xl p-8 text-center">
              <ShieldCheck className="h-8 w-8 text-sage-deep mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold mb-2">No approved Zooters available yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Zooters appear here only after verification, training, and activation. Please try another time or contact support for launch-area availability.
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{zooters.map((z) => <div key={z.id} className={picked.some((p) => p.id === z.id) ? "ring-2 ring-primary rounded-3xl" : ""}><ZooterCard z={z} onBook={() => selectWorker(z)} /></div>)}</div>
          )}
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button><Button onClick={() => validateStep() && setStep(3)} disabled={picked.length === 0} className="flex-1 rounded-2xl h-12 gradient-warm font-semibold">Review & Pay <ArrowRight className="h-4 w-4 ml-1" /></Button></div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-5 md:p-7 space-y-5">
          <h2 className="font-display text-2xl font-bold">Price breakdown</h2>
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Booking cost ({size.label}{totalWorkers > 1 ? ` x ${totalWorkers}` : ""})</span><span className="font-semibold">{formatZAR(totalPrice)}</span></div>{discount > 0 && <div className="flex justify-between text-sage-deep"><span>Multi-worker discount</span><span>{Math.round(discount * 100)}%</span></div>}{highDemandPremium > 0 && <div className="flex justify-between"><span>High-demand slot premium</span><span>{formatZAR(highDemandPremium)}</span></div>}<div className="flex justify-between"><span>Booking cover</span><span>{formatZAR(bookingCover)}</span></div><div className="flex justify-between"><span>{frequency === "repeat" ? "Service fee waived for recurring" : "Service fee"}</span><span>{formatZAR(serviceFee)}</span></div><div className="h-px bg-border my-2" /><div className="flex justify-between font-display text-lg font-bold"><span>Total pending</span><span>{formatZAR(bookingTotal)}</span></div></div>
          <button type="button" onClick={() => setBookingCoverOptIn((value) => !value)} className={`w-full rounded-2xl border p-4 text-left ${bookingCoverOptIn ? "border-primary bg-primary/10" : "border-border bg-muted/40"}`}>
            <p className="font-semibold">Booking cover {bookingCoverOptIn ? "included" : "not included"}</p>
            <p className="text-xs text-muted-foreground">Keeps a support record and admin queue available for booking issues. Payment stays pending until confirmed.</p>
          </button>
          {photoRequired && <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex items-start gap-3"><ShieldCheck className="h-5 w-5 text-primary mt-0.5" /><p className="text-sm">This service requires before and after completion photos to reduce disputes and verify quality.</p></div>}
          <div className="rounded-2xl bg-muted/40 p-4 text-sm space-y-1"><p><span className="text-muted-foreground">Service:</span> <span className="capitalize font-medium">{active}</span></p><p><span className="text-muted-foreground">Date:</span> {new Date(date).toLocaleDateString("en-ZA")}</p><p><span className="text-muted-foreground">Zooter:</span> {picked.map((z) => z.name).join(", ")}</p></div>
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button><Button onClick={handleBook} disabled={submitting} className="flex-1 rounded-2xl h-12 gradient-warm font-semibold">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Confirm booking <ArrowRight className="h-4 w-4 ml-1" /></>}</Button></div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-8 text-center space-y-5"><div className="grid place-items-center h-16 w-16 rounded-full bg-sage/15 mx-auto"><Sparkles className="h-8 w-8 text-sage-deep" /></div><h2 className="font-display text-3xl font-bold">Booking draft created</h2><p className="text-muted-foreground max-w-md mx-auto">Your server-priced booking draft is ready. Zoot confirms payment from the provider webhook before assignment is finalised.</p>{bookingStatus && <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold">Status: <span className="capitalize">{bookingStatus}</span></div>}<div className="flex flex-col sm:flex-row gap-2 justify-center"><Button onClick={() => { setStep(0); setPicked([]); setBookingId(null); setBookingStatus(null); }} variant="outline" className="rounded-full">Book another</Button><Button asChild className="rounded-full gradient-warm"><a href={bookingId ? `/app/bookings/${bookingId}` : "/app/bookings"}>View booking</a></Button></div></div>
      )}
    </div>
  );
};

export default Book;
