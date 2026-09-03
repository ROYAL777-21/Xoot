import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { XooterCard, Xooter } from "@/components/xoot/XooterCard";
import { ChipGrid } from "@/components/kit";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Home as HomeIcon, Building2, BedDouble, Sparkles, ArrowRight, ArrowLeft, Loader2, Wand2, Plus, Minus, ShieldCheck, Repeat, Truck, TimerReset, CheckCircle2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { PayFastCheckout } from "@/components/PayFastCheckout";
import { getSmartRecurringSuggestion, requiresCompletionPhotos, sortXootersForMarketplace } from "@/lib/trust";
import { calculateBookingQuote, isApprovedLaunchRegion } from "@/lib/operations";
import { useCarePlus } from "@/hooks/useCarePlus";
import {
  SERVICE_ALIASES,
  isPriced,
  quote as priceQuote,
  resolveHours,
  serviceAllowsMultipleXooters,
} from "@/lib/xoot-pricing";
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

const SERVICE_LENGTHS = [
  {
    id: "refresh",
    label: "Essential reset",
    desc: "Light maintenance clean for a smaller space or already-kept home.",
    hours: 3,
    priceFactor: 0.82,
    badge: "Quickest",
  },
  {
    id: "standard",
    label: "Standard clean",
    desc: "The best fit for most homes, repeat visits and balanced room-by-room care.",
    hours: 4.5,
    priceFactor: 1,
    badge: "Most booked",
  },
  {
    id: "extended",
    label: "Deep attention",
    desc: "More time for detail work, catch-up cleaning and extra high-touch areas.",
    hours: 6,
    priceFactor: 1.28,
    badge: "More detail",
  },
  {
    id: "full_day",
    label: "Full-day care",
    desc: "For moving, Airbnb turnovers, offices or homes needing a serious reset.",
    hours: 8,
    priceFactor: 1.62,
    badge: "Most complete",
  },
] as const;

const EXTRAS = ["Inside fridge", "Inside oven", "Inside cabinets", "Interior windows", "Interior walls", "Water plants", "Ironing", "Laundry", "Small flatlet"] as const;
const EXTRA_HOURS = 1;
const TIME_SLOTS = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "14:00", "15:00", "16:00", "17:00"];
const TIME_GROUPS = [
  { label: "Morning", slots: TIME_SLOTS.filter((slot) => Number(slot.split(":")[0]) < 12) },
  { label: "Midday", slots: TIME_SLOTS.filter((slot) => Number(slot.split(":")[0]) >= 12 && Number(slot.split(":")[0]) < 15) },
  { label: "Late day", slots: TIME_SLOTS.filter((slot) => Number(slot.split(":")[0]) >= 15) },
] as const;
/**
 * Answered by the pricing module, not by a list kept here.
 *
 * The list this replaced included "deep" and "premium", so the Xooter stepper appeared on two
 * services that alias to `regular` — which `quote()` refuses to price with a second Xooter. The
 * refusal fell through to `discountedBase = 0`, and a Deep clean with three Xooters displayed
 * R61 against a server charge of R860. `pricing-parity.test.ts` now pins this against the server.
 */
const allowsMultipleWorkers = serviceAllowsMultipleXooters;
const isSafeDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime());
const serviceMultiplier: Record<string, number> = {
  residential: 1,
  express: 0.85,
  airbnb: 1.15,
  office: 1.2,
  deep: 1.35,
  moving: 1.4,
  premium: 1.55,
};

/**
 * ZD-036 — the four refusals `checkReferral` can return, in words a customer can act on.
 *
 * ⚠️ **The wording matters more than it looks.** The server checks `own_code` BEFORE
 * `already_used` precisely so a person entering their own burned code is told the honest reason
 * rather than a misleading one — telling them "already used" sends them to support with the
 * wrong question. Flattening these four into one "invalid code" message would throw away that
 * care at the last step.
 *
 * ⛔ None of these say the credit is worth a specific amount. The value is server-side only, and
 * `locked-commercial-facts.md` §Current Pricing Conflict is still open.
 */
const REFERRAL_REFUSALS = [
  { reason: "unknown_code", message: "We do not recognise that referral code. Check the spelling, or remove it to carry on." },
  { reason: "own_code", message: "That is your own referral code. Share it with someone else — it cannot be used on your own booking." },
  { reason: "already_used", message: "A referral code has already been used on this account. One per customer." },
  { reason: "not_a_first_booking", message: "Referral codes apply to a first booking only. Remove the code to carry on." },
] as const;

