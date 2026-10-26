import { cloneElement, createContext, isValidElement, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/kit/Logo";
import { HandoffFlowerField } from "@/components/xoot/HeroArtwork";
import "./apply-handoff.css";
import { ShieldCheck, Loader2, ArrowRight, ArrowLeft, Upload, FileCheck2, Phone, Users } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { checkRateLimit } from "@/lib/rate-limit";
import { captureOrSelectImage } from "@/lib/mobile-upload";
import { XooterApplicationInput } from "@/lib/validators";

type DocType = "id" | "proof_of_residence" | "bank_statement" | "selfie";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);
const ALLOWED_UPLOAD_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);

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

type ApplicationForm = typeof emptyForm;

const RequiredFieldContext = createContext<{ form: ApplicationForm; requiredKeys: string[] }>({
  form: emptyForm,
  requiredKeys: [],
});

const F = ({ label, name, children }: { label: string; name?: keyof ApplicationForm; children: ReactNode }) => {
  const { form, requiredKeys } = useContext(RequiredFieldContext);
  const missingRequired = Boolean(name && !String(form[name] ?? "").trim() && requiredKeys.includes(String(name)));

  return (
    <div className="space-y-1.5">
      <Label htmlFor={name ? `xooter-${name}` : undefined} className="text-sm font-semibold text-foreground">{label}</Label>
      {name && isValidElement<{ id?: string }>(children) ? cloneElement(children, { id: `xooter-${name}` }) : children}
      {missingRequired && <p className="text-[11px] text-muted-foreground">Required</p>}
    </div>
  );
};

const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const joinList = (value?: string[] | null) => (value ?? []).join(", ");
const safeFileName = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, "-").replace(/-+/g, "-").slice(0, 90);
const getFileExtension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const looksLikePhone = (value: string) => /^\+?[0-9\s().-]{7,20}$/.test(value.trim());
const looksLikeBankAccount = (value: string) => /^[0-9]{6,20}$/.test(value.trim());

const validateUpload = (file: File) => {
  if (!ALLOWED_UPLOAD_TYPES.has(file.type)) {
    return "Upload a PDF, JPG, PNG or WebP file.";
  }
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(getFileExtension(file.name))) {
    return "Upload a file with a PDF, JPG, PNG or WebP extension.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "Upload files smaller than 8MB.";
  }
  return null;
};

