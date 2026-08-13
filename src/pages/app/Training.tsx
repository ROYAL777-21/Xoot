import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, GraduationCap, Loader2, Star } from "lucide-react";
import { resolvePhoto } from "@/components/xoot/XooterCard";

const Training = () => {
  const [modules, setModules] = useState<any[]>([]);
  const [zotm, setZotm] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from("training_modules").select("*").order("category"),
      supabase.from("xooters_public").select("*").eq("is_zotm", true).maybeSingle(),
    ]).then(([m, z]) => {
      setModules(m.data ?? []); setZotm(z.data); setLoading(false);
    });
  }, []);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 lg:py-12 max-w-5xl">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 mb-3">
          <GraduationCap className="h-3 w-3 text-sage-deep" />
          <span className="text-xs font-medium text-sage-deep">Quality you can feel</span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold">Xooter training & recognition</h1>
        <p className="text-muted-foreground mt-2 max-w-xl">Every Xooter completes our standards programme. Top performers earn Xooter of the Month.</p>
      </div>

      {zotm && (
        <Card className="p-6 rounded-3xl gradient-warm text-primary-foreground border-0 mb-8 flex items-center gap-5 shadow-warm">
          <img src={resolvePhoto(zotm.photo_url)} alt={zotm.name} className="h-20 w-20 rounded-2xl object-cover border-2 border-background" />
          <div className="flex-1">
            <div className="inline-flex items-center gap-1 rounded-full bg-background/20 backdrop-blur-sm px-2.5 py-1 text-xs font-bold mb-1">
              <Crown className="h-3 w-3" /> XOOTER OF THE MONTH
            </div>
            <p className="font-display text-2xl font-bold">{zotm.name}</p>
            <p className="text-sm opacity-90 capitalize flex items-center gap-2">
              {zotm.role} · <Star className="h-3 w-3 fill-current" /> {Number(zotm.rating).toFixed(2)} · {zotm.jobs_completed} jobs
            </p>
          </div>
        </Card>
      )}

      <h2 className="font-display text-2xl font-bold mb-4">Training modules</h2>
      <div className="grid md:grid-cols-2 gap-4">
        {modules.map((m) => (
          <Card key={m.id} className="p-5 rounded-2xl">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h3 className="font-display text-lg font-bold">{m.title}</h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                m.badge_color === "terracotta" ? "bg-primary/15 text-primary" : "bg-sage/15 text-sage-deep"
              }`}>{m.category}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{m.description}</p>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{m.duration_min} min</span>
              <Button size="sm" variant="outline" className="rounded-full">View</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Training;
