import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Camera,
  Check,
  CheckCircle2,
  Clock,
  Crown,
  Heart,
  Home,
  Lock,
  MapPin,
  MessageCircle,
  PhoneCall,
  Repeat,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TrustBadges } from "@/components/zoot/TrustBadges";
import { deriveZooterBadges, requiresCompletionPhotos, sortZootersForMarketplace } from "@/lib/trust";
import { formatZAR } from "@/lib/format";

type ServiceId = "regular" | "express" | "deep" | "moving" | "airbnb" | "office";
type BookingStatus = "draft" | "confirmed" | "enroute" | "arrived" | "in_progress" | "completed";

type Contractor = {
  id: string;
  name: string;
  suburb: string;
  rating: number;
  jobs_completed: number;
  reliability_score: number;
  repeat_client_count: number;
  job_completion_rate: number;
  years_experience: number;
  hourly_rate: number;
  verified: boolean;
  background_check_status: string;
  airbnb_specialist?: boolean;
  premium_care_plus?: boolean;
  transport: string;
  languages_spoken: string[];
  supplies_owned: string[];
  pet_comfort: string;
};

type HomeProfile = {
  suburb: string;
  address: string;
  petNotes: string;
  parking: string;
  accessCode: string;
  fragileAreas: string;
  preferences: string;
  products: string;
};

type Booking = {
  id: string;
  service: ServiceId;
  suburb: string;
  date: string;
  time: string;
  contractorId: string;
  contractorName: string;
  total: number;
  status: BookingStatus;
  photoProofRequired: boolean;
  beforePhoto: boolean;
  afterPhoto: boolean;
};

const approvedRegions = [
  "Midrand",
  "Sandton",
  "Bryanston",
  "Bedfordview",
  "Rosebank",
  "Parkhurst",
  "Melville",
  "Fourways",
  "Waterfall",
  "Dainfern",
  "Hyde Park",
  "Braamfontein",
];

const services: Record<ServiceId, { label: string; base: number; hours: number; description: string }> = {
  regular: { label: "Regular clean", base: 270, hours: 4, description: "Recurring-ready domestic cleaning." },
  express: { label: "Express clean", base: 220, hours: 3, description: "Focused reset for high-priority rooms." },
  deep: { label: "Deep clean", base: 390, hours: 6, description: "Detailed premium home reset." },
  moving: { label: "Moving clean", base: 490, hours: 7, description: "Move-in or move-out readiness." },
  airbnb: { label: "Airbnb turnover", base: 430, hours: 5, description: "Guest-ready clean with photo proof." },
  office: { label: "Office clean", base: 520, hours: 6, description: "Small office and estate workspace care." },
};

const addOns = [
  "Ironing",
  "Laundry",
  "Inside fridge",
  "Inside oven",
  "Inside cabinets",
  "Interior windows",
  "Interior walls",
  "Watering plants",
  "Small flatlet",
];

const contractors: Contractor[] = [
  {
    id: "nomsa",
    name: "Nomsa M.",
    suburb: "Sandton",
    rating: 4.96,
    jobs_completed: 184,
    reliability_score: 97,
    repeat_client_count: 41,
    job_completion_rate: 99,
    years_experience: 7,
    hourly_rate: 92,
    verified: true,
    background_check_status: "approved",
    premium_care_plus: true,
    transport: "Own transport",
    languages_spoken: ["English", "isiZulu"],
    supplies_owned: ["Eco products", "Vacuum", "Steam mop"],
    pet_comfort: "Comfortable with dogs and cats",
  },
  {
    id: "thandi",
    name: "Thandi R.",
    suburb: "Rosebank",
    rating: 4.91,
    jobs_completed: 132,
    reliability_score: 94,
    repeat_client_count: 27,
    job_completion_rate: 98,
    years_experience: 6,
    hourly_rate: 88,
    verified: true,
    background_check_status: "approved",
    airbnb_specialist: true,
    transport: "Own transport",
    languages_spoken: ["English", "Sesotho"],
    supplies_owned: ["Linen checklist", "Eco products"],
    pet_comfort: "Pet friendly",
  },
  {
    id: "aisha",
    name: "Aisha K.",
    suburb: "Midrand",
    rating: 4.84,
    jobs_completed: 91,
    reliability_score: 88,
    repeat_client_count: 16,
    job_completion_rate: 97,
    years_experience: 5,
    hourly_rate: 82,
    verified: true,
    background_check_status: "approved",
    transport: "Ride share",
    languages_spoken: ["English", "Afrikaans"],
    supplies_owned: ["Oven care kit", "Glass tools"],
    pet_comfort: "Cats preferred",
  },
];

