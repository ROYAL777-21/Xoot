import { useState, type FormEvent } from "react";
import { MessageSquareQuote, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { isPreviewSupabase, supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";

const workflows = [
  "Booking flow",
  "Address search",
  "Price breakdown",
  "Care+",
  "Zooter application",
  "Support chat",
  "Installable app",
  "Airbnb and Office",
];

export const FeedbackSection = () => {
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(workflows[0]);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const body = feedback.trim();
    if (body.length < 12) {
      haptic("warning");
      toast.error("Please add a little more detail so the team can understand the workflow.");
      return;
    }

    if (!user && !isPreviewSupabase) {
      haptic("warning");
      toast.error("Please sign in before sending product feedback so Zoot can follow up safely.");
      return;
    }

    setSubmitting(true);
    try {
      if (!isPreviewSupabase) {
        const { error } = await supabase.functions.invoke("create-support-ticket", {
          body: {
            subject: `Product feedback: ${workflow}`,
            body,
            category: "product_feedback",
          },
        });
        if (error) throw error;
      }

      haptic("success");
      toast.success(isPreviewSupabase ? "Preview feedback captured for this session." : "Thanks. Your feedback has been routed to Zoot support.");
      setFeedback("");
    } catch {
      haptic("warning");
      toast.error("Feedback could not be sent right now. Please try again in the app.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="relative overflow-hidden border-y border-border/70 bg-secondary/45 py-16 md:py-20">
      <div className="pointer-events-none absolute -left-10 top-10 h-32 w-32 rounded-full border border-primary/15" aria-hidden="true" />
      <div className="container grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-background px-3 py-1.5 text-xs font-semibold text-sage-deep shadow-card">
            <Sparkles className="h-3.5 w-3.5" />
            Product feedback
          </div>
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
            Help shape the workflows before they become habit.
          </h2>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Tell Zoot where a booking, support, Care+, address, or installable-app step feels unclear. Useful critique helps the product become calmer, faster and more dependable.
          </p>
        </div>

        <Card className="rounded-3xl border-border bg-card/95 p-5 shadow-soft md:p-6">
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="feedback-workflow">Workflow</Label>
              <select
                id="feedback-workflow"
                value={workflow}
                onChange={(event) => setWorkflow(event.target.value)}
                className="h-11 rounded-xl border border-input bg-background px-3 text-sm"
              >
                {workflows.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="feedback-body">What should feel better?</Label>
              <Textarea
                id="feedback-body"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                rows={5}
                maxLength={900}
                placeholder="Example: The address step should explain whether my area is under active coverage or operations review..."
                className="native-textarea rounded-2xl"
              />
              <p className="text-xs text-muted-foreground">
                Please avoid sending passwords, card details, gate codes, ID numbers or private access notes.
              </p>
            </div>
            <Button type="submit" className="h-12 rounded-2xl gradient-warm shadow-warm" disabled={submitting}>
              <Send className="mr-2 h-4 w-4" />
              Send constructive feedback
            </Button>
          </form>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-muted/45 p-3 text-xs text-muted-foreground">
            <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Product feedback is reviewed for patterns; urgent booking, safety or payment issues should still go through in-app support.
          </div>
        </Card>
      </div>
    </section>
  );
};
