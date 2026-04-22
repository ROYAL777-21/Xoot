import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, User, Bell, CreditCard, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>({ full_name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle().then(({ data }) => {
      if (data) setProfile(data); setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: profile.full_name, phone: profile.phone, address: profile.address,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 lg:py-12 max-w-3xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-8">Profile & settings</h1>

      <Card className="p-6 rounded-3xl mb-6">
        <div className="flex items-center gap-2 mb-5">
          <User className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Personal info</h2>
        </div>
        <div className="space-y-4">
          <div><Label>Full name</Label><Input value={profile.full_name ?? ""} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })} /></div>
          <div><Label>Email</Label><Input value={user?.email ?? ""} disabled /></div>
          <div><Label>Phone</Label><Input value={profile.phone ?? ""} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} /></div>
          <div><Label>Default address</Label><Input value={profile.address ?? ""} onChange={(e) => setProfile({ ...profile, address: e.target.value })} placeholder="Used to pre-fill bookings" /></div>
        </div>
        <Button onClick={save} disabled={saving} className="mt-5 gradient-warm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
      </Card>

      <Card className="p-6 rounded-3xl mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Payment methods</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Card, Apple Pay, Google Pay and Link will be available once payments are connected. We never charge before a Zooter accepts.</p>
        <Button variant="outline" disabled>Connect payment method (coming soon)</Button>
      </Card>

      <Card className="p-6 rounded-3xl mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-sage-deep" />
          <h2 className="font-display text-xl font-bold">Become a Zooter</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Earn 65–96% per booking. Apply, complete verification, take training.</p>
        <Button asChild variant="outline"><Link to="/zooter/apply">Apply now</Link></Button>
      </Card>

      <Card className="p-6 rounded-3xl">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Notifications</h2>
        </div>
        <p className="text-sm text-muted-foreground">In-app notifications are on by default. Email and SMS settings coming soon.</p>
      </Card>
    </div>
  );
};

export default Profile;