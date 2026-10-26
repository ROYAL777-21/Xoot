import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/kit/Logo";
import { ShieldCheck, FileCheck2, Clock, AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import "./apply-handoff.css";

type Review = { status: string; reviewer_notes: string | null };
type Document = { id: string; doc_type: string; status: string; created_at: string };

const XooterReview = ({ ownerId }: { ownerId: string }) => {
  const navigate = useNavigate();
  const [app, setApp] = useState<Review | null>(null);
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(false);
    (async () => {
      try {
        const [application, documents] = await Promise.all([
          supabase.from("xooter_applications").select("status, reviewer_notes").eq("user_id", ownerId).maybeSingle(),
          supabase.from("xooter_documents").select("id, doc_type, status, created_at").eq("user_id", ownerId),
        ]);
        if (cancelled) return;
        if (application.error || documents.error) throw new Error("Review could not be loaded");
        setApp(application.data); setDocs(documents.data ?? []);
      } catch { if (!cancelled) setLoadError(true); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [ownerId, attempt]);

  const status = app?.status ?? "draft";
  const statusInfo: Record<string, { icon: LucideIcon; cls: string; title: string; body: string }> = {
    draft: { icon: AlertCircle, cls: "bg-muted text-muted-foreground", title: "Application incomplete", body: "Finish all steps and submit when you are ready." },
    submitted: { icon: Clock, cls: "bg-primary/10 text-primary", title: "Under review", body: "Your application is in the trust review queue. Each verification area is reviewed before activation." },
    approved: { icon: ShieldCheck, cls: "bg-primary/10 text-primary", title: "Approved", body: "Your application has been approved. Open your Xooter dashboard to see your next steps." },
    rejected: { icon: AlertCircle, cls: "bg-destructive/10 text-destructive", title: "Review needs attention", body: app?.reviewer_notes || "Please review your application, update your documents and resubmit." },
  };
  const info = statusInfo[status] ?? { icon: Clock, cls: "bg-muted text-muted-foreground", title: "Review in progress", body: "Please contact Xoot support if you need help with your application." };
  const Icon = info.icon;
  return <main className="xooter-onboarding"><div className="xooter-onboarding-content">
    <header className="xooter-onboarding-header"><a href="/" aria-label="Xoot home"><Logo size={27} /></a><span><ShieldCheck size={15} aria-hidden="true" /> Work on your terms</span></header>
    <p className="xooter-onboarding-eyebrow">BECOME A XOOTER</p><h1 className="xooter-onboarding-title">Your next chapter</h1>
    <p className="xooter-onboarding-intro">Your application, documents and next steps, together in one place.</p>
    {loading ? <div role="status" className="py-12"><Loader2 aria-label="Loading your review" className="h-6 w-6 animate-spin text-primary" /></div>
      : loadError ? <Card role="alert" className="xooter-onboarding-card"><h2>Your review could not be loaded.</h2><p className="xooter-onboarding-hint mb-5">Please try again to see your saved application.</p><Button onClick={() => setAttempt(current => current + 1)}>Try again</Button></Card>
      : <Card className="xooter-onboarding-card">
        <div className={`rounded-2xl p-5 mb-6 flex items-start gap-3 ${info.cls}`}><Icon className="h-5 w-5 mt-0.5 shrink-0" aria-hidden="true" /><div><h2>{info.title}</h2><p className="text-sm leading-relaxed mt-2">{info.body}</p></div></div>
        <h2 className="mb-3">Your documents</h2><p className="xooter-onboarding-hint mb-5">Submitted privately for Xoot trust review.</p>
        {docs.length === 0 ? <p className="text-sm text-muted-foreground mb-6">No documents uploaded yet.</p> : <div className="space-y-2 mb-6">{docs.map(document => <div key={document.id} className="rounded-2xl border border-border p-4 flex items-center gap-3">
          <FileCheck2 className="h-5 w-5 text-primary shrink-0" aria-hidden="true" /><div className="flex-1 min-w-0"><p className="font-medium text-sm capitalize">{document.doc_type.replace(/_/g, " ")}</p><p className="text-xs text-muted-foreground">Uploaded {new Date(document.created_at).toLocaleDateString()}</p></div>
          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${document.status === "approved" ? "bg-primary/10 text-primary" : document.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>{document.status}</span>
        </div>)}</div>}
        {(status === "draft" || status === "rejected") && <Button onClick={() => navigate("/xooter/apply")}>{status === "rejected" ? "Update application" : "Continue application"}</Button>}
        {status === "approved" && <Button onClick={() => navigate("/xooter")}>Open Xooter dashboard</Button>}
      </Card>}
  </div></main>;
};
const Kyc = () => {
  const { user } = useAuth();
  if (!user) return <div role="status">Loading your Xoot account...</div>;
  return <XooterReview key={user.id} ownerId={user.id} />;
};
export default Kyc;
