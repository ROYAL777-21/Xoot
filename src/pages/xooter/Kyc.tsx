import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileCheck2, Clock, AlertCircle, Loader2 } from "lucide-react";

const Kyc = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [app, setApp] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("xooter_applications").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("xooter_documents").select("*").eq("user_id", user.id),
    ]).then(([a, d]) => { setApp(a.data); setDocs(d.data ?? []); setLoading(false); });
  }, [user]);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const status = app?.status ?? "draft";
  const statusInfo: Record<string, { icon: any; cls: string; title: string; body: string }> = {
    draft: { icon: AlertCircle, cls: "bg-muted text-muted-foreground", title: "Application incomplete", body: "Finish all steps and submit." },
    submitted: { icon: Clock, cls: "bg-primary/15 text-primary", title: "Under review", body: "Your application is in the trust review queue. Each verification area is reviewed before activation." },
    approved: { icon: ShieldCheck, cls: "bg-accent/15 text-sage-deep", title: "Verified", body: "You're cleared to take jobs." },
    rejected: { icon: AlertCircle, cls: "bg-destructive/15 text-destructive", title: "Rejected", body: app?.reviewer_notes || "Re-upload documents and resubmit." },
  };
  const info = statusInfo[status];
  const Icon = info.icon;

  return (
    <div className="container py-8 lg:py-12 max-w-3xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-2">Verification</h1>
      <p className="text-muted-foreground mb-8">All documents are stored privately and only seen by our trust team.</p>

      <Card className={`p-5 rounded-3xl mb-6 flex items-start gap-3 ${info.cls}`}>
        <Icon className="h-5 w-5 mt-0.5" />
        <div>
          <p className="font-display text-lg font-bold">{info.title}</p>
          <p className="text-sm opacity-90">{info.body}</p>
        </div>
      </Card>

      <h2 className="font-display text-xl font-bold mb-3">Submitted documents</h2>
      {docs.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2 mb-6">
          {docs.map((d) => (
            <div key={d.id} className="rounded-2xl border border-border p-4 flex items-center gap-3">
              <FileCheck2 className="h-5 w-5 text-sage-deep" />
              <div className="flex-1">
                <p className="font-medium text-sm capitalize">{d.doc_type.replace(/_/g, " ")}</p>
                <p className="text-xs text-muted-foreground">Uploaded {new Date(d.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                d.status === "approved" ? "bg-accent/15 text-sage-deep"
                : d.status === "rejected" ? "bg-destructive/15 text-destructive"
                : "bg-muted text-muted-foreground"
              }`}>{d.status}</span>
            </div>
          ))}
        </div>
      )}

      {(status === "draft" || status === "rejected") && (
        <Button onClick={() => navigate("/xooter/apply")} className="gradient-warm">
          {status === "rejected" ? "Resubmit application" : "Continue application"}
        </Button>
      )}
    </div>
  );
};

export default Kyc;
