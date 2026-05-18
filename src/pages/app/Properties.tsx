import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Building2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const emptyForm = {
  account_type: "airbnb_host",
  name: "",
  billing_email: "",
  default_service_type: "airbnb",
  preferred_days: "",
  notes: "",
};

const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);

const Properties = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const refresh = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("property_accounts").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setAccounts(data ?? []);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { data: account, error } = await (supabase as any).from("property_accounts").insert({
      user_id: user.id,
      account_type: form.account_type,
      name: form.name,
      billing_email: form.billing_email || null,
      default_service_type: form.default_service_type,
      preferred_days: splitList(form.preferred_days),
      notes: form.notes || null,
      monthly_invoice: true,
    }).select("id").single();

    if (!error) {
      await (supabase as any).from("admin_review_queue").insert({
        queue_type: "b2b_invoice",
        subject_table: "property_accounts",
        subject_id: account.id,
        user_id: user.id,
        priority: "normal",
        summary: `B2B monthly invoice setup for ${form.name}`,
      });
      await (supabase as any).from("integration_outbox").insert({
        source_table: "property_accounts",
        source_id: account.id,
        event_type: "property_account_created",
        channel: "airtable_ops",
        owner: "Strategy & Operations Agent",
        stack_tool: "Airtable ops queue",
        payload: { property_account_id: account.id, account_type: form.account_type },
        created_by: user.id,
      });
    }

    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Property account created");
    setForm(emptyForm);
    refresh();
  };

  return (
    <div className="container py-8 lg:py-12 max-w-5xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-sage/15 px-3 py-1 mb-3">
          <Building2 className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Property accounts</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Airbnb, landlord and office accounts</h1>
        <p className="text-muted-foreground mt-2">Save property-level operations details and queue monthly invoice setup for admin review.</p>
      </div>

      <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-6">
        <Card className="p-6 rounded-3xl h-fit">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Account type</Label>
              <select value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="airbnb_host">Airbnb host</option>
                <option value="landlord">Landlord</option>
                <option value="property_manager">Property manager</option>
                <option value="office_estate">Office estate</option>
              </select>
            </div>
            <div><Label>Property / account name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div><Label>Billing email</Label><Input type="email" value={form.billing_email} onChange={(e) => setForm({ ...form, billing_email: e.target.value })} /></div>
            <div>
              <Label>Default service</Label>
              <select value={form.default_service_type} onChange={(e) => setForm({ ...form, default_service_type: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="airbnb">Airbnb clean</option>
                <option value="office">Office clean</option>
                <option value="moving">Moving clean</option>
                <option value="premium">Premium clean</option>
              </select>
            </div>
            <div><Label>Preferred days</Label><Input value={form.preferred_days} onChange={(e) => setForm({ ...form, preferred_days: e.target.value })} placeholder="Monday, Thursday" /></div>
            <div><Label>Operations notes</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Turnover timing, concierge, linen, invoice preferences" /></div>
            <Button type="submit" disabled={submitting} className="rounded-xl gradient-warm">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Create account</>}
            </Button>
          </form>
        </Card>

        <div className="space-y-3">
          {loading ? <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : accounts.length === 0 ? (
            <Card className="p-8 rounded-3xl text-center text-muted-foreground">No property accounts yet.</Card>
          ) : accounts.map((account) => (
            <Card key={account.id} className="p-5 rounded-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold">{account.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{account.account_type.replace(/_/g, " ")} - {account.default_service_type}</p>
                </div>
                <span className="text-[10px] uppercase font-bold rounded-full bg-sage/15 text-sage-deep px-2 py-1">{account.status}</span>
              </div>
              {account.notes && <p className="text-sm text-muted-foreground mt-3">{account.notes}</p>}
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Properties;
