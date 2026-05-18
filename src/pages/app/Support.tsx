import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LifeBuoy, Loader2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { routeNotificationChannel } from "@/lib/operations";

const getPriority = (text: string) => {
  const normalized = text.toLowerCase();
  if (normalized.includes("no-show") || normalized.includes("unsafe") || normalized.includes("damage")) return "urgent";
  if (normalized.includes("refund") || normalized.includes("replacement") || normalized.includes("complaint")) return "high";
  return "normal";
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const { data: ticket, error } = await supabase.from("support_tickets")
      .insert({ user_id: user.id, subject, body })
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    const priority = getPriority(`${subject} ${body}`);
    await (supabase as any).from("support_followups").insert({
      ticket_id: ticket.id,
      user_id: user.id,
      trigger_type: "manual",
      priority,
      notes: subject,
    });
    await (supabase as any).from("admin_review_queue").insert({
      queue_type: "support",
      subject_table: "support_tickets",
      subject_id: ticket.id,
      user_id: user.id,
      priority,
      summary: subject,
    });
    await (supabase as any).from("integration_outbox").insert(routeNotificationChannel("support_opened").map((channel) => ({
      source_table: "support_tickets",
      source_id: ticket.id,
      event_type: "support_opened",
      channel,
      owner: "Customer Support Agent",
      stack_tool: "Zoot in-app notification",
      payload: { ticket_id: ticket.id, subject, priority },
      created_by: user.id,
    })));

    toast.success("We've got your message. Support will review it in the app.");
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
        <p className="text-muted-foreground mt-2">Booking issues, refund reviews, replacements, and trust concerns are routed to the right internal queue.</p>
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
                <div className="rounded-2xl bg-accent-soft border border-accent/20 p-3 text-sm">
                  <p className="flex items-center gap-1 text-xs font-bold text-sage-deep uppercase mb-1">
                    <Sparkles className="h-3 w-3" /> Zoot Assistant
                  </p>
                  {t.ai_response}
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
