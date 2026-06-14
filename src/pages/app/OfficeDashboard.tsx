import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CheckCircle2, Clock3, Coffee, DoorOpen, LifeBuoy, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PropertyProfileCard, SmartReminderList } from "@/components/care-plus/CarePlusShowcase";
import { smartReminders } from "@/data/care-plus";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PropertyProfile } from "@/types/care-plus";

const mapOfficeAccount = (row: Record<string, unknown>): PropertyProfile => ({
  id: String(row.id ?? crypto.randomUUID()),
  name: String(row.name ?? row.property_name ?? "Saved office"),
  type: "small_office",
  suburb: String(row.suburb ?? row.location ?? "Saved suburb"),
  defaultService: String(row.default_service ?? "Small office clean"),
  readinessScore: Number(row.readiness_score ?? 0),
  turnoverInstructions: typeof row.turnover_instructions === "string" ? row.turnover_instructions : undefined,
  cleaningHistoryCount: Number(row.cleaning_history_count ?? 0),
  nextRecommendedBooking: typeof row.next_recommended_booking === "string" ? row.next_recommended_booking : undefined,
});

const roomPriorities = [
  { room: "Reception", detail: "Floors, bins, visitor surface wipe", score: 90 },
  { room: "Boardroom", detail: "Glass, table polish, cups reset", score: 84 },
  { room: "Kitchen", detail: "Bins, counters, fridge handle, sink", score: 78 },
];

const accessNotes = [
  "Parking bay B12 after 17:00",
  "Reception code stored only inside the app",
  "Use low-scent products for allergy-sensitive team members",
];

const OfficeDashboard = () => {
  const { user } = useAuth();
  const [officeProfiles, setOfficeProfiles] = useState<PropertyProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const refreshProfiles = useCallback(async () => {
    if (!user) {
      setOfficeProfiles([]);
      setLoadingProfiles(false);
      return;
    }

    // TODO: replace with real query - supabase.from('property_accounts') should become a typed property profile hook once schema generation catches up.
    const { data } = await (supabase as any)
      .from("property_accounts")
      .select("id,name,property_name,type,suburb,location,default_service,readiness_score,turnover_instructions,cleaning_history_count,next_recommended_booking")
      .eq("user_id", user.id)
      .eq("type", "small_office");
    setOfficeProfiles(Array.isArray(data) ? data.map(mapOfficeAccount) : []);
    setLoadingProfiles(false);
  }, [user]);

  useEffect(() => { refreshProfiles(); }, [refreshProfiles]);

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
          <Button asChild className="rounded-full gradient-warm" onClick={() => haptic("impact")}>
            <Link to="/app"><Plus className="mr-2 h-4 w-4" /> Book office clean</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Recurring schedule", "Tue/Fri", "Earlier slot access"],
          ["Room priorities", "Boardroom", "Reception next"],
          ["Replacement support", "Priority", "Not guaranteed"],
          ["ZootCred", "1.5x", "Completed bookings"],
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
              <h2 className="font-display text-3xl font-bold">Default office flow</h2>
            </div>
            <Coffee className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-4">
            {roomPriorities.map((room) => (
              <div key={room.room} className="rounded-2xl bg-muted/50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{room.room}</p>
                    <p className="text-sm text-muted-foreground">{room.detail}</p>
                  </div>
                  <span className="text-sm font-bold text-sage-deep">{room.score}%</span>
                </div>
                <Progress value={room.score} />
              </div>
            ))}
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
            {accessNotes.map((note) => (
              <div key={note} className="flex items-start gap-3 rounded-2xl bg-muted/50 p-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-sage-deep" />
                <span className="text-sm font-medium">{note}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-3xl border border-accent/20 bg-accent-soft p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-sage-deep"><Sparkles className="h-4 w-4" /> Care+ prompt</p>
            <p className="mt-1 text-sm text-muted-foreground">Your usual Tuesday morning slot is available. Reserve it before the week fills up.</p>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Office profiles</h2>
          {loadingProfiles ? (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">Loading saved office profiles...</Card>
          ) : officeProfiles.length > 0 ? (
            officeProfiles.map((profile) => <PropertyProfileCard key={profile.id} profile={profile} />)
          ) : (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">No office profiles saved yet.</Card>
          )}
          <Card className="rounded-3xl p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-display text-xl font-bold">Next recommended booking</p>
                <p className="text-sm text-muted-foreground">Tuesday 08:00 before the team arrives.</p>
              </div>
              <Clock3 className="h-7 w-7 text-primary" />
            </div>
          </Card>
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Office reminders</h2>
          <SmartReminderList reminders={smartReminders.filter((reminder) => reminder.intent === "slot" || reminder.intent === "default_addon")} />
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
