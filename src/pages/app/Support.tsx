import { useCallback, useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Bot, CheckCircle2, Clock, LifeBuoy, Loader2, MessageCircle, ShieldAlert, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";
import { checkRateLimit } from "@/lib/rate-limit";
import { SupportCaseInput } from "@/lib/validators";

type SupportAssistantReply = {
  response?: string;
  escalated?: boolean;
  source?: "openrouter" | "openai_responses" | "human_escalation";
  openai_request_id?: string | null;
};

const quickSupportPrompts = [
  {
    label: "Late Xooter",
    subject: "My Xooter is late",
    body: "My Xooter has not arrived yet. Please check the booking and help me understand the next step.",
  },
  {
    label: "Replacement",
    subject: "I need a replacement Xooter",
    body: "I need help with a replacement for my booking. Please review the safest option for this job.",
  },
  {
    label: "Quality review",
    subject: "I need help after a clean",
    body: "I would like Xoot to review a service concern and advise what can be done next.",
  },
  {
    label: "Join Xoot",
    subject: "I need help with Xooter onboarding",
    body: "I am applying to become a Xooter and need help with onboarding, document uploads, training, or trust review.",
  },
  {
    label: "Care+",
    subject: "I have a Care+ question",
    body: "I want to understand Care+ benefits, Home Memory, Favourite Xooter rebooking, XootCred, or priority support.",
  },
];

const requestSupportAssistantReply = async (
  ticketId: string,
  subject: string,
  body: string,
): Promise<SupportAssistantReply | null> => {
  const functionsClient = supabase.functions;
  if (!functionsClient?.invoke) return null;

  const { data, error } = await functionsClient.invoke("support-respond", {
    body: { ticket_id: ticketId, subject, body, role: "user" },
  });

  if (error) throw error;
  if (!data || typeof data.response !== "string") return null;
  return data as SupportAssistantReply;
};

const Support = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [assistantReply, setAssistantReply] = useState<SupportAssistantReply | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTickets(data ?? []);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const supportInput = SupportCaseInput.safeParse({ category: subject, description: body, booking_id: "" });
    if (!supportInput.success) {
      haptic("warning");
      toast.error(supportInput.error.issues[0]?.message ?? "Please check your support message.");
      return;
    }
    const safeSupport = supportInput.data;
    if (!checkRateLimit("support", 5, 3_600_000)) {
      haptic("warning");
      toast.error("Too many support requests. Please wait before creating another ticket.");
      return;
    }

    setSubmitting(true);
    setAssistantReply(null);

    const { data, error } = await supabase.functions.invoke("create-support-case", {
      body: { subject: safeSupport.category, description: safeSupport.description, category: safeSupport.category },
    });

    if (error) {
      haptic("warning");
      toast.error(error.message);
      setSubmitting(false);
      return;
    }
    const result = data as { success?: boolean; error?: string; data?: { case_id?: string } } | null;
    if (result?.success === false || !result?.data?.case_id) {
      haptic("warning");
      toast.error(result?.error ?? "Support ticket could not be created");
      setSubmitting(false);
      return;
    }

    let assistantReply: SupportAssistantReply | null = null;
    try {
      assistantReply = await requestSupportAssistantReply(result.data.case_id, safeSupport.category, safeSupport.description);
    } catch {
      assistantReply = null;
    }
    setAssistantReply(assistantReply);

    haptic("success");
    if (assistantReply?.escalated) {
      toast.success("We've flagged this for human support review in the app.");
    } else if (assistantReply?.response) {
      toast.success("Xoot Assistant replied and support has your ticket.");
    } else {
      toast.success("We've got your message. Support will review it in the app.");
    }
    setSubject("");
    setBody("");
    setSubmitting(false);
    refresh();
  };

  return (
    <div className="container py-8 lg:py-12 max-w-5xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-sage/15 px-3 py-1 mb-3">
          <Clock className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Support queue</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">How can we help?</h1>
        <p className="text-muted-foreground mt-2">Booking issues, refund reviews, replacements, and trust concerns are routed to the right internal queue. Care+ members receive priority handling for booking issues, cancellations, and service concerns.</p>
      </div>

      <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-4 mb-8">
        <Card className="p-6 rounded-3xl">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="e.g. Reschedule tomorrow's clean" />
            </div>
            <div className="space-y-1.5">
              <Label>Tell us what's happening</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={5} />
            </div>
            <div className="flex flex-wrap gap-2">
              {quickSupportPrompts.map((prompt) => (
                <button
                  key={prompt.label}
                  type="button"
                  className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                  onClick={() => {
                    setSubject(prompt.subject);
                    setBody(prompt.body);
                  }}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
            <Button type="submit" disabled={submitting} className="rounded-xl gradient-warm">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LifeBuoy className="h-4 w-4 mr-1" /> Get help</>}
            </Button>
          </form>
        </Card>

        <aside className="liquid-glass-shell rounded-3xl p-5">
          <div className="liquid-glass-readable space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl gradient-sage text-primary-foreground shadow-warm">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-display text-xl font-bold">Xoot bot</p>
                  <p className="text-xs text-muted-foreground">Fast triage with human backup</p>
                </div>
              </div>
              <span className="rounded-full bg-sage/15 px-2.5 py-1 text-[10px] font-bold uppercase text-sage-deep">Care desk</span>
            </div>

            <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
              {submitting ? (
                <div className="flex items-start gap-3">
                  <Loader2 className="mt-0.5 h-4 w-4 animate-spin text-primary" />
                  <div>
                    <p className="font-semibold">Reading your message</p>
                    <p className="text-sm leading-6 text-muted-foreground">The assistant is preparing a safe first reply while your ticket enters the support queue.</p>
                  </div>
                </div>
              ) : assistantReply?.response ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-xs font-bold uppercase text-sage-deep">
                    {assistantReply.escalated ? <ShieldAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                    {assistantReply.escalated ? "Human review queued" : "Assistant reply"}
                  </p>
                  <p className="text-sm leading-6 text-foreground">{assistantReply.response}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 font-semibold">
                    <MessageCircle className="h-4 w-4 text-primary" /> Start with the details that matter
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Share the booking, timing, location, and what outcome would help. Refunds, payments, replacements, and trust issues always stay in human review before anything changes.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                <p className="font-bold text-foreground">Triage</p>
                <p className="text-muted-foreground">First read</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                <p className="font-bold text-foreground">Safety</p>
                <p className="text-muted-foreground">Escalates risk</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background/35 p-3">
                <p className="font-bold text-foreground">Care+</p>
                <p className="text-muted-foreground">Priority queue</p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <h2 className="font-display text-xl font-bold mb-3">Your tickets</h2>
      {tickets.length === 0 ? (
        <Card className="p-8 rounded-3xl text-center text-muted-foreground">No tickets yet.</Card>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <Card key={t.id} className="p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h3 className="font-bold">{t.subject}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-sage/15 text-sage-deep">{t.status}</span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">{t.body}</p>
              {t.ai_response && (
                <div className="liquid-glass-shell rounded-2xl p-3 text-sm">
                  <div className="liquid-glass-readable">
                    <p className="flex items-center gap-1 text-xs font-bold text-sage-deep uppercase mb-1">
                      <Sparkles className="h-3 w-3" /> Xoot Assistant
                    </p>
                    <p className="text-sm leading-6 text-foreground">{t.ai_response}</p>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Support;
