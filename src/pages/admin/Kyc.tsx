import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, FileText, Check, X } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const AdminKyc = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [notes, setNotes] = useState("");

  const load = async () => {
    const { data } = await supabase.from("zooter_applications").select("*").in("status", ["submitted", "approved", "rejected"]).order("updated_at", { ascending: false });
    setApps(data ?? []); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openApp = async (a: any) => {
    setActive(a); setNotes(a.reviewer_notes ?? "");
    const { data } = await supabase.from("zooter_documents").select("*").eq("user_id", a.user_id);
    const withUrls = await Promise.all((data ?? []).map(async (d: any) => {
      const { data: signed } = await supabase.storage.from("kyc-docs").createSignedUrl(d.storage_path, 600);
      return { ...d, signed_url: signed?.signedUrl };
    }));
    setDocs(withUrls);
  };

  const decide = async (status: "approved" | "rejected") => {
    if (!active || !user) return;
    const { error } = await supabase.from("zooter_applications").update({
      status, reviewer_notes: notes, reviewed_by: user.id, reviewed_at: new Date().toISOString(),
    }).eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    if (status === "approved") {
      const { data: existing } = await supabase.from("zooters").select("id").eq("user_id", active.user_id).maybeSingle();
      if (!existing) {
        await supabase.from("zooters").insert({
          user_id: active.user_id, name: active.full_name, role: active.service_category ?? "cleaning",
          hourly_rate: 35, bio: active.bio, tags: [], distance_mi: 1.0, active: true, verified: true, tier: "new",
        });
      } else {
        await supabase.from("zooters").update({ verified: true, active: true }).eq("id", existing.id);
      }
      // Grant zooter role
      await supabase.from("user_roles").insert({ user_id: active.user_id, role: "zooter" }).select();
    }
    toast.success(`Application ${status}`);
    setActive(null); load();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 lg:py-12 max-w-6xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-2 flex items-center gap-2"><ShieldCheck className="h-8 w-8 text-sage-deep" /> Admin · KYC review</h1>
      <p className="text-muted-foreground mb-8">Approve or reject Zooter applications.</p>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card className="rounded-3xl overflow-hidden h-fit">
          <div className="p-4 border-b border-border"><p className="font-display font-bold">Queue ({apps.filter((a) => a.status === "submitted").length})</p></div>
          <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {apps.map((a) => (
              <button key={a.id} onClick={() => openApp(a)} className={`block w-full text-left px-4 py-3 hover:bg-muted ${active?.id === a.id ? "bg-muted" : ""}`}>
                <p className="font-medium text-sm truncate">{a.full_name}</p>
                <p className="text-xs text-muted-foreground capitalize">{a.service_category} · <span className={a.status === "submitted" ? "text-primary" : a.status === "approved" ? "text-sage-deep" : "text-destructive"}>{a.status}</span></p>
              </button>
            ))}
          </div>
        </Card>

        {active ? (
          <Card className="p-6 rounded-3xl">
            <h2 className="font-display text-2xl font-bold mb-1">{active.full_name}</h2>
            <p className="text-sm text-muted-foreground mb-4">{active.email} · {active.phone} · {active.city}</p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm mb-4">
              <Field k="ID number" v={active.id_number} />
              <Field k="DOB" v={active.date_of_birth} />
              <Field k="Address" v={active.address} />
              <Field k="Service" v={active.service_category} />
              <Field k="Bank" v={active.bank_name} />
              <Field k="Account" v={active.bank_account_number} />
              <Field k="Background consent" v={active.background_check_consent ? "Yes" : "No"} />
            </div>
            <h3 className="font-display text-lg font-bold mb-2">Documents</h3>
            <div className="space-y-2 mb-4">
              {docs.map((d) => (
                <a key={d.id} href={d.signed_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted">
                  <FileText className="h-4 w-4 text-sage-deep" />
                  <span className="text-sm font-medium capitalize flex-1">{d.doc_type.replace(/_/g, " ")}</span>
                  <span className="text-xs text-primary underline">Open</span>
                </a>
              ))}
              {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
            </div>
            <Textarea placeholder="Reviewer notes (visible to applicant if rejected)" value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-4" />
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => decide("rejected")}><X className="h-4 w-4 mr-1" /> Reject</Button>
              <Button onClick={() => decide("approved")} className="gradient-warm"><Check className="h-4 w-4 mr-1" /> Approve & activate</Button>
            </div>
          </Card>
        ) : (
          <Card className="p-12 rounded-3xl text-center text-muted-foreground">Select an application to review.</Card>
        )}
      </div>
    </div>
  );
};

const Field = ({ k, v }: any) => (
  <div className="rounded-xl bg-muted/40 p-2.5"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p><p className="font-medium">{v || "—"}</p></div>
);

export default AdminKyc;