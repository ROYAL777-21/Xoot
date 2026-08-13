import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  Crown,
  Gem,
  Heart,
  Home,
  Loader2,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { Navbar } from "@/components/xoot/Navbar";
import { Footer } from "@/components/xoot/Footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { CarePlusMark } from "@/components/care-plus/CarePlusMark";
import { CarePlusBenefitCard, CarePlusComparisonTable, CarePlusSupportPromise } from "@/components/care-plus/CarePlusShowcase";
import { carePlusBenefits, carePlusMoatBenefits } from "@/data/care-plus";
import { useCarePlus } from "@/hooks/useCarePlus";
import { useHouseholdOperatingLayer } from "@/hooks/useHouseholdOperatingLayer";
import { useXootCred } from "@/hooks/useXootCred";
import { formatZAR } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { captureAnalyticsEvent, getAnalyticsDeviceType } from "@/lib/analytics";

const pillars = [
  {
    title: "Memory",
    body: "Save pets, parking, product preferences, allergies, fragile areas and default add-ons once.",
    icon: Home,
  },
  {
    title: "Continuity",
    body: "Keep a preferred Xooter close to repeat bookings when availability allows.",
    icon: Heart,
  },
  {
    title: "Priority",
    body: "Get earlier support handling when a booking, cancellation or replacement needs attention.",
    icon: Crown,
  },
  {
    title: "Loyalty",
    body: "Track XootCred from the ledger and use your welcome add-on credit before it expires.",
    icon: WalletCards,
  },
];

const signupJourney = [
  "Create your member profile",
  "Confirm payment securely",
  "Save Home Memory",
  "Book with priority context",
];

const formatDate = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium" }).format(new Date(value)) : "Not available";

