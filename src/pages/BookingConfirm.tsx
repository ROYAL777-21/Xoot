import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { haptic } from "@/lib/haptics";
import { cn } from "@/lib/utils";
import { defaultHours, readDraft, type OnboardingAnswers } from "@/lib/onboarding";
import { formatRand, hoursFor, isPriced, quote, serviceBounds, xooterOptionsFor, type ServiceId } from "@/lib/xoot-pricing";
import { AlertTriangle, ArrowLeft, Check, Clock, ShieldCheck, Users, Zap } from "lucide-react";

/**
 * Booking confirmation — the end of the flow, and the first and only place a price
 * appears (master brief §4: no price is shown until the end, on every service).
 *
 * Everything above the total is already answered from onboarding, so a returning
 * customer confirms rather than fills in a form.
 */

const SERVICE_FOR: Record<OnboardingAnswers["type"], ServiceId> = {
  household: "regular",
  airbnb: "airbnb",
  office: "office",
};

/** R30 each. Interior windows is preselected by default (§4.1). */
const ADD_ONS = [
  { id: "windows", label: "Interior windows", preselected: true },
  { id: "fridge", label: "Inside fridge" },
  { id: "oven", label: "Inside oven" },
  { id: "cabinets", label: "Inside cabinets" },
  { id: "laundry", label: "Laundry" },
  { id: "ironing", label: "Ironing" },
];

/** What the customer gives up by dropping cover. Kept honest — no invented cover. */
const COVER_LOSSES = [
  "Accidental damage to your things while we're there",
  "Breakage cover on items handled during the clean",
  "Priority support if something goes wrong",
];

