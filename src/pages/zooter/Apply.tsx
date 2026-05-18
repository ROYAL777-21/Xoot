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
import { ShieldCheck, Loader2, ArrowRight, ArrowLeft, Upload, FileCheck2, Sparkles, Phone, Users } from "lucide-react";
import { toast } from "sonner";
import { routeNotificationChannel } from "@/lib/operations";

type DocType = "id" | "proof_of_residence" | "bank_statement" | "selfie";
const docMeta: { key: DocType; label: string; hint: string }[] = [
  { key: "id", label: "Government ID / passport", hint: "Clear photo of both sides. Name and DOB visible." },
  { key: "proof_of_residence", label: "Proof of address", hint: "Utility bill or lease, dated within 3 months." },
  { key: "bank_statement", label: "Banking verification", hint: "Recent statement showing account holder name." },
  { key: "selfie", label: "Facial verification selfie", hint: "Selfie holding your ID for face-match review." },
];

const emptyForm = {
  full_name: "",
  phone: "",
  email: "",
  date_of_birth: "",
  id_number: "",
  suburb: "",
  years_experience: "",
  transport: "",
  supplies_owned: "",
  pet_comfort: "",
  availability_notes: "",
  luxury_home_answer: "",
  fragile_items_answer: "",
  punctuality_answer: "",
  off_platform_answer: "",
  address: "",
  city: "",
  postal_code: "",
  service_category: "cleaning",
  bio: "",
  bank_name: "",
  bank_account_number: "",
  bank_branch_code: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
  reference_1_name: "",
  reference_1_phone: "",
  reference_2_name: "",
  reference_2_phone: "",
  background_check_consent: false,
};

const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const joinList = (value?: string[] | null) => (value ?? []).join(", ");

