import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { ShieldCheck, Loader2, ArrowRight, ArrowLeft, Upload, FileCheck2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type DocType = "id" | "proof_of_residence" | "bank_statement" | "selfie";
const docMeta: { key: DocType; label: string; hint: string }[] = [
  { key: "id", label: "South African ID / Passport", hint: "Clear photo of both sides. Name & DOB visible." },
  { key: "proof_of_residence", label: "Proof of residence", hint: "Utility bill or lease, dated within 3 months." },
  { key: "bank_statement", label: "Bank statement", hint: "Most recent statement showing account holder name." },
  { key: "selfie", label: "Selfie holding your ID", hint: "Confirms the ID belongs to you." },
];

const stepSchemas = [
  z.object({
    full_name: z.string().trim().min(2, "Full name required").max(100),
    phone: z.string().trim().min(7, "Phone required").max(20),
    email: z.string().trim().email("Valid email required").max(255),
    date_of_birth: z.string().min(1, "Date of birth required"),
    id_number: z.string().trim().min(6, "ID / passport number required").max(20),
    bio: z.string().trim().min(20, "Tell us a bit about yourself (20+ chars)").max(500),
  }),
  z.object({
    address: z.string().trim().min(5, "Street address required").max(200),
    city: z.string().trim().min(2, "City required").max(80),
    postal_code: z.string().trim().min(4, "Postal code required").max(10),
  }),
  z.object({
    bank_name: z.string().trim().min(2, "Bank name required").max(50),
    bank_account_number: z.string().trim().min(6, "Account number required").max(20),
    bank_branch_code: z.string().trim().min(4, "Branch code required").max(10),
  }),
];

const Apply = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "", phone: "", email: "", date_of_birth: "",
    id_number: "", address: "", city: "", postal_code: "",
    service_category: "cleaning", bio: "",
    bank_name: "", bank_account_number: "", bank_branch_code: "",
    background_check_consent: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: app } = await supabase.from("zooter_applications").select("*").eq("user_id", user.id).maybeSingle();
      if (app) {
        setAppId(app.id);
        setForm((f) => ({
          ...f,
          full_name: app.full_name ?? "", phone: app.phone ?? "", email: app.email ?? user.email ?? "",
          date_of_birth: app.date_of_birth ?? "", id_number: app.id_number ?? "",
          address: app.address ?? "", city: app.city ?? "", postal_code: app.postal_code ?? "",
          service_category: "cleaning", bio: app.bio ?? "",
          bank_name: app.bank_name ?? "", bank_account_number: app.bank_account_number ?? "",
          bank_branch_code: app.bank_branch_code ?? "",
          background_check_consent: app.background_check_consent ?? false,
        }));
        if (app.status === "submitted" || app.status === "approved") { navigate("/zooter"); return; }
        const { data: dlist } = await supabase.from("zooter_documents").select("doc_type, storage_path").eq("user_id", user.id);
        const m: Record<string, string> = {};
        (dlist ?? []).forEach((d: any) => { m[d.doc_type] = d.storage_path; });
        setDocs(m);
      } else {
        setForm((f) => ({ ...f, email: user.email ?? "" }));
      }
      setLoading(false);
    })();
  }, [user, navigate]);

  const saveDraft = async () => {
    if (!user) return null;
    const payload: any = { ...form, user_id: user.id, status: "draft", service_category: "cleaning" };
    if (!payload.date_of_birth) delete payload.date_of_birth;
    if (appId) {
      const { error } = await supabase.from("zooter_applications").update(payload).eq("id", appId);
      if (error) { toast.error(error.message); return null; }
      return appId;
    }
    const { data, error } = await supabase.from("zooter_applications").insert(payload).select("id").single();
    if (error) { toast.error(error.message); return null; }
    setAppId(data.id);
    return data.id;
  };

  const handleUpload = async (key: DocType, file: File) => {
    if (!user) return;
    const path = `${user.id}/${key}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("kyc-docs").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const id = appId ?? (await saveDraft());
    if (!id) return;
    await supabase.from("zooter_documents").insert({
      user_id: user.id, application_id: id, doc_type: key, storage_path: path, status: "pending",
    });
    setDocs((d) => ({ ...d, [key]: path }));
    toast.success(`${key.replace(/_/g, " ")} uploaded`);
  };

  const validateStep = (): boolean => {
    if (step >= stepSchemas.length) return true;
    const result = stepSchemas[step].safeParse(form);
    if (!result.success) {
      const e: Record<string, string> = {};
      Object.entries(result.error.flatten().fieldErrors).forEach(([k, v]) => { if (v?.[0]) e[k] = v[0]; });
      setErrors(e);
      toast.error(Object.values(e)[0] ?? "Please complete all required fields");
      return false;
    }
    setErrors({});
    return true;
  };

  const next = async () => {
    if (!validateStep()) return;
    if (step === 3) {
      // Document step — require all 4
      const missing = docMeta.filter((d) => !docs[d.key]);
      if (missing.length) { toast.error(`Upload required: ${missing.map((m) => m.label).join(", ")}`); return; }
    }
    await saveDraft();
    setStep(Math.min(step + 1, steps.length - 1));
  };
  const back = () => setStep(Math.max(step - 1, 0));

  const submit = async () => {
    if (!user) return;
    if (!form.background_check_consent) { toast.error("Background check consent is required"); return; }
    setSubmitting(true);
    const id = appId ?? (await saveDraft());
    if (!id) { setSubmitting(false); return; }
    const { error } = await supabase.from("zooter_applications").update({ status: "submitted" }).eq("id", id);
    if (!error) {
      await supabase.from("notifications").insert({
        user_id: user.id, kind: "zooter_application_submitted",
        title: "Application received 🎉",
        body: "Our trust team reviews within 48 hours. We'll notify you by email and in-app.",
      });
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted! We'll review within 48 hours.");
    navigate("/zooter");
  };

  const steps = ["About you", "Address", "Banking", "Documents", "Background check"];
  const progress = ((step + 1) / steps.length) * 100;

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const F = ({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) => (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {name && errors[name] && <p className="text-xs text-destructive">{errors[name]}</p>}
    </div>
  );

  return (
    <div className="min-h-screen gradient-hero py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-3 border border-accent/20">
          <Sparkles className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Become a Zooter</span>
        </div>
        <h1 className="font-display text-4xl font-bold mb-2">Join Zoot</h1>
        <p className="text-muted-foreground mb-6">Vetted cleaners earn 65–96% per booking. Verification keeps the bar high.</p>

        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
            <span>Step {step + 1} of {steps.length} · {steps[step]}</span><span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <Card className="p-6 rounded-3xl shadow-soft">
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">About you</h2>
              <p className="text-sm text-muted-foreground">All fields are required. We use this to verify your identity.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Full name" name="full_name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></F>
                <F label="Phone" name="phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27…" /></F>
                <F label="Email" name="email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F>
                <F label="Date of birth" name="date_of_birth"><Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></F>
                <F label="ID / Passport number" name="id_number"><Input value={form.id_number} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></F>
                <F label="Primary service"><Input value="House cleaning" disabled /></F>
              </div>
              <F label="Short bio (shown on your card)" name="bio">
                <Textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="5+ years experience, Airbnb turnover specialist, gentle with pets, eco-friendly products…" />
              </F>
            </div>
          )}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Where you live</h2>
              <F label="Street address" name="address"><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></F>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="City" name="city"><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></F>
                <F label="Postal code" name="postal_code"><Input value={form.postal_code} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></F>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Banking for payouts</h2>
              <p className="text-sm text-muted-foreground">Net earnings (after platform commission) are paid out every Friday in Rand.</p>
              <F label="Bank name" name="bank_name"><Input value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} placeholder="Standard Bank, FNB, ABSA…" /></F>
              <div className="grid sm:grid-cols-2 gap-3">
                <F label="Account number" name="bank_account_number"><Input value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} /></F>
                <F label="Branch code" name="bank_branch_code"><Input value={form.bank_branch_code} onChange={(e) => setForm({ ...form, bank_branch_code: e.target.value })} /></F>
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold">Upload documents</h2>
              <p className="text-sm text-muted-foreground">All four documents are required. Stored privately, reviewed by our trust team.</p>
              {docMeta.map((d) => (
                <div key={d.key} className="rounded-2xl border border-border p-4 flex items-center gap-3">
                  <div className={`grid h-10 w-10 place-items-center rounded-xl ${docs[d.key] ? "bg-accent/15 text-sage-deep" : "bg-muted text-muted-foreground"}`}>
                    {docs[d.key] ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{d.label}</p>
                    <p className="text-xs text-muted-foreground">{d.hint}</p>
                  </div>
                  <label className="cursor-pointer">
                    <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && handleUpload(d.key, e.target.files[0])} />
                    <span className="inline-flex items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold px-3 py-1.5">{docs[d.key] ? "Replace" : "Upload"}</span>
                  </label>
                </div>
              ))}
            </div>
          )}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold">Background check consent</h2>
              <div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground space-y-2">
                <p className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-sage-deep mt-0.5" /> By submitting you authorise Zoot to verify identity, address and run a criminal background check via our trust partner.</p>
                <p>We never share your documents with customers. Reviews complete within 48 hours.</p>
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={form.background_check_consent} onCheckedChange={(v) => setForm({ ...form, background_check_consent: !!v })} />
                <span className="text-sm">I consent to identity verification, address verification and a criminal background check.</span>
              </label>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-4 border-t border-border">
            <Button variant="ghost" onClick={back} disabled={step === 0}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>
            {step < steps.length - 1 ? (
              <Button onClick={next} className="gradient-warm">Save & continue <ArrowRight className="h-4 w-4 ml-1" /></Button>
            ) : (
              <Button onClick={submit} disabled={submitting || !form.background_check_consent} className="gradient-warm">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit application <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Apply;
