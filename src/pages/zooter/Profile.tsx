import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, ShieldCheck, Star, Repeat } from "lucide-react";
import { toast } from "sonner";
import { TrustBadges } from "@/components/zoot/TrustBadges";
import { deriveZooterBadges } from "@/lib/trust";

const splitList = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
const joinList = (value?: string[] | null) => (value ?? []).join(", ");

const Profile = () => {
  const { user } = useAuth();
  const [zooter, setZooter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");
  const [suburbsInput, setSuburbsInput] = useState("");
  const [suppliesInput, setSuppliesInput] = useState("");
  const [languagesInput, setLanguagesInput] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("zooters").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setZooter(data);
      setTagsInput((data?.tags ?? []).join(", "));
      setSuburbsInput(joinList(data?.suburb_coverage));
      setSuppliesInput(joinList(data?.supplies_owned));
      setLanguagesInput(joinList(data?.languages_spoken));
      setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!zooter) return;
    setSaving(true);
    const payload: any = {
      bio: zooter.bio,
      name: zooter.name,
      hourly_rate: Number(zooter.hourly_rate),
      years_experience: Number(zooter.years_experience ?? 0),
      transport: zooter.transport,
      pet_comfort: zooter.pet_comfort,
      tags: splitList(tagsInput),
      suburb_coverage: splitList(suburbsInput),
      supplies_owned: splitList(suppliesInput),
      languages_spoken: splitList(languagesInput),
      airbnb_specialist: !!zooter.airbnb_specialist,
    };
    const { error } = await (supabase as any).from("zooters").update(payload).eq("id", zooter.id);
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Profile saved");
  };

  const upload = async (file: File) => {
    if (!user || !zooter) return;
    const path = `${user.id}/avatar-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("zooter-avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    const { data: url } = supabase.storage.from("zooter-avatars").getPublicUrl(path);
    await supabase.from("zooters").update({ photo_url: url.publicUrl }).eq("id", zooter.id);
    setZooter({ ...zooter, photo_url: url.publicUrl });
    toast.success("Photo updated");
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (!zooter) return <div className="container py-12 max-w-3xl"><Card className="p-8 rounded-3xl text-center"><p className="font-display text-2xl font-bold mb-1">No active profile yet</p><p className="text-muted-foreground">Get verified first. Once approved, your trust profile becomes editable.</p></Card></div>;

  const badges = deriveZooterBadges(zooter);

  return (
    <div className="container py-8 lg:py-12 max-w-4xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-8">Your Zooter profile</h1>

      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        <Card className="p-6 rounded-3xl h-fit">
          <img src={zooter.photo_url || "/placeholder.svg"} alt="" className="h-32 w-32 rounded-3xl object-cover bg-muted mb-4" />
          <label className="cursor-pointer inline-flex mb-5"><input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} /><span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><Upload className="h-4 w-4" /> Change photo</span></label>
          <TrustBadges badges={badges} limit={6} />
          <div className="grid grid-cols-2 gap-2 mt-5 text-center">
            <Stat icon={ShieldCheck} label="Reliable" value={zooter.reliability_score ?? 100} />
            <Stat icon={Star} label="Complete" value={`${Math.round(zooter.job_completion_rate ?? 100)}%`} />
            <Stat icon={Repeat} label="Repeats" value={zooter.repeat_client_count ?? 0} />
            <Stat icon={Star} label="Rating" value={Number(zooter.rating ?? 0).toFixed(2)} />
          </div>
        </Card>

        <Card className="p-6 rounded-3xl">
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4"><div><Label>Display name</Label><Input value={zooter.name ?? ""} onChange={(e) => setZooter({ ...zooter, name: e.target.value })} /></div><div><Label>Hourly rate (R)</Label><Input type="number" value={zooter.hourly_rate ?? 0} onChange={(e) => setZooter({ ...zooter, hourly_rate: e.target.value })} /></div></div>
            <div><Label>Bio</Label><Textarea rows={4} value={zooter.bio ?? ""} onChange={(e) => setZooter({ ...zooter, bio: e.target.value })} placeholder="Premium homes, Airbnb turnovers, pet friendly, fragile item care..." /></div>
            <div className="grid sm:grid-cols-2 gap-4"><div><Label>Years of experience</Label><Input type="number" value={zooter.years_experience ?? 0} onChange={(e) => setZooter({ ...zooter, years_experience: e.target.value })} /></div><div><Label>Transport</Label><Input value={zooter.transport ?? ""} onChange={(e) => setZooter({ ...zooter, transport: e.target.value })} placeholder="Own transport, taxi, lift club" /></div></div>
            <div><Label>Suburb coverage</Label><Input value={suburbsInput} onChange={(e) => setSuburbsInput(e.target.value)} placeholder="Sandton, Rosebank, Parkhurst" /></div>
            <div><Label>Supplies owned</Label><Input value={suppliesInput} onChange={(e) => setSuppliesInput(e.target.value)} placeholder="Vacuum, mop, eco products" /></div>
            <div><Label>Languages spoken</Label><Input value={languagesInput} onChange={(e) => setLanguagesInput(e.target.value)} placeholder="English, isiZulu, Afrikaans" /></div>
            <div><Label>Skill tags</Label><Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="eco-friendly, pet-safe, deep-clean" /></div>
            <div><Label>Pet comfort</Label><Input value={zooter.pet_comfort ?? ""} onChange={(e) => setZooter({ ...zooter, pet_comfort: e.target.value })} placeholder="Comfortable with dogs and cats" /></div>
            <label className="flex items-center gap-3 rounded-2xl border border-border p-3 cursor-pointer"><input type="checkbox" checked={!!zooter.airbnb_specialist} onChange={(e) => setZooter({ ...zooter, airbnb_specialist: e.target.checked })} className="accent-primary" /><span className="text-sm font-medium">Airbnb turnover specialist</span></label>
          </div>
          <Button onClick={save} disabled={saving} className="mt-6 gradient-warm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}</Button>
        </Card>
      </div>
    </div>
  );
};

const Stat = ({ icon: Icon, label, value }: any) => <div className="rounded-2xl bg-muted/45 p-3"><Icon className="h-4 w-4 mx-auto text-primary mb-1" /><p className="text-[10px] text-muted-foreground">{label}</p><p className="font-display text-lg font-bold">{value}</p></div>;

export default Profile;
