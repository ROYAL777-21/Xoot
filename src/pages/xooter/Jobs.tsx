import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, MapPin, Loader2, Check, X, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";
import { getAcceptedXooterJobAddress, getSensitiveAccessAvailability } from "@/lib/operations";
import { SensitiveFieldReveal } from "@/components/xoot/SensitiveFieldReveal";
import { JobChecklist } from "@/components/xooter/JobChecklist";
import { isEligibleXooterProfile, parseWebXooterJobCards, type WebXooterJob } from "@/lib/xooter-web-job-cards";


type JobViewState = {
  jobs: WebXooterJob[];
  xooterId: string | null;
  eligibility: 'guest' | 'missing' | 'pending' | 'verified';
  loading: boolean;
  error: string | null;
};

const XooterJobsForAccount = ({ userId }: { userId: string | null }) => {
  const [state, setState] = useState<JobViewState>({
    jobs: [], xooterId: null, eligibility: userId ? 'missing' : 'guest',
    loading: Boolean(userId), error: null,
  });
  const [requestVersion, setRequestVersion] = useState(0);
  const [respondingJobId, setRespondingJobId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState({ jobs: [], xooterId: null, eligibility: userId ? 'missing' : 'guest',
      loading: Boolean(userId), error: null });
    if (!userId) return () => { active = false; };
    void (async () => {
      try {
        const { data: worker, error: workerError } = await supabase.from('xooters')
          .select('id,user_id,active,background_check_status')
          .eq('user_id', userId).maybeSingle();
        if (!active) return;
        if (workerError) throw workerError;
        if (!worker) {
          setState({ jobs: [], xooterId: null, eligibility: 'missing', loading: false, error: null });
          return;
        }
        if (!isEligibleXooterProfile(worker, userId)) {
          setState({ jobs: [], xooterId: null, eligibility: 'pending', loading: false, error: null });
          return;
        }
        const { data, error } = await supabase.functions.invoke('get-xooter-job-cards', { body: {} });
        if (!active) return;
        if (error) throw error;
        const jobs = parseWebXooterJobCards(data, worker.id);
        if (!jobs) throw new Error('Unexpected authenticated job-card response');
        setState({ jobs, xooterId: worker.id, eligibility: 'verified', loading: false, error: null });
      } catch {
        if (active) setState({ jobs: [], xooterId: null, eligibility: 'missing',
          loading: false, error: 'Your Xooter job offers could not be verified. Please retry.' });
      }
    })();
    return () => { active = false; };
  }, [userId, requestVersion]);

  const respond = async (jobId: string, bookingId: string, accept: boolean) => {
    if (!userId || !state.xooterId || state.eligibility !== 'verified' ||
        respondingJobId || !state.jobs.some(j =>
          j.id === jobId && j.booking_id === bookingId && j.state === 'offered')) return;
    setRespondingJobId(jobId);
    try {
      await invokeOpsWorkflow({ action: 'xooter_job_response', jobId, bookingId, accept });
      haptic(accept ? 'success' : 'warning');
      toast.success(accept ? 'Job accepted' : 'Job declined');
      setRequestVersion(value => value + 1);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Job response failed');
    } finally {
      setRespondingJobId(null);
    }
  };

  if (state.loading) return <div className="grid place-items-center py-20">
    <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading Xooter jobs" />
  </div>;
  if (state.error) return <div className="container py-12 max-w-3xl">
    <Card className="p-8 rounded-3xl text-center">
      <p className="font-display text-2xl font-bold mb-2">Jobs are unavailable</p>
      <p className="text-muted-foreground">{state.error}</p>
      <Button className="mt-4" onClick={() => setRequestVersion(value => value + 1)}>Try again</Button>
    </Card>
  </div>;
  if (state.eligibility !== 'verified' || !state.xooterId) {
    return <div className="container py-12 max-w-3xl">
      <Card className="p-8 rounded-3xl text-center">
        <Briefcase className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="font-display text-2xl font-bold mb-1">
          {state.eligibility === 'guest' ? 'Sign in to view Xooter jobs' : 'Verification required'}
        </p>
        <p className="text-muted-foreground">
          {state.eligibility === 'guest'
            ? 'Your job offers belong to your signed-in Xoot account.'
            : state.eligibility === 'pending'
              ? 'Job offers require an active Xooter profile with approved background checks.'
              : 'Finish your verified application before receiving job offers.'}
        </p>
      </Card>
    </div>;
  }

  const grouped = {
    offered: state.jobs.filter(j => j.state === 'offered'),
    accepted: state.jobs.filter(j => j.state === 'accepted'),
    history: state.jobs.filter(j => ['declined', 'expired', 'completed'].includes(j.state)),
  };
  return <div className="container py-8 lg:py-12 max-w-5xl">
    <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Jobs</h1>
    <p className="text-muted-foreground mb-8">Review your recorded offers and assignments. Customer addresses remain protected until accepted; household access details are time-locked and logged.</p>
    <Section title="New offers" jobs={grouped.offered} respond={respond}
      actions respondingJobId={respondingJobId} />
    <Section title="Upcoming" jobs={grouped.accepted} respond={respond} revealAccess />
    <Section title="History" jobs={grouped.history} respond={respond} revealAccess />
  </div>;
};
const Jobs = () => {
  const { user } = useAuth();
  // Key by account so private jobs cannot flash across an account change even
  // before React has run the effect that refreshes the new user's state.
  return <XooterJobsForAccount key={user?.id ?? 'guest'} userId={user?.id ?? null} />;
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

const Section = ({ title, jobs, respond, actions = false, revealAccess = false, respondingJobId = null }: {
  title: string;
  jobs: WebXooterJob[];
  respond: (jobId: string, bookingId: string, accept: boolean) => Promise<void>;
  actions?: boolean;
  revealAccess?: boolean;
  respondingJobId?: string | null;
}) => (
  <div className="mb-10">
    <h2 className="font-display text-2xl font-bold mb-3">{title}</h2>
    {jobs.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nothing here yet.</p>
    ) : (
      <div className="space-y-3">
        {jobs.map((j) => {
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
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />
                      {b.scheduled_at ? new Date(b.scheduled_at).toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' }) : 'Time to be confirmed'}
                    </span>
                    <span className="inline-flex min-w-0 items-start gap-1">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      {acceptedAddress ?? "Address shown after you accept the job"}
                    </span>
                    <span className="inline-flex items-center gap-1">{
                      b.duration_hours !== null ? `${b.duration_hours} booked hours` : 'Duration to be confirmed'
                    }</span>
                  </div>
                </div>
                {actions && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" disabled={respondingJobId !== null} onClick={() => void respond(j.id, b.id, false)}><X className="h-4 w-4 mr-1" /> Decline</Button>
                    <Button size="sm" className="gradient-warm" disabled={respondingJobId !== null} onClick={() => void respond(j.id, b.id, true)}><Check className="h-4 w-4 mr-1" /> Accept</Button>
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
              {j.state === "accepted" && <div className="mt-5 border-t border-border/70 pt-4"><JobChecklist jobId={j.id} bookingId={b.id} /></div>}
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

export default Jobs;
