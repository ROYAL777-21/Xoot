import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LifeBuoy, Loader2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

type SupportAssistantReply = {
  response?: string;
  escalated?: boolean;
  source?: "openai_responses" | "zoot_support_rules" | "human_escalation";
  openai_request_id?: string | null;
};

const requestSupportAssistantReply = async (
  ticketId: string,
  subject: string,
  body: string,
): Promise<SupportAssistantReply | null> => {
  const functionsClient = (supabase as any).functions;
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

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase.from("support_tickets").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setTickets(data ?? []);
  };

  useEffect(() => { refresh(); }, [user]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const { data, error } = await supabase.functions.invoke("create-support-case", {
      body: { subject, description: body, category: subject },
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
      assistantReply = await requestSupportAssistantReply(result.data.case_id, subject, body);
    } catch {
      assistantReply = null;
    }

    haptic("success");
    if (assistantReply?.escalated) {
      toast.success("We've flagged this for human support review in the app.");
    } else if (assistantReply?.response) {
      toast.success("Zoot Assistant replied and support has your ticket.");
    } else {
      toast.success("We've got your message. Support will review it in the app.");
    }
    setSubject("");
    setBody("");
    setSubmitting(false);
    refresh();
  };

  return (
    <div className="container py-8 lg:py-12 max-w-4xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-sage/15 px-3 py-1 mb-3">
          <Clock className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Support queue</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">How can we help?</h1>
        <p className="text-muted-foreground mt-2">Booking issues, refund reviews, replacements, and trust concerns are routed to the right internal queue. Care+ members receive priority handling for booking issues, cancellations, and service concerns.</p>
      </div>

      <Card className="p-6 rounded-3xl mb-8">
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} required placeholder="e.g. Reschedule tomorrow's clean" />
          </div>
          <div>
            <Label>Tell us what's happening</Label>
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={4} />
          </div>
          <Button type="submit" disabled={submitting} className="rounded-xl gradient-warm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LifeBuoy className="h-4 w-4 mr-1" /> Get help</>}
          </Button>
        </form>
      </Card>

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
                      <Sparkles className="h-3 w-3" /> Zoot Assistant
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
