import { Fragment, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BedDouble, BriefcaseBusiness, Building2, Check, Clock3, House, Loader2, Minus, Plus, ShieldCheck, Sparkles, Truck, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/kit/Logo";
import { VerifiedAddressInput } from "@/components/xoot/VerifiedAddressInput";
import { SuburbPicker } from "@/components/xoot/SuburbPicker";
import { InteractiveServiceAreaMap } from "@/components/xoot/InteractiveServiceAreaMap";
import { ServiceIcon } from "@/components/kit/ServiceIcon";
import { Button } from "@/components/ui/button";
import { loadXooterDirectory, type XooterDirectory } from "@/lib/xooter-directory";
import { isApprovedLaunchRegion } from "@/lib/operations";
import { BOOKING_ADD_ONS, bookingVisitDurationHours, type BookingQuoteInput, type BookingService } from "@/lib/booking-contract";
import {
  BOOKING_SERVICE_DETAILS, BOOKING_PROPERTY_LABELS, BOOKING_FREQUENCY_LABELS, BOOKING_LINEN_LABELS,
  BOOKING_REFERRAL_MESSAGES, bookingServiceFromParam, createBookingInput, bookingDateInSast,
  bookingWeekday, repeatDaysForNewDate, bookingHomeSize, bookingCrewCap, bookingExtrasFor, bookingStartSlots, bookingServiceForProperty,
  changeBookingService, formatBookingMoney, readBookingQuoteResponse, type BookingQuoteResponse,
} from "@/lib/booking-flow";
import "@/styles/auth-booking.css";

const stepNames = ["Service", "Your home", "When", "Your Xooter", "Confirm"];
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const orderedServices = ["regular", "airbnb", "express", "office", "moving"] as const;
const websiteServices = ["regular", "airbnb", "office", "express", "moving"] as const;
const websiteSteps = ["Service", "Your place", "When", "Xooter", "Confirm"];
const homeSizes = [
  { id: "small", label: "Small", detail: "Studio or 1 bedroom", bedrooms: 1, hours: 4 },
  { id: "medium", label: "Medium", detail: "2–3 bedrooms", bedrooms: 2, hours: 5.5 },
  { id: "large", label: "Large", detail: "4+ bedrooms", bedrooms: 4, hours: 8 },
] as const;
const propertyIcons = { flat: Building2, house: House, townhouse: Users, airbnb: BedDouble, office: BriefcaseBusiness, empty: Truck };
const websitePropertyLabels = { flat: "Flat or apartment", house: "House", townhouse: "Townhouse or complex", airbnb: "Short-stay rental", office: "Office or commercial", empty: "Empty — moving in or out" };
const safePrefill = (value: string | null) => [...(value ?? "")].filter(char => char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127).join("").slice(0, 240);
const validDate = (value: string | null): value is string => Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value);

function Stepper({ label, value, min = 0, max, step = 1, onChange, description }: {
  label: string; value: number; min?: number; max: number; step?: number; onChange: (value: number) => void; description?: string;
}) {
  return <div className="xoot-booking-stepper">
    <span><strong>{label}</strong>{description && <small>{description}</small>}</span>
    <div><button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - step)}><Minus size={16} /></button>
      <output aria-label={label}>{value}</output><button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + step)}><Plus size={16} /></button></div>
  </div>;
}

