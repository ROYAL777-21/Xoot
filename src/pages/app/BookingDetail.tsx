import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Send, Star, ArrowLeft, CheckCircle2, Camera, Clock, ShieldCheck, Phone, AlertTriangle } from "lucide-react";
import { resolvePhoto } from "@/components/zoot/ZooterCard";
import { TrustBadges } from "@/components/zoot/TrustBadges";
import { deriveZooterBadges, requiresCompletionPhotos } from "@/lib/trust";
import { canAccessSensitiveBookingData, routeNotificationChannel } from "@/lib/operations";
import { toast } from "sonner";

type Msg = { id: string; sender_type: string; body: string; created_at: string };
type TimelineEvent = { id: string; status: string; label: string; created_at: string };
type CompletionPhoto = { id: string; photo_type: "before" | "after"; storage_path: string; created_at: string };
type Review = { id: string; rating: number; notes: string | null };

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
  const [review, setReview] = useState<Review | null>(null);
  const [body, setBody] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewNotes, setReviewNotes] = useState("");
  const [incidentType, setIncidentType] = useState("poor_quality");
  const [incidentNotes, setIncidentNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [requestingCall, setRequestingCall] = useState(false);
  const [eta, setEta] = useState(12);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    if (!user || !id) return;
    const [{ data }, { data: m }, { data: ev }, { data: ph }, { data: rv }] = await Promise.all([
      supabase.from("bookings").select("*, zooter:zooters!bookings_zooter_id_fkey(*)").eq("id", id).maybeSingle(),
      supabase.from("messages").select("*").eq("booking_id", id).order("created_at"),
      (supabase as any).from("booking_status_events").select("*").eq("booking_id", id).order("created_at"),
      (supabase as any).from("booking_completion_photos").select("*").eq("booking_id", id).order("created_at"),
      (supabase as any).from("post_job_reviews").select("*").eq("booking_id", id).eq("user_id", user.id).maybeSingle(),
    ]);
    if (!data) { navigate("/app/bookings"); return; }
    setBooking(data);
    setMessages((m ?? []) as Msg[]);
    setEvents((ev ?? []) as TimelineEvent[]);
    setPhotos((ph ?? []) as CompletionPhoto[]);
    setReview(rv as Review | null);
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
    const sender = booking?.zooter?.user_id === user?.id ? "zooter" : "user";
    await supabase.from("messages").insert({ booking_id: id, sender_type: sender, body: text });
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
    const eventType = status === "enroute" ? "contractor_on_the_way" : status === "arrived" ? "contractor_arrived" : status === "completed" ? "job_completed" : null;
    if (eventType) {
      await (supabase as any).from("integration_outbox").insert(routeNotificationChannel(eventType).map((channel) => ({
        source_table: "bookings",
        source_id: id,
        event_type: eventType,
        channel,
        owner: channel === "whatsapp_urgent" ? "Scheduling & Allocation Agent" : "Customer Support Agent",
        stack_tool: channel === "whatsapp_urgent" ? "WhatsApp urgent queue" : "Zoot in-app notification",
        payload: { booking_id: id, status, scheduled_at: booking.scheduled_at },
        created_by: user?.id,
      })));
    }

    if (status === "completed") {
      const { data: lp } = await supabase.from("loyalty_points").select("*").eq("user_id", user!.id).single();
      if (lp) {
        const total = lp.total_bookings + 1;
        await supabase.from("loyalty_points").update({ total_bookings: total, points: lp.points + 10, free_credits: lp.free_credits + (total % 10 === 0 ? 1 : 0) }).eq("user_id", user!.id);
      }
      await supabase.from("zooter_jobs").update({ state: "completed" }).eq("booking_id", id);
    }

    toast.success(statusLabel[status] ?? `Booking marked ${status}`);
    load();
  };

  const requestMaskedCall = async () => {
    if (!user || !id || !booking) return;
    if (!canAccessSensitiveBookingData({
      scheduledAt: booking.scheduled_at,
      status: booking.status,
      completedAt: booking.job_completed_at,
      cancelledAt: booking.cancelled_at,
    })) {
      toast.error("Masked calls are available during the active booking window.");
      return;
    }
    setRequestingCall(true);
    const calleeRole = booking.zooter?.user_id === user.id ? "client" : "contractor";
    const { data: call, error } = await (supabase as any).from("masked_call_sessions").insert({
      booking_id: id,
      caller_id: user.id,
      callee_role: calleeRole,
      status: "queued",
    }).select("id").single();
    if (!error) {
      await (supabase as any).from("integration_outbox").insert({
        source_table: "masked_call_sessions",
        source_id: call?.id,
        event_type: "masked_voice_call_requested",
        channel: "twilio_voice",
        owner: "Customer Support Agent",
        stack_tool: "Twilio masked voice queue",
        payload: { booking_id: id, callee_role: calleeRole },
        status: "needs_approval",
        approval_required: true,
        failure_mode: "Keep communication in chat if masked call setup fails.",
        created_by: user.id,
      });
    }
    setRequestingCall(false);
    if (error) return toast.error(error.message);
    toast.success("Masked call request queued");
  };

  const submitIncident = async () => {
    if (!user || !id || !booking?.zooter_id || !incidentNotes.trim()) return;
    const { data: incident, error } = await (supabase as any).from("trust_incidents").insert({
      booking_id: id,
      zooter_id: booking.zooter_id,
      user_id: user.id,
      incident_type: incidentType,
      severity: incidentType === "suspicious_behaviour" || incidentType === "damages" ? 4 : 3,
      notes: incidentNotes,
    }).select("id").single();
    if (error) return toast.error(error.message);
    await (supabase as any).from("admin_review_queue").insert({
      queue_type: "trust_incident",
      subject_table: "trust_incidents",
      subject_id: incident?.id,
      user_id: user.id,
      zooter_id: booking.zooter_id,
      booking_id: id,
      priority: incidentType === "suspicious_behaviour" || incidentType === "damages" ? "urgent" : "high",
      summary: `Trust incident: ${incidentType.replace(/_/g, " ")}`,
    });
    await (supabase as any).from("integration_outbox").insert(routeNotificationChannel("critical_trust_safety_alert").map((channel) => ({
      source_table: "trust_incidents",
      source_id: incident?.id,
      event_type: "critical_trust_safety_alert",
      channel,
      owner: "Trust & Safety Agent",
      stack_tool: channel === "whatsapp_urgent" ? "WhatsApp urgent queue" : "Zoot in-app notification",
      payload: { booking_id: id, incident_type: incidentType },
      created_by: user.id,
    })));
    setIncidentNotes("");
    toast.success("Incident sent to Trust & Safety");
  };

  const submitReview = async () => {
    if (!user || !id || !booking?.zooter_id) return;
    const { data: savedReview, error } = await (supabase as any).from("post_job_reviews").insert({
      booking_id: id,
      user_id: user.id,
      zooter_id: booking.zooter_id,
      rating: reviewRating,
      quality_rating: reviewRating,
      punctuality_rating: reviewRating,
      complaint: reviewRating <= 2,
      notes: reviewNotes || null,
    }).select("id, rating, notes").single();
    if (error) return toast.error(error.message);
    setReview(savedReview as Review);
    if (reviewRating <= 2) {
      await (supabase as any).from("support_followups").insert({
        booking_id: id,
        user_id: user.id,
        trigger_type: "low_rating",
        priority: "high",
        notes: reviewNotes || "Low post-job rating",
      });
      await (supabase as any).from("admin_review_queue").insert({
        queue_type: "support",
        subject_table: "post_job_reviews",
        subject_id: savedReview?.id,
        user_id: user.id,
        zooter_id: booking.zooter_id,
        booking_id: id,
        priority: "high",
        summary: "Low post-job rating needs follow-up",
      });
    }
    toast.success("Review submitted");
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
  const hasArrivedEvent = timeline.some((event) => event.status === "arrived");
  const hasStartedEvent = timeline.some((event) => event.status === "in_progress");

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
              {booking.status === "in_progress" && hasArrivedEvent && !hasStartedEvent && <Button onClick={() => setStatus("in_progress")} variant="outline" className="rounded-xl col-span-2">Job started</Button>}
              {booking.status === "in_progress" && (!hasArrivedEvent || hasStartedEvent) && <Button onClick={() => setStatus("completed")} disabled={photoProofRequired && (!beforeDone || !afterDone)} className="rounded-xl gradient-warm col-span-2"><CheckCircle2 className="h-4 w-4 mr-1" /> Complete job</Button>}
              <Button onClick={requestMaskedCall} disabled={requestingCall} variant="outline" className="rounded-xl col-span-2"><Phone className="h-4 w-4 mr-1" /> Request masked call</Button>
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

          {booking.status === "completed" && (
            <Card className="rounded-3xl p-5">
              <h2 className="font-display text-xl font-bold mb-2 flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> Post-clean satisfaction</h2>
              {review ? (
                <p className="text-sm text-muted-foreground">Review submitted: {review.rating}/5</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs uppercase tracking-wider text-muted-foreground">Rating</label>
                    <select value={reviewRating} onChange={(e) => setReviewRating(Number(e.target.value))} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating} stars</option>)}
                    </select>
                  </div>
                  <Input value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Anything the team should know?" />
                  <Button onClick={submitReview} className="rounded-xl gradient-warm">Submit review</Button>
                </div>
              )}
            </Card>
          )}

          <Card className="rounded-3xl p-5">
            <h2 className="font-display text-xl font-bold mb-2 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-primary" /> Trust incident</h2>
            <p className="text-sm text-muted-foreground mb-4">Use this for lateness, disrespect, poor quality, suspicious behaviour, damages, complaints, or escalations.</p>
            <div className="grid sm:grid-cols-[220px_1fr] gap-3">
              <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
                <option value="lateness">Lateness</option>
                <option value="disrespect">Disrespect</option>
                <option value="poor_quality">Poor quality</option>
                <option value="suspicious_behaviour">Suspicious behaviour</option>
                <option value="damages">Damages</option>
                <option value="complaint">Complaint</option>
                <option value="support_escalation">Support escalation</option>
              </select>
              <Input value={incidentNotes} onChange={(e) => setIncidentNotes(e.target.value)} placeholder="Briefly describe what happened" />
            </div>
            <Button onClick={submitIncident} disabled={!incidentNotes.trim()} variant="outline" className="rounded-xl mt-3">Send to Trust & Safety</Button>
          </Card>
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