const automationRules = [
  "IF booking confirmed THEN send in-app confirmation and email receipt.",
  "IF contractor is on the way THEN send urgent WhatsApp and in-app status.",
  "IF recurring window is missed THEN send in-app smart rebooking prompt.",
  "IF booking ends THEN mask sensitive household data in contractor view.",
  "IF rating is below 3 THEN create human follow-up task.",
];

const useStoredState = <T,>(key: string, initial: T) => {
  const [value, setValue] = useState<T>(() => {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : initial;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
};

const Preview = () => {
  const [activeTab, setActiveTab] = useState("book");
  const [selectedService, setSelectedService] = useState<ServiceId>("regular");
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(["Inside oven", "Laundry"]);
  const [selectedContractor, setSelectedContractor] = useState("nomsa");
  const [date, setDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [time, setTime] = useState("08:30");
  const [carePlus, setCarePlus] = useStoredState("zoot-preview-care-plus", false);
  const [favoriteId, setFavoriteId] = useStoredState("zoot-preview-favorite", "nomsa");
  const [bookings, setBookings] = useStoredState<Booking[]>("zoot-preview-bookings", []);
  const [homeProfile, setHomeProfile] = useStoredState<HomeProfile>("zoot-preview-home", {
    suburb: "Sandton",
    address: "12 Example Avenue, Sandton",
    petNotes: "Milo is friendly but nervous around the vacuum.",
    parking: "Visitor bay near reception.",
    accessCode: "1428",
    fragileAreas: "Glass coffee table, hallway art, study shelves.",
    preferences: "Bedrooms first, kitchen last. No bleach on stone surfaces.",
    products: "Eco floor cleaner and unscented laundry products.",
  });

  const approved = approvedRegions.includes(homeProfile.suburb);
  const service = services[selectedService];
  const rankedContractors = useMemo(() => sortZootersForMarketplace(contractors), []);
  const contractor = rankedContractors.find((item) => item.id === selectedContractor) ?? rankedContractors[0];
  const addOnTotal = selectedAddOns.length * 30;
  const serviceFee = carePlus ? 19 : 39;
  const cover = 21;
  const highDemand = time >= "16:00" ? Math.round((service.base + addOnTotal) * 0.12) : 0;
  const total = service.base + addOnTotal + serviceFee + cover + highDemand;
  const photoProofRequired = requiresCompletionPhotos(selectedService === "moving" ? "deep" : selectedService);
  const latestBooking = bookings[0];

  const toggleAddOn = (addOn: string) => {
    setSelectedAddOns((items) => items.includes(addOn) ? items.filter((item) => item !== addOn) : [...items, addOn]);
  };

  const confirmBooking = () => {
    if (!approved) return;
    const booking: Booking = {
      id: `Z-${Math.floor(Math.random() * 9000 + 1000)}`,
      service: selectedService,
      suburb: homeProfile.suburb,
      date,
      time,
      contractorId: contractor.id,
      contractorName: contractor.name,
      total,
      status: "confirmed",
      photoProofRequired,
      beforePhoto: false,
      afterPhoto: false,
    };
    setBookings([booking, ...bookings]);
    setFavoriteId(contractor.id);
    setActiveTab("bookings");
  };

  const updateBooking = (id: string, patch: Partial<Booking>) => {
    setBookings(bookings.map((booking) => booking.id === id ? { ...booking, ...patch } : booking));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-xl">
        <div className="container h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm shadow-warm">
              <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
            </span>
            <span className="font-display text-2xl font-bold">zoot</span>
          </Link>
          <nav className="hidden md:flex items-center gap-2">
            {[
              ["book", "Book"],
              ["home", "Home profile"],
              ["team", "Trusted team"],
              ["bookings", "Bookings"],
              ["contractor", "Contractor"],
              ["ops", "Ops"],
            ].map(([id, label]) => (
              <button key={id} onClick={() => setActiveTab(id)} className={`rounded-full px-3 py-1.5 text-sm font-medium ${activeTab === id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted"}`}>
                {label}
              </button>
            ))}
          </nav>
          <Button onClick={() => setCarePlus(!carePlus)} variant={carePlus ? "default" : "outline"} className="rounded-full">
            <Crown className="h-4 w-4 mr-1" />
            {carePlus ? "HomeCare+ active" : "Try HomeCare+"}
          </Button>
        </div>
      </header>

      <main className="container py-8 lg:py-10">
        <section className="mb-8 grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
          <div className="rounded-[2rem] gradient-hero p-8 lg:p-10 border border-border">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-5 border border-accent/20">
              <Sparkles className="h-3.5 w-3.5 text-sage-deep" />
              <span className="text-xs font-semibold text-sage-deep">Limited launch preview - no live APIs</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight max-w-3xl">
              Premium home care, built around trust and repeat comfort.
            </h1>
            <p className="mt-4 text-muted-foreground max-w-2xl">
              This preview uses local mock data only. It demonstrates Zoot's guided booking, vetted contractor proof, household memory, in-app notifications, urgent-channel discipline, and contractor data masking.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {approvedRegions.slice(0, 8).map((region) => <span key={region} className="rounded-full bg-card border border-border px-3 py-1 text-xs font-medium">{region}</span>)}
              <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold">+ nearby approved areas</span>
            </div>
          </div>
          <Card className="p-6 rounded-[2rem]">
            <h2 className="font-display text-2xl font-bold mb-4">Launch readiness</h2>
            <div className="space-y-3">
              <Readiness icon={ShieldCheck} title="Trust-first" body="MIE screening, ID checks, references, reliability score and incident routing are represented as product states." />
              <Readiness icon={Bell} title="App as the hub" body="In-app notifications are primary. WhatsApp is shown only for urgent real-time events." />
              <Readiness icon={Lock} title="Sensitive data masking" body="Contractor household access is visibly masked after completion or cancellation." />
              <Readiness icon={PhoneCall} title="Voice-only calling" body="Twilio is represented as masked active-booking calls, not messaging." />
            </div>
          </Card>
        </section>

        {activeTab === "book" && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <Card className="p-6 rounded-3xl">
              <h2 className="font-display text-2xl font-bold mb-1">Guided booking</h2>
              <p className="text-sm text-muted-foreground mb-5">Select a service, add-ons, location and preferred contractor before confirming.</p>

              <div className="grid md:grid-cols-3 gap-3 mb-6">
                {Object.entries(services).map(([id, item]) => (
                  <button key={id} onClick={() => setSelectedService(id as ServiceId)} className={`rounded-2xl border p-4 text-left ${selectedService === id ? "border-foreground bg-foreground text-background" : "border-border bg-muted/30 hover:bg-muted"}`}>
                    <p className="font-semibold">{item.label}</p>
                    <p className="text-xs opacity-75 mt-1">{item.description}</p>
                    <p className="font-display text-xl font-bold mt-3">{formatZAR(item.base)}</p>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <h3 className="font-semibold mb-2">Premium add-ons</h3>
                <div className="grid sm:grid-cols-3 gap-2">
                  {addOns.map((addOn) => (
                    <button key={addOn} onClick={() => toggleAddOn(addOn)} className={`rounded-xl border px-3 py-2 text-sm ${selectedAddOns.includes(addOn) ? "bg-foreground text-background border-foreground" : "bg-muted/30 border-border"}`}>
                      {addOn}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-3 mb-6">
                <div>
                  <Label>Suburb</Label>
                  <select value={homeProfile.suburb} onChange={(e) => setHomeProfile({ ...homeProfile, suburb: e.target.value })} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    {[...approvedRegions, "Pretoria East"].map((region) => <option key={region}>{region}</option>)}
                  </select>
                </div>
                <div><Label>Date</Label><Input className="mt-1" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div><Label>Time</Label><Input className="mt-1" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
              </div>

              {!approved && <div className="mb-5 rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex gap-2"><AlertTriangle className="h-4 w-4 mt-0.5" /> Zoot launch bookings are limited to approved launch regions. This suburb is blocked in the preview.</div>}

              <h3 className="font-semibold mb-3">Recommended contractors</h3>
              <div className="grid md:grid-cols-3 gap-3">
                {rankedContractors.map((item) => (
                  <button key={item.id} onClick={() => setSelectedContractor(item.id)} className={`rounded-2xl border p-4 text-left ${selectedContractor === item.id ? "border-primary bg-primary/5" : "border-border bg-card"}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-display font-bold">{item.name}</p>
                      {favoriteId === item.id && <Heart className="h-4 w-4 fill-primary text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground">{item.suburb} - {item.years_experience} yrs experience</p>
                    <div className="mt-3"><TrustBadges badges={deriveZooterBadges(item)} limit={2} /></div>
                    <div className="mt-3 grid grid-cols-3 gap-1 text-center text-xs">
                      <MiniStat label="Trust" value={item.reliability_score} />
                      <MiniStat label="Repeat" value={item.repeat_client_count} />
                      <MiniStat label="Done" value={`${item.job_completion_rate}%`} />
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="p-6 rounded-3xl h-fit sticky top-24">
              <h2 className="font-display text-2xl font-bold mb-4">Quote</h2>
              <Line label={service.label} value={formatZAR(service.base)} />
              <Line label={`${selectedAddOns.length} add-ons`} value={formatZAR(addOnTotal)} />
              <Line label="Service fee" value={formatZAR(serviceFee)} />
              <Line label="Booking cover" value={formatZAR(cover)} />
              {highDemand > 0 && <Line label="High-demand slot" value={formatZAR(highDemand)} />}
              <div className="h-px bg-border my-3" />
              <Line label="Total" value={formatZAR(total)} strong />
              <div className="mt-4 rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">
                Estimated {service.hours + selectedAddOns.length} hours. {photoProofRequired ? "Before/after photo proof required." : "Photo proof optional."}
              </div>
              <Button disabled={!approved} onClick={confirmBooking} className="w-full mt-4 rounded-2xl h-12 gradient-warm">
                Confirm mock booking
              </Button>
              <p className="text-[11px] text-muted-foreground mt-3">No payment is collected. Contractor availability is not promised until confirmation in a real system.</p>
            </Card>
          </div>
        )}

        {activeTab === "home" && (
          <Card className="p-6 rounded-3xl max-w-4xl">
            <h2 className="font-display text-2xl font-bold mb-1">Household memory</h2>
            <p className="text-sm text-muted-foreground mb-5">This is stored in local browser storage for preview only.</p>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Address"><Input value={homeProfile.address} onChange={(e) => setHomeProfile({ ...homeProfile, address: e.target.value })} /></Field>
              <Field label="Parking"><Input value={homeProfile.parking} onChange={(e) => setHomeProfile({ ...homeProfile, parking: e.target.value })} /></Field>
              <Field label="Gate or access code"><Input value={homeProfile.accessCode} onChange={(e) => setHomeProfile({ ...homeProfile, accessCode: e.target.value })} /></Field>
              <Field label="Favourite products"><Input value={homeProfile.products} onChange={(e) => setHomeProfile({ ...homeProfile, products: e.target.value })} /></Field>
              <Field label="Pet notes"><Textarea value={homeProfile.petNotes} onChange={(e) => setHomeProfile({ ...homeProfile, petNotes: e.target.value })} /></Field>
              <Field label="Fragile areas"><Textarea value={homeProfile.fragileAreas} onChange={(e) => setHomeProfile({ ...homeProfile, fragileAreas: e.target.value })} /></Field>
              <Field label="Cleaning preferences"><Textarea value={homeProfile.preferences} onChange={(e) => setHomeProfile({ ...homeProfile, preferences: e.target.value })} /></Field>
            </div>
          </Card>
        )}

        {activeTab === "team" && (
          <div className="grid md:grid-cols-3 gap-5">
            {rankedContractors.map((item) => (
              <Card key={item.id} className="p-5 rounded-3xl">
                <div className="flex items-start justify-between">
                  <div><h3 className="font-display text-xl font-bold">{item.name}</h3><p className="text-sm text-muted-foreground">{item.suburb}</p></div>
                  <Button size="icon" variant={favoriteId === item.id ? "default" : "outline"} className="rounded-full" onClick={() => setFavoriteId(item.id)}><Heart className={favoriteId === item.id ? "h-4 w-4 fill-current" : "h-4 w-4"} /></Button>
                </div>
                <div className="mt-4"><TrustBadges badges={deriveZooterBadges(item)} limit={4} /></div>
                <div className="mt-5 grid grid-cols-3 gap-2 text-center"><MiniStat label="Rating" value={item.rating} /><MiniStat label="Jobs" value={item.jobs_completed} /><MiniStat label="Repeat" value={item.repeat_client_count} /></div>
                <Button className="w-full mt-5 rounded-2xl" onClick={() => { setSelectedContractor(item.id); setActiveTab("book"); }}>Book {item.name.split(" ")[0]} again</Button>
              </Card>
            ))}
          </div>
        )}

        {activeTab === "bookings" && (
          <div className="grid lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-4">
              {bookings.length === 0 && <Card className="p-8 rounded-3xl text-center text-muted-foreground">No mock bookings yet. Create one from the booking tab.</Card>}
              {bookings.map((booking) => (
                <Card key={booking.id} className="p-5 rounded-3xl">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">{booking.id}</p>
                      <h3 className="font-display text-xl font-bold">{services[booking.service].label} with {booking.contractorName}</h3>
                      <p className="text-sm text-muted-foreground">{booking.suburb} - {booking.date} at {booking.time} - {formatZAR(booking.total)}</p>
                    </div>
                    <span className="rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-bold capitalize">{booking.status.replace("_", " ")}</span>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-5 gap-2">
                    {(["confirmed", "enroute", "arrived", "in_progress", "completed"] as BookingStatus[]).map((status) => (
                      <Button key={status} variant={booking.status === status ? "default" : "outline"} size="sm" className="rounded-xl capitalize" onClick={() => updateBooking(booking.id, { status })}>
                        {status.replace("_", " ")}
                      </Button>
                    ))}
                  </div>
                  {booking.photoProofRequired && (
                    <div className="mt-4 grid sm:grid-cols-2 gap-2">
                      <Button variant={booking.beforePhoto ? "default" : "outline"} className="rounded-xl" onClick={() => updateBooking(booking.id, { beforePhoto: !booking.beforePhoto })}><Camera className="h-4 w-4 mr-1" /> Before photo</Button>
                      <Button variant={booking.afterPhoto ? "default" : "outline"} className="rounded-xl" onClick={() => updateBooking(booking.id, { afterPhoto: !booking.afterPhoto })}><Camera className="h-4 w-4 mr-1" /> After photo</Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
            <Card className="p-5 rounded-3xl h-fit">
              <h3 className="font-display text-xl font-bold mb-3">Notification routing</h3>
              <Notification icon={Bell} title="In-app first" body="Booking confirmations, job completed, ZootCred and badge unlocks." />
              <Notification icon={MessageCircle} title="WhatsApp urgent only" body="On the way, arrived, same-day cancellation, no-show or safety alert." />
              <Notification icon={PhoneCall} title="Masked voice call" body="Available only during an active booking window." />
            </Card>
          </div>
        )}

        {activeTab === "contractor" && (
          <div className="grid lg:grid-cols-[1fr_380px] gap-6">
            <Card className="p-6 rounded-3xl">
              <h2 className="font-display text-2xl font-bold mb-1">Contractor portal preview</h2>
              <p className="text-sm text-muted-foreground mb-5">Shows dignity, standards, quality signals and limited household access.</p>
              <div className="grid md:grid-cols-3 gap-3 mb-6"><MiniStat label="Reliability" value={`${contractor.reliability_score}/100`} /><MiniStat label="Completion" value={`${contractor.job_completion_rate}%`} /><MiniStat label="Repeat clients" value={contractor.repeat_client_count} /></div>
              <div className="rounded-2xl border border-border p-4 mb-4"><h3 className="font-semibold mb-2">Training path</h3><div className="grid sm:grid-cols-2 gap-2">{["Etiquette", "Luxury-home standards", "Pet handling", "Fragile items", "Punctuality"].map((item) => <span key={item} className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-sm"><CheckCircle2 className="h-4 w-4 text-sage-deep" />{item}</span>)}</div></div>
              <div className="rounded-2xl border border-border p-4"><h3 className="font-semibold mb-2">Active booking household data</h3>{latestBooking && ["confirmed", "enroute", "arrived", "in_progress"].includes(latestBooking.status) ? <div className="text-sm space-y-1"><p><strong>Parking:</strong> {homeProfile.parking}</p><p><strong>Access:</strong> {homeProfile.accessCode}</p><p><strong>Pets:</strong> {homeProfile.petNotes}</p></div> : <div className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> Sensitive fields are masked outside the active booking window.</div>}</div>
            </Card>
            <Card className="p-6 rounded-3xl h-fit">
              <h3 className="font-display text-xl font-bold mb-3">Masked voice call</h3>
              <p className="text-sm text-muted-foreground mb-4">This button is enabled only while the latest booking is active. It represents Twilio voice only, not SMS or marketing calls.</p>
              <Button disabled={!latestBooking || !["confirmed", "enroute", "arrived", "in_progress"].includes(latestBooking.status)} className="w-full rounded-2xl"><PhoneCall className="h-4 w-4 mr-1" /> Start masked call</Button>
            </Card>
          </div>
        )}

        {activeTab === "ops" && (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card className="p-6 rounded-3xl"><h2 className="font-display text-2xl font-bold mb-4">Automation skills</h2><div className="space-y-3">{automationRules.map((rule) => <div key={rule} className="rounded-2xl border border-border p-4 text-sm">{rule}</div>)}</div></Card>
            <Card className="p-6 rounded-3xl"><h2 className="font-display text-2xl font-bold mb-4">Launch operating limits</h2><div className="space-y-3"><Readiness icon={MapPin} title="Region guardrail" body="Bookings outside approved launch regions are blocked in the UI." /><Readiness icon={ShieldCheck} title="No overpromising" body="Contractor availability is shown as a request until confirmed." /><Readiness icon={Users} title="Independent contractors" body="Copy avoids employee language and keeps contractors positioned as vetted professionals." /><Readiness icon={Repeat} title="Retention-led" body="Home profile, favourite contractor and HomeCare+ are visible before repeat booking." /></div></Card>
          </div>
        )}
      </main>
    </div>
  );
};

const Readiness = ({ icon: Icon, title, body }: { icon: typeof ShieldCheck; title: string; body: string }) => (
  <div className="flex gap-3">
    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/10 text-primary shrink-0"><Icon className="h-5 w-5" /></span>
    <div><p className="font-semibold">{title}</p><p className="text-sm text-muted-foreground">{body}</p></div>
  </div>
);

const MiniStat = ({ label, value }: { label: string; value: string | number }) => <div className="rounded-xl bg-muted/40 p-2"><p className="text-[10px] text-muted-foreground">{label}</p><p className="font-display font-bold">{value}</p></div>;
const Line = ({ label, value, strong }: { label: string; value: string; strong?: boolean }) => <div className={`flex justify-between text-sm ${strong ? "font-display text-xl font-bold" : ""}`}><span>{label}</span><span>{value}</span></div>;
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
const Notification = ({ icon: Icon, title, body }: { icon: typeof Bell; title: string; body: string }) => <div className="flex gap-3 py-3 border-b border-border last:border-0"><Icon className="h-4 w-4 text-primary mt-1" /><div><p className="font-semibold text-sm">{title}</p><p className="text-xs text-muted-foreground">{body}</p></div></div>;

export default Preview;
