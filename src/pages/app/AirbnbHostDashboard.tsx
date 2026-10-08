import { useMemo } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Camera, CheckCircle2, Clock, Home, LifeBuoy, ListChecks, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PropertyProfileCard, SmartReminderList } from "@/components/care-plus/CarePlusShowcase";
import { haptic } from "@/lib/haptics";
import { useHouseholdOperatingLayer } from "@/hooks/useHouseholdOperatingLayer";

const turnoverTasks = [
  "Lockbox code checked inside the app",
  "Linen reset and guest towels",
  "Fridge, bins and surfaces photographed",
  "Before/after proof attached after completion",
];

const AirbnbHostDashboard = () => {
  const household = useHouseholdOperatingLayer();
  const hostProperties = useMemo(
    () => household.propertyProfiles.filter((profile) => profile.type === "airbnb" || profile.type === "landlord"),
    [household.propertyProfiles],
  );
  const hostReadiness = hostProperties.length
    ? Math.round(hostProperties.reduce((sum, profile) => sum + profile.readinessScore, 0) / hostProperties.length)
    : 0;
  const latestBooking = household.recentBookings[0];
  const guestReadyMode = household.readyModes.find((mode) => mode.id === "guest-ready");

  return (
    <div className="container max-w-6xl py-8 lg:py-12">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sage/15 px-3 py-1">
            <BedDouble className="h-3 w-3 text-sage-deep" />
            <span className="text-xs font-medium text-sage-deep">Airbnb host dashboard</span>
          </div>
          <h1 className="font-display text-4xl font-bold md:text-5xl">Guest-ready operations</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Track property readiness, turnover instructions, cleaning history and priority support for homes that need to be ready before guests arrive.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-full" onClick={() => haptic("selection")}>
            <Link to="/app/properties"><Home className="mr-2 h-4 w-4" /> Manage properties</Link>
          </Button>
          <Button asChild className="rounded-full" onClick={() => haptic("impact")}>
            <Link to="/app/book?service=airbnb"><Plus className="mr-2 h-4 w-4" /> Schedule turnover</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Host profiles", String(hostProperties.length), "Saved host or landlord properties"],
          ["Readiness", `${hostReadiness}%`, "Average profile completion"],
          ["Latest booking", latestBooking ? latestBooking.status.replace(/_/g, " ") : "None yet", latestBooking?.service ?? "Schedule when ready"],
          ["Support", String(household.serviceRecovery.length), "Open recovery signals"],
        ].map(([label, value, note]) => (
          <Card key={label} className="rounded-3xl p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{note}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-3xl p-6 shadow-card">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sage-deep">Guest-Ready Mode</p>
              <h2 className="font-display text-3xl font-bold">Turnover operating template</h2>
            </div>
            <ListChecks className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-3">
            {turnoverTasks.map((task) => (
              <div key={task} className="flex items-center gap-3 rounded-2xl bg-muted/50 p-3">
                <CheckCircle2 className="h-5 w-5 text-sage-deep" />
                <span className="text-sm font-medium">{task}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-accent/20 bg-accent-soft p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-ink"><Sparkles className="h-4 w-4" /> Care+ prompt</p>
            <p className="mt-1 text-sm text-muted-foreground">{household.lifecycleTriggers.find((reminder) => reminder.intent === "turnover")?.message ?? guestReadyMode?.summary ?? "Save a host property to unlock turnover planning."}</p>
          </div>
        </Card>

        <Card className="rounded-3xl p-6 shadow-card">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sage-deep">Readiness</p>
              <h2 className="font-display text-3xl font-bold">{hostProperties[0]?.name ?? "No host property yet"}</h2>
            </div>
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <Progress value={hostProperties[0]?.readinessScore ?? 0} className="mb-4" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Default service</p>
              <p className="mt-1 font-display text-2xl font-bold">{hostProperties[0]?.defaultService ?? "Not set"}</p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Readiness</p>
              <p className="mt-1 font-display text-2xl font-bold">{hostProperties[0]?.readinessScore ?? 0}%</p>
            </div>
          </div>
          <Button className="mt-5 rounded-full" variant="outline" onClick={() => haptic("selection")}>
            <Camera className="mr-2 h-4 w-4" /> Review photo proof
          </Button>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Property profiles</h2>
          {household.loading ? (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">Loading saved host properties...</Card>
          ) : hostProperties.length > 0 ? (
            hostProperties.map((profile) => <PropertyProfileCard key={profile.id} profile={profile} />)
          ) : (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">No Airbnb or landlord property profiles saved yet.</Card>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Host reminders</h2>
          {household.lifecycleTriggers.length > 0 ? (
            <SmartReminderList reminders={household.lifecycleTriggers.filter((reminder) => reminder.intent === "turnover" || reminder.intent === "slot" || reminder.intent === "rebook")} />
          ) : (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">No host reminders yet. Save a property or complete a booking to unlock pattern-based prompts.</Card>
          )}
          <Card className="rounded-3xl p-5 shadow-card">
            <h3 className="font-display text-xl font-bold mb-3">Cleaning history</h3>
            <div className="space-y-3">
              {household.recentBookings.length > 0 ? household.recentBookings.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3 text-sm">
                  <div>
                    <p className="font-semibold">{item.service}</p>
                    <p className="text-muted-foreground">{new Date(item.scheduledAt).toLocaleDateString()} - {item.durationHours}h</p>
                  </div>
                  <span className="rounded-full bg-sage/15 px-3 py-1 text-xs font-bold text-sage-deep">{item.status.replace(/_/g, " ")}</span>
                </div>
              )) : (
                <div className="rounded-2xl bg-muted/50 p-3 text-sm text-muted-foreground">No completed host booking history yet.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Card className="mt-6 rounded-3xl p-5 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-xl font-bold">Priority support for host issues</p>
            <p className="text-sm text-muted-foreground">Booking issues, cancellations and turnover concerns route into support review with Care+ context.</p>
          </div>
          <Button asChild variant="outline" className="rounded-full" onClick={() => haptic("warning")}>
            <Link to="/app/support"><LifeBuoy className="mr-2 h-4 w-4" /> Open support</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AirbnbHostDashboard;
