import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Briefcase, Calendar, MapPin, Loader2, Check, X, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { haptic } from "@/lib/haptics";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";

const Jobs = () => {
  const { user } = useAuth();
  const [zooterId, setZooterId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async (zid: string) => {
    const { data } = await supabase
      .from("zooter_jobs")
      .select("*, bookings:booking_id(id, service, service_type, scheduled_at, price, duration_hours, status, job_completed_at, cancelled_at, user_id)")
      .eq("zooter_id", zid)
      .order("offered_at", { ascending: false });
    setJobs(data ?? []);
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: z } = await supabase.from("zooters").select("id").eq("user_id", user.id).maybeSingle();
      if (z) { setZooterId(z.id); await load(z.id); }
      setLoading(false);
    })();
  }, [user]);

  const respond = async (jobId: string, bookingId: string, accept: boolean) => {
    haptic(accept ? "success" : "warning");
    try {
      await invokeOpsWorkflow({
        action: "zooter_job_response",
        jobId,
        bookingId,
        accept,
      });
      toast.success(accept ? "Job accepted" : "Job declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Job response failed");
    }
    if (zooterId) load(zooterId);
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!zooterId) {
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
      <p className="text-muted-foreground mb-8">Accept jobs that fit your schedule. Client address details stay protected and are not exposed in this offer list.</p>

      <Section title="New offers" jobs={grouped.offered} respond={respond} actions />
      <Section title="Upcoming" jobs={grouped.accepted} respond={respond} />
      <Section title="History" jobs={grouped.history} respond={respond} />
    </div>
  );
};

const Section = ({ title, jobs, respond, actions = false }: any) => (
  <div className="mb-10">
    <h2 className="font-display text-2xl font-bold mb-3">{title}</h2>
    {jobs.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nothing here yet.</p>
    ) : (
      <div className="space-y-3">
        {jobs.map((j: any) => {
          const b = j.bookings;
          if (!b) return null;
          return (
            <Card key={j.id} className="p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="min-w-0">
                  <p className="font-display text-lg font-bold capitalize mb-1">{b.service_type ?? b.service}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(b.scheduled_at).toLocaleString()}</span>
                    <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Address unlocks through secure booking details near the appointment window</span>
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
            </Card>
          );
        })}
      </div>
    )}
  </div>
);

export default Jobs;
