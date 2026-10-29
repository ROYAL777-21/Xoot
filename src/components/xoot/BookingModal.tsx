import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  X,
  ArrowLeft,
  Check,
  MapPin,
  Home,
  Building2,
  BedDouble,
  Truck,
  TimerReset,
  Sparkles,
  Shirt,
  Info,
  Lightbulb,
  ShieldCheck,
  Star,
  Users,
  ChevronRight,
} from "lucide-react";
import {
  type ServiceId,
  PROPERTY_TYPES,
  checkServiceFit,
  calculateCrewQuote,
  crewCapFor,
  formatRand,
} from "@/lib/xoot-pricing";
import { approvedLaunchRegions } from "@/lib/operations";
import { useAuth } from "@/contexts/AuthContext";
import { captureAnalyticsEvent } from "@/lib/analytics";

export interface BookingModalProps {
  open: boolean;
  onClose: () => void;
  initialService?: string;
  referralCode?: string | null;
}

const STEPS = ["Service", "Your place", "When", "Xooter", "Confirm"] as const;

const SERVICES_CATALOG: { id: ServiceId; label: string; desc: string; icon: any }[] = [
  { id: "regular", label: "Regular Clean", desc: "Routine upkeep for flats & homes", icon: Home },
  { id: "airbnb", label: "Airbnb Turnover", desc: "Fast linen swap & restocking", icon: BedDouble },
  { id: "office", label: "Office Reset", desc: "Desks, meeting rooms & kitchens", icon: Building2 },
  { id: "express", label: "Express Clean", desc: "1 to 3 hours quick tidy", icon: TimerReset },
  { id: "moving", label: "Move In / Out", desc: "Cupboards, appliances & deep scrub", icon: Truck },
];

const SIZES = [
  { key: "small", label: "Small", detail: "1-2 rooms", hours: 4 },
  { key: "medium", label: "Medium", detail: "3-4 rooms", hours: 5.5 },
  { key: "large", label: "Large", detail: "5+ rooms", hours: 8 },
] as const;

const ADDONS = [
  { key: "fridge", label: "Inside the fridge" },
  { key: "oven", label: "Inside the oven" },
  { key: "windows", label: "Windows" },
  { key: "cupboards", label: "Inside cupboards" },
];

const PROS_MOCK = [
  {
    name: "Nomsa M.",
    rating: 4.98,
    reviews: 142,
    suburb: "Sandton",
    tagline: "Detail specialist · 2 yrs on Xoot",
    initials: "NM",
  },
  {
    name: "Thabo K.",
    rating: 4.95,
    reviews: 98,
    suburb: "Rosebank",
    tagline: "Move-out & office expert",
    initials: "TK",
  },
  {
    name: "Precious D.",
    rating: 4.99,
    reviews: 215,
    suburb: "Bryanston",
    tagline: "Care+ rated five-star helper",
    initials: "PD",
  },
];

function generate14Days() {
  const out = [];
  const now = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(now.getTime() + i * 86400000);
    out.push({
      iso: d.toISOString().slice(0, 10),
      day: d.toLocaleDateString("en-ZA", { weekday: "short" }),
      num: d.getDate(),
      ideal: i <= 3,
    });
  }
  return out;
}

function slotsForDuration(hours: number) {
  const out = [];
  for (let h = 7; h + hours <= 17; h += 1) {
    out.push(`${String(h).padStart(2, "0")}:00`);
  }
  if (out.length === 0) return ["08:00", "09:00"];
  return out;
}

