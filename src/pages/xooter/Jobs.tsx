import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, MapPin, Loader2, Check, X, DollarSign, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";
import { getAcceptedXooterJobAddress, getSensitiveAccessAvailability } from "@/lib/operations";
import { SensitiveFieldReveal } from "@/components/xoot/SensitiveFieldReveal";

const Jobs = () => {
  const { user } = useAuth();
  const [xooterId, setXooterId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data, error } = await supabase.functions.invoke("get-xooter-job-cards");
    if (error) {
      console.warn("Xooter jobs lookup failed", error.message);
      setJobs([]);
      return;
    }

    setJobs(((data?.jobs ?? []) as any[]).map((job) => ({
      id: job.job_id,
      booking_id: job.booking_id,
      xooter_id: job.xooter_id,
      state: job.state,
      offered_at: job.offered_at,
      responded_at: job.responded_at,
      decline_reason: job.decline_reason,
      destination_address: job.destination_address,
      bookings: {
        id: job.booking_id,
        service: job.service,
        service_type: job.service_type,
        scheduled_at: job.scheduled_at,
        price: job.price,
        duration_hours: job.duration_hours,
        status: job.status,
        job_completed_at: job.job_completed_at,
        completed_at: job.completed_at,
        cancelled_at: job.cancelled_at,
        sensitive_data_revoked_at: job.sensitive_data_revoked_at,
        sensitive_access_available_notified_at: job.sensitive_access_available_notified_at,
        user_id: job.user_id,
      },
    })));
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: z } = await supabase.from("xooters").select("id").eq("user_id", user.id).maybeSingle();
      if (z) { setXooterId(z.id); await load(); }
      setLoading(false);
    })();
  }, [user]);

  const respond = async (jobId: string, bookingId: string, accept: boolean) => {
    haptic(accept ? "success" : "warning");
    try {
      await invokeOpsWorkflow({
        action: "xooter_job_response",
        jobId,
        bookingId,
        accept,
      });
      toast.success(accept ? "Job accepted" : "Job declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Job response failed");
    }
    if (xooterId) load();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!xooterId) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card className="p-8 rounded-3xl text-center">
          <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-display text-2xl font-bold mb-1">Verification required</p>
          <p className="text-muted-foreground">Finish your application to start receiving job offers.</p>
        </Card>
      </div>
    );
  }

  const grouped = {
    offered: jobs.filter((j) => j.state === "offered"),
    accepted: jobs.filter((j) => j.state === "accepted"),
    history: jobs.filter((j) => ["declined", "expired", "completed"].includes(j.state)),
  };

  return (
    <div className="container py-8 lg:py-12 max-w-5xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Jobs</h1>
      <p className="text-muted-foreground mb-8">Accept jobs that fit your schedule. The destination appears after acceptance; household access details remain time-locked and logged.</p>

      <Section title="New offers" jobs={grouped.offered} respond={respond} actions />
      <Section title="Upcoming" jobs={grouped.accepted} respond={respond} revealAccess />
      <Section title="History" jobs={grouped.history} respond={respond} revealAccess />
    </div>
  );
};

const getSensitiveAccessState = (booking: any) => {
  if (!booking) return { state: "closed" as const, opensAt: null, minutesUntilOpen: 0 };
  return getSensitiveAccessAvailability({
    scheduledAt: booking.scheduled_at,
    status: booking.status,
    completedAt: booking.completed_at ?? booking.job_completed_at,
    cancelledAt: booking.cancelled_at,
    sensitiveDataRevokedAt: booking.sensitive_data_revoked_at,
    durationHours: booking.duration_hours,
  });
};

const Section = ({ title, jobs, respond, actions = false, revealAccess = false }: any) => (
  <div className="mb-10">
    <h2 className="font-display text-2xl font-bold mb-3">{title}</h2>
    {jobs.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nothing here yet.</p>
    ) : (
      <div className="space-y-3">
        {jobs.map((j: any) => {
          const b = j.bookings;
          if (!b) return null;
          const accessState = getSensitiveAccessState(b);
          const withinWindow = accessState.state === "available";
          const canShowReveal = revealAccess && j.state !== "declined" && j.state !== "expired";
          const acceptedAddress = getAcceptedXooterJobAddress({
            jobState: j.state,
            address: j.destination_address,
          });
          return (
            <Card key={j.id} className="p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold capitalize mb-1">{b.service_type ?? b.service}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(b.scheduled_at).toLocaleString()}</span>
                    <span className="inline-flex min-w-0 items-start gap-1">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      {acceptedAddress ?? "Address shown after you accept the job"}
                    </span>
                    <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" /> {formatZAR(Number(b.price))} - {b.duration_hours}h</span>
                  </div>
                </div>
                {actions && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => respond(j.id, b.id, false)}><X className="h-4 w-4 mr-1" /> Decline</Button>
                    <Button size="sm" className="gradient-warm" onClick={() => respond(j.id, b.id, true)}><Check className="h-4 w-4 mr-1" /> Accept</Button>
                  </div>
                )}
              </div>
              {canShowReveal && (
                <div className="mt-5 border-t border-border/70 pt-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <LockKeyhole className={`h-4 w-4 ${withinWindow ? "text-sage-deep" : "text-muted-foreground"}`} />
                      Access information
                    </p>
                    {accessState.state === "available" ? (
                      <p className="text-xs font-medium text-sage-deep">Available now. Viewing is logged.</p>
                    ) : accessState.state === "locked" ? (
                      <p className="text-xs text-muted-foreground">
                        Unlocks {new Date(accessState.opensAt).toLocaleString()}.
                        {" "}We will notify you when it becomes available, 45 minutes before the scheduled start.
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Access is not available for this booking.</p>
                    )}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <SensitiveFieldReveal bookingId={b.id} field="gate_code" label="Gate code" withinWindow={withinWindow} />
                    <SensitiveFieldReveal bookingId={b.id} field="alarm_code" label="Alarm code" withinWindow={withinWindow} />
                    <SensitiveFieldReveal bookingId={b.id} field="access_instructions" label="Access instructions" withinWindow={withinWindow} />
                    <SensitiveFieldReveal bookingId={b.id} field="parking_instructions" label="Parking instructions" withinWindow={withinWindow} />
                    <SensitiveFieldReveal bookingId={b.id} field="pet_notes" label="Pet notes" withinWindow={withinWindow} className="md:col-span-2" />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

export default Jobs;
