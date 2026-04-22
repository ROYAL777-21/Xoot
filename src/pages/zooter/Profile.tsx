import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const [zooter, setZooter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tagsInput, setTagsInput] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("zooters").select("*").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      setZooter(data); setTagsInput((data?.tags ?? []).join(", ")); setLoading(false);
    });
  }, [user]);

  const save = async () => {
    if (!zooter) return;
    setSaving(true);
    const tags = tagsInput.split(",").map((t) => t.trim()).filter(Boolean);
    const { error } = await supabase.from("zooters").update({
      bio: zooter.bio, tags, hourly_rate: zooter.hourly_rate, name: zooter.name,
    }).eq("id", zooter.id);
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

  if (!zooter) {
    return (
      <div className="container py-12 max-w-3xl">
        <Card className="p-8 rounded-3xl text-center">
          <p className="font-display text-2xl font-bold mb-1">No active profile yet</p>
          <p className="text-muted-foreground">Get verified first — once approved, your profile becomes editable.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-8 lg:py-12 max-w-3xl">
      <h1 className="font-display text-4xl md:text-5xl font-bold mb-8">Your Zooter profile</h1>

      <Card className="p-6 rounded-3xl mb-6">
        <div className="flex items-center gap-4 mb-6">
          <img src={zooter.photo_url || "/placeholder.svg"} alt="" className="h-20 w-20 rounded-2xl object-cover bg-muted" />
          <label className="cursor-pointer">
            <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
            <span className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-medium"><Upload className="h-4 w-4" /> Change photo</span>
          </label>
        </div>
        <div className="space-y-4">
          <div><Label>Display name</Label><Input value={zooter.name} onChange={(e) => setZooter({ ...zooter, name: e.target.value })} /></div>
          <div><Label>Bio</Label><Textarea rows={4} value={zooter.bio ?? ""} onChange={(e) => setZooter({ ...zooter, bio: e.target.value })} /></div>
          <div><Label>Skill tags (comma separated)</Label><Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder="eco-friendly, pet-safe, deep-clean" /></div>
          <div><Label>Hourly rate ($)</Label><Input type="number" value={zooter.hourly_rate} onChange={(e) => setZooter({ ...zooter, hourly_rate: e.target.value })} /></div>
        </div>
        <Button onClick={save} disabled={saving} className="mt-6 gradient-warm">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}</Button>
      </Card>
    </div>
  );
};

export default Profile;