export default function BookingConfirm() {
  const navigate = useNavigate();
  const answers = useMemo(() => readDraft(), []);
  const service: ServiceId = answers ? SERVICE_FOR[answers.type] : "regular";
  const bounds = serviceBounds(service);
  const recommended = answers ? defaultHours(answers) : 5.5;

  const [hours, setHours] = useState(recommended);
  const [xooterChoice, setXooterChoice] = useState(1);
  const [selected, setSelected] = useState<string[]>(ADD_ONS.filter((a) => a.preselected).map((a) => a.id));
  const [cover, setCover] = useState(true);
  const [askingCover, setAskingCover] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const options = hoursFor(service);
  const belowRecommended = hours < recommended;

  // Which Xooter counts this hour count can actually be split into. Changing the hours
  // changes this set, so the choice is *derived* rather than synced: a stale selection
  // falls back to 1 instead of being carried into a quote that would then fail. No effect,
  // nothing to keep in step.
  const xooterOptions = xooterOptionsFor(service, hours);
  const xooterCount = xooterOptions.includes(xooterChoice) ? xooterChoice : 1;

  const raw = quote({
    service,
    hours,
    xooterCount,
    addOns: selected.length,
    linenOnSite: answers?.type === "airbnb" && answers.linenHandling === "wash-dry-repack",
    bookingCover: cover,
  });
  // Split once so JSX below reads plainly instead of re-narrowing in every branch.
  const priced = isPriced(raw) ? raw : null;
  const failure = isPriced(raw) ? null : raw;

  const toggleAddOn = (id: string) => {
    haptic("selection");
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  /** Deselecting cover opens a confirmation first; selecting it back is immediate. */
  const onCoverChange = () => {
    if (cover) {
      haptic("warning");
      setAskingCover(true);
      return;
    }
    haptic("selection");
    setCover(true);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-secondary">
      <SEO title="Your estimate" description="What your clean would cost, based on your profile. Nothing is booked yet." canonical="/book/confirm" noIndex />

      <header className="flex items-center gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="grid size-9 place-items-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <h1 className="font-display text-xl font-bold tracking-tight">Ready when you are</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 rounded-t-[1.75rem] bg-card px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* Hours */}
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-bold">
              <Clock className="size-4" aria-hidden="true" />
              How long
              {/* A tag, not a banner: it labels the slot it applies to rather than
                  occupying the top of the screen as an alert. */}
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-warning-foreground">
                <Zap className="size-2.5" aria-hidden="true" />
                Last minute
              </span>
            </h2>
            <span className="text-xs text-muted-foreground">
              {hours} hours{hours === recommended ? " · recommended" : ""}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {options.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => {
                  haptic("selection");
                  setHours(h);
                }}
                aria-pressed={hours === h}
                className={cn(
                  "min-w-12 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  hours === h ? "border-primary bg-primary text-primary-foreground" : "border-border text-foreground",
                )}
              >
                {h}h
              </button>
            ))}
          </div>

          {/* Warn, never block (§4.1). */}
          {belowRecommended ? (
            <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-warning-foreground" aria-hidden="true" />
              At {hours} hours we may not get your place to the standard we&rsquo;d want. You can still book it —
              we&rsquo;d just suggest {recommended}.
            </p>
          ) : null}
        </section>

        {/* How many Xooters. Hidden entirely when the hours cannot be split — an option
            with one choice is not a choice, and showing a disabled control invites the
            question "why can't I?" on the screen that is trying to close the booking. */}
        {xooterOptions.length > 1 ? (
          <section>
            <div className="flex items-baseline justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <Users className="size-4" aria-hidden="true" />
                How many Xooters
              </h2>
              <span className="text-xs text-muted-foreground">
                {priced && priced.discountRate > 0 ? `${priced.discountRate * 100}% off` : null}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {xooterOptions.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => {
                    haptic("selection");
                    setXooterChoice(count);
                  }}
                  aria-pressed={xooterCount === count}
                  className={cn(
                    "min-w-12 rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    xooterCount === count
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground",
                  )}
                >
                  {count}
                </button>
              ))}
            </div>

            {/* Says the quiet part out loud. Customers reasonably assume a second person
                doubles the bill, and left unsaid that assumption stops them selecting it. */}
            {/* States the cost plainly. Each Xooter works the full visit and is charged
                for, so the price rises with the count — saying otherwise here would be a
                surprise at the total. */}
            <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
              {xooterCount === 1
                ? `One Xooter for the full ${hours} hours.`
                : `${xooterCount} Xooters, each for the full ${hours} hours${priced && priced.discountRate > 0 ? `, with ${priced.discountRate * 100}% off for booking ${xooterCount}` : ""}.`}
            </p>
          </section>
        ) : null}

        {/* Add-ons */}
        <section>
          <h2 className="text-sm font-bold">Anything extra?</h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ADD_ONS.map((a) => {
              const on = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => toggleAddOn(a.id)}
                  aria-pressed={on}
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground",
                  )}
                >
                  {on ? "✓ " : "+ "}
                  {a.label}
                </button>
              );
            })}
          </div>
        </section>

        {/* Booking cover */}
        <section className="rounded-2xl border border-border p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className={cn("mt-0.5 size-5 shrink-0", cover ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Booking Cover</p>
              <p className="text-xs text-muted-foreground">Covers accidental damage while we&rsquo;re in your home.</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={cover}
              aria-label="Booking Cover"
              onClick={onCoverChange}
              className={cn(
                "relative h-6 w-10 shrink-0 rounded-full transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                cover ? "bg-primary" : "bg-muted",
              )}
            >
              <span className={cn("absolute top-0.5 size-5 rounded-full bg-card transition-all", cover ? "left-[1.125rem]" : "left-0.5")} />
            </button>
          </div>

          {askingCover ? (
            <div className="mt-3 rounded-xl bg-secondary p-3.5">
              <p className="text-sm font-semibold">Are you sure?</p>
              <p className="mt-1 text-xs text-muted-foreground">Without cover you&rsquo;d lose:</p>
              <ul className="mt-2 flex flex-col gap-1">
                {COVER_LOSSES.map((l) => (
                  <li key={l} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Check className="mt-0.5 size-3 shrink-0 text-primary" aria-hidden="true" />
                    {l}
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  className="h-10 flex-1 rounded-full text-xs"
                  onClick={() => {
                    haptic("impact");
                    setCover(false);
                    setAskingCover(false);
                  }}
                >
                  Remove
                </Button>
                <Button
                  className="h-10 flex-1 rounded-full text-xs"
                  onClick={() => {
                    haptic("success");
                    setAskingCover(false);
                  }}
                >
                  Keep
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        {/* Total — the only price on the whole journey. */}
        <div className="mt-auto pt-4">
          {priced && revealed ? (
            <dl className="mb-3 flex flex-col gap-1.5 text-xs">
              {/* One line, still one price. Naming the split here rather than adding a
                  second row keeps the total from reading as if the Xooters were charged
                  separately. */}
              <Row
                label={
                  priced.xooterCount === 1
                    ? `${hours} hours`
                    : `${hours} hours × ${priced.xooterCount} Xooters`
                }
                value={formatRand(priced.baseCents)}
              />
              {priced.addOnsCents > 0 ? <Row label={`${selected.length} add-on${selected.length === 1 ? "" : "s"}`} value={formatRand(priced.addOnsCents)} /> : null}
              {priced.linenCents > 0 ? <Row label="Linen washed on-site" value={formatRand(priced.linenCents)} /> : null}
              {priced.coverCents > 0 ? <Row label="Booking Cover" value={formatRand(priced.coverCents)} /> : null}
              {/*
                Shown, not folded silently into the total. The server has always charged this on
                one-time bookings; `quote()` did not model it, so this screen — the last one before
                payment — used to under-state the total by R39. Under the CPA the displayed price is
                the price, so it is a line the customer can see rather than a gap they discover.
              */}
              {priced.serviceFeeCents > 0 ? <Row label="Service fee" value={formatRand(priced.serviceFeeCents)} /> : null}
              <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2">
                <dt className="text-sm font-bold">Total</dt>
                <dd className="font-display text-2xl font-bold">{formatRand(priced.totalCents)}</dd>
              </div>
            </dl>
          ) : null}

          {failure ? (
            <p className="mb-3 flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning-foreground">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              {failure.reason}
            </p>
          ) : null}

          <Button
            size="lg"
            disabled={!priced}
            className="h-12 w-full rounded-full"
            onClick={() => {
              haptic("success");
              if (!revealed) return setRevealed(true);
              navigate("/app");
            }}
          >
            {revealed ? "Pick a date and time" : "See the price"}
          </Button>
          {/* This screen cannot create a booking and never could: the onboarding draft holds
              suburb, cadence and home size, while create-booking requires a date, a time and
              a full address it validates against launch coverage. The button used to read
              "Confirm booking" and then call navigate("/app"), so anyone who completed this
              flow believed they had booked. Navigating on is correct — Book.tsx is where the
              missing details get collected — so the label was the only thing that had to
              change, not the behaviour. */}
          {revealed ? (
            <p className="mt-2 text-center text-[0.65rem] text-muted-foreground">
              This is an estimate. Nothing is booked until you choose a date and time.
            </p>
          ) : null}
          {bounds && !bounds.confirmed ? (
            <p className="mt-2 text-center text-[0.65rem] text-muted-foreground">
              Indicative only — this service&rsquo;s pricing is still being confirmed.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
