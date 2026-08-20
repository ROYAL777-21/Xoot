import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, User, Bell, CreditCard, Sparkles, Home, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { ProfileUpdateInput } from "@/lib/validators";

type HouseholdProfile = {
  id?: string;
  label: string;
  address: string;
  pet_notes: string;
  parking_instructions: string;
  gate_code: string;
  cleaning_preferences: string;
  fragile_areas: string;
  favourite_products: string;
  access_notes: string;
  is_default: boolean;
};

const defaultHousehold: HouseholdProfile = {
  label: "Home",
  address: "",
  pet_notes: "",
  parking_instructions: "",
  gate_code: "",
  cleaning_preferences: "",
  fragile_areas: "",
  favourite_products: "",
  access_notes: "",
  is_default: true,
};

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>({ full_name: "", phone: "", address: "" });
  const [household, setHousehold] = useState<HouseholdProfile>(defaultHousehold);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingHousehold, setSavingHousehold] = useState(false);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("household_profiles").select("*").eq("user_id", user.id).eq("is_default", true).maybeSingle(),
    ]).then(([profileResult, householdResult]) => {
      if (profileResult.data) setProfile(profileResult.data);
      if (householdResult.data) setHousehold({ ...defaultHousehold, ...householdResult.data });
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    const profileInput = ProfileUpdateInput.safeParse({
      full_name: profile.full_name ?? "",
      phone: profile.phone ?? "",
      address: profile.address ?? "",
    });
    if (!profileInput.success) {
      toast.error(profileInput.error.issues[0]?.message ?? "Please check your profile details.");
      return;
    }
    const safeProfile = profileInput.data;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: safeProfile.full_name, phone: safeProfile.phone, address: safeProfile.address,
    }).eq("id", user.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  const saveHousehold = async () => {
    if (!user) return;
    setSavingHousehold(true);
    const payload = {
      user_id: user.id,
      label: household.label || "Home",
      address: household.address || profile.address || null,
      pet_notes: household.pet_notes || null,
      parking_instructions: household.parking_instructions || null,
      gate_code: household.gate_code || null,
      cleaning_preferences: household.cleaning_preferences || null,
      fragile_areas: household.fragile_areas || null,
      favourite_products: household.favourite_products || null,
      access_notes: household.access_notes || null,
      is_default: true,
      updated_at: new Date().toISOString(),
    };

    const query = supabase.from("household_profiles");
    const { data, error } = household.id
      ? await query.update(payload).eq("id", household.id).select("*").single()
      : await query.insert(payload).select("*").single();

    setSavingHousehold(false);
    if (error) return toast.error(error.message);
    setHousehold({ ...defaultHousehold, ...data });
    toast.success("Household profile saved");
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
        <Button onClick={save} disabled={saving} className="mt-5">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}</Button>
      </Card>

      <Card className="p-6 rounded-3xl mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Home className="h-5 w-5 text-sage-deep" />
          <h2 className="font-display text-xl font-bold">Household profile</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Save the details that make each visit smoother: pets, parking, gate access, product preferences, and fragile areas.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><Label>Profile label</Label><Input value={household.label} onChange={(e) => setHousehold({ ...household, label: e.target.value })} /></div>
          <div><Label>Address</Label><Input value={household.address ?? ""} onChange={(e) => setHousehold({ ...household, address: e.target.value })} placeholder={profile.address || "Full address"} /></div>
          <div><Label>Parking instructions</Label><Input value={household.parking_instructions ?? ""} onChange={(e) => setHousehold({ ...household, parking_instructions: e.target.value })} placeholder="Visitor bay, street parking, garage code" /></div>
          <div><Label>Gate code</Label><Input value={household.gate_code ?? ""} onChange={(e) => setHousehold({ ...household, gate_code: e.target.value })} placeholder="Optional" /></div>
          <div className="sm:col-span-2"><Label>Pet notes</Label><Textarea rows={2} value={household.pet_notes ?? ""} onChange={(e) => setHousehold({ ...household, pet_notes: e.target.value })} placeholder="Names, temperament, rooms to avoid, feeding notes" /></div>
          <div className="sm:col-span-2"><Label>Cleaning preferences</Label><Textarea rows={2} value={household.cleaning_preferences ?? ""} onChange={(e) => setHousehold({ ...household, cleaning_preferences: e.target.value })} placeholder="Preferred order, rooms to prioritise, laundry preferences" /></div>
          <div><Label>Fragile areas</Label><Textarea rows={2} value={household.fragile_areas ?? ""} onChange={(e) => setHousehold({ ...household, fragile_areas: e.target.value })} placeholder="Art wall, glass table, antiques" /></div>
          <div><Label>Favourite products</Label><Textarea rows={2} value={household.favourite_products ?? ""} onChange={(e) => setHousehold({ ...household, favourite_products: e.target.value })} placeholder="Eco products, floor cleaner, no bleach" /></div>
          <div className="sm:col-span-2"><Label>Access notes</Label><Textarea rows={2} value={household.access_notes ?? ""} onChange={(e) => setHousehold({ ...household, access_notes: e.target.value })} placeholder="Keys, concierge, alarm notes" /></div>
        </div>
        <Button onClick={saveHousehold} disabled={savingHousehold} className="mt-5">
          {savingHousehold ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save household"}
        </Button>
      </Card>

      <Card className="p-6 rounded-3xl mb-6">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Payment methods</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Card, Apple Pay, Google Pay and Link will be available once payments are connected. We never charge before a Xooter accepts.</p>
        <Button variant="outline" disabled>Connect payment method (coming soon)</Button>
      </Card>

      <Card className="p-6 rounded-3xl mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-5 w-5 text-sage-deep" />
          <h2 className="font-display text-xl font-bold">Become a Xooter</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">Earn predictable income from recurring clients, premium homes, fair pay rules, fast support, and stronger vetting.</p>
        <Button asChild variant="outline"><Link to="/xooter/apply">Apply now</Link></Button>
      </Card>

      <Card className="p-6 rounded-3xl">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="font-display text-xl font-bold">Notifications</h2>
        </div>
        <p className="text-sm text-muted-foreground flex items-start gap-2"><ShieldCheck className="h-4 w-4 text-sage-deep mt-0.5" /> In-app notifications are on by default for arrivals, changes, trust incidents, and Care+ updates.</p>
      </Card>
    </div>
  );
};

export default Profile;
