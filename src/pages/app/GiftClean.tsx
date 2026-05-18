import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Gift, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { buildPendingPaymentRecord, routeNotificationChannel } from "@/lib/operations";
import { formatZAR } from "@/lib/format";

const servicePrices: Record<string, number> = {
  residential: 270,
  deep: 365,
  airbnb: 315,
  premium: 420,
  moving: 455,
};

const GiftClean = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    recipient_name: "",
    recipient_email: "",
    recipient_phone: "",
    occasion: "",
    message: "",
    service_type: "residential",
  });
  const [submitting, setSubmitting] = useState(false);
  const amount = servicePrices[form.service_type] ?? servicePrices.residential;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);

    const { data: order, error } = await (supabase as any).from("gift_clean_orders").insert({
      purchaser_user_id: user.id,
      recipient_name: form.recipient_name,
      recipient_email: form.recipient_email || null,
      recipient_phone: form.recipient_phone || null,
      occasion: form.occasion || null,
      message: form.message || null,
      service_type: form.service_type,
      amount,
      status: "pending_payment",
    }).select("id").single();

    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    const { data: payment } = await (supabase as any).from("payment_records").insert({
      ...buildPendingPaymentRecord({ userId: user.id, amount, kind: "gift_clean" }),
      meta: { gift_clean_order_id: order.id, service_type: form.service_type },
    }).select("id").single();

    await (supabase as any).from("gift_clean_orders").update({ payment_record_id: payment?.id }).eq("id", order.id);
    await (supabase as any).from("admin_review_queue").insert({
      queue_type: "payment",
      subject_table: "gift_clean_orders",
      subject_id: order.id,
      user_id: user.id,
      priority: "normal",
      summary: `Gift clean pending payment for ${form.recipient_name}`,
    });
    await (supabase as any).from("integration_outbox").insert([
      ...routeNotificationChannel("invoice_created").map((channel) => ({
        source_table: "gift_clean_orders",
        source_id: order.id,
        event_type: "gift_clean_invoice_created",
        channel,
        owner: "Retention & Loyalty Agent",
        stack_tool: channel === "brevo_email" ? "Brevo email queue" : "Zoot in-app notification",
        payload: { gift_clean_order_id: order.id, amount },
        created_by: user.id,
      })),
      {
        source_table: "payment_records",
        source_id: payment?.id,
        event_type: "gift_clean_payment_authorisation_requested",
        channel: "payment_provider",
        owner: "Finance Operations",
        stack_tool: "Payment provider queue",
        payload: { payment_record_id: payment?.id, amount },
        status: "needs_approval",
        approval_required: true,
        failure_mode: "Gift order remains pending until provider callback or admin confirmation exists.",
        created_by: user.id,
      },
    ]);

    setSubmitting(false);
    toast.success("Gift clean recorded with pending payment");
    setForm({ recipient_name: "", recipient_email: "", recipient_phone: "", occasion: "", message: "", service_type: "residential" });
  };

  return (
    <div className="container py-8 lg:py-12 max-w-3xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
          <Gift className="h-3 w-3 text-primary" />
          <span className="text-xs font-medium text-primary">Gift a clean</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Send practical home care</h1>
        <p className="text-muted-foreground mt-2">Create a real gift-clean order. Delivery waits for payment confirmation.</p>
      </div>

      <Card className="p-6 rounded-3xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Recipient name</Label><Input value={form.recipient_name} onChange={(e) => setForm({ ...form, recipient_name: e.target.value })} required /></div>
            <div><Label>Occasion</Label><Input value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} placeholder="Birthday, new home, thank you" /></div>
            <div><Label>Recipient email</Label><Input type="email" value={form.recipient_email} onChange={(e) => setForm({ ...form, recipient_email: e.target.value })} /></div>
            <div><Label>Recipient phone</Label><Input value={form.recipient_phone} onChange={(e) => setForm({ ...form, recipient_phone: e.target.value })} /></div>
          </div>
          <div>
            <Label>Service</Label>
            <select value={form.service_type} onChange={(e) => setForm({ ...form, service_type: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
              <option value="residential">Residential clean</option>
              <option value="deep">Deep clean</option>
              <option value="airbnb">Airbnb clean</option>
              <option value="moving">Moving clean</option>
              <option value="premium">Premium clean</option>
            </select>
          </div>
          <div><Label>Message</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></div>
          <div className="rounded-2xl bg-muted/40 p-4 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Pending amount</span>
            <span className="font-display text-2xl font-bold">{formatZAR(amount)}</span>
          </div>
          <Button type="submit" disabled={submitting} className="rounded-xl gradient-warm">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Record gift clean</>}
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default GiftClean;
