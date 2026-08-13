import { useCallback, useEffect, useState } from "react";
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
import { resolvePhoto } from "@/components/xoot/XooterCard";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";
import { getClientVisibleStatus, normaliseBookingStatus } from "@/lib/booking-state-machine";

type Booking = {
  id: string; service: string; scheduled_at: string; status: string;
  price: number; address: string | null; was_reassigned: boolean;
  reassignment_acknowledged: boolean;
  xooter_id: string | null;
  xooter: { id: string; name: string; photo_url: string | null; rating: number; role: string } | null;
};

const statusBadge: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending_payment: "bg-muted text-muted-foreground",
  payment_confirmed: "bg-primary/15 text-primary",
  awaiting_assignment: "bg-primary/15 text-primary",
  assigned: "bg-primary/15 text-primary",
  contractor_accepted: "bg-sage/15 text-sage-deep",
  confirmed: "bg-sage/15 text-sage-deep",
  pending: "bg-muted text-muted-foreground",
  enroute: "bg-primary/15 text-primary",
  en_route: "bg-primary/15 text-primary",
  in_progress: "bg-primary/15 text-primary",
  completed: "bg-sage/15 text-sage-deep",
  rated: "bg-sage/15 text-sage-deep",
  cancelled: "bg-destructive/15 text-destructive",
  replacement_required: "bg-primary/15 text-primary",
  replacement_offered: "bg-primary/15 text-primary",
  reassigned: "bg-primary/15 text-primary",
};

const getVisibleStatus = (status: string) => {
  const canonical = normaliseBookingStatus(status);
  return canonical ? getClientVisibleStatus(canonical) : status.replace(/_/g, " ");
};

const activeStatuses = new Set([
  "draft",
  "pending_payment",
  "payment_confirmed",
  "awaiting_assignment",
  "assigned",
  "contractor_accepted",
  "en_route",
  "in_progress",
  "replacement_required",
  "replacement_offered",
  "reassigned",
]);

const pastStatuses = new Set(["completed", "rated", "cancelled"]);

const Bookings = () => {
  const { user } = useAuth();
  const [list, setList] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDate, setBulkDate] = useState("");

  const refresh = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("bookings")
      .select("id, xooter_id, service, scheduled_at, status, price, address, was_reassigned, reassignment_acknowledged")
      .eq("user_id", user.id).order("scheduled_at", { ascending: false });
    const bookings = (data ?? []) as Array<Omit<Booking, "xooter">>;
    const bookingIds = bookings.map((booking) => booking.id);
    const { data: xooters } = bookingIds.length
      ? await supabase
        .from("booking_xooter_profiles")
        .select("booking_id,id,name,photo_url,rating,role")
        .in("booking_id", bookingIds)
      : { data: [] };
    const xootersByBookingId = new Map(
      ((xooters ?? []) as Array<NonNullable<Booking["xooter"]> & { booking_id: string }>)
        .map((xooter) => [xooter.booking_id, xooter]),
    );
    setList(bookings.map((booking) => ({ ...booking, xooter: xootersByBookingId.get(booking.id) ?? null })) as Booking[]);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = (id: string) => {
    const n = new Set(selected); n.has(id) ? n.delete(id) : n.add(id); setSelected(n);
  };

  const bulkReschedule = async () => {
    if (!bulkDate || selected.size === 0) return;
    try {
      await Promise.all(
        Array.from(selected).map((bookingId) =>
          invokeOpsWorkflow({
            action: "booking_reschedule_requested",
            bookingId,
            scheduledAt: new Date(bulkDate).toISOString(),
          }),
        ),
      );
      toast.success(`Rescheduled ${selected.size} booking${selected.size === 1 ? "" : "s"}`);
      setBulkOpen(false); setSelected(new Set()); refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Reschedule failed");
    }
  };

  const upcoming = list.filter((b) => {
    const canonical = normaliseBookingStatus(b.status);
    return canonical ? activeStatuses.has(canonical) : false;
  });
  const past = list.filter((b) => {
    const canonical = normaliseBookingStatus(b.status);
    return canonical ? pastStatuses.has(canonical) : false;
  });

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
              <img src={resolvePhoto(b.xooter?.photo_url)} alt="" className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold truncate">{b.xooter?.name ?? "Reassigning…"}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${statusBadge[normaliseBookingStatus(b.status) ?? b.status] ?? "bg-muted text-muted-foreground"}`}>{getVisibleStatus(b.status)}</span>
                  {b.was_reassigned && !b.reassignment_acknowledged && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary text-primary-foreground flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> NEW XOOTER
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
              <img src={resolvePhoto(b.xooter?.photo_url)} alt="" className="h-12 w-12 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-semibold">{b.xooter?.name}</p>
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