export function BookingFlow({ buyerId, variant = "app", initialAddress = "" }: {
  buyerId: string | null; variant?: "app" | "website"; initialAddress?: string;
}) {
  const website = variant === "website";
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    if (!params.has("address") && !params.has("area")) return;
    const clean = new URLSearchParams(params);
    clean.delete("address"); clean.delete("area");
    setParams(clean, { replace: true });
  }, [params, setParams]);
  const [step, setStep] = useState(0);
  const [serviceChosen, setServiceChosen] = useState(!website || Boolean(params.get("service")));
  const [input, setInput] = useState<BookingQuoteInput>(() => {
    const draft = createBookingInput(bookingServiceFromParam(params.get("service")));
    draft.homeSize = bookingHomeSize(2, 1);
    if (draft.service === "regular") draft.hours = 5.5;
    const date = params.get("date");
    if (validDate(date) && date >= bookingDateInSast()) draft.date = date;
    const frequency = params.get("frequency");
    if (frequency === "once" || frequency === "weekly" || frequency === "fortnightly") {
      draft.frequency = frequency;
      draft.repeatDays = frequency === "once" ? [] : [bookingWeekday(draft.date)];
    } else {
      // The date may have come from a deep link. Keep the default single
      // weekly repeat on that date's weekday, not yesterday's weekday.
      draft.repeatDays = [bookingWeekday(draft.date)];
    }
    return draft;
  });
  const [bedrooms, setBedrooms] = useState(2);
  const [bathrooms, setBathrooms] = useState(1);
  const [address, setAddress] = useState(() => safePrefill(initialAddress || params.get("address") || params.get("area")));
  const [showAreaMap, setShowAreaMap] = useState(false);
  const [coverageCheck, setCoverageCheck] = useState<{
    key: string; status: "loading" | "in_zone" | "review" | "error"; message: string;
  } | null>(null);
  const [suburb, setSuburb] = useState("");
  const [notes, setNotes] = useState("");
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [propertyId, setPropertyId] = useState("");
  const [savedDetailsError, setSavedDetailsError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [roster, setRoster] = useState<XooterDirectory["xooters"]>([]);
  const [rosterStatus, setRosterStatus] = useState<"loading" | "ready" | "error">("loading");
  const [rosterAttempt, setRosterAttempt] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const preferredApplied = useRef(false);
  const [quoteAttempt, setQuoteAttempt] = useState(0);
  const [quoteState, setQuoteState] = useState<{ key: string; result?: BookingQuoteResponse; error?: string; loading: boolean }>({ key: "", loading: false });
  const [acceptedFingerprint, setAcceptedFingerprint] = useState<string | null>(null);
  const addressEdited = useRef(Boolean(address));
  const requestVersion = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const quoteKey = JSON.stringify(input);
  const quote = quoteState.key === quoteKey ? quoteState.result?.quote : undefined;
  const quoteLoading = quoteState.key !== quoteKey || quoteState.loading;
  const actualService = bookingServiceForProperty(input);
  const service = BOOKING_SERVICE_DETAILS[actualService];
  const extras = bookingExtrasFor(actualService);
  const maxCrew = bookingCrewCap(actualService, input.homeSize);
  const slots = bookingStartSlots(input);
  const correctedService = input.propertyType === "office" ? "office" : input.propertyType === "airbnb" ? "airbnb" : input.propertyType === "empty" ? "moving" : null;
  const mismatch = correctedService && correctedService !== input.service ? correctedService : null;
  const fullAddress = [address.trim(), suburb].filter(Boolean).join(", ");
  const coverageKey = JSON.stringify([fullAddress, actualService]);
  // Only show a verdict for the exact current address/service. Editing either
  // invalidates the result instantly without retaining a private geocode.
  const visibleCoverage = coverageCheck?.key === coverageKey ? coverageCheck : null;
  const checkGeoCoverage = async () => {
    if (!buyerId) {
      setCoverageCheck({ key: coverageKey, status: "error", message: "Sign in to check a precise service address." });
      return;
    }
    if (!fullAddress.trim()) {
      setCoverageCheck({ key: coverageKey, status: "review", message: "Enter a full service address first." });
      return;
    }
    setCoverageCheck({ key: coverageKey, status: "loading", message: "Checking the approved operating area…" });
    try {
      const { data, error: failure } = await supabase.functions.invoke("check-service-coverage", {
        body: { address: fullAddress, service: actualService },
      });
      const response = data as {
        success?: unknown; data?: { state?: unknown; zoneName?: unknown; reason?: unknown };
      } | null;
      if (failure || response?.success !== true) {
        setCoverageCheck({ key: coverageKey, status: "error", message: "Location verification is temporarily unavailable. Contact Xoot to confirm." });
      } else if (response.data?.state === "available") {
        setCoverageCheck({ key: coverageKey, status: "in_zone",
          message: "Address is inside an approved service area. Xooter availability for your date is confirmed separately." });
      } else {
        setCoverageCheck({ key: coverageKey, status: "review",
          message: "We cannot verify coverage automatically. Please request a manual area review." });
      }
    } catch {
      setCoverageCheck({ key: coverageKey, status: "error", message: "Unable to confirm this address. Manual review remains available." });
    }
  };
  const days = Array.from({ length: 14 }, (_, i) => bookingDateInSast(Date.now(), i + 1));

  const updateInput = (patch: Partial<BookingQuoteInput>) => {
    requestVersion.current += 1; setAcceptedFingerprint(null); setError(null);
    setInput(previous => ({ ...previous, ...patch }));
  };
  const chooseService = (value: BookingService) => {
    setServiceChosen(true);
    requestVersion.current += 1; setAcceptedFingerprint(null); setSelectedIds([]); setError(null);
    setInput(previous => changeBookingService(previous, value));
  };
  const chooseProperty = (propertyType: BookingQuoteInput["propertyType"]) => {
    const resolved = bookingServiceForProperty({ service: input.service, propertyType });
    const compatible = bookingExtrasFor(resolved);
    updateInput({ propertyType, addOns: input.addOns.filter(id => compatible.includes(id)),
      linen: resolved === "airbnb" ? input.linen ?? "none" : null,
      crewSize: Math.min(input.crewSize, bookingCrewCap(resolved, input.homeSize)),
      time: resolved === "airbnb" && input.time > "14:00" ? "08:00" : input.time });
    setSelectedIds([]);
  };
  const chooseRooms = (beds: number, baths: number) => {
    const size = bookingHomeSize(beds, baths);
    setBedrooms(beds); setBathrooms(baths); setSelectedIds([]);
    updateInput({ homeSize: size, hours: input.service === "regular" ? ({ small: 4, medium: 5.5, large: 8 } as const)[size] : input.hours,
      crewSize: Math.min(input.crewSize, bookingCrewCap(actualService, size)) });
  };

  useEffect(() => {
    if (!buyerId) return;
    let active = true;
    Promise.all([
      supabase.from("profiles").select("address").eq("id", buyerId).maybeSingle(),
      supabase.from("property_accounts").select("id,name").eq("user_id", buyerId).eq("status", "active").order("created_at"),
    ]).then(([profile, accounts]) => {
      if (!active) return;
      setSavedDetailsError(Boolean(profile.error || accounts.error));
      if (!profile.error && !addressEdited.current && profile.data?.address) setAddress(profile.data.address);
      if (!accounts.error) setProperties(accounts.data ?? []);
    }).catch(() => { if (active) setSavedDetailsError(true); });
    return () => { active = false; };
  }, [buyerId]);

  useEffect(() => {
    bodyRef.current?.focus({ preventScroll: true });
    bodyRef.current?.closest(".xoot-site-booking-dialog")?.scrollTo({ top: 0 });
  }, [step]);
  useEffect(() => {
    if (step !== 3) return;
    let active = true;
    setRosterStatus("loading");
    loadXooterDirectory().then(result => {
      if (!active) return;
      setRoster(result.xooters); setRosterStatus("ready");
      const preferred = params.get("xooter");
      const initialPreference = !preferredApplied.current && preferred && result.xooters.some(person => person.id === preferred) ? preferred : null;
      preferredApplied.current = true;
      setSelectedIds(ids => initialPreference ? [initialPreference] : ids.filter(id => result.xooters.some(person => person.id === id)));
    }).catch(() => { if (active) { setRoster([]); setRosterStatus("error"); } });
    return () => { active = false; };
  }, [step, rosterAttempt, params]);

  useEffect(() => {
    if (step !== 4 || !buyerId) return;
    const version = ++requestVersion.current;
    setQuoteState({ key: quoteKey, loading: true }); setAcceptedFingerprint(null);
    const timer = setTimeout(async () => {
      try {
        const { data, error: requestError } = await supabase.functions.invoke("get-booking-quote", { body: JSON.parse(quoteKey) });
        if (requestVersion.current !== version) return;
        if (requestError) {
          let message = "Your quote could not be loaded. Check your connection and try again.";
          if (requestError.context instanceof Response && [400, 401, 429].includes(requestError.context.status)) {
            const failure = await requestError.context.json().catch(() => null);
            if (typeof failure?.error === "string" && failure.error.length <= 240) message = failure.error;
          }
          throw new Error(message);
        }
        if (data?.success !== true) throw new Error("Your quote could not be verified. Please try again.");
        const result = readBookingQuoteResponse(data.data);
        if (requestVersion.current === version) setQuoteState({ key: quoteKey, result, loading: false });
      } catch (failure) {
        if (requestVersion.current === version) setQuoteState({ key: quoteKey, error: failure instanceof Error ? failure.message : "Please try again.", loading: false });
      }
    }, 250);
    return () => { clearTimeout(timer); requestVersion.current += 1; };
  }, [step, buyerId, quoteKey, quoteAttempt]);

  const back = () => { setError(null); step === 0 ? navigate("/") : setStep(value => value - 1); };
  const next = () => {
    if (step === 0 && !serviceChosen) return;
    if (step === 1 && !address.trim()) { setError("Add the address where you need us."); return; }
    if (step === 1 && !isApprovedLaunchRegion(fullAddress)) { setError("Choose an address in one of our Johannesburg launch suburbs."); return; }
    if (step === 1 && !mismatch && ["airbnb", "office", "moving"].includes(input.service) && input.propertyType !== ({ airbnb: "airbnb", office: "office", moving: "empty" } as Record<string, string>)[input.service]) {
      setError("Choose the property type that fits this service, or change the service."); return;
    }
    if (step === 2 && (!validDate(input.date) || !bookingStartSlots(input).includes(input.time))) { setError("Choose a future date and arrival time."); return; }
    if (step === 2 && input.frequency !== "once" && !input.repeatDays.includes(bookingWeekday(input.date))) {
      setError("Your repeat days must include the first booking day."); return;
    }
    if (step === 3 && !bookingStartSlots(input).includes(input.time)) {
      setStep(2); setError("Choose an arrival time that lets your new crew finish by 17:00."); return;
    }
    setError(null); setStep(value => Math.min(4, value + 1));
  };
  const chooseDate = (date: string) => updateInput({ date, time: bookingStartSlots({ ...input, date })[0] ?? "08:00",
    repeatDays: repeatDaysForNewDate(input, date) });

  const crewPicker = <fieldset><legend className="xoot-booking-label">{website ? "How many Xooters" : "Your crew"}</legend><div className="xoot-booking-crew">{Array.from({ length: maxCrew }, (_, i) => i + 1).map(size => <button key={size} type="button" aria-pressed={input.crewSize === size} onClick={() => { updateInput({ crewSize: size }); setSelectedIds([]); }} className={input.crewSize === size ? "is-selected" : ""}>{!website && <Users size={19} />}<strong>{website ? `${size} ${size === 1 ? "Xooter" : "Xooters"}` : size}</strong>{!website && <span>{size === 1 ? "Xooter" : "Xooters"}</span>}</button>)}</div><p className="xoot-booking-help">One job, shared by your crew. Review the total and estimated duration before booking.</p></fieldset>;

  return <div className={`xoot-booking-page xoot-booking-handoff${website ? " xoot-site-booking" : ""}`}><div className="xoot-booking-frame">
    <header className="xoot-booking-head">
      <button type="button" className="xoot-booking-back" aria-label={step === 0 ? "Close booking" : "Back"} onClick={back}>{website && step === 0 ? <X /> : <ArrowLeft />}</button>
      {website ? <ol className="xoot-booking-steps" aria-label="Booking progress">{websiteSteps.map((name, i) => <Fragment key={name}><li className={`xoot-booking-step ${i === step ? "is-active" : i < step ? "is-done" : ""}`} aria-current={i === step ? "step" : undefined} aria-label={name}><i aria-hidden="true">{i < step ? <Check size={11} strokeWidth={3.4} /> : i + 1}</i><span aria-hidden="true">{name}</span></li>{i < 4 && <li aria-hidden="true" className={`xoot-booking-connector ${i < step ? "is-done" : ""}`} />}</Fragment>)}</ol> : <><div className="xoot-booking-progress"><span>{stepNames[step]}</span><ol aria-label="Booking progress">{stepNames.map((name, i) => <li key={name} aria-label={name} aria-current={i === step ? "step" : undefined} className={i <= step ? "is-done" : ""} />)}</ol></div><Logo className="xoot-booking-logo" size={20} tone="violet" /></>}
    </header>
    <div className="xoot-booking-body" ref={bodyRef} tabIndex={-1}>
      {error && <p className="xoot-booking-error" role="alert">{error}</p>}
      {step === 0 && <div className="xoot-booking-stack"><h1>{website ? "What needs doing?" : "What do you need done?"}</h1>
        {website && <p className="xoot-booking-lede">Pick one. You can add extras in a moment.</p>}
        <div className="xoot-booking-grid">{(website ? websiteServices : orderedServices).map(id => <button type="button" key={id} aria-pressed={serviceChosen && input.service === id} onClick={() => chooseService(id)} className={`xoot-booking-choice ${serviceChosen && input.service === id ? "is-selected" : ""}`}>
          <ServiceIcon service={id} size={website ? 52 : 46} /><span>{BOOKING_SERVICE_DETAILS[id].title}</span>{!website && <small>{BOOKING_SERVICE_DETAILS[id].detail}</small>}
        </button>)}<button type="button" className="xoot-booking-choice" disabled><ServiceIcon service="laundry" size={website ? 52 : 46} /><span>Laundry &amp; ironing</span><small>Not available yet</small></button><button type="button" className={`xoot-booking-choice ${website ? "xoot-site-lux" : ""}`} disabled>{website ? <span className="xoot-site-lux-icon"><Sparkles size={24} strokeWidth={1.6} /></span> : <ServiceIcon service="lux" size={46} />}<span>Xoot Lux</span><small>Not available yet</small></button></div>
      </div>}
      {step === 1 && <div className="xoot-booking-stack"><h1>{website ? "Where are we going?" : "Tell us about your place"}</h1>
        {website && <p className="xoot-booking-lede">Add your address and tell us about the space.</p>}
        <div className={website ? "xoot-site-address" : undefined}><div className="xoot-booking-field">
          <span>{website ? "Street address" : "Where do you need us?"}</span>
          <VerifiedAddressInput value={address} label={website ? "Street address" : "Where do you need us?"}
            showIcon={false} inputClassName="xoot-booking-service-address"
            onChange={next => { addressEdited.current = true; setAddress(next); setAcceptedFingerprint(null); }}
            placeholder={website ? "14 Fredman Drive" : "Street address and suburb"} />
        </div>
        {website && <SuburbPicker value={suburb} onChange={value => { setSuburb(value); setAcceptedFingerprint(null); }} />}</div>
        {!website && <button type="button" className="xoot-booking-pill" aria-expanded={showAreaMap} aria-controls="xoot-booking-service-map"
          onClick={() => setShowAreaMap(open => !open)}>
          {showAreaMap ? "Hide interactive area map" : "View interactive area map"}
        </button>}
        {!website && showAreaMap && <div id="xoot-booking-service-map"><InteractiveServiceAreaMap /></div>}
        {import.meta.env.VITE_VERIFIED_COVERAGE === "true" && (
          <div className="space-y-2 rounded-xl border border-border p-3">
            <button type="button" className="xoot-booking-pill"
              disabled={visibleCoverage?.status === "loading"}
              onClick={() => void checkGeoCoverage()}>Verify this service area</button>
            {visibleCoverage && <p role="status" className="xoot-booking-help">{visibleCoverage.message}</p>}
            <p className="xoot-booking-help">
              Mapbox verifies the address and a server-approved operating-zone boundary.
              This is separate from available Xooters, arrival time and a confirmed booking.
            </p>
          </div>
        )}
        {savedDetailsError && <p className="xoot-booking-help">Saved details could not be loaded. You can enter the address above.</p>}
        {properties.length > 0 && <label className="xoot-booking-field">Property account<select value={propertyId} onChange={event => { setPropertyId(event.target.value); setAcceptedFingerprint(null); }}><option value="">Personal booking</option>{properties.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}</select></label>}
        <fieldset><legend className="xoot-booking-label">{website ? "What kind of place is it?" : "What kind of place?"}</legend><div className="xoot-booking-property-grid">{Object.entries(BOOKING_PROPERTY_LABELS).map(([id, label]) => { const Icon = propertyIcons[id as keyof typeof propertyIcons]; return <button type="button" key={id} className={`xoot-booking-card ${input.propertyType === id ? "is-selected" : ""}`} aria-pressed={input.propertyType === id} onClick={() => chooseProperty(id as BookingQuoteInput["propertyType"])}>{website && <Icon size={17} />}<strong>{website ? websitePropertyLabels[id as keyof typeof websitePropertyLabels] : label}</strong></button>; })}</div></fieldset>
        {mismatch && <div className="xoot-booking-correction"><strong>{BOOKING_SERVICE_DETAILS[mismatch].title} is the right one for this</strong><p>The quote will show the suitable service and revised total for you to accept.</p><Button onClick={() => chooseService(mismatch)}>Switch to {BOOKING_SERVICE_DETAILS[mismatch].title.toLowerCase()}</Button></div>}
        {website ? <fieldset><legend className="xoot-booking-label">How big is the place?</legend><div className="xoot-site-sizes">{homeSizes.map(size => <button type="button" key={size.id} className={`xoot-booking-card ${input.homeSize === size.id ? "is-selected" : ""}`} aria-pressed={input.homeSize === size.id} onClick={() => { setBedrooms(size.bedrooms); updateInput({ homeSize: size.id, hours: input.service === "regular" ? size.hours : input.hours, crewSize: Math.min(input.crewSize, bookingCrewCap(actualService, size.id)) }); setSelectedIds([]); }}><strong>{size.label}</strong><span>{size.detail}</span></button>)}</div></fieldset> : input.service !== "office" && <div className="xoot-booking-steppers"><Stepper label="Bedrooms" description="Common areas always included" value={bedrooms} max={8} onChange={value => chooseRooms(value, bathrooms)} /><Stepper label="Bathrooms" value={bathrooms} max={6} onChange={value => chooseRooms(bedrooms, value)} /></div>}
        {mismatch ? <p className="xoot-booking-help">The corrected quote uses the usual hours for {service.title.toLowerCase()}. Switch services above to customise those hours.</p> : <div className="xoot-booking-steppers"><Stepper label="Hours" description="Cleaning time before extras and crew adjustment" value={input.hours} min={actualService === "airbnb" && input.linen === "wash_dry_repack" ? 5 : service.min} max={service.max} step={0.5} onChange={hours => updateInput({ hours })} /></div>}
        {actualService === "airbnb" && <label className="xoot-booking-field">Linen handling<select value={input.linen ?? "none"} onChange={event => updateInput({ linen: event.target.value as BookingQuoteInput["linen"], hours: event.target.value === "wash_dry_repack" ? Math.max(5, input.hours) : input.hours })}>{Object.entries(BOOKING_LINEN_LABELS).map(([id, label]) => <option key={id} value={id} disabled={Boolean(mismatch && id === "wash_dry_repack")}>{label}{mismatch && id === "wash_dry_repack" ? " — switch to Airbnb first" : ""}</option>)}</select></label>}
        {extras.length > 0 && <fieldset><legend className="xoot-booking-label">Anything extra?</legend><div className={website ? "xoot-booking-pills" : "xoot-booking-stack xoot-booking-extras"}>{extras.map(id => website ? <button type="button" key={id} className={`xoot-booking-pill ${input.addOns.includes(id) ? "is-selected" : ""}`} aria-pressed={input.addOns.includes(id)} onClick={() => updateInput({ addOns: input.addOns.includes(id) ? input.addOns.filter(item => item !== id) : [...input.addOns, id] })}>{BOOKING_ADD_ONS[id].label}</button> : <label className={`xoot-booking-check ${input.addOns.includes(id) ? "is-selected" : ""}`} key={id}><input type="checkbox" checked={input.addOns.includes(id)} onChange={() => updateInput({ addOns: input.addOns.includes(id) ? input.addOns.filter(item => item !== id) : [...input.addOns, id] })} /><span><strong>{BOOKING_ADD_ONS[id].label}</strong><small>Adds about an hour</small></span></label>)}</div></fieldset>}
        {!website && crewPicker}
        <p className="xoot-booking-help" role="status">Estimated visit: {bookingVisitDurationHours(input)} hours with {input.crewSize} {input.crewSize === 1 ? "Xooter" : "Xooters"}, including selected extras. Actual time depends on the condition of the space.</p>
        <label className="xoot-booking-field">Anything we should know?<textarea maxLength={1500} rows={3} value={notes} onChange={event => { setNotes(event.target.value); setAcceptedFingerprint(null); }} placeholder="Pets, products or fragile areas. Keep gate codes in your secure home details." /></label>
      </div>}
      {step === 2 && <div className="xoot-booking-stack"><h1>When suits you?</h1>
        {website && <><p className="xoot-booking-lede">Choose a date and arrival time. Availability is confirmed before booking.</p><div className="xoot-site-dates" aria-label="Upcoming dates">{days.map(date => <button type="button" key={date} aria-label={new Date(`${date}T12:00:00Z`).toLocaleDateString("en-ZA", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Johannesburg" })} aria-pressed={input.date === date} className={input.date === date ? "is-selected" : ""} onClick={() => chooseDate(date)}><span>{dayNames[bookingWeekday(date)]}</span><strong>{Number(date.slice(-2))}</strong></button>)}</div></>}
        <fieldset><legend className="xoot-booking-label">How often</legend><div className="xoot-booking-frequency">{Object.entries(BOOKING_FREQUENCY_LABELS).map(([id, label]) => <button key={id} type="button" aria-pressed={input.frequency === id} className={input.frequency === id ? "is-selected" : ""} onClick={() => updateInput({ frequency: id as BookingQuoteInput["frequency"], repeatDays: id === "once" ? [] : [bookingWeekday(input.date)] })}>{label}</button>)}</div></fieldset>
        {!website && <fieldset><legend className="xoot-booking-label">Which day</legend><div className="xoot-booking-day-choices">{[[0, "Today"], [1, "Tomorrow"]].map(([offset, label]) => { const date = bookingDateInSast(Date.now(), Number(offset)); return <button type="button" key={label} disabled={bookingStartSlots({ ...input, date }).length === 0} aria-pressed={input.date === date} className={`xoot-booking-card ${input.date === date ? "is-selected" : ""}`} onClick={() => chooseDate(date)}><strong>{label}</strong></button>; })}</div></fieldset>}
        <label className="xoot-booking-field">Pick a date<input type="date" value={input.date} min={bookingDateInSast()} onChange={event => chooseDate(event.target.value)} /></label>
        {input.frequency !== "once" && <fieldset><legend className="xoot-booking-label">Repeat on</legend><div className="xoot-booking-days">{dayNames.map((day, i) => <button type="button" key={day} aria-pressed={input.repeatDays.includes(i)} className={input.repeatDays.includes(i) ? "is-selected" : ""} onClick={() => updateInput({ repeatDays: input.repeatDays.includes(i) ? input.repeatDays.filter(value => value !== i) : [...input.repeatDays, i] })}>{day}</button>)}</div><p className="xoot-booking-help">The reviewed price is per visit. Future visits need availability confirmation.</p></fieldset>}
        <fieldset><legend className="xoot-booking-label">Arrival time</legend><div className="xoot-booking-pills">{slots.map(time => <button type="button" key={time} aria-pressed={input.time === time} className={`xoot-booking-pill ${input.time === time ? "is-selected" : ""}`} onClick={() => updateInput({ time })}>{time}</button>)}</div>{!slots.length && <p className="xoot-booking-help">Choose another date to see future arrival times.</p>}</fieldset>
      </div>}
      {step === 3 && <div className="xoot-booking-stack"><h1>Choose your Xooter{input.crewSize > 1 ? "s" : ""}</h1>
        <p className="xoot-booking-lede">Pick a preference, or let Xoot match your crew. Availability for your date still needs confirmation.</p>
        {website && crewPicker}
        <button type="button" className={`xoot-booking-match ${!selectedIds.length ? "is-selected" : ""}`} aria-pressed={!selectedIds.length} onClick={() => { setSelectedIds([]); setAcceptedFingerprint(null); }}><Users /><span><strong>Let Xoot match my crew</strong><small>{input.crewSize} {input.crewSize === 1 ? "Xooter" : "Xooters"} for this visit</small></span>{!selectedIds.length && <Check size={18} />}</button>
        {rosterStatus === "loading" ? <p role="status">Loading the approved roster…</p> : rosterStatus === "error" ? <div className="xoot-booking-empty" role="alert"><p>The roster could not be loaded.</p><Button variant="outline" onClick={() => setRosterAttempt(value => value + 1)}>Try again</Button></div> : !roster.length ? <div className="xoot-booking-empty"><ShieldCheck /><h2>No approved Xooters listed yet</h2><p>You can review a quote. A booking cannot be confirmed until a suitable crew is available.</p></div> : <div className="xoot-booking-roster">{roster.map(person => <button type="button" key={person.id} aria-pressed={selectedIds.includes(person.id)} className={`xoot-booking-person ${selectedIds.includes(person.id) ? "is-selected" : ""}`} onClick={() => { setSelectedIds(ids => ids.includes(person.id) ? ids.filter(id => id !== person.id) : ids.length < input.crewSize ? [...ids, person.id] : input.crewSize === 1 ? [person.id] : ids); setAcceptedFingerprint(null); }}>
          {person.photo_url ? <img src={person.photo_url} alt="" width="52" height="52" /> : <span className="xoot-booking-avatar">{person.name.slice(0, 1)}</span>}<span><strong>{person.name}</strong><small>{person.jobs_completed > 0 && person.rating !== null ? `${person.rating.toFixed(1)} · ${person.jobs_completed} visits` : "New to Xoot"}</small></span>{selectedIds.includes(person.id) && <Check size={18} />}
        </button>)}</div>}
      </div>}
      {step === 4 && <div className="xoot-booking-stack"><h1>Everything look right?</h1>
        <div className="xoot-booking-summary"><div className="xoot-booking-summary-row"><span>Where</span><span>{fullAddress}</span></div><div className="xoot-booking-summary-row"><span>When</span><span>{input.date} · {input.time}</span></div><div className="xoot-booking-summary-row"><span>How often</span><span>{BOOKING_FREQUENCY_LABELS[input.frequency]}</span></div><div className="xoot-booking-summary-row"><span>Your crew</span><span>{input.crewSize} {input.crewSize === 1 ? "Xooter" : "Xooters"}{selectedIds.length ? ` · ${roster.filter(person => selectedIds.includes(person.id)).map(person => person.name).join(", ")}` : " · match requested"}</span></div>{propertyId && <div className="xoot-booking-summary-row"><span>Property account</span><span>{properties.find(account => account.id === propertyId)?.name}</span></div>}{notes && <div className="xoot-booking-summary-row"><span>Your notes</span><span>{notes}</span></div>}</div>
        <label htmlFor="referral-code" className="xoot-booking-field">A friend’s invite?<input id="referral-code" maxLength={32} value={input.referralCode} onChange={event => updateInput({ referralCode: event.target.value.toUpperCase() })} aria-describedby="referral-code-help" autoComplete="off" spellCheck={false} placeholder="Referral code (optional)" /></label><p id="referral-code-help" className="xoot-booking-help">{quote ? BOOKING_REFERRAL_MESSAGES[quote.referral.status] : "We’ll check the code with your quote."}</p>
        <label className="xoot-booking-check"><input type="checkbox" checked={input.requestedCreditCents > 0} onChange={event => updateInput({ requestedCreditCents: event.target.checked ? 100_000_000 : 0 })} /><span><strong>Use my available XootCred</strong><small>Your quote confirms the amount available to use.</small></span></label>
        {!buyerId ? <div className="xoot-booking-empty"><p>Sign in to review your quote and account benefits. You’ll be able to enter your booking details again after signing in.</p><Button onClick={() => navigate("/auth", { state: { from: { pathname: website ? "/book" : "/app/book", search: `?service=${input.service}` } } })}>Sign in</Button></div> : quoteLoading ? <p role="status" className="xoot-booking-callout"><Loader2 className="animate-spin" />Reviewing your quote…</p> : quoteState.error ? <div className="xoot-booking-empty" role="alert"><p>{quoteState.error}</p><Button onClick={() => setQuoteAttempt(value => value + 1)}>Try quote again</Button></div> : quote && <>
          {quote.serviceCorrection && <div className="xoot-booking-correction" role="status"><strong>{BOOKING_SERVICE_DETAILS[quote.service].title} suits this property</strong><p>Your selection was {BOOKING_SERVICE_DETAILS[quote.requestedService].title.toLowerCase()}. Review the corrected service and total below.</p></div>}
          <div className="xoot-booking-callout"><Clock3 /><span><strong>{BOOKING_SERVICE_DETAILS[quote.service].title}</strong> · estimated {quote.estimatedDurationHours} hours</span></div>
          <div className="xoot-booking-summary" aria-label="Reviewed quote">{quote.lines.filter(line => line.amountCents !== 0 || line.id === "booking_fee").map(line => <div className="xoot-booking-summary-row" key={line.id}><span>{line.label}</span><span>{formatBookingMoney(line.amountCents)}</span></div>)}<div className="xoot-booking-summary-row is-total"><span>Total per visit</span><span>{formatBookingMoney(quote.totalCents)}</span></div></div>
          <label className="xoot-booking-check"><input type="checkbox" checked={acceptedFingerprint === quote.fingerprint} onChange={event => setAcceptedFingerprint(event.target.checked ? quote.fingerprint : null)} /><span><strong>I accept {BOOKING_SERVICE_DETAILS[quote.service].title.toLowerCase()} and {formatBookingMoney(quote.totalCents)} per visit.</strong><small>Any change to this quote will need your acceptance again.</small></span></label>
          <p className="xoot-booking-help">Booking Cover is not available. No cover premium is included.</p>
          <div className="xoot-booking-empty" role="status"><ShieldCheck /><h2>Online confirmation is not available yet</h2><p>Your quote has been reviewed, but no booking has been created and nothing has been charged.</p><Button variant="outline" onClick={() => navigate("/app/support")}>Contact support</Button></div>
        </>}
      </div>}
    </div>
    {(!website || step < 4) && <footer className="xoot-booking-footer"><p>{website ? "No charge until you confirm." : `Step ${step + 1} of ${stepNames.length}`}</p><div className="xoot-booking-footer-actions">{!website && <Button variant="ghost" onClick={back}>Back</Button>}{step < 4 ? <Button className="xoot-booking-continue" disabled={step === 0 && !serviceChosen} onClick={next}>Continue<ArrowRight /></Button> : <Button className="xoot-booking-continue" disabled={!buyerId || quoteLoading} onClick={() => setQuoteAttempt(value => value + 1)}>Refresh quote</Button>}</div></footer>}
  </div></div>;
}
