import { useState, type FormEvent } from "react";
import { MessageSquareQuote, Send } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";

const workflows = ["Booking flow", "Address search", "Price breakdown", "Care+", "Xooter application", "Support chat", "Installable app", "Airbnb and Office"];

export function FeedbackSection() {
  const { user } = useAuth();
  const [workflow, setWorkflow] = useState(workflows[0]);
  const [feedback, setFeedback] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = feedback.trim();
    if (body.length < 12) { haptic("warning"); toast.error("Please add a little more detail so the team can understand the workflow."); return; }
    if (!user) { haptic("warning"); toast.error("Please sign in before sending product feedback so Xoot can follow up safely."); return; }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-support-case", {
        body: { subject: `Product feedback: ${workflow}`, description: body, category: "product_feedback" },
      });
      const result = data as { success?: boolean; error?: string } | null;
      if (error || result?.success === false) throw error ?? new Error(result?.error ?? "Feedback could not be sent");
      haptic("success");
      toast.success("Thanks. Your feedback has been routed to Xoot support.");
      setFeedback("");
    } catch {
      haptic("warning");
      toast.error("Feedback could not be sent right now. Please try again in the app.");
    } finally { setSubmitting(false); }
  }

  return (
    <section className="xoot-public-section xoot-public-section--alt" aria-labelledby="feedback-title">
      <div className="xoot-public-inner xoot-feedback-grid">
        <div className="xoot-section-head">
          <p className="xoot-section-eyebrow xoot-section-eyebrow--sage">Product feedback</p>
          <h2 id="feedback-title" className="xoot-section-title">Help shape the workflows before they become habit.</h2>
          <p className="xoot-section-sub">Tell Xoot where a booking, support, Care+, address, or installable-app step feels unclear.</p>
        </div>
        <div className="xoot-card xoot-feedback-card">
          <form className="xoot-feedback-form" onSubmit={submit}>
            <div className="xoot-feedback-field">
              <label htmlFor="feedback-workflow">Workflow</label>
              <select id="feedback-workflow" value={workflow} onChange={(event) => setWorkflow(event.target.value)}>{workflows.map((item) => <option key={item}>{item}</option>)}</select>
            </div>
            <div className="xoot-feedback-field">
              <label htmlFor="feedback-body">What should feel better?</label>
              <textarea id="feedback-body" value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={5} maxLength={900} placeholder="Tell us what felt unclear and where it happened…" />
              <p className="xoot-feedback-help">Please avoid passwords, card details, gate codes, ID numbers or private access notes.</p>
            </div>
            <button className="xoot-action xoot-feedback-submit" type="submit" disabled={submitting} aria-busy={submitting}>{submitting ? "Sending…" : <><Send size={17} /> Send constructive feedback</>}</button>
          </form>
          <p className="xoot-feedback-note"><MessageSquareQuote aria-hidden="true" />Product feedback is reviewed for patterns. Urgent booking, safety or payment issues should go through in-app support.</p>
        </div>
      </div>
    </section>
  );
}