const Book = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const preferredXooterId = sanitiseSearchParam(searchParams.get("xooter"));
  const requestedService = sanitiseSearchParam(searchParams.get("service"));
  const requestedAddress = sanitiseSearchParam(searchParams.get("address")) || sanitiseSearchParam(searchParams.get("area"));
  const requestedDate = sanitiseSearchParam(searchParams.get("date"));
  const requestedIntent = sanitiseSearchParam(searchParams.get("intent"));
  const safeRequestedDate = requestedDate && isSafeDate(requestedDate) ? requestedDate : null;
  const defaultBookingDate = safeRequestedDate ?? new Date(Date.now() + 864e5).toISOString().slice(0, 10);
  const assistantStarted = requestedIntent === "book_clean" || Boolean(requestedService || requestedAddress || requestedDate);
  const [step, setStep] = useState(0);
  const [active, setActive] = useState<string>(services.some((s) => s.id === requestedService) ? requestedService : "residential");
  const [frequency, setFrequency] = useState<"one_time" | "repeat">("one_time");
  const [homeSize, setHomeSize] = useState<string>("small");
  const [serviceLength, setServiceLength] = useState<string>("standard");
  const [extras, setExtras] = useState<Set<string>>(new Set());
  const [address, setAddress] = useState(requestedAddress ?? "");
  const [date, setDate] = useState(defaultBookingDate);
  const [time, setTime] = useState("08:00");
  const [instructions, setInstructions] = useState("");
  const [householdNotes, setHouseholdNotes] = useState("");
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [properties, setProperties] = useState<{ id: string; name: string; account_type: string }[]>([]);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [smartSuggestion, setSmartSuggestion] = useState("");
  const [bookingCoverOptIn, setBookingCoverOptIn] = useState(true);
  /*
   * ZD-036 — the referral code, and nothing derived from it.
   *
   * ⚠️ This screen deliberately does NOT compute or preview the credit, and that is the design
   * rather than an omission. `locked-commercial-facts.md` lists "referral qualification" among
   * the things the frontend is never authoritative for: a screen that can decide its own
   * eligibility can decide its own discount. `_shared/referrals.ts` has no client mirror for
   * exactly this reason, unlike every other duplicated money rule in the repo.
   *
   * So the total shown on this step EXCLUDES the credit even when the code is valid, and the
   * customer is charged less than they were shown. Under the CPA that is the safe direction —
   * over-stating is survivable, under-stating is not — and it is the only arrangement where the
   * client never states a number the server has not agreed to.
   */
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState<string | null>(null);
  const [workerCount, setWorkerCount] = useState(1);
  const [xooters, setXooters] = useState<Xooter[]>([]);
  const [loadingXooters, setLoadingXooters] = useState(false);
  const [picked, setPicked] = useState<Xooter[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  /*
   * The payment record to charge, returned by `create-booking`.
   *
   * A recurring booking creates ONE RECORD PER VISIT, and only the first is offered here — paying
   * for a whole series up front is not what the customer agreed to. The rest are payable from
   * BookingDetail, each against its own booking.
   */
  const [paymentRecordId, setPaymentRecordId] = useState<string | null>(null);
  /*
   * How many payment records the booking produced.
   *
   * ⚠️ This decides whether an amount may be shown on the pay button at all. A recurring booking,
   * or one with several Xooters, produces ONE RECORD PER VISIT and `paymentRecordId` is only the
   * first. Labelling that button with the basket total would say "Pay R1 000" and then charge
   * R500 at PayFast — the screen and the charge disagreeing, which is the defect this repo has
   * shipped three times and which the Consumer Protection Act treats as the displayed price being
   * the price. When there is more than one record, the button names no figure and PayFast shows
   * the real one.
   */
  const [paymentRecordCount, setPaymentRecordCount] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  const size = HOME_SIZES.find((s) => s.id === homeSize) ?? HOME_SIZES[0];
  const length = SERVICE_LENGTHS.find((option) => option.id === serviceLength) ?? SERVICE_LENGTHS[1];
  const totalWorkers = Math.max(1, workerCount);

  /**
   * Priced off the ZD-020 hour ladder, via the same translation the server does.
   *
   * This screen used to compute `size.price x length.priceFactor x serviceMultiplier` off
   * `270 / 315 / 390` — the superseded model, which `pricing-parity.test.ts` forbids in the
   * server and which the booking screen kept its own copy of. It agreed with *deployed*
   * production and disagreed with the repo, so the two were consistent only by accident.
   *
   * Now there is one source: `quote()` applies the ladder, the multi-Xooter discount and the
   * per-Xooter multiplication, all of which are already held against `create-booking` by
   * `multi-xooter.test.ts`. The rule is no longer duplicated here, so it can no longer drift
   * here.
   *
   * **This makes deploying `create-booking` mandatory, not optional.** Until it is deployed,
   * production still charges the old model and this screen shows the new one. Production holds
   * no bookings, so nobody is affected today — but the gap closes only on deploy.
   */
  /**
   * The base shown against each service-length option, off the ladder rather than off
   * `size.price x priceFactor`. Home size no longer moves the price at all — it only supplies
   * a default duration — so this quotes the option's own hours.
   */
  const optionBase = (lengthId: string) => {
    const hours = resolveHours({ serviceLengthId: lengthId }) ?? 0;
    const q = priceQuote({ service: SERVICE_ALIASES[active] ?? "regular", hours, bookingCover: false });
    return isPriced(q) ? formatZAR(Math.round(q.baseCents / 100)) : "—";
  };

  const bookedHours = resolveHours({ serviceLengthId: serviceLength, homeSizeId: homeSize }) ?? 0;
  const priced = priceQuote({
    service: SERVICE_ALIASES[active] ?? "regular",
    hours: bookedHours,
    xooterCount: totalWorkers,
    // Add-ons and cover are added by `calculateBookingQuote` below, which also applies the
    // high-demand premium and the booking fee. Asking for them here would double them.
    addOns: 0,
    bookingCover: false,
  });
  const serviceBasePrice = isPriced(priced) ? Math.round(priced.baseCents / totalWorkers / 100) : 0;
  const estHours = bookedHours + extras.size * EXTRA_HOURS;
  const discountedBase = isPriced(priced) ? Math.round(priced.baseCents / 100) : 0;
  // Read back from the quote rather than recomputed, so the line item cannot claim a
  // discount the price did not actually apply.
  const discount = isPriced(priced) ? priced.discountRate : 0;
  // Membership waives the R39 booking fee, and since 2026-08-12 that is the only thing that
  // does. Without this the screen quotes a member the fee on every booking and the server then
  // charges R0 — the paywall promise contradicted in the place it is easiest to disbelieve.
  const carePlus = useCarePlus();
  const carePlusMember = carePlus.state.status === "active";
  const quote = calculateBookingQuote({
    basePrice: discountedBase,
    addOnCount: extras.size,
    frequency,
    time,
    bookingCoverOptIn,
    carePlusMember,
  });
  const totalPrice = quote.basePrice + quote.addOnsTotal;
  const serviceFee = quote.serviceFee;
  const bookingCover = quote.bookingCover;
  const bookingTotal = quote.total;
  const highDemandPremium = quote.highDemandPremium;
  const perWorkerPrice = Math.max(1, Math.round(totalPrice / totalWorkers));
  const photoRequired = requiresCompletionPhotos(active);
  const inLaunchRegion = address.trim().length > 0 && isApprovedLaunchRegion(address);
  const activeServiceLabel = services.find((service) => service.id === active)?.label ?? "cleaning";

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("household_profiles").select("*").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
      supabase.from("bookings").select("scheduled_at").eq("user_id", user.id).order("scheduled_at", { ascending: false }).limit(6),
      // Only active accounts: a closed property should not still be bookable against.
      supabase.from("property_accounts").select("id,name,account_type").eq("user_id", user.id).eq("status", "active").order("created_at"),
    ]).then(([homeResult, bookingResult, propertyResult]) => {
      setProperties(propertyResult.data ?? []);
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

  /*
   * Rank Xooters by how far they actually are from this booking.
   *
   * ── What this replaced, and why it mattered ─────────────────────────────────
   * This queried `xooters_public` directly with `.limit(30)`, no ordering by anything to do with
   * the customer, and **ignored the address typed one step earlier**. `ai-match` existed and
   * nothing in the app called it — so "matched with Xooters near you" was not a weak feature, it
   * was an absent one.
   *
   * ── The fallback is not decoration ──────────────────────────────────────────
   * If matching fails for any reason — the function is not deployed yet on this project, the
   * address resolves to no known suburb, a network blip — this falls back to the old direct query.
   * An empty Xooter list is indistinguishable to a customer from "Xoot has nobody", and losing a
   * booking is a far worse outcome than losing the distance ordering.
   */
  useEffect(() => {
    if (step !== 2) return;
    let mounted = true;
    setLoadingXooters(true);

    const applyResults = (rows: Xooter[]) => {
      if (!mounted) return;
      const preferred = preferredXooterId ? rows.find((z) => z.id === preferredXooterId) : null;
      setXooters(rows);
      if (preferred) setPicked((current) => current.some((z) => z.id === preferred.id) ? current : [preferred]);
      setLoadingXooters(false);
    };

    const fallback = async () => {
      const { data } = await supabase.from("xooters_public").select("*").limit(30);
      applyResults(sortXootersForMarketplace((data ?? []) as Xooter[]));
    };

    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ai-match", {
          // The address is what makes this proximity matching rather than a sort. It is the same
          // value validated against the launch regions in step 1.
          body: { address },
        });
        if (error) throw error;
        const ranked = (data as { ranked?: Xooter[] } | null)?.ranked;
        if (!ranked?.length) throw new Error("no ranked results");
        applyResults(ranked);
      } catch (err) {
        console.warn("proximity matching unavailable; falling back to the plain roster", err);
        await fallback();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [step, preferredXooterId, address]);

  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase.channel(`booking-${bookingId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` }, (payload: any) => setBookingStatus(payload.new.status))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);


  const validateStep = () => {
    if (step === 1 && !address.trim()) { toast.error("Please enter your address"); return false; }
    if (step === 1 && !isApprovedLaunchRegion(address)) { toast.error("Xoot is currently available in the approved launch suburbs only."); return false; }
    if (step === 2 && picked.length === 0) { toast.error("Select at least one Xooter"); return false; }
    return true;
  };

  const selectWorker = (z: Xooter) => {
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
      service_length: serviceLength,
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
        serviceLength: safeBooking.service_length,
        time: safeBooking.time,
        date: safeBooking.date,
        address: safeBooking.address,
        instructions,
        householdProfileId: householdId,
        propertyAccountId: propertyId,
        workerCount: totalWorkers,
        xooterIds: picked.map((z) => z.id),
        addOns: safeBooking.extras,
        bookingCoverOptIn,
        referralCode: referralCode.trim() || undefined,
      },
    });

    if (error) {
      /*
       * A refused referral code comes back as a 409 from `create-booking`, which fails the whole
       * booking rather than quietly charging full price. That is deliberate on the server: a
       * customer who typed a code expects a total that includes it, and creating the booking
       * without it is the "shown one price, charged another" defect this repo shipped three
       * times.
       *
       * So the refusal has to land on the field, not in a toast that disappears. The reasons
       * are the four in `ReferralRefusal`, mapped to something a person can act on.
       */
      /*
       * ⚠️ The reason is in the RESPONSE BODY, not in `error.message`.
       *
       * `supabase.functions.invoke` sets `error.message` to a generic "Edge Function returned a
       * non-2xx status code" for every failure — the body `fail()` sent is only reachable through
       * `error.context`, which is the raw Response. Matching on `error.message` would have
       * compiled, passed a type check, and silently never fired, dropping the customer to a
       * generic toast that tells them nothing.
       */
      let serverMessage = error.message ?? "";
      const context = (error as { context?: Response }).context;
      if (context && typeof context.json === "function") {
        try {
          const payload = await context.clone().json();
          if (typeof payload?.error === "string") serverMessage = payload.error;
        } catch {
          // Body already consumed or not JSON — fall back to error.message below.
        }
      }
      const refusal = REFERRAL_REFUSALS.find((entry) => serverMessage.includes(entry.reason));
      if (refusal) {
        setReferralError(refusal.message);
        toast.error(refusal.message);
        setSubmitting(false);
        return;
      }
      toast.error(serverMessage || error.message);
      setSubmitting(false);
      return;
    }
    setReferralError(null);

    type BookingResult = {
      booking_ids?: string[];
      booking_id?: string;
      status?: string;
      payment_record_ids?: string[];
    };
    const actionResult = data as { success?: boolean; error?: string; data?: BookingResult } | null;
    if (actionResult?.success === false) {
      toast.error(actionResult.error ?? "Booking request failed");
      setSubmitting(false);
      return;
    }
    const result = actionResult?.data ?? (data as BookingResult | null);
    const firstBookingId = result?.booking_id ?? result?.booking_ids?.[0] ?? null;
    if (firstBookingId) {
      setBookingId(firstBookingId);
      setBookingStatus(result?.status ?? "draft");
    }
    setPaymentRecordId(result?.payment_record_ids?.[0] ?? null);
    setPaymentRecordCount(result?.payment_record_ids?.length ?? 0);
    setSubmitting(false);
    setStep(4);
  };

  const maxPick = allowsMultipleWorkers(active) ? workerCount : 1;

  return (
    <div className="container py-5 lg:py-10 max-w-4xl pb-32 md:pb-10">
      <div className="flex items-start justify-between gap-3 mb-5 lg:mb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-2 border border-accent/20">
            <Sparkles className="h-3 w-3 text-accent-ink" />
            <span className="text-xs font-medium text-accent-ink">Book a clean · takes under a minute</span>
          </div>
          <h1 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">Your home, handled.</h1>
          <p className="mt-1 text-sm text-muted-foreground hidden sm:block">Four calm steps. Vetted Xooter. Price you see is the price you pay.</p>
        </div>
        <div className="lg:block hidden"><NotificationBell /></div>
      </div>

      {assistantStarted && (
        <div className="slide-up-soft mb-6 rounded-3xl border border-primary/20 bg-primary/10 p-4 text-sm shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-lg font-bold text-foreground">Voice booking started</p>
              <p className="mt-1 text-muted-foreground">
                Xoot heard a request for {activeServiceLabel.toLowerCase()}
                {safeRequestedDate ? ` on ${new Date(`${safeRequestedDate}T00:00:00`).toLocaleDateString("en-ZA")}` : ""}.
                Confirm the address, time and payment inside the app for safety.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center justify-center rounded-full bg-background px-3 py-1 text-xs font-bold text-primary">
              Siri / Gemini safe handoff
            </span>
          </div>
        </div>
      )}

      {step < 4 && (
        <div className="mb-6">
          <div className="flex gap-1">{["Service", "Details", "Worker", "Review"].map((s, i) => <div key={s} className={`flex-1 h-1.5 rounded-full ${i <= step ? "gradient-warm" : "bg-muted"}`} />)}</div>
          <p className="text-xs text-muted-foreground mt-1.5">Step {step + 1} of 4 - {["Service", "Details", "Worker", "Review"][step]}</p>
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
          {/* Only shown when the customer actually has property accounts, so a household
              customer never sees it. "Personal" is an explicit choice rather than a blank,
              because for an Airbnb host with three listings, silently defaulting to no
              property is how a booking ends up filed against nothing. */}
          {properties.length > 0 && <div><h2 className="font-display text-xl font-bold mb-2">Which property?</h2><div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setPropertyId(null)} aria-pressed={propertyId === null} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${propertyId === null ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>Personal</button>
            {properties.map((property) => (
              <button key={property.id} type="button" onClick={() => setPropertyId(property.id)} aria-pressed={propertyId === property.id} className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${propertyId === property.id ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{property.name}</button>
            ))}
          </div></div>}

          {allowsMultipleWorkers(active) && <div><h2 className="font-display text-xl font-bold mb-2">How many Xooters?</h2><div className="flex items-center gap-3"><button onClick={() => setWorkerCount(Math.max(1, workerCount - 1))} className="h-9 w-9 rounded-full border grid place-items-center"><Minus className="h-4 w-4" /></button><span className="font-display text-2xl font-bold w-8 text-center">{workerCount}</span><button onClick={() => setWorkerCount(Math.min(5, workerCount + 1))} className="h-9 w-9 rounded-full border grid place-items-center"><Plus className="h-4 w-4" /></button></div></div>}
          <Button onClick={() => setStep(1)} className="w-full rounded-2xl h-12 font-semibold">Next <ArrowRight className="h-4 w-4 ml-1" /></Button>
        </div>
      )}

      {step === 1 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-5 md:p-7 space-y-5">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-display text-xl font-bold">Visit details</h2>
              <p className="text-sm text-muted-foreground">Choose the time you want reserved before adding extras.</p>
            </div>
            <div className="rounded-2xl bg-muted/45 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Estimated visit: </span>
              <span className="font-semibold text-foreground">{estHours}h</span>
            </div>
          </div>

          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="font-semibold">Reserve the right amount of time</h3>
                <p className="text-xs text-muted-foreground">Choose the visit shape first. Extras and home size refine the estimate below.</p>
              </div>
              <span className="inline-flex w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{length.badge}</span>
            </div>
            <div className="xoot-duration-grid grid gap-3">
              {SERVICE_LENGTHS.map((option) => {
                const selected = serviceLength === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setServiceLength(option.id)}
                    data-selected={selected ? "true" : "false"}
                    className="xoot-duration-card liquid-glass-interactive interactive-press rounded-[1.35rem] border border-border p-4 text-left transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-bold">{option.label}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{option.desc}</p>
                      </div>
                      {selected ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <span className="rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold text-foreground">{option.badge}</span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-foreground">{option.hours} reserved hours</p>
                      <p className="text-xs text-muted-foreground">{optionBase(option.id)} base</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-semibold">Home size</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {HOME_SIZES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setHomeSize(s.id)}
                  className={`rounded-2xl border p-4 text-left transition ${homeSize === s.id ? "border-foreground bg-foreground text-background" : "border-border bg-muted/35 hover:bg-muted"}`}
                >
                  <p className="font-semibold">{s.label}</p>
                  <p className="text-xs opacity-80">{s.desc}</p>
                  <p className="mt-3 text-xs opacity-70">Base from {formatZAR(s.price)}</p>
                </button>
              ))}
            </div>
          </section>

          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <div>
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 h-12 rounded-2xl" />
            </div>
            <div>
              <Label>Arrival time</Label>
              <div className="mt-1 space-y-2 rounded-2xl border border-border bg-muted/25 p-3">
                {TIME_GROUPS.map((group) => (
                  <div key={group.label} className="grid gap-2 sm:grid-cols-[76px_1fr] sm:items-center">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTime(slot)}
                          className={`h-9 rounded-full px-3 text-sm font-semibold transition ${time === slot ? "bg-foreground text-background shadow-card" : "bg-background text-foreground hover:bg-secondary"}`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/*
            The kit's ChipGrid, in place of the hand-rolled one that was here. Same behaviour,
            two things gained: the chips now carry `aria-pressed`, so a screen reader can say
            which extras are chosen rather than reading four identical buttons, and they render
            from `--xoot-*` so they follow the kit rather than diverging from it the next time
            either is touched.
          */}
          <section>
            <h3 className="font-semibold mb-2">Extra tasks</h3>
            <ChipGrid
              label="Extra tasks"
              options={EXTRAS}
              value={Array.from(extras)}
              onChange={(next) => setExtras(new Set(next))}
            />
          </section>
          <div className="grid gap-3">
            <Label>Your address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full street address in Sandton, Midrand, Rosebank..." className="h-12 rounded-2xl" />
            <div className={`xoot-map-context rounded-2xl border p-3 text-sm ${address.trim() && !inLaunchRegion ? "border-destructive/35" : "border-border"}`}>
              <div className="flex items-start gap-2">
                <MapPin className={`mt-0.5 h-4 w-4 shrink-0 ${address.trim() && !inLaunchRegion ? "text-destructive" : "text-sage-deep"}`} />
                <div>
                  <p className="font-semibold text-foreground">
                    {address.trim()
                      ? inLaunchRegion
                        ? "Launch coverage confirmed"
                        : "Coverage review needed"
                      : "Map-aware coverage context"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {address.trim()
                      ? inLaunchRegion
                        ? "Xoot uses this area context to plan a calmer arrival."
                        : "Use one of the approved launch suburbs so Xoot can match the right nearby Xooter."
                      : "Add the address now — your Xooter's arrival window is confirmed before dispatch."}
                  </p>
                </div>
              </div>
            </div>
          </div>
          {householdNotes && <div className="rounded-2xl bg-accent-soft border border-accent/20 p-4 text-xs text-muted-foreground"><p className="font-semibold text-foreground mb-1">Household profile applied</p><pre className="whitespace-pre-wrap font-sans">{householdNotes}</pre></div>}
          <div><Label>Specific instructions</Label><Textarea rows={4} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Keys, dogs, product preferences, fragile areas" /></div>
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(0)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button><Button onClick={() => validateStep() && setStep(2)} className="flex-1 rounded-2xl h-12 font-semibold">Choose a Xooter <ArrowRight className="h-4 w-4 ml-1" /></Button></div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <div><h2 className="font-display text-2xl font-bold">Choose your Xooter{maxPick > 1 ? "s" : ""}</h2><p className="text-sm text-muted-foreground">{picked.length}/{maxPick} selected - low reliability contractors are automatically ranked lower</p></div>
          {loadingXooters ? (
            <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : xooters.length === 0 ? (
            <Card className="rounded-3xl p-8 text-center">
              <ShieldCheck className="h-8 w-8 text-sage-deep mx-auto mb-3" />
              <h3 className="font-display text-xl font-bold mb-2">No approved Xooters available yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Xooters appear here only after verification, training, and activation. Please try another time or contact support for launch-area availability.
              </p>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{xooters.map((z) => <div key={z.id} className={picked.some((p) => p.id === z.id) ? "ring-2 ring-primary rounded-3xl" : ""}><XooterCard z={z} onBook={() => selectWorker(z)} /></div>)}</div>
          )}
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(1)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button><Button onClick={() => validateStep() && setStep(3)} disabled={picked.length === 0} className="flex-1 rounded-2xl h-12 font-semibold">Review booking <ArrowRight className="h-4 w-4 ml-1" /></Button></div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-5 md:p-7 space-y-5">
          <h2 className="font-display text-2xl font-bold">Price breakdown</h2>
          <div className="space-y-2 text-sm"><div className="flex justify-between"><span>Booking cost ({length.label}, {size.label}{totalWorkers > 1 ? ` x ${totalWorkers}` : ""})</span><span className="font-semibold">{formatZAR(totalPrice)}</span></div><div className="flex justify-between text-muted-foreground"><span>Reserved time</span><span>{estHours}h including add-ons</span></div>{discount > 0 && <div className="flex justify-between text-sage-deep"><span>Multi-worker discount</span><span>{Math.round(discount * 100)}%</span></div>}{highDemandPremium > 0 && <div className="flex justify-between"><span>High-demand slot premium</span><span>{formatZAR(highDemandPremium)}</span></div>}<div className="flex justify-between"><span>Booking cover</span><span>{formatZAR(bookingCover)}</span></div><div className="flex justify-between"><span>{carePlusMember ? "Booking fee — waived with Care+" : "Booking fee"}</span><span>{formatZAR(serviceFee)}</span></div><div className="h-px bg-border my-2" /><div className="flex justify-between font-display text-lg font-bold"><span>Total pending</span><span>{formatZAR(bookingTotal)}</span></div></div>
          <button type="button" onClick={() => setBookingCoverOptIn((value) => !value)} className={`w-full rounded-2xl border p-4 text-left ${bookingCoverOptIn ? "border-primary bg-primary/10" : "border-border bg-muted/40"}`}>
            <p className="font-semibold">Booking cover {bookingCoverOptIn ? "included" : "not included"}</p>
            <p className="text-xs text-muted-foreground">Keeps a support record and admin queue available for booking issues. Payment stays pending until confirmed.</p>
          </button>
          {photoRequired && <div className="rounded-2xl bg-primary/10 border border-primary/20 p-4 flex items-start gap-3"><ShieldCheck className="h-5 w-5 text-primary mt-0.5" /><p className="text-sm">This service requires before and after completion photos to reduce disputes and verify quality.</p></div>}
          <div className="rounded-2xl bg-muted/40 p-4 text-sm space-y-1"><p><span className="text-muted-foreground">Service:</span> <span className="capitalize font-medium">{active}</span></p><p><span className="text-muted-foreground">Length:</span> {length.label} - {estHours}h reserved</p><p><span className="text-muted-foreground">Date:</span> {new Date(date).toLocaleDateString("en-ZA")} at {time}</p><p><span className="text-muted-foreground">Xooter:</span> {picked.map((z) => z.name).join(", ")}</p></div>
          <div className="rounded-2xl border border-border bg-muted/40 p-4 space-y-2">
            <label htmlFor="referral-code" className="text-sm font-semibold">Referral code <span className="font-normal text-muted-foreground">(optional)</span></label>
            <input
              id="referral-code"
              value={referralCode}
              onChange={(event) => {
                // Uppercased on entry because the issued codes are uppercase and someone
                // retyping one from a WhatsApp message will not be. The server uppercases too;
                // this is so the field shows the customer the form that will actually be sent.
                setReferralCode(event.target.value.toUpperCase());
                setReferralError(null);
              }}
              maxLength={40}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={referralError ? true : undefined}
              aria-describedby="referral-code-help"
              className={`w-full rounded-xl border bg-background px-3 py-2 text-sm uppercase tracking-wide ${referralError ? "border-destructive" : "border-border"}`}
              placeholder="Enter a friend's code"
            />
            <p id="referral-code-help" className="text-xs text-muted-foreground">
              {referralError
                ? referralError
                : "Applied by Xoot when your booking is created. The credit comes off the cleaning, not the booking fee or the cover, so your total here may drop once it is confirmed."}
            </p>
          </div>
          <div className="flex gap-2"><Button variant="ghost" onClick={() => setStep(2)}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button><Button onClick={handleBook} disabled={submitting} className="flex-1 rounded-2xl h-12 font-semibold">{submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Confirm booking <ArrowRight className="h-4 w-4 ml-1" /></>}</Button></div>
        </div>
      )}

      {step === 4 && (
        <div className="rounded-3xl bg-card border border-border shadow-soft p-8 text-center space-y-5">
          <div className="grid place-items-center h-16 w-16 rounded-full bg-sage/15 mx-auto"><Sparkles className="h-8 w-8 text-sage-deep" /></div>
          <h2 className="font-display text-3xl font-bold">{paymentRecordId ? "Almost there — one payment left" : "Booking request received"}</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            {paymentRecordId
              ? "Your booking is held at the price you were shown. Pay to confirm it and we will assign your Xooter."
              : "Nothing has been charged. Xoot confirms your payment before your Xooter is assigned, and your booking stays pending until then."}
          </p>
          {bookingStatus && <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 text-primary px-4 py-2 text-sm font-semibold">Status: <span className="capitalize">{bookingStatus.replace(/_/g, " ")}</span></div>}

          {/*
            Until this existed, step 4 was where the journey stopped: a draft was created and the
            customer was told payment happens "from the provider webhook", with no way to trigger
            one. The amount charged is the SERVER's, read from `payment_records` — the client never
            sends a price, which is what keeps the screen and the charge in agreement.
          */}
          {paymentRecordId && bookingStatus === "draft" && (
            <div className="mx-auto max-w-sm">
              <PayFastCheckout
                paymentRecordId={paymentRecordId}
                label={paymentRecordCount === 1 ? `Pay ${formatZAR(bookingTotal)}` : "Pay for your first visit"}
              />
              {paymentRecordCount > 1 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  This booking has {paymentRecordCount} visits. You are paying for the first one now; the rest are payable from the booking.
                </p>
              )}
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={() => { setStep(0); setPicked([]); setBookingId(null); setBookingStatus(null); setPaymentRecordId(null); setPaymentRecordCount(0); }} variant="outline" className="rounded-full">Book another</Button>
            <Button asChild variant={paymentRecordId ? "outline" : "default"} className={paymentRecordId ? "rounded-full" : "rounded-full gradient-warm"}><a href={bookingId ? `/app/bookings/${bookingId}` : "/app/bookings"}>View booking</a></Button>
          </div>
        </div>
      )}

      {step < 3 && (
        <div className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur-lg shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.15)]" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="container flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Estimate</p>
              <p className="font-display text-lg font-bold leading-tight truncate">{formatZAR(bookingTotal)}</p>
              <p className="text-[11px] text-muted-foreground truncate">{estHours}h · {length.label}</p>
            </div>
            <Button
              onClick={() => {
                if (step === 0) setStep(1);
                else if (step === 1 && validateStep()) setStep(2);
                else if (step === 2 && validateStep()) setStep(3);
              }}
              disabled={step === 2 && picked.length === 0}
              className="rounded-2xl h-12 px-5 gradient-warm font-semibold shrink-0"
            >
              {step === 2 ? "Review" : "Continue"} <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Book;
