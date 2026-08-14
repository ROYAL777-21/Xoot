import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, Clock3, Coffee, DoorOpen, LifeBuoy, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PropertyProfileCard, SmartReminderList } from "@/components/care-plus/CarePlusShowcase";
import { haptic } from "@/lib/haptics";
import { useHouseholdOperatingLayer } from "@/hooks/useHouseholdOperatingLayer";

const OfficeDashboard = () => {
  const household = useHouseholdOperatingLayer();
  const officeProfiles = useMemo(
    () => household.propertyProfiles.filter((profile) => profile.type === "small_office"),
    [household.propertyProfiles],
  );
  const officeReadiness = officeProfiles.length
    ? Math.round(officeProfiles.reduce((sum, profile) => sum + profile.readinessScore, 0) / officeProfiles.length)
    : 0;
  const latestBooking = household.recentBookings[0];
  const workplaceMode = household.readyModes.find((mode) => mode.id === "workplace-ready");

  return (
    <div className="container max-w-6xl py-8 lg:py-12">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-sage/15 px-3 py-1">
            <Building2 className="h-3 w-3 text-sage-deep" />
            <span className="text-xs font-medium text-sage-deep">Small office dashboard</span>
          </div>
          <h1 className="font-display text-4xl font-bold md:text-5xl">Workplace readiness</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Recurring schedules, room priorities, access notes, product preferences and support handling for small offices that need calm, consistent operations.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" className="rounded-full" onClick={() => haptic("selection")}>
            <Link to="/app/properties"><DoorOpen className="mr-2 h-4 w-4" /> Manage office profile</Link>
          </Button>
          <Button asChild className="rounded-full" onClick={() => haptic("impact")}>
            <Link to="/app"><Plus className="mr-2 h-4 w-4" /> Book office clean</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Office profiles", String(officeProfiles.length), "Saved workplace locations"],
          ["Readiness", `${officeReadiness}%`, "Average profile completion"],
          ["Latest booking", latestBooking ? latestBooking.status.replace(/_/g, " ") : "None yet", latestBooking?.service ?? "Book when ready"],
          ["Service recovery", String(household.serviceRecovery.length), "Open support signals"],
        ].map(([label, value, note]) => (
          <Card key={label} className="rounded-3xl p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className="mt-2 font-display text-3xl font-bold">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{note}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="rounded-3xl p-6 shadow-card">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sage-deep">Room priorities</p>
              <h2 className="font-display text-3xl font-bold">Saved office readiness</h2>
            </div>
            <Coffee className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-4">
            {officeProfiles.length > 0 ? officeProfiles.slice(0, 3).map((profile) => (
              <div key={profile.id} className="rounded-2xl bg-muted/50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{profile.name}</p>
                    <p className="text-sm text-muted-foreground">{profile.turnoverInstructions}</p>
                  </div>
                  <span className="text-sm font-bold text-sage-deep">{profile.readinessScore}%</span>
                </div>
                <Progress value={profile.readinessScore} />
              </div>
            )) : (
              <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground">
                Save an office profile to track workplace access, cleaning preferences and recurring service rhythm.
              </div>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl p-6 shadow-card">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sage-deep">Access and safety</p>
              <h2 className="font-display text-3xl font-bold">Protected instructions</h2>
            </div>
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-3">
            {[
              household.homeMemory?.parkingInstructions ?? "No parking instructions saved yet.",
              household.homeMemory?.cleaningPreferences ?? "No workplace cleaning preferences saved yet.",
              household.homeMemory?.hasAccessNotes ? "Access notes are saved inside the authenticated app." : "No protected access notes saved yet.",
            ].map((note) => (
              <div key={note} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-sage-deep" />
                <span className="text-sm font-medium">{note}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-accent/20 bg-accent-soft p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-accent-ink"><Sparkles className="h-4 w-4" /> Care+ prompt</p>
            <p className="mt-1 text-sm text-muted-foreground">{household.lifecycleTriggers[0]?.message ?? workplaceMode?.summary ?? "Add a workplace profile to unlock office-specific reminders."}</p>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Office profiles</h2>
          {household.loading ? (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">Loading saved office profiles...</Card>
          ) : officeProfiles.length > 0 ? (
            officeProfiles.map((profile) => <PropertyProfileCard key={profile.id} profile={profile} />)
          ) : (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">No office profiles saved yet.</Card>
          )}
          <Card className="rounded-3xl p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold">Next recommended action</p>
                <p className="text-sm text-muted-foreground">{household.lifecycleTriggers[0]?.cta ?? "Save an office profile"}</p>
              </div>
              <Clock3 className="h-7 w-7 text-primary" />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Office reminders</h2>
          {household.lifecycleTriggers.length > 0 ? (
            <SmartReminderList reminders={household.lifecycleTriggers.filter((reminder) => reminder.intent === "slot" || reminder.intent === "default_addon" || reminder.intent === "rebook")} />
          ) : (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">No office reminders yet. Save a profile or complete a booking to unlock pattern-based prompts.</Card>
          )}
          <Card className="rounded-3xl p-5 shadow-card">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-display text-xl font-bold">Priority support</p>
                <p className="text-sm text-muted-foreground">Service concerns, cancellations and replacement matching route with Care+ context.</p>
              </div>
              <Button asChild variant="outline" className="rounded-full" onClick={() => haptic("warning")}>
                <Link to="/app/support"><LifeBuoy className="mr-2 h-4 w-4" /> Open support</Link>
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OfficeDashboard;
