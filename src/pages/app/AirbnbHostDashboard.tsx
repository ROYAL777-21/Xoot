import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BedDouble, Camera, CheckCircle2, Clock, Home, LifeBuoy, ListChecks, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PropertyProfilePreview, SmartReminderList } from "@/components/care-plus/CarePlusShowcase";
import { smartReminders } from "@/data/care-plus";
import { haptic } from "@/lib/haptics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { PropertyProfile } from "@/types/care-plus";

const mapPropertyAccount = (row: Record<string, unknown>): PropertyProfile => ({
  id: String(row.id ?? crypto.randomUUID()),
  name: String(row.name ?? row.property_name ?? "Saved property"),
  type: (row.type === "landlord" ? "landlord" : "airbnb"),
  suburb: String(row.suburb ?? row.location ?? "Saved suburb"),
  defaultService: String(row.default_service ?? "Airbnb turnover clean"),
  readinessScore: Number(row.readiness_score ?? 0),
  turnoverInstructions: typeof row.turnover_instructions === "string" ? row.turnover_instructions : undefined,
  cleaningHistoryCount: Number(row.cleaning_history_count ?? 0),
  nextRecommendedBooking: typeof row.next_recommended_booking === "string" ? row.next_recommended_booking : undefined,
});

const turnoverTasks = [
  "Lockbox code checked inside the app",
  "Linen reset and guest towels",
  "Fridge, bins and surfaces photographed",
  "Before/after proof attached after completion",
];

const recentHistory = [
  { property: "Rosebank guest loft", date: "27 May", status: "Guest-ready", zooter: "Nomsa" },
  { property: "Melville cottage", date: "24 May", status: "Photo proof complete", zooter: "Aisha" },
  { property: "Sandton studio", date: "20 May", status: "Turnover completed", zooter: "Nomsa" },
];

const AirbnbHostDashboard = () => {
  const { user } = useAuth();
  const [hostProperties, setHostProperties] = useState<PropertyProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const refreshProperties = useCallback(async () => {
    if (!user) {
      setHostProperties([]);
      setLoadingProfiles(false);
      return;
    }

    // TODO: replace with real query - supabase.from('property_accounts') should become a typed property profile hook once schema generation catches up.
    const { data } = await (supabase as any)
      .from("property_accounts")
      .select("id,name,property_name,type,suburb,location,default_service,readiness_score,turnover_instructions,cleaning_history_count,next_recommended_booking")
      .eq("user_id", user.id)
      .in("type", ["airbnb", "landlord"]);
    setHostProperties(Array.isArray(data) ? data.map(mapPropertyAccount) : []);
    setLoadingProfiles(false);
  }, [user]);

  useEffect(() => { refreshProperties(); }, [refreshProperties]);

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
          <Button asChild className="rounded-full gradient-warm" onClick={() => haptic("impact")}>
            <Link to="/app"><Plus className="mr-2 h-4 w-4" /> Schedule turnover</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[
          ["Guest-ready score", "92%", "3 turnovers this week"],
          ["Next check-in", "14:00", "Rosebank guest loft"],
          ["Photo proof", "8 sets", "Before/after stored"],
          ["Support", "Priority", "Care+ host profile"],
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
              <h2 className="font-display text-3xl font-bold">Today&apos;s turnover checklist</h2>
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
            <p className="flex items-center gap-2 text-sm font-semibold text-sage-deep"><Sparkles className="h-4 w-4" /> Care+ prompt</p>
            <p className="mt-1 text-sm text-muted-foreground">Guest arriving soon? Schedule an Airbnb turnover clean.</p>
          </div>
        </Card>

        <Card className="rounded-3xl p-6 shadow-card">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-sage-deep">Readiness</p>
              <h2 className="font-display text-3xl font-bold">Rosebank guest loft</h2>
            </div>
            <Clock className="h-8 w-8 text-primary" />
          </div>
          <Progress value={92} className="mb-4" />
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Turnover time</p>
              <p className="mt-1 font-display text-2xl font-bold">11:00</p>
            </div>
            <div className="rounded-2xl bg-muted/50 p-3">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Check-in</p>
              <p className="mt-1 font-display text-2xl font-bold">14:00</p>
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
          {loadingProfiles ? (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">Loading saved host properties...</Card>
          ) : hostProperties.length > 0 ? (
            hostProperties.map((profile) => <PropertyProfilePreview key={profile.id} profile={profile} />)
          ) : (
            <Card className="rounded-3xl p-5 text-sm text-muted-foreground shadow-card">No Airbnb or landlord property profiles saved yet.</Card>
          )}
        </div>
        <div className="space-y-4">
          <h2 className="font-display text-2xl font-bold">Host reminders</h2>
          <SmartReminderList reminders={smartReminders.filter((reminder) => reminder.intent === "turnover" || reminder.intent === "slot")} />
          <Card className="rounded-3xl p-5 shadow-card">
            <h3 className="font-display text-xl font-bold mb-3">Cleaning history</h3>
            <div className="space-y-3">
              {recentHistory.map((item) => (
                <div key={`${item.property}-${item.date}`} className="flex items-center justify-between gap-3 rounded-2xl bg-muted/50 p-3 text-sm">
                  <div>
                    <p className="font-semibold">{item.property}</p>
                    <p className="text-muted-foreground">{item.date} - {item.zooter}</p>
                  </div>
                  <span className="rounded-full bg-sage/15 px-3 py-1 text-xs font-bold text-sage-deep">{item.status}</span>
                </div>
              ))}
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
