import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar, Loader2, MapPin, MessageSquare, Repeat, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { resolvePhoto } from "@/components/zoot/ZooterCard";

type Booking = {
  id: string; service: string; scheduled_at: string; status: string;
  price: number; address: string | null; was_reassigned: boolean;
  reassignment_acknowledged: boolean;
  zooter: { id: string; name: string; photo_url: string | null; rating: number; role: string } | null;
};

const statusBadge: Record<string, string> = {
  confirmed: "bg-sage/15 text-sage-deep",
  pending: "bg-muted text-muted-foreground",
  enroute: "bg-primary/15 text-primary",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-sage/15 text-sage-deep",
  cancelled: "bg-destructive/15 text-destructive",
  reassigned: "bg-primary/15 text-primary",
};

const Bookings = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState("");

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase.from("bookings")
      .select("id, service, scheduled_at, status, price, address, was_reassigned, reassignment_acknowledged, zooter:zooters(id,name,photo_url,rating,role)")
      .eq("user_id", user.id).order("scheduled_at", { ascending: false });
    setList((data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [user]);

  const toggle = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  };

  const bulkReschedule = async () => {
    if (!bulkDate || selected.size === 0) return;
    await supabase.from("bookings").update({ scheduled_at: new Date(bulkDate).toISOString() }).in("id", Array.from(selected));
    toast.success(`Rescheduled ${selected.size} booking${selected.size === 1 ? "" : "s"}`);
    setBulkOpen(false); setSelected(new Set()); refresh();
  };

  const upcoming = list.filter((b) => ["pending", "confirmed", "enroute", "in_progress", "reassigned"].includes(b.status));
  const past = list.filter((b) => ["completed", "cancelled"].includes(b.status));

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="container py-8 lg:py-12 max-w-5xl">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="font-display text-4xl md:text-5xl font-bold">My bookings</h1>
          <p className="text-muted-foreground mt-2">Manage upcoming visits and review past ones.</p>
        </div>
        {selected.size > 0 && (
          <Button onClick={() => setBulkOpen(true)} className="rounded-full gradient-warm">
            <Repeat className="h-4 w-4 mr-1" /> Reschedule {selected.size}
          </Button>
        )}
      </div>

      <h2 className="font-display text-xl font-bold mb-3">Upcoming</h2>
      {upcoming.length === 0 ? (
        <Card className="p-8 rounded-3xl text-center text-muted-foreground mb-8">No upcoming bookings.</Card>
      ) : (
        <div className="space-y-3 mb-10">
          {upcoming.map((b) => (
            <Card key={b.id} className="p-4 rounded-2xl flex items-center gap-4">
              <Checkbox checked={selected.has(b.id)} onCheckedChange={() => toggle(b.id)} />
              <img src={resolvePhoto(b.zooter?.photo_url)} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{b.zooter?.name ?? "Reassigning…"}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBadge[b.status]}`}>{b.status}</span>
                  {b.was_reassigned && !b.reassignment_acknowledged && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary text-primary-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> NEW ZOOTER
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                  {b.service} · {new Date(b.scheduled_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </p>
                {b.address && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" /> {b.address}</p>}
              </div>
              <Button asChild size="sm" variant="outline" className="rounded-full">
                <Link to={`/app/bookings/${b.id}`}><MessageSquare className="h-4 w-4 mr-1" /> Open</Link>
              </Button>
            </Card>
          ))}
        </div>
      )}

      <h2 className="font-display text-xl font-bold mb-3">Past</h2>
      {past.length === 0 ? (
        <Card className="p-8 rounded-3xl text-center text-muted-foreground">No past bookings yet.</Card>
      ) : (
        <div className="space-y-3">
          {past.map((b) => (
            <Card key={b.id} className="p-4 rounded-2xl flex items-center gap-4 opacity-80">
              <img src={resolvePhoto(b.zooter?.photo_url)} alt="" className="h-12 w-12 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-semibold">{b.zooter?.name}</p>
                <p className="text-xs text-muted-foreground capitalize">{b.service} · {new Date(b.scheduled_at).toLocaleDateString()}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-sage-deep" />
            </Card>
          ))}
        </div>
      )}

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>Reschedule {selected.size} booking{selected.size === 1 ? "" : "s"}</DialogTitle>
          </DialogHeader>
          <div>
            <Label>New date & time</Label>
            <Input type="datetime-local" value={bulkDate} onChange={(e) => setBulkDate(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button onClick={bulkReschedule} className="gradient-warm">Confirm</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Bookings;