const CarePlus = () => {
  const carePlus = useCarePlus();
  const household = useHouseholdOperatingLayer();
  const xootCred = useXootCred();

  const joinCarePlus = async () => {
    try {
      haptic("impact");
      await carePlus.requestMembership();
      haptic("success");
      toast.success("Care+ setup started. Complete payment to activate member benefits.");
    } catch (error) {
      haptic("warning");
      toast.error(error instanceof Error ? error.message : "Care+ setup could not start.");
    }
  };

  const state = carePlus.state;
  const captureCarePlusCta = (ctaLocation: string) => {
    captureAnalyticsEvent("care_plus_cta_clicked", {
      cta_location: ctaLocation,
      membership_state: state.status,
      device_type: getAnalyticsDeviceType(),
    });
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <SEO
        title="Xoot Care+ - Premium recurring home care and XootCred"
        description="Join Xoot Care+ for saved home memory, preferred Xooter continuity, priority support and ledger-backed XootCred add-on credit."
        canonical="/care-plus"
      />
      <Navbar />
      <main>
        <section className="relative overflow-hidden bg-background">
          <div className="container grid gap-10 py-14 sm:py-16 lg:min-h-[700px] lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-12 lg:py-24">
            <div className="animate-fade-up">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-primary">
                <Gem className="h-3.5 w-3.5" />
                Premium membership
              </div>
              <h1 className="font-display text-4xl font-bold leading-[1.04] tracking-tight text-balance sm:text-5xl md:text-6xl lg:text-7xl">
                <CarePlusMark /> keeps your home ready.
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg md:text-xl">
                A real membership layer for repeat households: saved home memory, priority support, favourite Xooter continuity and ledger-backed XootCred.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                {state.status === "unauthenticated" ? (
                  <Button asChild size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto" onClick={() => { haptic("success"); captureCarePlusCta("hero_guest_join"); }}>
                    <Link to="/auth">Join Care+ membership <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                ) : state.status === "not_member" || state.status === "cancelled" ? (
                  <Button size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto" onClick={() => { captureCarePlusCta("hero_join"); void joinCarePlus(); }} disabled={carePlus.actionLoading}>
                    {carePlus.actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
                    Join for {formatZAR(carePlus.plan.priceZar)}/month
                  </Button>
                ) : state.status === "pending_payment" ? (
                  <Button asChild size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto" onClick={() => captureCarePlusCta("hero_pending_payment")}>
                    <a href={state.checkout_url}>Complete setup <ArrowRight className="ml-1 h-4 w-4" /></a>
                  </Button>
                ) : (
                  <Button asChild size="lg" className="h-14 w-full justify-center rounded-full gradient-warm px-7 text-base font-semibold shadow-warm sm:w-auto" onClick={() => captureCarePlusCta("hero_active_book")}>
                    <Link to="/app">Book with Care+ <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                )}
                <Button asChild size="lg" variant="outline" className="h-14 w-full justify-center rounded-full px-7 text-base sm:w-auto" onClick={() => haptic("selection")}>
                  <a href="#included">See benefits</a>
                </Button>
              </div>
              <p className="mt-5 text-sm text-muted-foreground">
                Signed-in member panels come from your live Supabase account data.
              </p>
            </div>

            {carePlus.loading ? (
              <Card className="grid min-h-80 place-items-center rounded-3xl p-8 shadow-card">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </Card>
            ) : (
              <CarePlusStatePanel carePlus={carePlus} household={household} xootCred={xootCred} onJoin={joinCarePlus} />
            )}
          </div>
        </section>

        <section id="included" className="border-y border-border bg-secondary/35 py-20 md:py-28">
          <div className="container">
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">What&apos;s included</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">The {formatZAR(carePlus.plan.priceZar)}/month reliability layer.</h2>
              <p className="mt-4 text-muted-foreground"><CarePlusMark /> gives practical continuity and emotional calm without pretending support, refunds or replacement decisions are automatic.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {carePlusBenefits.map((benefit) => <CarePlusBenefitCard key={benefit.id} benefit={benefit} />)}
            </div>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container">
            <div className="mb-12 max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Value pillars</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Remembered, protected, ready.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <Card key={pillar.title} className="rounded-3xl border-border/70 bg-card p-6 shadow-card">
                    <div className="mb-5 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <h3 className="font-display text-2xl font-bold">{pillar.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{pillar.body}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-secondary/30 py-20 md:py-28">
          <div className="container">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Compare</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Standard Xoot vs <CarePlusMark /></h2>
              </div>
              <p className="max-w-md text-sm text-muted-foreground">Care+ adds continuity, priority handling and ledger-backed rewards to ordinary cleaning workflows.</p>
            </div>
            <CarePlusComparisonTable />
          </div>
        </section>

        {state.status === "active" && (
          <section className="py-20 md:py-28">
            <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-sage-deep">Smart reminders</p>
                <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl"><CarePlusMark /> follows your real booking rhythm.</h2>
                <p className="mt-4 text-muted-foreground">These prompts are based on your last completed booking, not generic example data.</p>
              </div>
              <div className="space-y-3">
                {carePlus.reminders.map((reminder) => (
                  <Card key={reminder.id} className="rounded-3xl border-border bg-card p-4 shadow-card">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold">{reminder.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Last completed booking: {formatDate(carePlus.lastBookingAt)}</p>
                      </div>
                      <Button asChild variant="ghost" size="sm" className="rounded-full">
                        <Link to={reminder.intent === "default_addon" ? "/app/profile" : "/app"}>{reminder.cta}</Link>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="bg-background py-20 md:py-28">
          <div className="container grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="rounded-4xl gradient-sage p-6 text-primary-foreground shadow-warm sm:p-8 md:p-12">
              <Sparkles className="mb-5 h-8 w-8" />
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Home care should not reset every time.</h2>
              <p className="mt-4 max-w-2xl text-base opacity-90 sm:text-lg">Care+ keeps the useful context in the app: household notes, favourite people, XootCred, property profiles and support handoff history.</p>
              <Button asChild size="lg" variant="secondary" className="mt-8 h-14 w-full justify-center rounded-full px-7 text-base font-semibold sm:w-auto" onClick={() => haptic("success")}>
                <Link to={state.status === "unauthenticated" ? "/auth" : "/app/plans"}>{state.status === "active" ? "Manage Care+" : "Join Care+ membership"}</Link>
              </Button>
            </div>
            <div className="grid gap-5">
              <CarePlusSupportPromise />
              <div className="grid gap-5 sm:grid-cols-2">
                {carePlusMoatBenefits.slice(0, 2).map((benefit) => <CarePlusBenefitCard key={benefit.id} benefit={benefit} />)}
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

type CarePlusHook = ReturnType<typeof useCarePlus>;
type HouseholdHook = ReturnType<typeof useHouseholdOperatingLayer>;
type XootCredHook = ReturnType<typeof useXootCred>;

const CarePlusStatePanel = ({ carePlus, household, xootCred, onJoin }: { carePlus: CarePlusHook; household: HouseholdHook; xootCred: XootCredHook; onJoin: () => Promise<void> }) => {
  const state = carePlus.state;

  if (state.status === "unauthenticated") {
    return (
      <CarePlusSignupPass mode="guest" price={carePlus.plan.priceZar} />
    );
  }

  if (state.status === "not_member") {
    return (
      <CarePlusSignupPass mode="member" price={state.plan.priceZar} benefits={state.plan.benefits} onJoin={onJoin} loading={carePlus.actionLoading} />
    );
  }

  if (state.status === "pending_payment") {
    return (
      <Card className="rounded-3xl border-primary/30 bg-primary/10 p-6 shadow-card">
        <CalendarClock className="mb-5 h-8 w-8 text-primary" />
        <h2 className="font-display text-3xl font-bold">Complete your Care+ setup</h2>
        <p className="mt-3 text-sm text-muted-foreground">Your membership request exists, but benefits activate only after payment is confirmed by the backend payment flow.</p>
        <Button asChild className="mt-6 rounded-full gradient-warm">
          <a href={state.checkout_url}>Open payment link</a>
        </Button>
      </Card>
    );
  }

  if (state.status === "past_due") {
    return (
      <Card className="rounded-3xl border-destructive/25 bg-destructive/10 p-6 shadow-card">
        <ShieldCheck className="mb-5 h-8 w-8 text-destructive" />
        <h2 className="font-display text-3xl font-bold">Payment update needed</h2>
        <p className="mt-3 text-sm text-muted-foreground">Care+ is past due. Update payment to restore priority handling and your remaining add-on credit.</p>
        <p className="mt-4 text-sm font-semibold">Last renewal date: {formatDate(state.membership.renewsAt)}</p>
        <Button asChild className="mt-6 rounded-full">
          <Link to="/app/support">Contact support</Link>
        </Button>
      </Card>
    );
  }

  if (state.status === "cancelled") {
    return (
      <CarePlusSignupPass mode="rejoin" price={carePlus.plan.priceZar} cancelledAt={state.cancelled_at} onJoin={onJoin} loading={carePlus.actionLoading} />
    );
  }

  return (
    <div className="grid gap-5">
      <Card className="rounded-3xl border-0 bg-foreground p-6 text-background shadow-warm">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-background/70">Care<span className="text-primary-glow">+</span> active</p>
            <h2 className="font-display text-4xl font-bold">{formatZAR(state.membership.priceZar)}/month</h2>
          </div>
          <Crown className="h-10 w-10 shrink-0 text-accent" />
        </div>
        <div className="grid gap-3 text-center sm:grid-cols-3">
          <Metric label="Renews" value={formatDate(state.membership.renewsAt)} />
          <Metric label="XootCred" value={xootCred.loading ? "..." : formatZAR(xootCred.availableBalance)} />
          <Metric label="Welcome credit" value={xootCred.loading ? "..." : formatZAR(xootCred.welcomeCredit)} />
        </div>
        <p className="mt-4 text-xs text-background/70">Welcome credit expires: {formatDate(xootCred.welcomeCreditExpiresAt)}</p>
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
          <p className="text-sm font-semibold text-sage-deep">Favourite Xooter</p>
          {state.favourite ? (
            <>
              <h3 className="mt-2 font-display text-2xl font-bold">{state.favourite.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">Rating {state.favourite.rating || "not rated yet"} - {state.favourite.preferredFor}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {state.favourite.specialties.map((specialty) => <span key={specialty} className="rounded-full bg-muted px-3 py-1 text-xs">{specialty}</span>)}
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">Save a Xooter from My Xooters to make repeat bookings easier.</p>
          )}
        </Card>

        <Card className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
          <p className="text-sm font-semibold text-sage-deep">Saved properties</p>
          <h3 className="mt-2 font-display text-2xl font-bold">{carePlus.properties.length}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Property profiles are loaded from your account.</p>
        </Card>
      </div>

      {household.readyModes.length > 0 && (
        <Card className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
          <p className="text-sm font-semibold text-sage-deep">Household operating layer</p>
          <div className="mt-4 grid gap-3">
            {household.readyModes.slice(0, 3).map((mode) => (
              <div key={mode.id} className="flex flex-col gap-2 rounded-2xl bg-muted/50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{mode.title}</p>
                  <p className="text-sm text-muted-foreground">{mode.summary}</p>
                </div>
                <span className="text-sm font-bold text-sage-deep">{mode.readinessScore}%</span>
              </div>
            ))}
          </div>
          {household.serviceRecovery.length > 0 && (
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 p-4">
              <p className="text-sm font-semibold">Service recovery active</p>
              <p className="mt-1 text-sm text-muted-foreground">{household.serviceRecovery[0].summary}</p>
            </div>
          )}
        </Card>
      )}

      {carePlus.properties.length > 0 && (
        <div className="grid gap-3">
          {carePlus.properties.map((property) => (
            <Card key={property.id} className="rounded-3xl border-border/70 bg-card/90 p-5 shadow-card">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-display text-xl font-bold">{property.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{property.type.replace(/_/g, " ")} - {property.defaultService}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{property.turnoverInstructions}</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const CarePlusSignupPass = ({
  mode,
  price,
  benefits = [],
  cancelledAt,
  loading,
  onJoin,
}: {
  mode: "guest" | "member" | "rejoin";
  price: number;
  benefits?: string[];
  cancelledAt?: string;
  loading?: boolean;
  onJoin?: () => Promise<void>;
}) => {
  const title =
    mode === "guest"
      ? "Unlock the member home-care layer"
      : mode === "rejoin"
        ? "Restart your Care+ rhythm"
        : "Your Care+ pass is ready";
  const body =
    mode === "guest"
      ? "Create your account to start Care+ setup with Home Memory, priority support, favourite Xooter continuity and member XootCred."
      : mode === "rejoin"
        ? `Your previous membership ended on ${formatDate(cancelledAt)}. Rejoin to restore Home Memory, priority context and member add-on credit.`
        : "Join to make repeat cleaning feel remembered, protected and easier to rebook.";

  return (
    <div className="liquid-glass-shell xoot-concierge-panel rounded-4xl p-5 shadow-warm sm:p-6">
      <div className="liquid-glass-readable">
        <div className="rounded-[1.6rem] border border-white/20 bg-foreground p-5 text-background shadow-warm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-background/65">Care+ member pass</p>
              <h2 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{formatZAR(price)}</h2>
              <p className="mt-1 text-sm font-semibold text-background/70">per month</p>
            </div>
            <div className="grid h-14 w-14 place-items-center rounded-[1.25rem] bg-primary text-primary-foreground shadow-card">
              <Crown className="h-7 w-7" />
            </div>
          </div>

          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {["Home Memory", "Priority support", "R30 welcome credit", "Favourite Xooter"].map((item) => (
              <div key={item} className="rounded-2xl bg-background/10 px-3 py-2 text-sm font-semibold">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <h3 className="font-display text-3xl font-bold">{title}</h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </div>

        <div className="mt-5 grid gap-3">
          {signupJourney.map((step, index) => (
            <div key={step} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/75 px-3 py-3 shadow-card">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
              <span className="text-sm font-semibold">{step}</span>
            </div>
          ))}
        </div>

        {benefits.length > 0 && (
          <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
            {benefits.slice(0, 6).map((benefit) => (
              <li key={benefit} className="flex items-start gap-2 rounded-2xl bg-background/35 px-3 py-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-deep" />
                {benefit}
              </li>
            ))}
          </ul>
        )}

        {mode === "guest" ? (
          <Button asChild size="lg" className="mt-6 h-14 w-full rounded-full gradient-warm text-base font-semibold shadow-warm">
            <Link to="/auth">Join Care+ membership <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        ) : (
          <Button size="lg" className="mt-6 h-14 w-full rounded-full gradient-warm text-base font-semibold shadow-warm" onClick={onJoin} disabled={loading}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Crown className="mr-2 h-4 w-4" />}
            {mode === "rejoin" ? "Rejoin Care+ membership" : "Activate Care+ membership"}
          </Button>
        )}

        <p className="mt-3 text-center text-xs text-muted-foreground">Benefits activate only after backend payment confirmation. No sensitive home access details are sent by email.</p>
      </div>
    </div>
  );
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl bg-background/10 p-3">
    <p className="font-display text-xl font-bold">{value}</p>
    <p className="text-xs text-background/70">{label}</p>
  </div>
);

export default CarePlus;
