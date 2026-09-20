import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { XooterCard, Xooter } from "@/components/xoot/XooterCard";
import { Logo } from "@/components/kit/Logo";
import { loadXooterDirectory } from "@/lib/xooter-directory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Home as HomeIcon, Building2, BedDouble, Sparkles, ArrowRight, ArrowLeft, Loader2, Plus, Minus, ShieldCheck, Repeat, Truck, TimerReset, MapPin, Check, WashingMachine } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
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
import "@/styles/auth-booking.css";

const services = [
  { id: "residential", label: "Regular", icon: HomeIcon, available: true },
  { id: "airbnb", label: "Airbnb turnover", icon: BedDouble },
  { id: "express", label: "Express", icon: TimerReset },
  { id: "office", label: "Office / commercial", icon: Building2 },
  { id: "moving", label: "Moving clean", icon: Truck },
  { id: "laundry", label: "Laundry & ironing", icon: WashingMachine, available: false },
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
  const navigate = useNavigate();
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
  const [xooterLoadError, setXooterLoadError] = useState(false);
  const [rosterAttempt, setRosterAttempt] = useState(0);
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
    if (step !== 3) return;
    let mounted = true;
    setLoadingXooters(true);
    setXooterLoadError(false);

    const applyResults = (rows: Xooter[]) => {
      if (!mounted) return;
      const preferred = preferredXooterId ? rows.find((z) => z.id === preferredXooterId) : null;
      setXooters(rows);
      if (preferred) setPicked((current) => current.some((z) => z.id === preferred.id) ? current : [preferred]);
      setLoadingXooters(false);
    };

    const fallback = async () => {
      try {
        const { xooters: roster } = await loadXooterDirectory();
        applyResults(sortXootersForMarketplace(roster));
      } catch {
        if (mounted) {
          setXooters([]);
          setXooterLoadError(true);
          setLoadingXooters(false);
        }
      }
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
        if (!Array.isArray(ranked)) throw new Error("Invalid matching response");
        applyResults(ranked);
      } catch (err) {
        console.warn("proximity matching unavailable; falling back to the plain roster", err);
        await fallback();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [step, preferredXooterId, address, rosterAttempt]);

  useEffect(() => {
    if (!bookingId) return;
    const channel = supabase.channel(`booking-${bookingId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings", filter: `id=eq.${bookingId}` }, (payload: any) => setBookingStatus(payload.new.status))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [bookingId]);


  const validateStep = () => {
    if (active === "laundry") { toast.error("Laundry bookings are not available yet."); return false; }
    if (step === 1 && !address.trim()) { toast.error("Please enter your address"); return false; }
    if (step === 1 && !isApprovedLaunchRegion(address)) { toast.error("Xoot is currently available in the approved launch suburbs only."); return false; }
    if (step === 2 && (!isSafeDate(date) || !time || new Date(`${date}T${time}:00`).getTime() <= Date.now())) { toast.error("Choose a future date and arrival time."); return false; }
    if (step === 2 && !isPriced(priced)) { toast.error("Choose a visit length available for this service."); return false; }
    if (step === 3 && picked.length !== (allowsMultipleWorkers(active) ? workerCount : 1)) { toast.error("Select the required number of Xooters."); return false; }
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
    setStep(5);
  };

  const maxPick = allowsMultipleWorkers(active) ? workerCount : 1;
  const stepNames = ["Service", "Home", "When", "Xooter", "Review"];
  const nextStep = () => { if (validateStep()) setStep((value) => Math.min(value + 1, 4)); };
  const back = () => step === 0 ? navigate("/") : setStep((value) => value - 1);

  return (
    <div className="xoot-booking-page">
      {assistantStarted && <p className="xoot-booking-callout"><Sparkles aria-hidden="true" />Your {activeServiceLabel.toLowerCase()} selection is ready. Review the details before booking.</p>}
      <div className="xoot-booking-frame">
        <header className="xoot-booking-head">
          {step < 5 && <button type="button" className="xoot-booking-back" aria-label={step === 0 ? "Close booking" : "Back"} onClick={back}><ArrowLeft /></button>}
          <ol className="xoot-booking-steps" aria-label="Booking progress">
            {stepNames.map((name, index) => <li key={name} className={`xoot-booking-step ${index === step ? "is-active" : index < step ? "is-done" : ""}`} aria-current={step === index ? "step" : undefined}>
              {index > 0 && <span className={`xoot-booking-connector ${index <= step ? "is-done" : ""}`} aria-hidden="true" />}
              <i aria-hidden="true">{index < step ? <Check size={13} /> : index + 1}</i><span>{name}</span>
            </li>)}
          </ol>
          <Logo className="xoot-booking-logo" size={20} tone="violet" />
        </header>
        <div className="xoot-booking-body">
          {step === 0 && <>
            <h1>What needs doing?</h1><p className="xoot-booking-lede">Pick one. You can add extras in a moment.</p>
            <div className="xoot-booking-grid">
              {services.map(({ id, label, icon: Icon }) => <button key={id} type="button" disabled={id === "laundry"} aria-pressed={active === id} onClick={() => { setActive(id); setPicked([]); if (!allowsMultipleWorkers(id)) setWorkerCount(1); }} className={`xoot-booking-choice ${active === id ? "is-selected" : ""}`}><span className="xoot-booking-choice-icon"><Icon /></span><span>{label}</span>{id === "laundry" && <small>Not available yet</small>}</button>)}
            </div>
          </>}
          {step === 1 && <>
            <h1>Tell us about the place.</h1><p className="xoot-booking-lede">A little context helps us plan the right visit.</p>
            <div className="xoot-booking-stack">
              {properties.length > 0 && <fieldset><legend className="xoot-booking-label">Which property?</legend><div className="xoot-booking-pills"><button type="button" className={`xoot-booking-pill ${!propertyId ? "is-selected" : ""}`} aria-pressed={!propertyId} onClick={() => setPropertyId(null)}>Personal</button>{properties.map((property) => <button key={property.id} type="button" className={`xoot-booking-pill ${propertyId === property.id ? "is-selected" : ""}`} aria-pressed={propertyId === property.id} onClick={() => setPropertyId(property.id)}>{property.name}</button>)}</div></fieldset>}
              <fieldset><legend className="xoot-booking-label">Home size</legend><div className="xoot-booking-cards">{HOME_SIZES.map((item) => <button key={item.id} type="button" className={`xoot-booking-card ${homeSize === item.id ? "is-selected" : ""}`} aria-pressed={homeSize === item.id} onClick={() => setHomeSize(item.id)}><strong>{item.label}</strong><span>{item.desc}</span></button>)}</div></fieldset>
              <label className="xoot-booking-field">Address<Input autoComplete="street-address" value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Full street address and suburb" /></label>
              <div className={`xoot-booking-map-note ${address.trim() && !inLaunchRegion ? "is-error" : ""}`}><MapPin /><p>{address.trim() ? inLaunchRegion ? "This address mentions a launch suburb. Exact coverage and availability are confirmed before dispatch." : "This address is outside our listed launch suburbs. Check the suburb before continuing." : "Enter the address where the clean will take place."}</p></div>
              <fieldset><legend className="xoot-booking-label">Extra tasks</legend><div className="xoot-booking-pills">{EXTRAS.map((extra) => <button key={extra} type="button" aria-pressed={extras.has(extra)} className={`xoot-booking-pill ${extras.has(extra) ? "is-selected" : ""}`} onClick={() => setExtras((previous) => { const next = new Set(previous); if (next.has(extra)) next.delete(extra); else next.add(extra); return next; })}>{extra}</button>)}</div></fieldset>
              {householdNotes && <div className="xoot-booking-callout"><HomeIcon /><p style={{ whiteSpace: "pre-wrap" }}>{householdNotes}</p></div>}
              <label className="xoot-booking-field">Anything we should know?<Textarea rows={3} value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Pets, parking, products or fragile areas" /></label>
            </div>
          </>}
          {step === 2 && <>
            <h1>When works for you?</h1><p className="xoot-booking-lede">Choose a date, arrival time and visit length.</p>
            <div className="xoot-booking-stack">
              <fieldset><legend className="xoot-booking-label">Visit length</legend><div className="xoot-booking-cards">{SERVICE_LENGTHS.map((item) => { const available = optionBase(item.id) !== "—"; return <button key={item.id} type="button" disabled={!available} aria-pressed={serviceLength === item.id} className={`xoot-booking-card ${serviceLength === item.id ? "is-selected" : ""}`} onClick={() => setServiceLength(item.id)}><strong>{item.label}</strong><span>{item.hours} hours</span><span>{available ? item.desc : "Not available for this service"}</span></button>; })}</div></fieldset>
              <label className="xoot-booking-field">Date<Input type="date" min={new Date().toLocaleDateString("en-CA")} value={date} onChange={(event) => setDate(event.target.value)} /></label>
              <fieldset><legend className="xoot-booking-label">Arrival time</legend><div className="xoot-booking-stack">{TIME_GROUPS.map((group) => <div key={group.label}><p className="xoot-booking-label">{group.label}</p><div className="xoot-booking-pills">{group.slots.map((slot) => <button key={slot} type="button" className={`xoot-booking-pill ${time === slot ? "is-selected" : ""}`} aria-pressed={time === slot} onClick={() => setTime(slot)}>{slot}</button>)}</div></div>)}</div></fieldset>
              <fieldset><legend className="xoot-booking-label">How often?</legend><div className="xoot-booking-cards">{(["one_time", "repeat"] as const).map((item) => <button key={item} type="button" className={`xoot-booking-card ${frequency === item ? "is-selected" : ""}`} aria-pressed={frequency === item} onClick={() => setFrequency(item)}><strong>{item === "one_time" ? "Just this once" : "Repeat weekly"}</strong><span>{item === "one_time" ? "One visit" : "Review the series before confirming"}</span></button>)}</div></fieldset>
              {smartSuggestion && <p className="xoot-booking-callout"><Repeat />{smartSuggestion}</p>}
              {allowsMultipleWorkers(active) && <fieldset><legend className="xoot-booking-label">How many Xooters?</legend><div className="xoot-booking-pills"><button type="button" aria-label="Fewer Xooters" disabled={workerCount <= 1} className="xoot-booking-pill" onClick={() => { setWorkerCount(Math.max(1, workerCount - 1)); setPicked([]); }}><Minus size={16} /></button><output aria-live="polite">{workerCount}</output><button type="button" aria-label="More Xooters" disabled={workerCount >= 5} className="xoot-booking-pill" onClick={() => { setWorkerCount(Math.min(5, workerCount + 1)); setPicked([]); }}><Plus size={16} /></button></div></fieldset>}
            </div>
          </>}
          {step === 3 && <>
            <h1>Choose your Xooter{maxPick > 1 ? "s" : ""}.</h1><p className="xoot-booking-lede">{picked.length} of {maxPick} selected. Listings come from the approved Xooter roster.</p>
            {loadingXooters ? <div className="xoot-booking-empty" role="status"><Loader2 className="animate-spin" /><p>Loading Xooters…</p></div> : xooterLoadError ? <div className="xoot-booking-empty" role="alert"><ShieldCheck /><h2>Availability could not be loaded</h2><p>Please try again to check the current Xooter roster.</p><Button variant="outline" onClick={() => setRosterAttempt((attempt) => attempt + 1)}>Try again</Button></div> : xooters.length === 0 ? <div className="xoot-booking-empty" role="status"><ShieldCheck /><h2>No approved Xooters available yet</h2><p>Please try another time or contact support for launch-area availability.</p><Button variant="outline" onClick={() => navigate("/app/support")}>Contact support</Button></div> : <div className="xoot-booking-worker-grid">{xooters.map((xooter) => <div key={xooter.id} className={picked.some((person) => person.id === xooter.id) ? "is-selected" : ""}><XooterCard z={xooter} onBook={() => selectWorker(xooter)} /></div>)}</div>}
          </>}
          {step === 4 && <>
            <h1>Everything look right?</h1><p className="xoot-booking-lede">Review the details and total before creating your booking.</p>
            <div className="xoot-booking-stack">
              <div className="xoot-booking-summary"><div className="xoot-booking-summary-row"><span>Service</span><span>{activeServiceLabel}</span></div><div className="xoot-booking-summary-row"><span>Address</span><span>{address}</span></div><div className="xoot-booking-summary-row"><span>Date and arrival</span><span>{new Date(`${date}T00:00:00`).toLocaleDateString("en-ZA")} · {time}</span></div><div className="xoot-booking-summary-row"><span>Reserved time</span><span>{estHours}h, including extras</span></div><div className="xoot-booking-summary-row"><span>Xooters</span><span>{picked.map((person) => person.name).join(", ")}</span></div><div className="xoot-booking-summary-row"><span>Clean and extras</span><span>{formatZAR(totalPrice)}</span></div>{discount > 0 && <div className="xoot-booking-summary-row"><span>Multi-worker discount included</span><span>{Math.round(discount * 100)}%</span></div>}{highDemandPremium > 0 && <div className="xoot-booking-summary-row"><span>High-demand slot premium</span><span>{formatZAR(highDemandPremium)}</span></div>}<div className="xoot-booking-summary-row"><span>Booking cover</span><span>{formatZAR(bookingCover)}</span></div><div className="xoot-booking-summary-row"><span>{carePlusMember ? "Booking fee waived with Care+" : "Booking fee"}</span><span>{formatZAR(serviceFee)}</span></div><div className="xoot-booking-summary-row is-total"><span>Total pending</span><span>{formatZAR(bookingTotal)}</span></div></div>
              <button type="button" className={`xoot-booking-cover ${bookingCoverOptIn ? "is-selected" : ""}`} aria-pressed={bookingCoverOptIn} onClick={() => setBookingCoverOptIn(!bookingCoverOptIn)}><i>{bookingCoverOptIn && <Check size={16} />}</i><span><strong>Booking cover {bookingCoverOptIn ? "included" : "not included"}</strong><small>Support and review for booking issues. This is not an insurance policy.</small></span></button>
              {photoRequired && <p className="xoot-booking-callout"><ShieldCheck />This service requires before and after completion photos.</p>}
              <label htmlFor="referral-code" className="xoot-booking-field">Referral code (optional)<Input id="referral-code" value={referralCode} onChange={(event) => { setReferralCode(event.target.value.toUpperCase()); setReferralError(null); }} maxLength={40} autoComplete="off" spellCheck={false} aria-invalid={Boolean(referralError)} aria-describedby="referral-code-help" placeholder="Enter a friend’s code" /></label><p id="referral-code-help" className="xoot-booking-lede">{referralError || "Xoot checks referral eligibility before applying credit. No referral discount is included in the estimate above."}</p>
            </div>
          </>}
          {step === 5 && <div className="xoot-booking-success"><ShieldCheck /><h1>{paymentRecordId ? "One payment left." : "Booking request received."}</h1><p>Nothing has been charged by this page. Your booking remains pending until payment is confirmed.</p>{bookingStatus && <span className="xoot-booking-status">{bookingStatus.replace(/_/g, " ")}</span>}{paymentRecordId && bookingStatus === "draft" && <PayFastCheckout paymentRecordId={paymentRecordId} label={paymentRecordCount === 1 ? "Continue to payment" : "Pay for your first visit"} />}{paymentRecordCount > 1 && <p>This request contains {paymentRecordCount} payment records. Remaining visits are payable from your bookings.</p>}<div className="xoot-booking-pills"><Button variant="outline" onClick={() => { setStep(0); setPicked([]); setBookingId(null); setBookingStatus(null); setPaymentRecordId(null); setPaymentRecordCount(0); }}>Book another</Button><Button onClick={() => navigate(bookingId ? `/app/bookings/${bookingId}` : "/app/bookings")}>View booking</Button></div></div>}
        </div>
        {step < 5 && <footer className="xoot-booking-footer"><p>Step {step + 1} of {stepNames.length}</p><div className="xoot-booking-footer-actions"><Button variant="ghost" onClick={back}>Back</Button><Button className="xoot-booking-continue" onClick={step === 4 ? handleBook : nextStep} disabled={submitting || active === "laundry" || (step === 3 && picked.length !== maxPick) || (step >= 2 && !isPriced(priced))}>{submitting ? <Loader2 className="animate-spin" /> : step === 4 ? "Confirm booking" : "Continue"}<ArrowRight /></Button></div></footer>}
      </div>
    </div>
  );
};

export default Book;
