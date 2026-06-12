import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, CheckCircle2, Loader2, ShieldAlert, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";

const Ops = () => {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<any[]>([]);
  const [outbox, setOutbox] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [followups, setFollowups] = useState<any[]>([]);
  const [bookingAnalytics, setBookingAnalytics] = useState<any[]>([]);
  const [qualityAnalytics, setQualityAnalytics] = useState<any[]>([]);

  const refresh = async () => {
    const [paymentRows, outboxRows, reviewRows, followupRows, bookingRows, qualityRows] = await Promise.all([
      (supabase as any).from("payment_records").select("*").order("created_at", { ascending: false }).limit(12),
      (supabase as any).from("integration_outbox").select("*").order("created_at", { ascending: false }).limit(12),
      (supabase as any).from("admin_review_queue").select("*").order("created_at", { ascending: false }).limit(12),
      (supabase as any).from("support_followups").select("*").order("created_at", { ascending: false }).limit(12),
      (supabase as any).from("analytics_booking_summary").select("*").order("day", { ascending: false }).limit(8),
      (supabase as any).from("analytics_contractor_quality").select("*").order("reliability_score", { ascending: true }).limit(8),
    ]);
    setPayments(paymentRows.data ?? []);
    setOutbox(outboxRows.data ?? []);
    setReviews(reviewRows.data ?? []);
    setFollowups(followupRows.data ?? []);
    setBookingAnalytics(bookingRows.data ?? []);
    setQualityAnalytics(qualityRows.data ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const runAdminAction = async (body: Record<string, unknown>) => {
    try {
      await invokeOpsWorkflow(body);
      toast.success("Queue updated");
      refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Queue update failed");
    }
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 lg:py-12 max-w-7xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
          <BarChart3 className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">Admin operations</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Zoot operating queues</h1>
        <p className="text-muted-foreground mt-2">Payments, integrations, support, trust review, and analytics in one admin surface.</p>
      </div>

      <div className="grid sm:grid-cols-4 gap-4 mb-8">
        <Stat icon={WalletCards} label="Pending payments" value={payments.filter((p) => p.status === "pending").length} />
        <Stat icon={BarChart3} label="Outbox queued" value={outbox.filter((o) => ["queued", "needs_approval"].includes(o.status)).length} />
        <Stat icon={ShieldAlert} label="Open reviews" value={reviews.filter((r) => r.status === "open").length} />
        <Stat icon={CheckCircle2} label="Support follow-ups" value={followups.filter((f) => f.status === "open").length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Queue title="Payment records" rows={payments} empty="No payment records.">
          {(row) => (
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-semibold">{row.payment_kind} - {formatZAR(Number(row.amount))}</p><p className="text-xs text-muted-foreground">{row.status} via {row.provider}</p></div>
              {row.status === "pending" && <Button size="sm" variant="outline" onClick={() => runAdminAction({ action: "admin_confirm_payment_record", paymentRecordId: row.id })}>Admin confirm</Button>}
            </div>
          )}
        </Queue>

        <Queue title="Integration outbox" rows={outbox} empty="No integration events.">
          {(row) => (
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-semibold">{row.event_type}</p><p className="text-xs text-muted-foreground">{row.channel} - {row.status}</p></div>
              {["queued", "needs_approval"].includes(row.status) && <Button size="sm" variant="outline" onClick={() => runAdminAction({ action: "admin_complete_outbox_event", outboxId: row.id })}>Mark done</Button>}
            </div>
          )}
        </Queue>

        <Queue title="Admin review queue" rows={reviews} empty="No admin review items.">
          {(row) => (
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-semibold">{row.summary}</p><p className="text-xs text-muted-foreground">{row.queue_type} - {row.priority} - {row.status}</p></div>
              {row.status === "open" && <Button size="sm" variant="outline" onClick={() => runAdminAction({ action: "admin_resolve_review_item", reviewId: row.id, resolutionNotes: "Resolved from admin ops" })}>Resolve</Button>}
            </div>
          )}
        </Queue>

        <Queue title="Support follow-ups" rows={followups} empty="No support follow-ups.">
          {(row) => (
            <div className="flex items-center justify-between gap-3">
              <div><p className="font-semibold">{row.trigger_type}</p><p className="text-xs text-muted-foreground">{row.priority} - {row.status}</p></div>
              {row.status === "open" && <Button size="sm" variant="outline" onClick={() => runAdminAction({ action: "admin_close_support_followup", followupId: row.id })}>Close</Button>}
            </div>
          )}
        </Queue>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Queue title="Booking analytics" rows={bookingAnalytics} empty="No booking analytics yet.">
          {(row) => <div><p className="font-semibold">{row.launch_region} - {row.service_type}</p><p className="text-xs text-muted-foreground">{row.booking_count} bookings - {formatZAR(Number(row.gross_revenue ?? 0))}</p></div>}
        </Queue>
        <Queue title="Contractor quality" rows={qualityAnalytics} empty="No contractor quality rows yet.">
          {(row) => <div><p className="font-semibold">{row.name}</p><p className="text-xs text-muted-foreground">Reliability {row.reliability_score} - completion {Math.round(Number(row.job_completion_rate ?? 0))}% - open incidents {row.open_incident_count}</p></div>}
        </Queue>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: any) => (
  <Card className="p-5 rounded-2xl">
    <Icon className="h-5 w-5 text-primary mb-3" />
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-display text-3xl font-bold">{value}</p>
  </Card>
);

const Queue = ({ title, rows, empty, children }: { title: string; rows: any[]; empty: string; children: (row: any) => React.ReactNode }) => (
  <Card className="p-5 rounded-3xl">
    <h2 className="font-display text-xl font-bold mb-4">{title}</h2>
    {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
      <div className="space-y-3">
        {rows.map((row) => <div key={row.id ?? `${title}-${JSON.stringify(row)}`} className="rounded-2xl border border-border p-3">{children(row)}</div>)}
      </div>
    )}
  </Card>
);

export default Ops;
