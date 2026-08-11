import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, ShieldCheck, FileText, Check, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { getActivationReadiness } from "@/lib/operations";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";
import { approveXooterAdmin, rejectXooterAdmin } from "@/lib/admin-actions";

const verificationFields = [
  ["id_verification_status", "Government ID"],
  ["selfie_verification_status", "Facial selfie"],
  ["address_verification_status", "Proof of address"],
  ["banking_verification_status", "Banking"],
  ["reference_verification_status", "References"],
  ["background_check_status", "Background check"],
  ["third_party_verification_status", "MIE / third-party screening"],
] as const;

const AdminKyc = () => {
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [trainingPassed, setTrainingPassed] = useState(false);
  const [requiredTrainingCount, setRequiredTrainingCount] = useState(0);
  const [passedTrainingCount, setPassedTrainingCount] = useState(0);

  const load = async () => {
    const { data } = await supabase.from("zooter_applications").select("*").in("status", ["submitted", "approved", "rejected"]).order("updated_at", { ascending: false });
    setApps(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openApp = async (a: any) => {
    setActive(a);
    setNotes(a.reviewer_notes ?? "");
    const { data } = await supabase.from("zooter_documents").select("*").eq("user_id", a.user_id);
    const [{ data: modules }, { data: completions }] = await Promise.all([
      supabase.from("training_modules").select("id").eq("required", true),
      supabase.from("zooter_training_completions").select("module_id").eq("user_id", a.user_id).eq("passed", true),
    ]);
    const requiredIds = new Set((modules ?? []).map((module: any) => module.id));
    const completedIds = new Set((completions ?? []).map((completion: any) => completion.module_id));
    const passedCount = [...requiredIds].filter((moduleId) => completedIds.has(moduleId)).length;
    setRequiredTrainingCount(requiredIds.size);
    setPassedTrainingCount(passedCount);
    setTrainingPassed(requiredIds.size > 0 && passedCount === requiredIds.size);
    const withUrls = await Promise.all((data ?? []).map(async (d: any) => {
      const { data: signed } = await supabase.storage.from("kyc-docs").createSignedUrl(d.storage_path, 600);
      return { ...d, signed_url: signed?.signedUrl };
    }));
    setDocs(withUrls);
  };

  const setVerification = async (field: string, status: "approved" | "rejected" | "pending") => {
    if (!active) return;
    let data: any;
    try {
      const result = await invokeOpsWorkflow<{ application?: any }>({
        action: "admin_set_kyc_verification",
        applicationId: active.id,
        field,
        status,
      });
      data = result.application ?? { ...active, [field]: status };
    } catch (error) {
      return toast.error(error instanceof Error ? error.message : "Verification update failed");
    }
    setActive(data);
    setApps((items) => items.map((item) => item.id === data.id ? data : item));
  };

  const readiness = active ? getActivationReadiness({
    verification: {
      id: active.id_verification_status,
      selfie: active.selfie_verification_status,
      address: active.address_verification_status,
      banking: active.banking_verification_status,
      reference: active.reference_verification_status,
      background: active.background_check_status,
      thirdParty: active.third_party_verification_status,
    },
    requiredTrainingPassed: trainingPassed,
    backgroundCheckConsent: !!active.background_check_consent,
  }) : { activationReady: false, missing: [] as string[] };
  const allVerified = active && readiness.activationReady;

  const decide = async (status: "approved" | "rejected") => {
    if (!active) return;
    const reason = notes.trim();
    if (reason.length < 10) {
      toast.error("Reviewer notes must be at least 10 characters for the audit trail.");
      return;
    }
    if (status === "approved" && !readiness.activationReady) {
      toast.error(`Activation locked: ${readiness.missing.join(", ")}`);
      return;
    }

    try {
      const { data, error } = status === "approved"
        ? await approveXooterAdmin(active.id, reason)
        : await rejectXooterAdmin(active.id, reason);
      if (error) throw error;
      if ((data as any)?.success === false) throw new Error((data as any).error ?? "Application decision failed");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Application decision failed");
      return;
    }

    toast.success(`Application ${status}`);
    setActive(null);
    load();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 lg:py-12 max-w-6xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-2 flex items-center gap-2"><ShieldCheck className="h-8 w-8 text-sage-deep" /> Admin KYC review</h1>
      <p className="text-muted-foreground mb-8">Approve or reject every verification area before activation.</p>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        <Card className="rounded-3xl overflow-hidden h-fit">
          <div className="p-4 border-b border-border"><p className="font-display font-bold">Queue ({apps.filter((a) => a.status === "submitted").length})</p></div>
          <div className="divide-y divide-border max-h-[70vh] overflow-y-auto">
            {apps.map((a) => <button key={a.id} onClick={() => openApp(a)} className={`block w-full text-left px-4 py-3 hover:bg-muted ${active?.id === a.id ? "bg-muted" : ""}`}><p className="font-medium text-sm truncate">{a.full_name ?? a.name ?? "Unnamed applicant"}</p><p className="text-xs text-muted-foreground capitalize">{a.service_category ?? "cleaning"} · <span className={a.status === "submitted" ? "text-primary" : a.status === "approved" ? "text-sage-deep" : "text-destructive"}>{a.status}</span></p></button>)}
          </div>
        </Card>

        {active ? (
          <Card className="p-6 rounded-3xl">
            <h2 className="font-display text-2xl font-bold mb-1">{active.full_name ?? active.name ?? "Unnamed applicant"}</h2>
            <p className="text-sm text-muted-foreground mb-4">{active.email ?? "No email"} · {active.phone ?? "No phone"} · {active.city ?? active.suburb ?? "No area"}</p>
            <div className="grid sm:grid-cols-2 gap-2 text-sm mb-4">
              <Field k="ID number" v={active.id_number} /><Field k="DOB" v={active.date_of_birth} /><Field k="Address" v={active.address} /><Field k="Bank" v={active.bank_name} /><Field k="Emergency contact" v={`${active.emergency_contact_name ?? ""} ${active.emergency_contact_phone ?? ""}`} /><Field k="Reference 1" v={`${active.reference_1_name ?? ""} ${active.reference_1_phone ?? ""}`} /><Field k="Reference 2" v={`${active.reference_2_name ?? ""} ${active.reference_2_phone ?? ""}`} /><Field k="Consent" v={active.background_check_consent ? "Yes" : "No"} />
            </div>

            <h3 className="font-display text-lg font-bold mb-2">Verification checklist</h3>
            <div className="grid sm:grid-cols-2 gap-2 mb-5">
              {verificationFields.map(([field, label]) => <div key={field} className="rounded-2xl border border-border p-3"><div className="flex items-center justify-between gap-2"><p className="font-medium text-sm">{label}</p><Status status={active[field]} /></div><div className="mt-3 flex gap-1.5"><Button size="sm" variant="outline" className="h-8 rounded-full" onClick={() => setVerification(field, "approved")}>Approve</Button><Button size="sm" variant="ghost" className="h-8 rounded-full text-destructive" onClick={() => setVerification(field, "rejected")}>Reject</Button></div></div>)}
            </div>

            <div className="rounded-2xl bg-muted/40 border border-border p-3 text-sm mb-4">
              <p className="font-semibold">Training gate</p>
              <p className="text-muted-foreground">{passedTrainingCount} / {requiredTrainingCount} required modules passed before activation.</p>
            </div>
            {!allVerified && <div className="rounded-2xl bg-primary/10 border border-primary/20 p-3 text-sm text-primary flex gap-2 mb-4"><AlertTriangle className="h-4 w-4 mt-0.5" /> Activation is locked until verification, screening, consent, and required training are complete.</div>}

            <h3 className="font-display text-lg font-bold mb-2">Documents</h3>
            <div className="space-y-2 mb-4">
              {docs.map((d) => <a key={d.id} href={d.signed_url} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted"><FileText className="h-4 w-4 text-sage-deep" /><span className="text-sm font-medium capitalize flex-1">{d.doc_type.replace(/_/g, " ")}</span><span className="text-xs text-primary underline">Open</span></a>)}
              {docs.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded.</p>}
            </div>
            <Textarea placeholder="Reviewer notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="mb-4" />
            <div className="flex gap-2"><Button variant="outline" onClick={() => decide("rejected")}><X className="h-4 w-4 mr-1" /> Reject</Button><Button onClick={() => decide("approved")} disabled={!allVerified} className="gradient-warm"><Check className="h-4 w-4 mr-1" /> Approve & activate</Button></div>
          </Card>
        ) : <Card className="p-12 rounded-3xl text-center text-muted-foreground">Select an application to review.</Card>}
      </div>
    </div>
  );
};

const Field = ({ k, v }: any) => <div className="rounded-xl bg-muted/40 p-2.5"><p className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</p><p className="font-medium">{v || "-"}</p></div>;
const Status = ({ status }: { status?: string }) => <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${status === "approved" ? "bg-accent/15 text-sage-deep" : status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-muted text-muted-foreground"}`}>{status ?? "pending"}</span>;

export default AdminKyc;