export function BookingModal({ open, onClose, initialService = "regular", referralCode }: BookingModalProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [service, setService] = useState<ServiceId>((initialService as ServiceId) || "regular");
  const [sizeKey, setSizeKey] = useState<"small" | "medium" | "large">("medium");
  const [property, setProperty] = useState("house");
  const [address, setAddress] = useState("");
  const [suburb, setSuburb] = useState("Sandton");
  const [addons, setAddons] = useState<string[]>([]);
  const [day, setDay] = useState<string>("");
  const [slot, setSlot] = useState<string>("");
  const [freq, setFreq] = useState<"weekly" | "fortnightly" | "monthly" | "once">("weekly");
  const [crew, setCrew] = useState<number>(1);
  const [xooter, setXooter] = useState<string | null>(null);
  const [laundryLoads, setLaundryLoads] = useState({ wash: 4, iron: 2 });

  const days = useMemo(generate14Days, []);

  useEffect(() => {
    if (open) {
      setStep(0);
      if (initialService && SERVICES_CATALOG.some((s) => s.id === initialService)) {
        setService(initialService as ServiceId);
      }
      if (days[0]) setDay(days[0].iso);
    }
  }, [open, initialService, days]);

  const maxCrew = useMemo(() => crewCapFor(service, sizeKey), [service, sizeKey]);

  useEffect(() => {
    if (crew > maxCrew) setCrew(maxCrew);
  }, [maxCrew, crew]);

  const baseHours = useMemo(() => {
    const s = SIZES.find((x) => x.key === sizeKey);
    return s ? s.hours : 5.5;
  }, [sizeKey]);

  const fit = useMemo(() => checkServiceFit(service, property), [service, property]);

  const quote = useMemo(() => {
    const referralDiscountCents = referralCode ? 10000 : 0;
    return calculateCrewQuote({
      service,
      hours: baseHours,
      crew,
      addOns: addons.length,
      linenOnSite: service === "airbnb",
      bookingCover: true,
      carePlusMember: false,
      referralCreditCents: referralDiscountCents,
    });
  }, [service, baseHours, crew, addons.length, referralCode]);

  const elapsedHours = quote ? quote.elapsedHours : baseHours;
  const timeSlots = useMemo(() => slotsForDuration(elapsedHours), [elapsedHours]);

  useEffect(() => {
    if (!slot && timeSlots.length > 0) setSlot(timeSlots[0]);
  }, [timeSlots, slot]);

  if (!open) return null;

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Step 4: Final Confirmation
      captureAnalyticsEvent("booking_flow_started", {
        service_category: service,
        launch_area: suburb || "unselected",
        source: user ? "signed_in_modal" : "guest_modal",
      });
      const query = new URLSearchParams({
        service,
        suburb,
        crew: String(crew),
        freq,
        date: day,
        time: slot,
      });
      if (address) query.set("address", address);
      if (xooter) query.set("xooter", xooter);
      if (referralCode) query.set("ref", referralCode);

      onClose();
      navigate(`/app?${query.toString()}`);
    }
  };

  const handleBack = () => {
    if (step === 0) onClose();
    else setStep((s) => s - 1);
  };

  const currentSizeObj = SIZES.find((s) => s.key === sizeKey) || SIZES[1];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Book a visit"
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 sm:p-6 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl rounded-2xl bg-card border border-border shadow-2xl overflow-hidden my-auto animate-in fade-in-50 zoom-in-95 duration-200">
        {/* Header with Step Dots */}
        <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 bg-muted/20">
          <button
            type="button"
            onClick={handleBack}
            className="grid h-9 w-9 place-items-center rounded-full bg-muted/60 text-foreground hover:bg-muted transition-colors"
            aria-label={step === 0 ? "Close" : "Back"}
          >
            {step === 0 ? <X className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2">
            {STEPS.map((label, idx) => (
              <div key={label} className="flex items-center gap-1.5">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold transition-colors ${
                    idx < step
                      ? "bg-primary text-primary-foreground"
                      : idx === step
                      ? "bg-foreground text-background"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx < step ? <Check className="h-3 w-3 stroke-[3]" /> : idx + 1}
                </span>
                <span
                  className={`hidden sm:inline text-xs font-medium ${
                    idx === step ? "text-foreground font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {idx < STEPS.length - 1 && <span className="h-0.5 w-3 sm:w-5 bg-border rounded-full" />}
              </div>
            ))}
          </div>

          <span className="w-9" />
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-8 max-h-[75vh] overflow-y-auto">
          {/* Step 0: Service Selection */}
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">What needs doing?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose a service to begin. You can customize duration and extras on the next step.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SERVICES_CATALOG.map((item) => {
                  const Icon = item.icon;
                  const selected = service === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setService(item.id)}
                      className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                        selected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div
                        className={`h-12 w-12 rounded-xl grid place-items-center mb-2.5 ${
                          selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</span>
                    </button>
                  );
                })}

                {/* Xoot Lux Card */}
                <div className="flex flex-col items-center text-center p-4 rounded-xl border border-border/80 bg-gradient-to-b from-muted/40 to-muted/10 opacity-80">
                  <div className="h-12 w-12 rounded-xl grid place-items-center mb-2.5 bg-muted text-foreground">
                    <Sparkles className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Xoot Lux</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary mt-1">
                    By Invitation
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Your Place */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">Where are we going?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Addresses are only revealed to your verified Xooter on the morning of service.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Street address</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. 14 Fredman Drive"
                      className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Suburb</label>
                  <select
                    value={suburb}
                    onChange={(e) => setSuburb(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  >
                    {approvedLaunchRegions.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Property Type Selection */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  What kind of property is it?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PROPERTY_TYPES.map((pt) => {
                    const selected = property === pt.key;
                    return (
                      <button
                        key={pt.key}
                        type="button"
                        onClick={() => setProperty(pt.key)}
                        className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-primary bg-primary/10 font-semibold text-foreground"
                            : "border-border bg-card hover:bg-muted/30 text-muted-foreground"
                        }`}
                      >
                        <span className="text-sm font-medium">{pt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Service Fit Notice */}
              {fit && (
                <div className="flex gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200">
                  <Lightbulb className="h-5 w-5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-sm">
                      {fit.to.toUpperCase()} is the recommended service for this property
                    </p>
                    <p className="text-muted-foreground dark:text-amber-200/80 leading-relaxed">
                      {fit.why}
                    </p>
                    <button
                      type="button"
                      onClick={() => setService(fit.to)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shadow-sm hover:opacity-95"
                    >
                      Switch to {fit.to} clean
                    </button>
                  </div>
                </div>
              )}

              {/* Size Selector */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  How big is the place?
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {SIZES.map((sz) => {
                    const selected = sizeKey === sz.key;
                    return (
                      <button
                        key={sz.key}
                        type="button"
                        onClick={() => setSizeKey(sz.key as any)}
                        className={`flex flex-col p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:bg-muted/30"
                        }`}
                      >
                        <span className="text-sm font-bold text-foreground">{sz.label}</span>
                        <span className="text-xs text-muted-foreground mt-0.5">{sz.detail}</span>
                        <span className="text-[11px] font-mono text-primary mt-1 font-semibold">
                          ~{sz.hours} hrs
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Extras */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">
                  Any extras needed?
                </label>
                <div className="flex flex-wrap gap-2">
                  {ADDONS.map((addon) => {
                    const selected = addons.includes(addon.key);
                    return (
                      <button
                        key={addon.key}
                        type="button"
                        onClick={() =>
                          setAddons((prev) =>
                            selected ? prev.filter((k) => k !== addon.key) : [...prev, addon.key]
                          )
                        }
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/50 text-foreground border-border hover:bg-muted"
                        }`}
                      >
                        {addon.label} (+R30)
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: When */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">When suits you?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Xooters work 07:00–17:00 daily.
                </p>
              </div>

              {/* Day Scroller */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">Select date</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {days.map((d) => {
                    const selected = day === d.iso;
                    return (
                      <button
                        key={d.iso}
                        type="button"
                        onClick={() => setDay(d.iso)}
                        className={`flex flex-col items-center shrink-0 w-16 py-2.5 rounded-xl border text-center transition-all ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card hover:bg-muted/40 text-foreground"
                        }`}
                      >
                        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{d.day}</span>
                        <span className="text-lg font-display font-bold leading-tight mt-0.5">{d.num}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Frequency */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">How often?</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { key: "weekly", label: "Weekly", sub: "Most popular" },
                    { key: "fortnightly", label: "Fortnightly", sub: "Twice a month" },
                    { key: "monthly", label: "Monthly", sub: "Recurring" },
                    { key: "once", label: "Once-off", sub: "Single clean" },
                  ].map((f) => {
                    const selected = freq === f.key;
                    return (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setFreq(f.key as any)}
                        className={`p-3 rounded-lg border text-left transition-all ${
                          selected
                            ? "border-primary bg-primary/10 shadow-sm"
                            : "border-border bg-card hover:bg-muted/30"
                        }`}
                      >
                        <span className="text-xs font-bold text-foreground block">{f.label}</span>
                        <span className="text-[10px] text-muted-foreground block">{f.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Time Slots */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-2 block">Start time</label>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((ts) => {
                    const selected = slot === ts;
                    return (
                      <button
                        key={ts}
                        type="button"
                        onClick={() => setSlot(ts)}
                        className={`px-4 py-2 rounded-lg text-xs font-mono font-medium border transition-all ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-card text-foreground hover:bg-muted"
                        }`}
                      >
                        {ts}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Xooter & Crew */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">Verified Xooters</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select a preferred local helper or book any available top-rated Xooter.
                </p>
              </div>

              {/* ZD-035 Crew Selection */}
              {maxCrew > 1 && (
                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs font-semibold text-foreground">Crew size</span>
                    <span className="text-xs text-muted-foreground">
                      Finish in ~{elapsedHours % 1 === 0 ? elapsedHours : elapsedHours.toFixed(1)} hrs with {crew} Xooter{crew > 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {Array.from({ length: maxCrew }, (_, i) => i + 1).map((n) => {
                      const selected = crew === n;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setCrew(n)}
                          className={`p-2.5 rounded-lg border text-center transition-all ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground shadow-sm"
                              : "border-border bg-card text-foreground hover:bg-muted/40"
                          }`}
                        >
                          <span className="text-xs font-bold block">
                            {n === 1 ? "1 Solo" : `${n} Crew`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Multiple Xooters arrive together and split the job, finishing sooner without doubling the price.
                  </p>
                </div>
              )}

              {/* Pros List */}
              <div className="grid sm:grid-cols-3 gap-3">
                {PROS_MOCK.map((pro) => {
                  const selected = xooter === pro.name;
                  return (
                    <button
                      key={pro.name}
                      type="button"
                      onClick={() => setXooter(pro.name)}
                      className={`flex flex-col items-center text-center p-4 rounded-xl border transition-all ${
                        selected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border bg-card hover:bg-muted/40"
                      }`}
                    >
                      <div className="h-12 w-12 rounded-full grid place-items-center bg-primary/20 text-primary font-bold text-sm mb-2">
                        {pro.initials}
                      </div>
                      <span className="text-sm font-bold text-foreground">{pro.name}</span>
                      <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold mt-0.5">
                        <Star className="h-3 w-3 fill-amber-500" />
                        <span>{pro.rating}</span>
                        <span className="text-muted-foreground">({pro.reviews})</span>
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1 leading-tight">
                        {pro.tagline}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setXooter(null);
                  handleNext();
                }}
                className="w-full py-2.5 rounded-xl border border-dashed border-border bg-muted/20 text-xs font-semibold text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Any available top-rated Xooter is fine
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-display font-bold text-foreground">Review your booking</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Full upfront pricing. No hidden doorstep extras.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service</span>
                  <span className="font-semibold text-foreground uppercase">{service} clean</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scope</span>
                  <span className="font-semibold text-foreground">
                    {currentSizeObj.label} ({elapsedHours} hrs elapsed)
                  </span>
                </div>
                {crew > 1 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Crew</span>
                    <span className="font-semibold text-primary">{crew} Xooters arriving together</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">When</span>
                  <span className="font-semibold text-foreground">
                    {day} at {slot}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Location</span>
                  <span className="font-semibold text-foreground">
                    {address || "To be confirmed"}, {suburb}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Helper</span>
                  <span className="font-semibold text-foreground">{xooter || "Top available Xooter"}</span>
                </div>

                <div className="border-t border-border/80 pt-3 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base service</span>
                    <span className="font-mono">{quote ? formatRand(quote.baseCents) : "—"}</span>
                  </div>
                  {quote && quote.addOnsCents > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Add-ons</span>
                      <span className="font-mono">{formatRand(quote.addOnsCents)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">XootCover Insurance</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">Included</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Platform booking fee</span>
                    <span className="font-mono">{quote ? formatRand(quote.serviceFeeCents) : "R39"}</span>
                  </div>
                  {quote && quote.discountCents > 0 && (
                    <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                      <span>Referral discount</span>
                      <span className="font-mono">-{formatRand(quote.discountCents)}</span>
                    </div>
                  )}

                  <div className="border-t border-border/80 pt-2 flex justify-between items-baseline">
                    <span className="text-sm font-bold text-foreground">Total to pay</span>
                    <span className="text-2xl font-display font-bold text-primary font-mono">
                      {quote ? formatRand(quote.totalCents) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 text-[11px] text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                <span>
                  Payments are protected in escrow. Funds are only cleared once work is verified and complete.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between border-t border-border/80 px-6 py-4 bg-muted/20">
          <button
            type="button"
            onClick={handleBack}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-xs shadow-md hover:opacity-95 transition-all"
          >
            <span>{step === STEPS.length - 1 ? "Confirm & Book" : "Continue"}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
