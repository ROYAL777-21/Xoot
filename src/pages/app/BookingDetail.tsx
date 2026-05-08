import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Send, Star, ArrowLeft, CheckCircle2, Camera, Clock, ShieldCheck } from "lucide-react";
import { resolvePhoto } from "@/components/zoot/ZooterCard";
import { TrustBadges } from "@/components/zoot/TrustBadges";
import { deriveZooterBadges, requiresCompletionPhotos } from "@/lib/trust";
import { toast } from "sonner";

type Msg = { id: string; sender_type: string; body: string; created_at: string };
type TimelineEvent = { id: string; status: string; label: string; created_at: string };
type CompletionPhoto = { id: string; photo_type: "before" | "after"; storage_path: string; created_at: string };

const statusSteps = [
  { key: "confirmed", label: "Confirmed" },
  { key: "enroute", label: "On the way" },
  { key: "arrived", label: "Arrived" },
  { key: "in_progress", label: "Job started" },
  { key: "completed", label: "Job completed" },
];

const statusLabel: Record<string, string> = {
  confirmed: "Confirmed",
  enroute: "On the way",
  arrived: "Arrived",
  in_progress: "Job started",
  completed: "Job completed",
  cancelled: "Cancelled",
  reassigned: "Reassigned",
  pending: "Pending confirmation",
};

const BookingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [photos, setPhotos] = useState<CompletionPhoto[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [eta, setEta] = useState(12);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user || !id) return;
    const [{ data }, { data: m }, { data: ev }, { data: ph }] = await Promise.all([
      supabase.from("bookings").select("*, zooter:zooters!bookings_zooter_id_fkey(*)").eq("id", id).eq("user_id", user.id).maybeSingle(),
      supabase.from("messages").select("*").eq("booking_id", id).order("created_at"),
      (supabase as any).from("booking_status_events").select("*").eq("booking_id", id).order("created_at"),
      (supabase as any).from("booking_completion_photos").select("*").eq("booking_id", id).order("created_at"),
    ]);
    if (!data) { navigate("/app/bookings"); return; }
    setBooking(data);
    setMessages((m ?? []) as Msg[]);
    setEvents((ev ?? []) as TimelineEvent[]);
    setPhotos((ph ?? []) as CompletionPhoto[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id, user]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${id}` }, (p) => setMessages((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight }); }, [messages]);

  useEffect(() => {
    if (booking?.status !== "enroute") return;
    const t = setInterval(() => setEta((e) => Math.max(1, e - 1)), 5000);
    return () => clearInterval(t);
  }, [booking?.status]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim() || !id) return;
    const text = body;
    setBody("");
    await supabase.from("messages").insert({ booking_id: id, sender_type: "user", body: text });
  };

  const setStatus = async (status: string) => {
    if (!id || !booking) return;
    const timestampField = status === "arrived" ? "arrived_at" : status === "in_progress" ? "job_started_at" : status === "completed" ? "job_completed_at" : null;
    const bookingStatus = status === "arrived" ? "in_progress" : status;
    const payload: any = { status: bookingStatus };
    if (timestampField) payload[timestampField] = new Date().toISOString();

    await (supabase as any).from("bookings").update(payload).eq("id", id);
    await (supabase as any).from("booking_status_events").insert({
      booking_id: id,
      actor_id: user?.id,
      status,
      label: statusLabel[status] ?? status,
    });

    if (status === "completed") {
      const { data: lp } = await supabase.from("loyalty_points").select("*").eq("user_id", user!.id).single();
      if (lp) {
        const total = lp.total_bookings + 1;
        await supabase.from("loyalty_points").update({ total_bookings: total, points: lp.points + 10, free_credits: lp.free_credits + (total % 10 === 0 ? 1 : 0) }).eq("user_id", user!.id);
      }
    }

    toast.success(statusLabel[status] ?? `Booking marked ${status}`);
    load();
  };

  const uploadPhoto = async (photoType: "before" | "after", file: File) => {
    if (!user || !id || !booking?.zooter_id) return;
    setUploading(photoType);
    const path = `${id}/${photoType}-${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("booking-completion-photos").upload(path, file, { upsert: true });
    if (error) { setUploading(null); toast.error(error.message); return; }
    const { error: insertError } = await (supabase as any).from("booking_completion_photos").insert({ booking_id: id, zooter_id: booking.zooter_id, photo_type: photoType, storage_path: path });
    setUploading(null);
    if (insertError) return toast.error(insertError.message);
    toast.success(`${photoType} photo uploaded`);
    load();
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!booking) return null;

  const z = booking.zooter;
  const serviceType = booking.service_type ?? booking.service;
  const photoProofRequired = booking.completion_photo_required || requiresCompletionPhotos(serviceType);
  const beforeDone = photos.some((p) => p.photo_type === "before");
  const afterDone = photos.some((p) => p.photo_type === "after");
  const timeline = events.length ? events : [{ id: "current", status: booking.status, label: statusLabel[booking.status] ?? booking.status, created_at: booking.updated_at }];

  return (
    <div className="container py-6 lg:py-10 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate("/app/bookings")} className="mb-4 -ml-2"><ArrowLeft className="h-4 w-4 mr-1" /> All bookings</Button>

      <div className="grid lg:grid-cols-[1fr_400px] gap-5">
        <div className="space-y-5">
          <Card className="rounded-3xl overflow-hidden border-border">
            <div className="relative h-64 bg-gradient-to-br from-sage/20 via-accent-soft to-cream">
              <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 400 250">
                <path d="M0 120 Q100 80 200 130 T400 110" stroke="hsl(var(--sage-deep))" strokeWidth="2" fill="none" />
                <path d="M50 0 L120 250" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
                <path d="M280 0 L320 250" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
              </svg>
              <div className="absolute top-1/3 left-1/4 grid place-items-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-warm animate-pulse"><MapPin className="h-5 w-5" /></div>
              <div className="absolute bottom-1/4 right-1/3 grid place-items-center h-10 w-10 rounded-full bg-foreground text-background shadow-warm"><span className="text-xs font-bold">YOU</span></div>
              <div className="absolute top-3 left-3 right-3 flex justify-between">
                <div className="rounded-full bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-card">
                  <span className="h-2 w-2 rounded-full bg-sage animate-pulse" />{booking.status === "enroute" ? `Arriving in ${eta} min` : (statusLabel[booking.status] ?? booking.status)}
                </div>
                <div className="rounded-full bg-background/95 backdrop-blur px-3 py-1.5 text-xs font-bold shadow-card">R{Number(booking.price).toFixed(0)}</div>
              </div>
            </div>

            {z && (
              <div className="p-5 flex items-center gap-4">
                <img src={resolvePhoto(z.photo_url)} alt={z.name} className="h-16 w-16 rounded-2xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-lg">{z.name}</p>
                  <p className="text-sm text-muted-foreground capitalize flex items-center gap-2">{z.role}<span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {Number(z.rating).toFixed(2)}</span></p>
                  <div className="mt-2"><TrustBadges badges={deriveZooterBadges(z)} limit={4} /></div>
                </div>
              </div>
            )}

            <div className="px-5 pb-5 grid grid-cols-2 gap-2">
              {booking.status === "confirmed" && <Button onClick={() => setStatus("enroute")} variant="outline" className="rounded-xl">On the way</Button>}
              {booking.status === "enroute" && <Button onClick={() => setStatus("arrived")} variant="outline" className="rounded-xl">Arrived</Button>}
              {booking.status === "in_progress" && <Button onClick={() => setStatus("completed")} disabled={photoProofRequired && (!beforeDone || !afterDone)} className="rounded-xl gradient-warm col-span-2"><CheckCircle2 className="h-4 w-4 mr-1" /> Complete job</Button>}
            </div>
          </Card>

          <Card className="rounded-3xl p-5">
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Arrival tracking</h2>
            <div className="space-y-3">
              {statusSteps.map((step) => {
                const hit = timeline.find((e) => e.status === step.key || e.label === step.label);
                return <div key={step.key} className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${hit ? "bg-primary" : "bg-muted"}`} /><div><p className="text-sm font-medium">{step.label}</p>{hit && <p className="text-xs text-muted-foreground">{new Date(hit.created_at).toLocaleString("en-ZA")}</p>}</div></div>;
              })}
            </div>
          </Card>

          {photoProofRequired && (
            <Card className="rounded-3xl p-5">
              <h2 className="font-display text-xl font-bold mb-2 flex items-center gap-2"><Camera className="h-5 w-5 text-primary" /> Photo completion verification</h2>
              <p className="text-sm text-muted-foreground mb-4">Before and after photos are required for {serviceType} bookings.</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {(["before", "after"] as const).map((kind) => {
                  const done = photos.some((p) => p.photo_type === kind);
                  return <label key={kind} className={`rounded-2xl border p-4 cursor-pointer ${done ? "border-sage bg-accent-soft" : "border-border"}`}><input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && uploadPhoto(kind, e.target.files[0])} /><span className="flex items-center gap-2 font-semibold capitalize"><ShieldCheck className="h-4 w-4" /> {kind} photo</span><p className="text-xs text-muted-foreground mt-1">{done ? "Uploaded" : uploading === kind ? "Uploading..." : "Tap to upload"}</p></label>;
                })}
              </div>
            </Card>
          )}
        </div>

        <Card className="rounded-3xl flex flex-col h-[500px] overflow-hidden">
          <div className="px-5 py-4 border-b border-border"><p className="font-display font-bold">Chat with {z?.name?.split(" ")[0] ?? "Zooter"}</p><p className="text-xs text-muted-foreground">Messages stay on-platform for booking protection</p></div>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">{messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Say hi</p>}{messages.map((m) => <div key={m.id} className={`flex ${m.sender_type === "user" ? "justify-end" : "justify-start"}`}><div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_type === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>{m.body}</div></div>)}</div>
          <form onSubmit={send} className="p-3 border-t border-border flex gap-2"><Input value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type a message..." className="rounded-full" /><Button type="submit" size="icon" className="rounded-full"><Send className="h-4 w-4" /></Button></form>
        </Card>
      </div>
    </div>
  );
};

export default BookingDetail;
