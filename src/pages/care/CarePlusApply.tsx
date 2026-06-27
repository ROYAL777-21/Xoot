import { useState } from "react";
import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { z } from "zod";

const SKILLS = [
  "Housekeeping", "Cooking experience", "Hospitality trained",
  "Office cleaning experience", "Laundry & ironing: normal", "Laundry & ironing: expert",
];
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const PETS = ["Dogs", "Cats", "Other"];

const schema = z.object({
  first_name: z.string().trim().min(1, "First name required").max(100),
  last_name: z.string().trim().min(1, "Last name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  phone: z.string().trim().min(7, "Phone required").max(30),
  address: z.string().trim().min(5, "Full street address required").max(500),
});

const CarePlusApply = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: user?.email ?? "",
    phone: "",
    address: "",
    preferred_start_date: "",
    daily_start_time: "07:00",
    daily_end_time: "16:00",
    days_of_week: [] as string[],
    daily_pay_rate: 300,
    overtime: "",
    job_description: "",
    preferred_language: "",
    ideal_personality: "",
    required_skills: [] as string[],
    pets: [] as string[],
    other_qualities: "",
  });

  const update = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const toggle = (k: "days_of_week" | "required_skills" | "pets", v: string) =>
    setForm((f) => ({ ...f, [k]: f[k].includes(v) ? f[k].filter((x) => x !== v) : [...f[k], v] }));

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    const v = schema.safeParse(form);
    if (!v.success) { toast.error(Object.values(v.error.flatten().fieldErrors)[0]?.[0] ?? "Check the form"); setStep(1); return; }
    if (form.daily_pay_rate < 220) { toast.error("Minimum pay is R220 for half-day"); return; }

    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke("activate-care-plus", {
      body: {
        action: "placement_application",
        application: {
          ...form,
          preferred_start_date: form.preferred_start_date || null,
          daily_start_time: form.daily_start_time || null,
          daily_end_time: form.daily_end_time || null,
        },
      },
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    const result = data as { success?: boolean; error?: string } | null;
    if (result?.success === false) return toast.error(result.error ?? "Application submission failed");

    setDone(true);
  };

  if (done) {
    return (
      <div className="dark min-h-screen bg-background text-foreground">
        <Navbar />
        <div className="container max-w-2xl py-24 text-center">
          <div className="grid place-items-center h-20 w-20 rounded-full bg-sage/15 mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-sage-deep" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">Application received!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your placement request is in the support queue. We'll start review from the information you provided.
          </p>
          <Button asChild size="lg" className="rounded-full gradient-warm">
            <Link to="/app">Go to dashboard</Link>
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const totalSteps = 4;
  const progress = (step / totalSteps) * 100;

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="container max-w-3xl py-12">
        <div className="mb-8">
          <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Care+ placement</p>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">Let's find your permanent housekeeper.</h1>
          <div className="mt-6 h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full gradient-warm transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">Step {step} of {totalSteps}</p>
        </div>

        <div className="liquid-glass-shell zoot-concierge-panel rounded-[2rem] p-6 shadow-warm md:p-8">
          <div className="liquid-glass-readable space-y-5">
          {step === 1 && (
            <>
              <h2 className="font-display text-2xl font-bold">About yourself</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>First name</Label><Input value={form.first_name} onChange={(e) => update("first_name", e.target.value)} /></div>
                <div><Label>Last name</Label><Input value={form.last_name} onChange={(e) => update("last_name", e.target.value)} /></div>
                <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
                <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
              </div>
              <div>
                <Label>Address</Label>
                <Input placeholder="Please provide your full street address" value={form.address} onChange={(e) => update("address", e.target.value)} />
              </div>
              <p className="text-xs text-muted-foreground">
                Are you a worker looking for a job? <Link to="/zooter/apply" className="text-primary font-semibold">Apply here</Link>.
              </p>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-display text-2xl font-bold">Job details</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><Label>Preferred start date</Label><Input type="date" value={form.preferred_start_date} onChange={(e) => update("preferred_start_date", e.target.value)} /></div>
                <div><Label>Daily start time</Label><Input type="time" value={form.daily_start_time} onChange={(e) => update("daily_start_time", e.target.value)} /></div>
                <div><Label>Daily end time</Label><Input type="time" value={form.daily_end_time} onChange={(e) => update("daily_end_time", e.target.value)} /></div>
              </div>
              <div>
                <Label>Which days do you need help?</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {DAYS.map((d) => {
                    const on = form.days_of_week.includes(d);
                    return (
                      <button type="button" key={d} onClick={() => toggle("days_of_week", d)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                          on ? "bg-foreground text-background shadow-warm" : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}>{d}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Daily pay rate (Rand)</Label>
                <Input type="number" min={220} value={form.daily_pay_rate} onChange={(e) => update("daily_pay_rate", Number(e.target.value))} />
                <p className="text-xs text-muted-foreground mt-2">
                  Recommended market average: <strong>Half day R250-R300 / Full day R300-R400</strong>.
                  Minimum pay enforced: R220 (half) / R300 (full) for dignified work.
                </p>
              </div>
              <div>
                <Label>Will you require overtime?</Label>
                <RadioGroup value={form.overtime} onValueChange={(v) => update("overtime", v)} className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
                  {["Yes", "No", "Sometimes", "Not sure"].map((o) => (
                    <label key={o} className="flex items-center gap-2 rounded-2xl border border-border p-3 cursor-pointer hover:border-primary/40">
                      <RadioGroupItem value={o} /> <span className="text-sm">{o}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>
              <div>
                <Label>Short job description</Label>
                <Textarea rows={4} placeholder="What will your housekeeper's job entail?" value={form.job_description} onChange={(e) => update("job_description", e.target.value)} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-display text-2xl font-bold">Ideal candidate</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <div><Label>Preferred language</Label><Input placeholder="English, Zulu, Xhosa, Afrikaans..." value={form.preferred_language} onChange={(e) => update("preferred_language", e.target.value)} /></div>
                <div>
                  <Label>Ideal personality</Label>
                  <RadioGroup value={form.ideal_personality} onValueChange={(v) => update("ideal_personality", v)} className="grid grid-cols-3 gap-2 mt-2">
                    {["Reserved", "Outgoing", "Any"].map((o) => (
                      <label key={o} className="flex items-center gap-2 rounded-xl border border-border p-2.5 cursor-pointer hover:border-primary/40">
                        <RadioGroupItem value={o} /> <span className="text-sm">{o}</span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </div>
              <div>
                <Label>Required skills</Label>
                <div className="grid sm:grid-cols-2 gap-2 mt-2">
                  {SKILLS.map((s) => (
                    <label key={s} className="flex items-center gap-2 rounded-2xl border border-border p-3 cursor-pointer hover:border-primary/40">
                      <Checkbox checked={form.required_skills.includes(s)} onCheckedChange={() => toggle("required_skills", s)} />
                      <span className="text-sm">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <Label>Pets your worker should be comfortable with</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {PETS.map((p) => {
                    const on = form.pets.includes(p);
                    return (
                      <button type="button" key={p} onClick={() => toggle("pets", p)}
                        className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                          on ? "bg-foreground text-background" : "bg-muted text-muted-foreground hover:bg-muted/70"
                        }`}>{p}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <Label>Other qualities important to you</Label>
                <Textarea rows={3} value={form.other_qualities} onChange={(e) => update("other_qualities", e.target.value)} />
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h2 className="font-display text-2xl font-bold">Review & submit</h2>
              <div className="rounded-2xl bg-muted/50 p-5 text-sm space-y-2">
                <p><strong>{form.first_name} {form.last_name}</strong> / {form.email} / {form.phone}</p>
                <p>{form.address}</p>
                <p>{form.days_of_week.join(", ") || "No days selected"} / {form.daily_start_time}-{form.daily_end_time}</p>
                <p>Pay: R{form.daily_pay_rate}/day / Overtime: {form.overtime || "-"}</p>
                <p>Skills: {form.required_skills.join(", ") || "-"}</p>
              </div>
              <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5">
                <p className="text-sm font-semibold mb-1">Non-refundable admin fee: R399</p>
                <p className="text-xs text-muted-foreground">
                  This covers expert sourcing, vetting, and coordination of interviews and trials.
                  Online payment collection is not connected in this build; submit and a placement agent will follow up before any fee is collected.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                By submitting, you agree to the <Link to="/legal/terms" className="text-primary font-semibold hover:underline">Terms & Conditions</Link>.
              </p>
            </>
          )}

          <div className="flex justify-between pt-4 border-t border-border">
            <Button variant="ghost" onClick={() => setStep(Math.max(1, step - 1))} disabled={step === 1}>Back</Button>
            {step < totalSteps ? (
              <Button onClick={() => {
                if (step === 1) {
                  const v = schema.safeParse(form);
                  if (!v.success) { toast.error(Object.values(v.error.flatten().fieldErrors)[0]?.[0] ?? "Please fill in all required fields"); return; }
                }
                if (step === 2) {
                  if (form.days_of_week.length === 0) { toast.error("Please select at least one day"); return; }
                  if (form.daily_pay_rate < 220) { toast.error("Minimum daily pay is R220"); return; }
                }
                setStep(step + 1);
              }} className="gradient-warm rounded-full">
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={submitting} className="gradient-warm rounded-full">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit application"}
              </Button>
            )}
          </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CarePlusApply;