const XooterApplication = ({ user, token }: { user: User; token: string }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const pendingSave = useRef(false);
  const initialIdentity = useRef({ email: user.email ?? "", name: typeof user.user_metadata?.full_name === "string" ? user.user_metadata.full_name.slice(0, 120) : "" });
  const [submitting, setSubmitting] = useState(false);
  const [appId, setAppId] = useState<string | null>(null);
  const [docs, setDocs] = useState<Record<string, string>>({});
  const [uploadingDoc, setUploadingDoc] = useState<DocType | null>(null);
  const [form, setForm] = useState(emptyForm);
  const setField = <K extends keyof ApplicationForm>(key: K, value: ApplicationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setLoadError(false);
    (async () => {
      try {
      const { data: app, error } = await supabase.from("xooter_applications").select("*").eq("user_id", user.id).maybeSingle();
      if (cancelled) return;
      if (error) throw error;
      if (app) {
        const appRow = app as any;
        setAppId(appRow.id);
        setForm({
          ...emptyForm,
          ...appRow,
          full_name: appRow.full_name ?? "",
          phone: appRow.phone ?? "",
          email: appRow.email ?? initialIdentity.current.email,
          years_experience: String(appRow.years_experience ?? ""),
          supplies_owned: joinList(appRow.supplies_owned),
          availability_notes: appRow.availability?.notes ?? "",
          luxury_home_answer: appRow.behavioural_screening?.luxury_home ?? "",
          fragile_items_answer: appRow.behavioural_screening?.fragile_items ?? "",
          punctuality_answer: appRow.behavioural_screening?.punctuality ?? "",
          off_platform_answer: appRow.behavioural_screening?.off_platform ?? "",
          background_check_consent: appRow.background_check_consent ?? false,
        });
        if (appRow.status === "submitted") { navigate("/xooter/kyc"); return; }
        if (appRow.status === "approved") { navigate("/xooter"); return; }
        const { data: dlist, error: docsError } = await supabase.from("xooter_documents").select("doc_type, storage_path").eq("user_id", user.id);
        if (cancelled) return;
        if (docsError) throw docsError;
        const m: Record<string, string> = {};
        (dlist ?? []).forEach((d: any) => { m[d.doc_type] = d.storage_path; });
        setDocs(m);
      } else {
        setForm({ ...emptyForm, email: initialIdentity.current.email, full_name: initialIdentity.current.name });
      }
      } catch { if (!cancelled) setLoadError(true); }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [user.id, navigate, loadAttempt]);
  useEffect(() => { setSaved(false); }, [form]);

  const buildApplicationPayload = (sourceForm = form) => ({
    full_name: sourceForm.full_name,
    phone: sourceForm.phone,
    email: sourceForm.email,
    date_of_birth: sourceForm.date_of_birth,
    id_number: sourceForm.id_number,
    suburb: sourceForm.suburb,
    years_experience: Number(sourceForm.years_experience || 0),
    transport: sourceForm.transport,
    supplies_owned: splitList(sourceForm.supplies_owned),
    pet_comfort: sourceForm.pet_comfort,
    availability: { notes: sourceForm.availability_notes },
    behavioural_screening: {
      luxury_home: sourceForm.luxury_home_answer,
      fragile_items: sourceForm.fragile_items_answer,
      punctuality: sourceForm.punctuality_answer,
      off_platform: sourceForm.off_platform_answer,
    },
    address: sourceForm.address,
    city: sourceForm.city,
    postal_code: sourceForm.postal_code,
    service_category: "cleaning",
    bio: sourceForm.bio,
    bank_name: sourceForm.bank_name,
    bank_account_number: sourceForm.bank_account_number,
    bank_branch_code: sourceForm.bank_branch_code,
    emergency_contact_name: sourceForm.emergency_contact_name,
    emergency_contact_phone: sourceForm.emergency_contact_phone,
    reference_1_name: sourceForm.reference_1_name,
    reference_1_phone: sourceForm.reference_1_phone,
    reference_2_name: sourceForm.reference_2_name,
    reference_2_phone: sourceForm.reference_2_phone,
    background_check_consent: sourceForm.background_check_consent,
    selfie_storage_path: docs.selfie ?? null,
    docs,
  });

  const saveDraft = async (mode: "draft" | "submitted" = "draft", sourceForm = form) => {
    if (!user) return null;
    try {
    const payload = buildApplicationPayload(sourceForm);
    if (!payload.date_of_birth) delete (payload as any).date_of_birth;
    const { data, error } = await supabase.functions.invoke("submit-xooter-application", {
      headers: { Authorization: `Bearer ${token}` },
      body: { mode, application: payload, applicationId: appId },
    });
    if (error) { toast.error(error.message); return null; }
    const result = data as { success?: boolean; error?: string; data?: { application_id?: string } } | null;
    if (result?.success !== true || typeof result?.data?.application_id !== "string" || !result.data.application_id) {
      const missing = Array.isArray((result as any)?.missing) ? ` Missing: ${(result as any).missing.join(", ")}` : "";
      toast.error(`${result?.error ?? "Application save failed"}${missing}`);
      return null;
    }
    setAppId(result.data.application_id);
    setSaved(true);
    return result.data.application_id;
    } catch { toast.error("Your application was not saved. Please try again."); return null; }
  };

  const handleUpload = async (key: DocType, file: File) => {
    if (!user) return;
    const validationError = validateUpload(file);
    if (validationError) {
      haptic("warning");
      toast.error(validationError);
      return;
    }
    setUploadingDoc(key);
    let uploadedPath: string | null = null;
    try {
      const id = appId ?? (await saveDraft());
      if (!id) return;
      const uploadId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const path = `${user.id}/${key}-${uploadId}-${safeFileName(file.name)}`;
      const { error } = await supabase.storage.from("kyc-docs").upload(path, file, {
        cacheControl: "0",
        contentType: file.type,
        upsert: false,
      });
      if (error) { haptic("warning"); toast.error(error.message); return; }
      uploadedPath = path;
      const { data, error: docError } = await supabase.functions.invoke("submit-xooter-application", {
        headers: { Authorization: `Bearer ${token}` },
        body: {
          mode: "document",
          applicationId: id,
          document: { doc_type: key, storage_path: path },
        },
      });
      const docResult = data as { success?: boolean; error?: string } | null;
      if (docError || docResult?.success !== true) {
        if (uploadedPath) await supabase.storage.from("kyc-docs").remove([uploadedPath]);
        haptic("warning");
        toast.error(docError?.message ?? docResult?.error ?? "Document metadata could not be saved");
        return;
      }
      setDocs((d) => ({ ...d, [key]: path }));
      haptic("success");
      toast.success(`${key.replace(/_/g, " ")} uploaded`);
    } finally {
      setUploadingDoc(null);
    }
  };

  const captureSelfie = async () => {
    const file = await captureOrSelectImage();
    if (!file) return;
    await handleUpload("selfie", file);
  };

  const requiredForStep = () => {
    if (step === 0) return ["full_name", "phone", "email"];
    if (step === 1) return ["address", "city", "suburb", "postal_code"];
    if (step === 2) return ["bio", "years_experience", "transport", "supplies_owned", "pet_comfort", "availability_notes", "luxury_home_answer", "fragile_items_answer", "punctuality_answer", "off_platform_answer"];
    if (step === 3) return ["date_of_birth", "id_number", "bank_name", "bank_account_number", "bank_branch_code"];
    if (step === 4) return ["emergency_contact_name", "emergency_contact_phone", "reference_1_name", "reference_1_phone", "reference_2_name", "reference_2_phone"];
    return [];
  };

  const validateStep = () => {
    const missing = requiredForStep().filter((key) => !String((form as any)[key] ?? "").trim());
    if (missing.length) { haptic("warning"); toast.error("Please complete all required fields"); return false; }
    if (step === 0 && !looksLikeEmail(form.email)) { haptic("warning"); toast.error("Enter a valid email address"); return false; }
    if (step === 0 && !looksLikePhone(form.phone)) { haptic("warning"); toast.error("Enter a valid phone number"); return false; }
    if (step === 2 && Number(form.years_experience) < 0) { haptic("warning"); toast.error("Years of experience cannot be negative"); return false; }
    if (step === 3 && !looksLikeBankAccount(form.bank_account_number)) { haptic("warning"); toast.error("Enter a valid bank account number"); return false; }
    if (step === 3 && !/^[0-9]{4,8}$/.test(form.bank_branch_code.trim())) { haptic("warning"); toast.error("Enter a valid branch code"); return false; }
    if (step === 5) {
      const missingDocs = docMeta.filter((d) => !docs[d.key]);
      if (missingDocs.length) { haptic("warning"); toast.error(`Upload required: ${missingDocs.map((d) => d.label).join(", ")}`); return false; }
    }
    return true;
  };

  const next = async () => {
    if (pendingSave.current || !validateStep()) return;
    pendingSave.current = true; setSaving(true);
    try {
      const id = await saveDraft();
      if (!id) return;
      haptic("selection");
      setStep(current => Math.min(current + 1, steps.length - 1));
    } catch { toast.error("Your application was not saved. Please try again."); }
    finally { pendingSave.current = false; setSaving(false); }
  };

  const submit = async () => {
    if (!user) return;
    if (!form.background_check_consent) { haptic("warning"); toast.error("Background check consent is required"); return; }
    const applicationInput = XooterApplicationInput.safeParse({
      full_name: form.full_name,
      phone: form.phone,
      suburb: form.suburb,
      years_experience: form.years_experience,
    });
    if (!applicationInput.success) {
      haptic("warning");
      toast.error(applicationInput.error.issues[0]?.message ?? "Please check your application details.");
      return;
    }
    if (!checkRateLimit("application", 3, 3_600_000)) {
      haptic("warning");
      toast.error("Too many application submissions. Please wait before trying again.");
      return;
    }
    const safeForm = {
      ...form,
      full_name: applicationInput.data.full_name,
      phone: applicationInput.data.phone,
      suburb: applicationInput.data.suburb,
      years_experience: String(applicationInput.data.years_experience),
    };
    setSubmitting(true);
    const id = await saveDraft("submitted", safeForm);
    if (!id) { setSubmitting(false); return; }
    setSubmitting(false);
    haptic("success");
    toast.success("Application submitted. Trust review is now queued.");
    navigate("/xooter/kyc");
  };

  const steps = ["About you", "Address", "Experience", "Banking", "References", "Documents", "Consent"];
  const progress = ((step + 1) / steps.length) * 100;
  const requiredKeys = requiredForStep();
  const busy = saving || submitting || Boolean(uploadingDoc);
  const stages = ["You", "Where", "What", "Checks"];

  if (loading) return <div role="status" className="min-h-screen grid place-items-center"><Loader2 aria-label="Loading your application" className="h-6 w-6 animate-spin text-primary" /></div>;
  if (loadError) return <main className="xooter-onboarding"><div className="xooter-onboarding-content"><Logo /><div role="alert" className="xooter-onboarding-card"><h1>Your application could not be loaded.</h1><p>Please try again before making changes.</p><Button onClick={() => setLoadAttempt(current => current + 1)}>Try again</Button></div></div></main>;

  return (
    <div className="xooter-onboarding">
      <HandoffFlowerField className="xooter-onboarding-flowers" />
      <div className="xooter-onboarding-content">
        <header className="xooter-onboarding-header"><a href="/" aria-label="Xoot home"><Logo size={27} /></a><span><ShieldCheck size={15} aria-hidden="true" /> Work on your terms</span></header>
        <p className="xooter-onboarding-eyebrow">BECOME A XOOTER</p>
        <h1 className="xooter-onboarding-title">Work with Xoot</h1>
        <p className="xooter-onboarding-intro">Start with you. Add your experience, then complete the checks that help keep every visit safe.</p>
        <ol className="xooter-onboarding-stages" aria-label="Application stages">{stages.map((stage, index) => <li key={stage} aria-current={index === Math.min(step, 3) ? "step" : undefined} data-complete={index < Math.min(step, 3)}><span aria-hidden="true">{index + 1}</span>{stage}</li>)}</ol>
        <div className="xooter-onboarding-progress" role="progressbar" aria-label="Application progress" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={step + 1}><span style={{ width: `${progress}%` }} /></div>
        <p className="xooter-onboarding-step">{steps[step]} · step {step + 1} of {steps.length}</p>

        <RequiredFieldContext.Provider value={{ form, requiredKeys }}>
        <fieldset disabled={busy} className="xooter-onboarding-fields">
        <Card className="xooter-onboarding-card">
          {step === 0 && <div className="space-y-5"><div><h2>Let's start with you.</h2><p className="xooter-onboarding-hint">A few details to start your application. You can return to the checks when you are ready.</p></div><div className="grid sm:grid-cols-2 gap-4 xooter-about-fields"><F label="Your full name" name="full_name"><Input autoComplete="name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></F><F label="Mobile number" name="phone"><Input type="tel" inputMode="tel" autoComplete="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="082 123 4567" /></F><F label="Email" name="email"><Input autoComplete="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></F></div></div>}

          {step === 1 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold">Where can you work?</h2><p className="xooter-onboarding-hint">Tell us where you are based. Your address is part of your private application.</p><F label="Street address" name="address"><Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></F><div className="grid sm:grid-cols-3 gap-3"><F label="City" name="city"><Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} /></F><F label="Suburb" name="suburb"><Input value={form.suburb ?? ""} onChange={(e) => setForm({ ...form, suburb: e.target.value })} placeholder="Sandton, Midrand..." /></F><F label="Postal code" name="postal_code"><Input value={form.postal_code ?? ""} onChange={(e) => setForm({ ...form, postal_code: e.target.value })} /></F></div></div>}

          {step === 2 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold">What do you bring to each visit?</h2><p className="xooter-onboarding-hint">Tell us about your experience and the work you are comfortable with.</p><div className="grid sm:grid-cols-2 gap-4"><F label="Years of experience" name="years_experience"><Input type="number" min="0" value={form.years_experience ?? ""} onChange={(e) => setForm({ ...form, years_experience: e.target.value })} /></F><F label="Primary service"><Input value="House cleaning" disabled /></F></div><F label="Short bio" name="bio"><Textarea rows={3} value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Airbnb turnover specialist, gentle with pets, eco-friendly products..." /></F><div className="grid sm:grid-cols-2 gap-3"><F label="Transport" name="transport"><Input value={form.transport ?? ""} onChange={(e) => setForm({ ...form, transport: e.target.value })} placeholder="Own car, taxi, lift club" /></F><F label="Supplies owned" name="supplies_owned"><Input value={form.supplies_owned ?? ""} onChange={(e) => setForm({ ...form, supplies_owned: e.target.value })} placeholder="Vacuum, mop, products" /></F><F label="Pet comfort" name="pet_comfort"><Input value={form.pet_comfort ?? ""} onChange={(e) => setForm({ ...form, pet_comfort: e.target.value })} placeholder="Comfortable with dogs and cats" /></F><F label="Availability" name="availability_notes"><Input value={form.availability_notes ?? ""} onChange={(e) => setForm({ ...form, availability_notes: e.target.value })} placeholder="Weekdays, Saturdays, mornings..." /></F></div><F label="Luxury-home expectations" name="luxury_home_answer"><Textarea rows={2} value={form.luxury_home_answer ?? ""} onChange={(e) => setForm({ ...form, luxury_home_answer: e.target.value })} placeholder="How do you handle premium surfaces, linen, and quiet service?" /></F><F label="Fragile items" name="fragile_items_answer"><Textarea rows={2} value={form.fragile_items_answer ?? ""} onChange={(e) => setForm({ ...form, fragile_items_answer: e.target.value })} placeholder="What do you do around glassware, art, and sentimental items?" /></F><F label="Punctuality" name="punctuality_answer"><Textarea rows={2} value={form.punctuality_answer ?? ""} onChange={(e) => setForm({ ...form, punctuality_answer: e.target.value })} placeholder="What happens if traffic or a delay affects arrival?" /></F><F label="Off-platform request" name="off_platform_answer"><Textarea rows={2} value={form.off_platform_answer ?? ""} onChange={(e) => setForm({ ...form, off_platform_answer: e.target.value })} placeholder="What do you do if a client asks to book privately?" /></F></div>}

          {step === 3 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold">Identity & payouts</h2><p className="xooter-onboarding-hint">Your identity and banking details are privately reviewed before approval and payout.</p><div className="grid sm:grid-cols-2 gap-4"><F label="Date of birth" name="date_of_birth"><Input type="date" value={form.date_of_birth ?? ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></F><F label="ID / Passport number" name="id_number"><Input value={form.id_number ?? ""} onChange={(e) => setForm({ ...form, id_number: e.target.value })} /></F></div><F label="Bank name" name="bank_name"><Input value={form.bank_name ?? ""} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} /></F><div className="grid sm:grid-cols-2 gap-3"><F label="Account number" name="bank_account_number"><Input value={form.bank_account_number ?? ""} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} /></F><F label="Branch code" name="bank_branch_code"><Input value={form.bank_branch_code ?? ""} onChange={(e) => setForm({ ...form, bank_branch_code: e.target.value })} /></F></div></div>}

          {step === 4 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> References & emergency contact</h2><p className="text-sm text-muted-foreground">References help us keep marketplace quality high before a Xooter goes live.</p><div className="grid sm:grid-cols-2 gap-3"><F label="Emergency contact name" name="emergency_contact_name"><Input value={form.emergency_contact_name ?? ""} onChange={(e) => setForm({ ...form, emergency_contact_name: e.target.value })} /></F><F label="Emergency contact phone" name="emergency_contact_phone"><Input value={form.emergency_contact_phone ?? ""} onChange={(e) => setForm({ ...form, emergency_contact_phone: e.target.value })} /></F><F label="Reference 1 name" name="reference_1_name"><Input value={form.reference_1_name ?? ""} onChange={(e) => setForm({ ...form, reference_1_name: e.target.value })} /></F><F label="Reference 1 phone" name="reference_1_phone"><Input value={form.reference_1_phone ?? ""} onChange={(e) => setForm({ ...form, reference_1_phone: e.target.value })} /></F><F label="Reference 2 name" name="reference_2_name"><Input value={form.reference_2_name ?? ""} onChange={(e) => setForm({ ...form, reference_2_name: e.target.value })} /></F><F label="Reference 2 phone" name="reference_2_phone"><Input value={form.reference_2_phone ?? ""} onChange={(e) => setForm({ ...form, reference_2_phone: e.target.value })} /></F></div></div>}

          {step === 5 && (
            <div className="space-y-3">
              <h2 className="font-display text-2xl font-bold">Upload documents</h2>
              <p className="text-sm text-muted-foreground">All four documents are required and reviewed by the trust team. PDFs, JPGs, PNGs and WebP images under 8MB are accepted.</p>
              {docMeta.map((d) => {
                const isUploading = uploadingDoc === d.key;
                const uploadLocked = Boolean(uploadingDoc) || submitting;
                const hasDoc = Boolean(docs[d.key]);
                return (
                  <div key={d.key} className="rounded-2xl border border-border p-4 flex items-center gap-3">
                    <div className={`grid h-10 w-10 place-items-center rounded-xl ${hasDoc ? "bg-accent/15 text-accent-ink" : "bg-muted text-muted-foreground"}`}>
                      {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : hasDoc ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{d.label}</p>
                      <p className="text-xs text-muted-foreground">{isUploading ? "Uploading securely..." : d.hint}</p>
                    </div>
                    <label className={uploadLocked ? "cursor-not-allowed opacity-60" : "cursor-pointer"}>
                      <input
                        type="file"
                        className="sr-only"
                        aria-label={`Upload ${d.label}`}
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        disabled={uploadLocked}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) void handleUpload(d.key, file);
                        }}
                      />
                      <span className="inline-flex items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold px-3 py-1.5">
                        {isUploading ? "Uploading" : hasDoc ? "Replace" : uploadLocked ? "Wait" : "Upload"}
                      </span>
                    </label>
                    {d.key === "selfie" && (
                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={() => void captureSelfie()}
                        disabled={uploadLocked}
                      >
                        Camera
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {step === 6 && <div className="space-y-4"><h2 className="font-display text-2xl font-bold flex items-center gap-2"><Phone className="h-5 w-5 text-primary" /> Trust review consent</h2><div className="rounded-2xl bg-muted/50 p-4 text-sm text-muted-foreground space-y-2"><p className="flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-sage-deep mt-0.5" /> By submitting you authorise Xoot to verify identity, selfie, address, banking details, references, and criminal background status.</p><p>The trust team reviews each verification area before you can take jobs. Submitting this form does not approve your application.</p></div><label className="flex items-start gap-3 cursor-pointer"><Checkbox checked={form.background_check_consent} onCheckedChange={(v) => setField("background_check_consent", !!v)} /><span className="text-sm">I consent to the Xoot trust review and background-check process.</span></label></div>}

          <div className="flex justify-between mt-8 pt-4 border-t border-border"><Button variant="ghost" onClick={() => { haptic("selection"); setStep(Math.max(step - 1, 0)); }} disabled={step === 0}><ArrowLeft className="h-4 w-4 mr-1" /> Back</Button>{step < steps.length - 1 ? <Button onClick={next} className="bg-primary text-primary-foreground hover:bg-primary/90">{saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : <>Save & continue <ArrowRight className="h-4 w-4 ml-1" /></>}</Button> : <Button onClick={submit} disabled={submitting || !form.background_check_consent} className="bg-primary text-primary-foreground hover:bg-primary/90">{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Submit application <ArrowRight className="h-4 w-4 ml-1" /></>}</Button>}</div>
          <p role="status" className="xooter-onboarding-save-status">{saved ? "Your latest step is saved." : "Your progress is saved when you continue."}</p>
        </Card></fieldset>
        </RequiredFieldContext.Provider>
      </div>
    </div>
  );
};

const Apply = () => {
  const { user, session } = useAuth();
  if (!user || !session || session.user.id !== user.id) return <div role="status" className="min-h-screen grid place-items-center">Loading your Xoot account...</div>;
  return <XooterApplication key={user.id} user={user} token={session.access_token} />;
};

export default Apply;
