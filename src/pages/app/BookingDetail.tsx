import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, MapPin, Send, Star, ArrowLeft, AlertCircle, CheckCircle2, Repeat, X } from "lucide-react";
import { resolvePhoto } from "@/components/zoot/ZooterCard";
import { toast } from "sonner";

type Msg = { id: string; sender_type: string; body: string; created_at: string };

const BookingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [originalZooter, setOriginalZooter] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [eta, setEta] = useState(12);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user || !id) return;
    const { data } = await supabase.from("bookings")
      .select("*, zooter:zooters!bookings_zooter_id_fkey(*), original:zooters!bookings_original_zooter_id_fkey(*)")
      .eq("id", id).eq("user_id", user.id).maybeSingle();
    if (!data) { navigate("/app/bookings"); return; }
    setBooking(data);
    setOriginalZooter((data as any).original);

    if (data.was_reassigned && !data.reassignment_acknowledged) {
      const { data: state } = await supabase.from("user_reassignment_state").select("*").eq("user_id", user.id).single();
      if (state?.show_modal) setShowReassignModal(true);
    }

    const { data: m } = await supabase.from("messages").select("*").eq("booking_id", id).order("created_at");
    setMessages((m ?? []) as Msg[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${id}` },
        (p) => setMessages((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  // Mock ETA countdown
  useEffect(() => {
    if (booking?.status !== "enroute") return;
    const t = setInterval(() => setEta((e) => Math.max(1, e - 1)), 5000);
    return () => clearInterval(t);
  }, [booking?.status]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !id) return;
    const text = body; setBody("");
    await supabase.from("messages").insert({ booking_id: id, sender_type: "user", body: text });
    // Mock zooter reply
    setTimeout(async () => {
      await supabase.from("messages").insert({
        booking_id: id, sender_type: "zooter",
        body: ["On my way!", "Got it, see you soon.", "Thanks, will do!"][Math.floor(Math.random() * 3)],
      });
    }, 1500);
  };

  const setStatus = async (status: string) => {
    if (!id) return;
    await supabase.from("bookings").update({ status: status as any }).eq("id", id);
    if (status === "completed") {
      // bump loyalty + reassignment success counter
      const { data: lp } = await supabase.from("loyalty_points").select("*").eq("user_id", user!.id).single();
      if (lp) {
        const total = lp.total_bookings + 1;
        const newCredits = lp.free_credits + (total > 0 && total % 10 === 0 ? 1 : 0);
        await supabase.from("loyalty_points").update({
          total_bookings: total, points: lp.points + 10, free_credits: newCredits,
        }).eq("user_id", user!.id);
        if (newCredits > lp.free_credits) toast.success("🎉 You earned a free clean!");
      }
      const { data: rs } = await supabase.from("user_reassignment_state").select("*").eq("user_id", user!.id).single();
      if (rs) {
        const next = rs.successful_bookings_since_last + 1;
        await supabase.from("user_reassignment_state").update({
          successful_bookings_since_last: next,
          show_modal: next < 3,
        }).eq("user_id", user!.id);
      }
    }
    toast.success(`Booking marked ${status}`);
    load();
  };

  const simulateReassign = async () => {
    if (!id || !booking) return;
    const { data: alts } = await supabase.from("zooters").select("*")
      .eq("role", booking.service).neq("id", booking.zooter_id).eq("active", true).limit(1);
    if (!alts || alts.length === 0) { toast.error("No alternates available"); return; }
    await supabase.from("bookings").update({
      zooter_id: alts[0].id, was_reassigned: true, reassignment_acknowledged: false, status: "reassigned",
    }).eq("id", id);
    const { data: rs } = await supabase.from("user_reassignment_state").select("*").eq("user_id", user!.id).single();
    if (rs) {
      await supabase.from("user_reassignment_state").update({
        successful_bookings_since_last: 0, total_reassignments: rs.total_reassignments + 1,
      }).eq("user_id", user!.id);
    }
    load();
  };

  const acceptReassign = async () => {
    await supabase.from("bookings").update({ reassignment_acknowledged: true, status: "confirmed" }).eq("id", id!);
    setShowReassignModal(false); load();
    toast.success("Got it. New Zooter confirmed.");
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!booking) return null;

  const z = booking.zooter;
  const showBanner = booking.was_reassigned && !booking.reassignment_acknowledged && !showReassignModal;

  return (
    <div className="container py-6 lg:py-10 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate("/app/bookings")} className="mb-4 -ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> All bookings
      </Button>

      {showBanner && (
        <div className="mb-5 rounded-2xl bg-primary/10 border border-primary/30 p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold">Your Zooter changed</p>
            <p className="text-muted-foreground">{z?.name} will be taking this visit. Same skills, same rate.</p>
          </div>
          <Button size="sm" onClick={acceptReassign} className="rounded-full">Got it</Button>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_400px] gap-5">
        {/* Map + Zooter card */}
        <div className="space-y-5">
          <Card className="rounded-3xl overflow-hidden border-border">
            <div className="relative h-64 bg-gradient-to-br from-sage/20 via-accent-soft to-cream">
              {/* Mock map */}
              <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 400 250">
                <path d="M0 120 Q100 80 200 130 T400 110" stroke="hsl(var(--sage-deep))" strokeWidth="2" fill="none" />
                <path d="M50 0 L120 250" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
                <path d="M280 0 L320 250" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
              </svg>
              <div className="absolute top-1/3 left-1/4 grid place-items-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-warm animate-pulse">
                <MapPin className="h-5 w-5" />
              </div>
              <div className="absolute bottom-1/4 right-1/3 grid place-items-center h-10 w-10 rounded-full bg-foreground text-background shadow-warm">
                <span className="text-xs font-bold">YOU</span>
              </div>
              <div className="absolute top-3 left-3 right-3 flex justify-between">
                <div className="rounded-full bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-card">
                  <span className="h-2 w-2 rounded-full bg-sage animate-pulse" />
                  {booking.status === "enroute" ? `Arriving in ${eta} min` : booking.status.toUpperCase()}
                </div>
                <div className="rounded-full bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-bold shadow-card">
                  ${Number(booking.price).toFixed(0)}
                </div>
              </div>
            </div>

            {z && (
              <div className="p-5 flex items-center gap-4">
                <img src={resolvePhoto(z.photo_url)} alt={z.name} className="h-16 w-16 rounded-2xl object-cover" />
                <div className="flex-1">
                  <p className="font-display font-bold text-lg">{z.name}</p>
                  <p className="text-sm text-muted-foreground capitalize flex items-center gap-2">
                    {z.role}
                    <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {Number(z.rating).toFixed(2)}</span>
                  </p>
                </div>
              </div>
            )}

            <div className="px-5 pb-5 grid grid-cols-2 gap-2">
              {booking.status === "confirmed" && (
                <Button onClick={() => setStatus("enroute")} variant="outline" className="rounded-xl">Mark on the way</Button>
              )}
              {booking.status === "enroute" && (
                <Button onClick={() => setStatus("in_progress")} variant="outline" className="rounded-xl">Mark arrived</Button>
              )}
              {booking.status === "in_progress" && (
                <Button onClick={() => setStatus("completed")} className="rounded-xl gradient-warm col-span-2">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> Complete & rate
                </Button>
              )}
              {!["completed", "cancelled"].includes(booking.status) && (
                <Button onClick={simulateReassign} variant="ghost" size="sm" className="rounded-xl text-muted-foreground">
                  <Repeat className="h-3 w-3 mr-1" /> Simulate reassign
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Chat */}
        <Card className="rounded-3xl flex flex-col h-[500px] overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <p className="font-display font-bold">Chat with {z?.name?.split(" ")[0] ?? "Zooter"}</p>
            <p className="text-xs text-muted-foreground">Messages are end-to-end within Zoot</p>
          </div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Say hi 👋</p>}
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender_type === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  m.sender_type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}>{m.body}</div>
              </div>
            ))}
          </div>
          <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
            <Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message…" className="rounded-full" />
            <Button type="submit" size="icon" className="rounded-full"><Send className="h-4 w-4" /></Button>
          </form>
        </Card>
      </div>

      {/* Reassign modal (first time) */}
      <Dialog open={showReassignModal} onOpenChange={setShowReassignModal}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" /> Your Zooter changed
            </DialogTitle>
            <DialogDescription>
              {originalZooter?.name} can't make this visit. We've matched you with a similarly-rated Zooter.
            </DialogDescription>
          </DialogHeader>
          {z && (
            <div className="rounded-2xl bg-muted/40 p-4 flex items-center gap-3">
              <img src={resolvePhoto(z.photo_url)} alt={z.name} className="h-14 w-14 rounded-xl object-cover" />
              <div className="flex-1">
                <p className="font-bold">{z.name}</p>
                <p className="text-xs text-muted-foreground capitalize flex items-center gap-2">
                  {z.role} · <Star className="h-3 w-3 fill-primary text-primary" /> {Number(z.rating).toFixed(2)} · {z.jobs_completed} jobs
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {z.tags?.slice(0, 3).map((t: string) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-background text-muted-foreground">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => { setStatus("cancelled"); setShowReassignModal(false); }}>
              <X className="h-4 w-4 mr-1" /> Decline & cancel
            </Button>
            <Button onClick={acceptReassign} className="gradient-warm">
              <CheckCircle2 className="h-4 w-4 mr-1" /> Accept new Zooter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BookingDetail;