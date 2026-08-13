import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  ShieldAlert,
  UserCheck,
  WalletCards,
} from "lucide-react";
import { toast } from "sonner";
import { formatZAR } from "@/lib/format";
import {
  approveXooterAdmin,
  confirmPaymentAdmin,
  escalateSupportCase,
  markOutboxProcessed,
  rejectXooterAdmin,
  resolveAdminReview,
} from "@/lib/admin-actions";

const minimumReasonLength = 10;

const Ops = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [checkingMfa, setCheckingMfa] = useState(true);
  const [mfaVerified, setMfaVerified] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [payments, setPayments] = useState<any[]>([]);
  const [outbox, setOutbox] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [xooterApplications, setXooterApplications] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [bookingAnalytics, setBookingAnalytics] = useState<any[]>([]);
  const [qualityAnalytics, setQualityAnalytics] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [
      paymentRows,
      outboxRows,
      reviewRows,
      supportRows,
      applicationRows,
      auditRows,
      bookingRows,
      qualityRows,
    ] = await Promise.all([
      supabase.from("payment_records").select("*").order("created_at", { ascending: false }).limit(12),
      supabase.from("integration_outbox").select("*").order("created_at", { ascending: false }).limit(12),
      supabase.from("admin_review_queue").select("*").order("created_at", { ascending: false }).limit(12),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }).limit(12),
      supabase.from("xooter_applications").select("id,full_name,email,service_category,status,reviewer_notes,updated_at,created_at").order("updated_at", { ascending: false }).limit(12),
      supabase.from("admin_audit_log").select("id,admin_id,action,target_table,target_id,reason,changes,created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("analytics_booking_summary").select("*").order("day", { ascending: false }).limit(8),
      supabase.from("analytics_contractor_quality").select("*").order("reliability_score", { ascending: true }).limit(8),
    ]);
    setPayments(paymentRows.data ?? []);
    setOutbox(outboxRows.data ?? []);
    setReviews(reviewRows.data ?? []);
    setSupportTickets(supportRows.data ?? []);
    setXooterApplications(applicationRows.data ?? []);
    setAuditLogs(auditRows.data ?? []);
    setBookingAnalytics(bookingRows.data ?? []);
    setQualityAnalytics(qualityRows.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.mfa
      .getAuthenticatorAssuranceLevel()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || data?.currentLevel !== "aal2") {
          toast.error("Admin MFA verification is required before operating queues.");
          navigate("/auth?reauth=admin-mfa", { replace: true, state: { from: location } });
          return;
        }
        setMfaVerified(true);
        setCheckingMfa(false);
        void refresh();
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Admin MFA verification is required before operating queues.");
        navigate("/auth?reauth=admin-mfa", { replace: true, state: { from: location } });
      });

    return () => {
      cancelled = true;
    };
  }, [location, navigate, refresh]);

  const setReason = (key: string, value: string) => setReasons((current) => ({ ...current, [key]: value }));
  const getReason = (key: string) => (reasons[key] ?? "").trim();

  const requireReason = (key: string) => {
    const reason = getReason(key);
    if (reason.length < minimumReasonLength) {
      toast.error("Add a clear audit reason of at least 10 characters before continuing.");
      return null;
    }
    return reason;
  };

  const runTypedAction = async (key: string, action: () => Promise<{ data: unknown; error: unknown }>, success: string) => {
    setActionLoading(key);
    try {
      const { data, error } = await action();
      if (error) throw error;
      if ((data as any)?.success === false) throw new Error((data as any).error ?? "Admin action failed");
      toast.success(success);
      setReasons((current) => ({ ...current, [key]: "" }));
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Admin action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const confirmPayment = (row: any) => {
    const key = `payment:${row.id}`;
    const reason = requireReason(key);
    if (!reason) return;
    void runTypedAction(key, () => confirmPaymentAdmin(row.id, reason), "Payment confirmation audited");
  };

  const resolveReview = (row: any) => {
    const key = `review:${row.id}`;
    const reason = requireReason(key);
    if (!reason) return;
    void runTypedAction(key, () => resolveAdminReview(row.id, reason, reason), "Review resolution audited");
  };

  const escalateSupport = (row: any) => {
    const key = `support:${row.id}`;
    const reason = requireReason(key);
    if (!reason) return;
    void runTypedAction(key, () => escalateSupportCase(row.id, reason), "Support escalation audited");
  };

  const approveApplication = (row: any) => {
    const key = `application:${row.id}`;
    const reason = requireReason(key);
    if (!reason) return;
    void runTypedAction(key, () => approveXooterAdmin(row.id, reason), "Xooter approval audited");
  };

  const rejectApplication = (row: any) => {
    const key = `application:${row.id}`;
    const reason = requireReason(key);
    if (!reason) return;
    void runTypedAction(key, () => rejectXooterAdmin(row.id, reason), "Xooter rejection audited");
  };

  const markOutbox = (row: any) => {
    const key = `outbox:${row.id}`;
    const reason = requireReason(key);
    if (!reason) return;
    void runTypedAction(key, () => markOutboxProcessed(row.id, reason), "Outbox completion audited");
  };

  const outboxQueued = outbox.filter((o) => ["queued", "needs_approval", "processing"].includes(o.status));
  const outboxRetryRows = outbox.filter((o) => ["failed", "retry", "retrying", "needs_retry"].includes(o.status));
  const outboxDeadLetters = outbox.filter((o) => ["dead_letter", "dead-letter", "permanent_failure"].includes(o.status));
  const agentDecisionRows = auditLogs.filter((row) =>
    ["integration_outbox", "admin_review_queue", "support_tickets", "booking_status_events"].includes(row.target_table) ||
    String(row.action ?? "").toLowerCase().includes("agent") ||
    String(row.reason ?? "").toLowerCase().includes("agent")
  );

  if (checkingMfa || !mfaVerified || loading) {
    return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container max-w-7xl py-8 lg:py-12">
      <div className="mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
          <BarChart3 className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">Admin operations</span>
        </div>
        <h1 className="font-display text-4xl font-bold md:text-5xl">Xoot operating queues</h1>
        <p className="mt-2 text-muted-foreground">Typed, MFA-gated actions for payments, integrations, support, trust review, Xooter activation and analytics.</p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        <Stat icon={WalletCards} label="Pending payments" value={payments.filter((p) => p.status === "pending").length} />
        <Stat icon={BarChart3} label="Outbox queued" value={outboxQueued.length} />
        <Stat icon={Loader2} label="Retry needed" value={outboxRetryRows.length} />
        <Stat icon={ShieldAlert} label="Dead letters" value={outboxDeadLetters.length} />
        <Stat icon={ClipboardCheck} label="Agent decisions" value={agentDecisionRows.length} />
        <Stat icon={ShieldAlert} label="Open reviews" value={reviews.filter((r) => r.status === "open").length} />
        <Stat icon={CheckCircle2} label="Open support" value={supportTickets.filter((t) => t.status === "open").length} />
        <Stat icon={UserCheck} label="Xooter queue" value={xooterApplications.filter((a) => a.status === "submitted").length} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Queue title="Payment records" rows={payments} empty="No payment records.">
          {(row) => {
            const key = `payment:${row.id}`;
            return (
              <div className="grid gap-3">
                <div><p className="font-semibold">{row.payment_kind} - {formatZAR(Number(row.amount))}</p><p className="text-xs text-muted-foreground">{row.status} via {row.provider}</p></div>
                {row.status === "pending" && (
                  <ActionBlock id={key} value={getReason(key)} onChange={(value) => setReason(key, value)} disabled={actionLoading === key}>
                    <Button size="sm" variant="outline" onClick={() => confirmPayment(row)} disabled={actionLoading === key}>
                      {actionLoading === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Admin confirm
                    </Button>
                  </ActionBlock>
                )}
              </div>
            );
          }}
        </Queue>

        <Queue title="Integration outbox" rows={outbox} empty="No integration events.">
          {(row) => {
            const key = `outbox:${row.id}`;
            return (
              <div className="grid gap-3">
                <div><p className="font-semibold">{row.event_type}</p><p className="text-xs text-muted-foreground">{row.channel} - {row.status}</p></div>
                {["queued", "needs_approval", "processing"].includes(row.status) && (
                  <ActionBlock id={key} value={getReason(key)} onChange={(value) => setReason(key, value)} disabled={actionLoading === key}>
                    <Button size="sm" variant="outline" onClick={() => markOutbox(row)} disabled={actionLoading === key}>
                      {actionLoading === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Mark done
                    </Button>
                  </ActionBlock>
                )}
              </div>
            );
          }}
        </Queue>

        <Queue title="Outbox retries and dead letters" rows={[...outboxRetryRows, ...outboxDeadLetters]} empty="No failed delivery rows in the latest outbox sample.">
          {(row) => (
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{row.event_type ?? "Integration event"}</p>
                <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">{row.status}</span>
              </div>
              <p className="text-xs text-muted-foreground">{row.channel ?? "unknown channel"} - {row.provider ?? "provider pending"} - created {row.created_at ? new Date(row.created_at).toLocaleString() : "unknown"}</p>
              <p className="text-sm text-muted-foreground">Review provider credentials, webhook status, consent, and idempotency before replaying this row.</p>
            </div>
          )}
        </Queue>

        <Queue title="Agent decisions" rows={agentDecisionRows} empty="No agent decisions in the latest audit sample.">
          {(row) => (
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{row.action}</p>
                <ClipboardCheck className="h-4 w-4 text-sage-deep" />
              </div>
              <p className="text-xs text-muted-foreground">{row.target_table} - {row.target_id ?? "no target"} - {new Date(row.created_at).toLocaleString()}</p>
              {row.reason ? <p className="text-sm text-muted-foreground">{row.reason}</p> : null}
            </div>
          )}
        </Queue>

        <Queue title="Admin review queue" rows={reviews} empty="No admin review items.">
          {(row) => {
            const key = `review:${row.id}`;
            return (
              <div className="grid gap-3">
                <div><p className="font-semibold">{row.summary}</p><p className="text-xs text-muted-foreground">{row.queue_type} - {row.priority} - {row.status}</p></div>
                {["open", "in_review"].includes(row.status) && (
                  <ActionBlock id={key} value={getReason(key)} onChange={(value) => setReason(key, value)} disabled={actionLoading === key}>
                    <Button size="sm" variant="outline" onClick={() => resolveReview(row)} disabled={actionLoading === key}>
                      {actionLoading === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Resolve
                    </Button>
                  </ActionBlock>
                )}
              </div>
            );
          }}
        </Queue>

        <Queue title="Support tickets" rows={supportTickets} empty="No support tickets.">
          {(row) => {
            const key = `support:${row.id}`;
            return (
              <div className="grid gap-3">
                <div><p className="font-semibold">{row.subject}</p><p className="text-xs text-muted-foreground">{row.status} - opened {new Date(row.created_at).toLocaleDateString()}</p></div>
                {!["closed", "resolved", "escalated"].includes(row.status) && (
                  <ActionBlock id={key} value={getReason(key)} onChange={(value) => setReason(key, value)} disabled={actionLoading === key} placeholder="Reason required: describe why this ticket needs escalation">
                    <Button size="sm" variant="outline" onClick={() => escalateSupport(row)} disabled={actionLoading === key}>
                      {actionLoading === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Escalate
                    </Button>
                  </ActionBlock>
                )}
              </div>
            );
          }}
        </Queue>

        <Queue title="Xooter applications" rows={xooterApplications} empty="No Xooter applications.">
          {(row) => {
            const key = `application:${row.id}`;
            return (
              <div className="grid gap-3">
                <div><p className="font-semibold">{row.full_name}</p><p className="text-xs text-muted-foreground">{row.service_category ?? "service"} - {row.status}</p></div>
                {row.status === "submitted" && (
                  <ActionBlock id={key} value={getReason(key)} onChange={(value) => setReason(key, value)} disabled={actionLoading === key} placeholder="Reason required: summarize screening evidence and decision">
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => rejectApplication(row)} disabled={actionLoading === key}>
                        Reject
                      </Button>
                      <Button size="sm" className="gradient-warm" onClick={() => approveApplication(row)} disabled={actionLoading === key}>
                        {actionLoading === key ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Approve
                      </Button>
                    </div>
                  </ActionBlock>
                )}
              </div>
            );
          }}
        </Queue>

        <Queue title="Recent audit trail" rows={auditLogs} empty="No audit entries yet.">
          {(row) => (
            <div className="grid gap-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{row.action}</p>
                <ClipboardCheck className="h-4 w-4 text-sage-deep" />
              </div>
              <p className="text-xs text-muted-foreground">{row.target_table} - {row.target_id ?? "no target"} - {new Date(row.created_at).toLocaleString()}</p>
              {row.reason ? <p className="text-sm text-muted-foreground">{row.reason}</p> : null}
            </div>
          )}
        </Queue>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
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
  <Card className="rounded-2xl p-5">
    <Icon className="mb-3 h-5 w-5 text-primary" />
    <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    <p className="font-display text-3xl font-bold">{value}</p>
  </Card>
);

const ActionBlock = ({
  id,
  value,
  onChange,
  children,
  disabled,
  placeholder = "Reason required: describe the evidence behind this action",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
  placeholder?: string;
}) => (
  <div className="grid gap-2">
    <div className="grid gap-1.5">
      <Label htmlFor={`${id}:reason`} className="text-xs font-semibold text-muted-foreground">Reason required</Label>
      <Input
        id={`${id}:reason`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        minLength={minimumReasonLength}
        disabled={disabled}
        className="h-10 rounded-xl"
      />
    </div>
    <div className="flex justify-end">{children}</div>
  </div>
);

const Queue = ({ title, rows, empty, children }: { title: string; rows: any[]; empty: string; children: (row: any) => ReactNode }) => (
  <Card className="rounded-2xl p-5">
    <h2 className="mb-4 font-display text-xl font-bold">{title}</h2>
    {rows.length === 0 ? <p className="text-sm text-muted-foreground">{empty}</p> : (
      <div className="space-y-3">
        {rows.map((row) => <div key={row.id ?? `${title}-${JSON.stringify(row)}`} className="rounded-2xl border border-border p-3">{children(row)}</div>)}
      </div>
    )}
  </Card>
);

export default Ops;