const Apply = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: app } = await supabase.from("zooter_applications").select("*").eq("user_id", user.id).maybeSingle();
      if (app) {
        const appRow = app as any;
        setAppId(appRow.id);
        setForm({
          ...emptyForm,
          ...appRow,
          email: appRow.email ?? user.email ?? "",
          years_experience: String(appRow.years_experience ?? ""),
          supplies_owned: joinList(appRow.supplies_owned),
          availability_notes: appRow.availability?.notes ?? "",
          luxury_home_answer: appRow.behavioural_screening?.luxury_home ?? "",
          fragile_items_answer: appRow.behavioural_screening?.fragile_items ?? "",
          punctuality_answer: appRow.behavioural_screening?.punctuality ?? "",
          off_platform_answer: appRow.behavioural_screening?.off_platform ?? "",
          background_check_consent: appRow.background_check_consent ?? false,
        });
        if (appRow.status === "submitted" || appRow.status === "approved") { navigate("/zooter"); return; }
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
    const payload: any = {
      full_name: form.full_name,
      phone: form.phone,
      email: form.email,
      date_of_birth: form.date_of_birth,
      id_number: form.id_number,
      suburb: form.suburb,
      years_experience: Number(form.years_experience || 0),
      transport: form.transport,
      supplies_owned: splitList(form.supplies_owned),
      pet_comfort: form.pet_comfort,
      availability: { notes: form.availability_notes },
      behavioural_screening: {
        luxury_home: form.luxury_home_answer,
        fragile_items: form.fragile_items_answer,
        punctuality: form.punctuality_answer,
        off_platform: form.off_platform_answer,
      },
      address: form.address,
      city: form.city,
      postal_code: form.postal_code,
      service_category: "cleaning",
      bio: form.bio,
      bank_name: form.bank_name,
      bank_account_number: form.bank_account_number,
      bank_branch_code: form.bank_branch_code,
      emergency_contact_name: form.emergency_contact_name,
      emergency_contact_phone: form.emergency_contact_phone,
      reference_1_name: form.reference_1_name,
      reference_1_phone: form.reference_1_phone,
      reference_2_name: form.reference_2_name,
      reference_2_phone: form.reference_2_phone,
      background_check_consent: form.background_check_consent,
      user_id: user.id,
      status: "draft",
    };
    if (!payload.date_of_birth) delete payload.date_of_birth;
    const query = (supabase as any).from("zooter_applications");
    if (appId) {
      const { error } = await query.update(payload).eq("id", appId);
      if (error) { toast.error(error.message); return null; }
      return appId;
    }
    const { data, error } = await query.insert(payload).select("id").single();
    if (error) { toast.error(error.message); return null; }
    setAppId(data.id);
    return data.id;
  };

  const handleUpload = async (key: DocType, file: File) => {
    if (!user) return;
    const id = appId ?? (await saveDraft());
    if (!id) return;
    const path = `${user.id}/${key}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("kyc-docs").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    await supabase.from("zooter_documents").insert({ user_id: user.id, application_id: id, doc_type: key, storage_path: path, status: "pending" });
    setDocs((d) => ({ ...d, [key]: path }));
    toast.success(`${key.replace(/_/g, " ")} uploaded`);
  };

  const requiredForStep = () => {
    if (step === 0) return ["full_name", "phone", "email", "date_of_birth", "id_number", "bio", "years_experience"];
    if (step === 1) return ["address", "city", "suburb", "postal_code"];
    if (step === 2) return ["transport", "supplies_owned", "pet_comfort", "availability_notes", "luxury_home_answer", "fragile_items_answer", "punctuality_answer", "off_platform_answer"];
    if (step === 3) return ["bank_name", "bank_account_number", "bank_branch_code"];
    if (step === 4) return ["emergency_contact_name", "emergency_contact_phone", "reference_1_name", "reference_1_phone", "reference_2_name", "reference_2_phone"];
    return [];
  };

  const validateStep = () => {
    const missing = requiredForStep().filter((key) => !String((form as any)[key] ?? "").trim());
    if (missing.length) { toast.error("Please complete all required fields"); return false; }
    if (step === 5) {
      const missingDocs = docMeta.filter((d) => !docs[d.key]);
      if (missingDocs.length) { toast.error(`Upload required: ${missingDocs.map((d) => d.label).join(", ")}`); return false; }
    }
    return true;
  };

  const next = async () => {
    if (!validateStep()) return;
    await saveDraft();
    setStep(Math.min(step + 1, steps.length - 1));
  };

  const submit = async () => {
    if (!user) return;
    if (!form.background_check_consent) { toast.error("Background check consent is required"); return; }
    setSubmitting(true);
    const id = appId ?? (await saveDraft());
    if (!id) { setSubmitting(false); return; }
    const { error } = await (supabase as any).from("zooter_applications").update({
      status: "submitted",
      id_verification_status: "pending",
      selfie_verification_status: "pending",
      address_verification_status: "pending",
      banking_verification_status: "pending",
      reference_verification_status: "pending",
      background_check_status: "pending",
      third_party_verification_status: "pending",
      activation_locked_reason: "Verification, MIE screening, and required training must be complete before activation.",
    }).eq("id", id);
    if (!error) {
      await supabase.from("notifications").insert({ user_id: user.id, kind: "zooter_application_submitted", title: "Application received", body: "Our trust team reviews ID, selfie, address, bank, references and background checks before activation." });
      await (supabase as any).from("admin_review_queue").insert({
        queue_type: "kyc",
        subject_table: "zooter_applications",
        subject_id: id,
        user_id: user.id,
        priority: "normal",
        summary: `KYC review for ${form.full_name}`,
      });
      await (supabase as any).from("integration_outbox").insert([
        {
          source_table: "zooter_applications",
          source_id: id,
          event_type: "mie_screening_requested",
          channel: "mie_screening",
          owner: "Trust & Safety Agent",
          stack_tool: "MIE screening queue",
          payload: { application_id: id, suburb: form.suburb, years_experience: form.years_experience },
          status: "needs_approval",
          approval_required: true,
          failure_mode: "Keep application pending until manual review is complete.",
          created_by: user.id,
        },
        ...routeNotificationChannel("trust_verification_update").map((channel) => ({
          source_table: "zooter_applications",
          source_id: id,
          event_type: "trust_verification_update",
          channel,
          owner: channel === "brevo_email" ? "Contractor Success Agent" : "Trust & Safety Agent",
          stack_tool: channel === "brevo_email" ? "Brevo email queue" : "Zoot in-app notification",
          payload: { application_id: id, status: "submitted" },
          created_by: user.id,
        })),
      ]);
    }
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Application submitted. Trust review is now queued.");
    navigate("/zooter");
  };

  const steps = ["About you", "Address", "Experience", "Banking", "References", "Documents", "Consent"];
  const progress = ((step + 1) / steps.length) * 100;

  if (loading) return <div className="min-h-screen grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const F = ({ label, name, children }: { label: string; name?: string; children: React.ReactNode }) => <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}{name && !String((form as any)[name] ?? "").trim() && requiredForStep().includes(name) && <p className="text-[11px] text-muted-foreground">Required</p>}</div>;

  return (
    <div className="min-h-screen gradient-hero py-10 px-6">
      <div className="max-w-2xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-3 border border-accent/20"><Sparkles className="h-3 w-3 text-sage-deep" /><span className="text-xs font-medium text-sage-deep">Become a Zooter</span></div>
        <h1 className="font-display text-4xl font-bold mb-2">Join Zoot</h1>
        <p className="text-muted-foreground mb-6">Build predictable income with recurring clients, premium homes, fast support, strong vetting and visible trust badges.</p>
        <div className="mb-4"><div className="flex justify-between text-xs text-muted-foreground mb-1.5"><span>Step {step + 1} of {steps.length} - {steps[step]}</span><span>{Math.round(progress)}%</span></div><Progress value={progress} /></div>

        <Card className="p-6 rounded-3xl shadow-soft">
          {step === 0 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold">About you</h2><div className="grid sm:grid-cols-2 gap-3"><F label="Full name" name="full_name"><Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></F><F label="Phone" name="phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+27..." /></F><F label="Email" name="email"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F><F label="Date of birth" name="date_of_birth"><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></F><F label="ID / Passport number" name="id_number"><Input value={form.id_number ?? ""} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></F><F label="Years of experience" name="years_experience"><Input type="number" min="0" value={form.years_experience ?? ""} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} /></F><F label="Primary service"><Input value="House cleaning" disabled /></F></div><F label="Short bio" name="bio"><Textarea rows={3} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Airbnb turnover specialist, gentle with pets, eco-friendly products..." /></F></div>}

          {step === 1 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold">Where you live</h2><F label="Street address" name="address"><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></F><div className="grid sm:grid-cols-3 gap-3"><F label="City" name="city"><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></F><F label="Suburb" name="suburb"><Input value={form.suburb ?? ""} onChange={(e) => setForm({ ...form, suburb: e.target.value })} placeholder="Sandton, Midrand..." /></F><F label="Postal code" name="postal_code"><Input value={form.postal_code ?? ""} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></F></div></div>}

          {step === 2 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold">Experience & work style</h2><div className="grid sm:grid-cols-2 gap-3"><F label="Transport" name="transport"><Input value={form.transport ?? ""} onChange={(e) => setForm({ ...form, transport: e.target.value })} placeholder="Own car, taxi, lift club" /></F><F label="Supplies owned" name="supplies_owned"><Input value={form.supplies_owned ?? ""} onChange={(e) => setForm({ ...form, supplies_owned: e.target.value })} placeholder="Vacuum, mop, products" /></F><F label="Pet comfort" name="pet_comfort"><Input value={form.pet_comfort ?? ""} onChange={(e) => setForm({ ...form, pet_comfort: e.target.value })} placeholder="Comfortable with dogs and cats" /></F><F label="Availability" name="availability_notes"><Input value={form.availability_notes ?? ""} onChange={(e) => setForm({ ...form, availability_notes: e.target.value })} placeholder="Weekdays, Saturdays, mornings..." /></F></div><F label="Luxury-home expectations" name="luxury_home_answer"><Textarea rows={2} value={form.luxury_home_answer ?? ""} onChange={(e) => setForm({ ...form, luxury_home_answer: e.target.value })} placeholder="How do you handle premium surfaces, linen, and quiet service?" /></F><F label="Fragile items" name="fragile_items_answer"><Textarea rows={2} value={form.fragile_items_answer ?? ""} onChange={(e) => setForm({ ...form, fragile_items_answer: e.target.value })} placeholder="What do you do around glassware, art, and sentimental items?" /></F><F label="Punctuality" name="punctuality_answer"><Textarea rows={2} value={form.punctuality_answer ?? ""} onChange={(e) => setForm({ ...form, punctuality_answer: e.target.value })} placeholder="What happens if traffic or a delay affects arrival?" /></F><F label="Off-platform request" name="off_platform_answer"><Textarea rows={2} value={form.off_platform_answer ?? ""} onChange={(e) => setForm({ ...form, off_platform_answer: e.target.value })} placeholder="What do you do if a client asks to book privately?" /></F></div>}

          {step === 3 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold">Banking for payouts</h2><p className="text-sm text-muted-foreground">Banking is manually reviewed before first payout.</p><F label="Bank name" name="bank_name"><Input value={form.bank_name ?? ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></F><div className="grid sm:grid-cols-2 gap-3"><F label="Account number" name="bank_account_number"><Input value={form.bank_account_number ?? ""} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} /></F><F label="Branch code" name="bank_branch_code"><Input value={form.bank_branch_code ?? ""} onChange={(e) => setForm({ ...form, bank_branch_code: e.target.value })} /></F></div></div>}

          {step === 4 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> References & emergency contact</h2><p className="text-sm text-muted-foreground">References help us keep marketplace quality high before a Zooter goes live.</p><div className="grid sm:grid-cols-2 gap-3"><F label="Emergency contact name" name="emergency_contact_name"><Input value={form.emergency_contact_name ?? ""} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></F><F label="Emergency contact phone" name="emergency_contact_phone"><Input value={form.emergency_contact_phone ?? ""} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></F><F label="Reference 1 name" name="reference_1_name"><Input value={form.reference_1_name ?? ""} onChange={(e) => setForm({ ...form, reference_1_name: e.target.value })} /></F><F label="Reference 1 phone" name="reference_1_phone"><Input value={form.reference_1_phone ?? ""} onChange={(e) => setForm({ ...form, reference_1_phone: e.target.value })} /></F><F label="Reference 2 name" name="reference_2_name"><Input value={form.reference_2_name ?? ""} onChange={(e) => setForm({ ...form, reference_2_name: e.target.value })} /></F><F label="Reference 2 phone" name="reference_2_phone"><Input value={form.reference_2_phone ?? ""} onChange={(e) => setForm({ ...form, reference_2_phone: e.target.value })} /></F></div></div>}

          {step === 5 && <div className="space-y-3"><h2 className="font-display text-2xl font-bold">Upload documents</h2><p className="text-sm text-muted-foreground">All four documents are required and reviewed by the trust team.</p>{docMeta.map((d) => <div key={d.key} className="rounded-2xl border border-border p-4 flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${docs[d.key] ? "bg-accent/15 text-sage-deep" : "bg-muted text-muted-foreground"}`}>{docs[d.key] ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}</div><div className="flex-1 min-w-0"><p className="font-medium text-sm">{d.label}</p><p className="text-xs text-muted-foreground">{d.hint}</p></div><label className="cursor-pointer"><input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && handleUpload(d.key, e.target.files[0])} /><span className="inline-flex items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold px-3 py-1.5">{docs[d.key] ? "Replace" : "Upload"}</span></label></div>)}</div>}

          {step === 6 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /> Trust review consent</h2><div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground space-y-2"><p className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-sage-deep mt-0.5" /> By submitting you authorise Zoot to verify identity, selfie, address, banking details, references, and criminal background status.</p><p>No live third-party check is run in this version. Admin reviewers classify each verification area before activation.</p></div><label className="flex items-start gap-3 cursor-pointer"><Checkbox checked={form.background_check_consent} onCheckedChange={(v) => setForm({ ...form, background_check_consent: !!v })} /><span className="text-sm">I consent to the Zoot trust review and background-check process.</span></label></div>}

          <div className="flex justify-between mt-8 pt-4 border-t border-border"><Button variant="ghost" onClick={() => setStep(Math.max(step - 1, 0))} disabled={step === 0}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>{step < steps.length - 1 ? <Button onClick={next} className="gradient-warm">Save & continue <ArrowRight className="h-4 w-4 ml-1" /></Button> : <Button onClick={submit} disabled={submitting || !form.background_check_consent} className="gradient-warm">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit application <ArrowRight className="h-4 w-4 ml-1" /></>}</Button>}</div>
        </Card>
      </div>
    </div>
  );
};

export default Apply;
