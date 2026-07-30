import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, Star, ArrowLeft, CheckCircle2, Camera, Clock, ShieldCheck, Phone, AlertTriangle, Navigation, Share2 } from "lucide-react";
import { resolvePhoto } from "@/components/zoot/XooterCard";
import { TrustBadges } from "@/components/zoot/TrustBadges";
import { BookingChat } from "@/components/zoot/BookingChat";
import { TipCard } from "@/components/zoot/TipCard";
import { deriveXooterBadges, requiresCompletionPhotos } from "@/lib/trust";
import { canAccessSensitiveBookingData } from "@/lib/operations";
import { notifyBookingLiveActivity, type XootBookingLiveActivityStatus } from "@/lib/native-live-activity";
import {
  buildBookingEtaShareText,
  createNativeBookingActionPayload,
  openBookingDirections,
  sendNativeBookingAction,
  type NativeBookingActionInput,
} from "@/lib/native-booking-actions";
import { haptic } from "@/lib/haptics";
import { buildTipRow, canOfferTip } from "@/lib/tipping";
import { formatRand } from "@/lib/xoot-pricing";
import { invokeOpsWorkflow } from "@/lib/ops-workflow";
import { isOptionalNativePlatform } from "@/lib/optional-capacitor";
import { getClientVisibleStatus, normaliseBookingStatus, type BookingStatus } from "@/lib/booking-state-machine";
import { captureOrSelectImage } from "@/lib/mobile-upload";
import { toast } from "sonner";

type Msg = { id: string; sender_type: string; body: string; created_at: string };
type TimelineEvent = { id: string; status: string; label: string; created_at: string };
type CompletionPhoto = { id: string; photo_type: "before" | "after"; storage_path: string; created_at: string };
type Review = { id: string; rating: number; notes: string | null };
type MaskedCallDetails = {
  call_session_id?: string;
  status?: string;
  proxy_numbers?: {
    client?: string | null;
    zooter?: string | null;
  } | null;
};

const statusSteps = [
  { keys: ["contractor_accepted", "confirmed"], label: "Xooter confirmed" },
  { keys: ["en_route", "enroute"], label: "On the way" },
  { keys: ["arrived"], label: "Arrived" },
  { keys: ["in_progress"], label: "Job started" },
  { keys: ["completed"], label: "Job completed" },
];

const statusLabel: Record<string, string> = {
  confirmed: "Xooter confirmed",
  contractor_accepted: "Xooter confirmed",
  enroute: "On the way",
  en_route: "On the way",
  arrived: "Arrived",
  in_progress: "Job started",
  completed: "Job completed",
  cancelled: "Cancelled",
  reassigned: "Reassigned",
  pending: "Pending confirmation",
};

const liveActivityStatuses: XootBookingLiveActivityStatus[] = [
  "confirmed",
  "enroute",
  "arrived",
  "in_progress",
  "completed",
  "cancelled",
  "reassigned",
  "pending",
];

const toLiveActivityStatus = (status: string): XootBookingLiveActivityStatus =>
  status === "en_route"
    ? "enroute"
    : status === "contractor_accepted" || status === "assigned"
      ? "confirmed"
      : liveActivityStatuses.includes(status as XootBookingLiveActivityStatus)
        ? (status as XootBookingLiveActivityStatus)
        : "pending";

const getCanonicalStatus = (status: unknown): BookingStatus | null => normaliseBookingStatus(status);

const getVisibleStatusLabel = (status: unknown) => {
  const canonical = getCanonicalStatus(status);
  return canonical ? getClientVisibleStatus(canonical) : statusLabel[String(status)] ?? "Pending confirmation";
};

const liveActivityNextStep: Record<XootBookingLiveActivityStatus, string> = {
  confirmed: "We will keep your booking ready and protected.",
  enroute: "Your Xooter is on the way. Access notes stay inside the app.",
  arrived: "Your Xooter has arrived and is preparing to begin.",
  in_progress: "Your home-care visit is in progress.",
  completed: "Your booking is complete. Review and photo proof are available in-app.",
  cancelled: "Support can help review the next available option.",
  reassigned: "Priority replacement matching is being reviewed.",
  pending: "We are confirming your booking details.",
};

const serviceNameForBooking = (booking: any) => booking?.service_type ?? booking?.service ?? "Home care";

const BookingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [photos, setPhotos] = useState<CompletionPhoto[]>([]);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewNotes, setReviewNotes] = useState("");
  const [tipCents, setTipCents] = useState<number | null>(null);
  const [incidentType, setIncidentType] = useState("poor_quality");
  const [incidentNotes, setIncidentNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [requestingCall, setRequestingCall] = useState(false);
  const [maskedCall, setMaskedCall] = useState<MaskedCallDetails | null>(null);
  const [eta, setEta] = useState(12);

  const load = useCallback(async () => {
    if (!user || !id) return;
    const [{ data }, { data: zooter }, { data: m }, { data: ev }, { data: ph }, { data: rv }] = await Promise.all([
      supabase.from("bookings").select("*").eq("id", id).maybeSingle(),
      (supabase as any).from("booking_zooter_profiles").select("*").eq("booking_id", id).maybeSingle(),
      supabase.from("messages").select("*").eq("booking_id", id).order("created_at"),
      (supabase as any).from("booking_status_events").select("*").eq("booking_id", id).order("created_at"),
      (supabase as any).from("booking_completion_photos").select("*").eq("booking_id", id).order("created_at"),
      (supabase as any).from("post_job_reviews").select("*").eq("booking_id", id).eq("user_id", user.id).maybeSingle(),
    ]);
    if (!data) { navigate("/app/bookings"); return; }
    setBooking({ ...data, zooter: zooter ?? null });
    setMessages((m ?? []) as Msg[]);
    setEvents((ev ?? []) as TimelineEvent[]);
    setPhotos((ph ?? []) as CompletionPhoto[]);
    setReview(rv as Review | null);
    setLoading(false);
  }, [id, navigate, user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!id) return;
    const ch = supabase.channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${id}` }, (p) => setMessages((m) => [...m, p.new as Msg]))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    if (getCanonicalStatus(booking?.status) !== "en_route") return;
    const t = setInterval(() => setEta((e) => Math.max(1, e - 1)), 5000);
    return () => clearInterval(t);
  }, [booking?.status]);

  const getNativeBookingActionInput = (): NativeBookingActionInput | null => {
    if (!id || !booking) return null;
    const canonicalStatus = getCanonicalStatus(booking.status);
    const liveStatus = toLiveActivityStatus(canonicalStatus ?? booking.status ?? "pending");

    return {
      bookingId: id,
      status: liveStatus,
      statusLabel: getVisibleStatusLabel(booking.status),
      serviceName: serviceNameForBooking(booking),
      zooterName: booking.zooter?.name,
      propertyName: booking.property_name ?? booking.address_label ?? booking.property?.name,
      suburb: booking.suburb,
      address: booking.address,
      etaMinutes: liveStatus === "enroute" ? eta : undefined,
    };
  };

  const handleOpenDirections = () => {
    const input = getNativeBookingActionInput();
    if (!input) return;
    haptic("selection");
    const result = openBookingDirections(input);
    if (!result.fallbackUrl) {
      toast.error("No destination is saved for this booking.");
      return;
    }
    toast.success(result.delivered ? "Directions sent to native app" : "Directions opened");
  };

  const shareEta = async () => {
    const input = getNativeBookingActionInput();
    if (!input || typeof window === "undefined") return;
    haptic("selection");

    const payload = createNativeBookingActionPayload("share_eta", input);
    const delivered = sendNativeBookingAction(payload);
    const shareText = buildBookingEtaShareText(payload);
    const shareUrl = `${window.location.origin}${payload.route}`;
    const navigatorWithShare = window.navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };

    try {
      if (typeof navigatorWithShare.share === "function") {
        await navigatorWithShare.share({ title: "Xoot booking update", text: shareText, url: shareUrl });
        toast.success("ETA shared");
        return;
      }

      if (navigatorWithShare.clipboard?.writeText) {
        await navigatorWithShare.clipboard.writeText(`${shareText} ${shareUrl}`);
        toast.success("ETA copied");
        return;
      }

      if (delivered) {
        toast.success("ETA sent to native app");
        return;
      }

      toast.error("Sharing is unavailable on this device.");
    } catch {
      if (delivered) toast.success("ETA sent to native app");
      else toast.error("Sharing was cancelled or unavailable.");
    }
  };

  const setStatus = async (status: string) => {
    if (!id || !booking) return;
    try {
      await invokeOpsWorkflow({
        action: "booking_status_changed",
        bookingId: id,
        status,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Booking status update failed");
      return;
    }

    const liveStatus = toLiveActivityStatus(status);
    notifyBookingLiveActivity({
      bookingId: id,
      status: liveStatus,
      statusLabel: statusLabel[status] ?? status,
      serviceName: serviceNameForBooking(booking),
      zooterName: booking.zooter?.name,
      propertyName: booking.property_name ?? booking.address_label ?? booking.property?.name ?? "Xoot home",
      suburb: booking.suburb,
      scheduledAt: booking.scheduled_at,
      etaMinutes: liveStatus === "enroute" ? eta : undefined,
      nextStep: liveActivityNextStep[liveStatus],
      supportState: booking.care_plus ? "priority" : "standard",
      updatedAt: new Date().toISOString(),
    });

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
      durationHours: booking.duration_hours,
    })) {
      toast.error("Masked calls are available during the active booking window.");
      return;
    }
    setRequestingCall(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-masked-call", {
        body: { booking_id: id },
      });
      if (error) throw error;

      const call = (data ?? {}) as MaskedCallDetails;
      setMaskedCall(call);

      const nativeInput = getNativeBookingActionInput();
      if (nativeInput) {
        sendNativeBookingAction(createNativeBookingActionPayload("masked_call", {
          ...nativeInput,
          callSessionId: call.call_session_id,
          updatedAt: new Date().toISOString(),
        }));
      }

      const callerProxyNumber = user.id === booking.user_id
        ? call.proxy_numbers?.client
        : call.proxy_numbers?.zooter;
      if (callerProxyNumber && isOptionalNativePlatform()) {
        window.location.href = `tel:${callerProxyNumber.replace(/[^\d+]/g, "")}`;
      }
    } catch (error) {
      setRequestingCall(false);
      toast.error(error instanceof Error ? error.message : "Masked call request failed");
      return;
    }
    setRequestingCall(false);
    haptic("success");
    toast.success("Masked call request queued");
  };

  const submitIncident = async () => {
    if (!user || !id || !booking?.zooter_id || !incidentNotes.trim()) return;
    try {
      await invokeOpsWorkflow({
        action: "trust_incident_submitted",
        bookingId: id,
        incidentType,
        notes: incidentNotes,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Trust incident submission failed");
      return;
    }
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

    // The tip is a second write, and deliberately not allowed to undo the first. The
    // rating is the record that matters for trust and safety; losing it because a tip
    // failed would be the worse outcome, so this reports and carries on rather than
    // rolling back or blocking the follow-up routing below.
    const tipRow =
      canOfferTip() && booking
        ? buildTipRow({ bookingId: id, userId: user.id, zooterId: booking.zooter_id ?? null, cents: tipCents })
        : null;

    if (tipRow) {
      // `booking_tips`, not a column on `bookings` — RLS is row-level, so a tip stored
      // on the booking would be readable by the assigned Xooter immediately, which is
      // exactly what the founder ruled against. See the migration for the full reason.
      //
      // `as any` because the table is not in the generated types yet: the migration is
      // written and unapplied (ZD-003, ZD-005), which is also why `canOfferTip()` gates
      // this. The cast goes away when the schema and its types are regenerated.
      const { error: tipError } = await (supabase as any).from("booking_tips").insert(tipRow);
      if (tipError) {
        toast.warning("Review saved. The tip did not go through — you have not been charged.");
      } else {
        haptic("success");
      }
    }

    if (reviewRating <= 2) {
      try {
        await invokeOpsWorkflow({
          action: "review_followup_requested",
          reviewId: savedReview?.id,
        });
      } catch {
        toast.warning("Review saved, but support follow-up routing is unavailable.");
      }
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

  const chooseAndUploadPhoto = async (photoType: "before" | "after") => {
    const file = await captureOrSelectImage();
    if (!file) return;
    await uploadPhoto(photoType, file);
  };

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  if (!booking) return null;

  const z = booking.zooter;
  const serviceType = serviceNameForBooking(booking);
  const photoProofRequired = booking.completion_photo_required || requiresCompletionPhotos(serviceType);
  const beforeDone = photos.some((p) => p.photo_type === "before");
  const afterDone = photos.some((p) => p.photo_type === "after");
  const canonicalStatus = getCanonicalStatus(booking.status);
  const visibleStatus = getVisibleStatusLabel(booking.status);
  const timeline = events.length ? events : [{ id: "current", status: canonicalStatus ?? booking.status, label: visibleStatus, created_at: booking.updated_at }];
  const hasArrivedEvent = timeline.some((event) => event.status === "arrived");
  const hasStartedEvent = timeline.some((event) => event.status === "in_progress");
  const isAssignedXooter = Boolean(booking.zooter?.user_id && booking.zooter.user_id === user?.id);
  const maskedCallAvailable = Boolean(canonicalStatus && ["en_route", "in_progress"].includes(canonicalStatus) && canAccessSensitiveBookingData({
    scheduledAt: booking.scheduled_at,
    status: booking.status,
    completedAt: booking.job_completed_at,
    cancelledAt: booking.cancelled_at,
    durationHours: booking.duration_hours,
  }));

  return (
    <div className="container py-6 lg:py-10 max-w-5xl">
      <Button variant="ghost" onClick={() => navigate("/app/bookings")} className="mb-4 -ml-2"><ArrowLeft className="h-4 w-4 mr-1" /> All bookings</Button>

      <div className="grid lg:grid-cols-[1fr_400px] gap-5">
        <div className="space-y-5">
          <Card className="rounded-3xl overflow-hidden border-border">
            <div className="relative h-64 bg-linear-to-br from-sage/20 via-accent-soft to-cream">
              <svg className="absolute inset-0 w-full h-full opacity-40" viewBox="0 0 400 250">
                <path d="M0 120 Q100 80 200 130 T400 110" stroke="hsl(var(--sage-deep))" strokeWidth="2" fill="none" />
                <path d="M50 0 L120 250" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
                <path d="M280 0 L320 250" stroke="hsl(var(--muted-foreground))" strokeWidth="1" opacity="0.4" />
              </svg>
              <div className="absolute top-1/3 left-1/4 grid place-items-center h-10 w-10 rounded-full bg-primary text-primary-foreground shadow-warm animate-pulse"><MapPin className="h-5 w-5" /></div>
              <div className="absolute bottom-1/4 right-1/3 grid place-items-center h-10 w-10 rounded-full bg-foreground text-background shadow-warm"><span className="text-xs font-bold">YOU</span></div>
              <div className="absolute top-3 left-3 right-3 flex justify-between">
                <div className="rounded-full bg-background/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold flex items-center gap-1.5 shadow-card">
                  <span className="h-2 w-2 rounded-full bg-sage animate-pulse" />{canonicalStatus === "en_route" ? `Arriving in ${eta} min` : visibleStatus}
                </div>
                <div className="rounded-full bg-background/95 backdrop-blur-sm px-3 py-1.5 text-xs font-bold shadow-card">R{Number(booking.price).toFixed(0)}</div>
              </div>
            </div>

            {z && (
              <div className="p-5 flex items-center gap-4">
                <img src={resolvePhoto(z.photo_url)} alt={z.name} className="h-16 w-16 rounded-2xl object-cover" />
                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-lg">{z.name}</p>
                  <p className="text-sm text-muted-foreground capitalize flex items-center gap-2">{z.role}<span className="flex items-center gap-1"><Star className="h-3 w-3 fill-primary text-primary" /> {Number(z.rating).toFixed(2)}</span></p>
                  <div className="mt-2"><TrustBadges badges={deriveXooterBadges(z)} limit={4} /></div>
                </div>
              </div>
            )}

            <div className="px-5 pb-5 grid grid-cols-2 gap-2">
              {isAssignedXooter && canonicalStatus === "contractor_accepted" && <Button onClick={() => setStatus("en_route")} variant="outline" className="rounded-xl">On the way</Button>}
              {isAssignedXooter && canonicalStatus === "en_route" && <Button onClick={() => setStatus("arrived")} variant="outline" className="rounded-xl">Arrived</Button>}
              {isAssignedXooter && canonicalStatus === "in_progress" && hasArrivedEvent && !hasStartedEvent && <Button onClick={() => setStatus("in_progress")} variant="outline" className="rounded-xl col-span-2">Job started</Button>}
              {isAssignedXooter && canonicalStatus === "in_progress" && (!hasArrivedEvent || hasStartedEvent) && <Button onClick={() => setStatus("completed")} disabled={photoProofRequired && (!beforeDone || !afterDone)} className="rounded-xl gradient-warm col-span-2"><CheckCircle2 className="h-4 w-4 mr-1" /> Complete job</Button>}
              {maskedCallAvailable && (
                <Button onClick={requestMaskedCall} disabled={requestingCall} variant="outline" className="rounded-xl col-span-2">
                  {requestingCall ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Phone className="h-4 w-4 mr-1" />}
                  Request masked call
                </Button>
              )}
            </div>
            {maskedCall?.proxy_numbers && (
              <div className="mx-5 mb-5 rounded-2xl border border-border bg-muted/35 p-3 text-sm">
                <p className="mb-2 font-semibold">Masked call proxy numbers</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-background/75 p-2">
                    <p className="text-xs text-muted-foreground">Client proxy</p>
                    <p className="font-medium">{maskedCall.proxy_numbers.client ?? "Pending Twilio assignment"}</p>
                  </div>
                  <div className="rounded-xl bg-background/75 p-2">
                    <p className="text-xs text-muted-foreground">Xooter proxy</p>
                    <p className="font-medium">{maskedCall.proxy_numbers.zooter ?? "Pending Twilio assignment"}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>

          <Card className="rounded-3xl p-5">
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Arrival tracking</h2>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <Button onClick={handleOpenDirections} variant="outline" className="rounded-xl justify-center"><Navigation className="h-4 w-4 mr-1" /> Directions</Button>
              <Button onClick={shareEta} variant="outline" className="rounded-xl justify-center"><Share2 className="h-4 w-4 mr-1" /> Share ETA</Button>
            </div>
            <div className="space-y-3">
              {statusSteps.map((step) => {
                const hit = timeline.find((e) => step.keys.includes(e.status) || e.label === step.label);
                return <div key={step.keys[0]} className="flex items-center gap-3"><span className={`h-3 w-3 rounded-full ${hit ? "bg-primary" : "bg-muted"}`} /><div><p className="text-sm font-medium">{step.label}</p>{hit && <p className="text-xs text-muted-foreground">{new Date(hit.created_at).toLocaleString("en-ZA")}</p>}</div></div>;
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
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => void chooseAndUploadPhoto(kind)}
                      disabled={Boolean(uploading)}
                      className={`rounded-2xl border p-4 text-left transition-smooth ${done ? "border-sage bg-accent-soft" : "border-border hover:border-primary/40"}`}
                    >
                      <span className="flex items-center gap-2 font-semibold capitalize"><ShieldCheck className="h-4 w-4" /> {kind} photo</span>
                      <p className="text-xs text-muted-foreground mt-1">{done ? "Uploaded" : uploading === kind ? "Uploading..." : "Tap to capture or select"}</p>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {canonicalStatus === "completed" && (
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
                  <TipCard value={tipCents} onChange={setTipCents} className="pt-1" />
                  <Button onClick={submitReview} className="rounded-xl gradient-warm">
                    {tipCents === null ? "Submit review" : `Submit review and tip ${formatRand(tipCents)}`}
                  </Button>
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

        <BookingChat bookingId={id} booking={booking} zooter={z} messages={messages} currentUserId={user?.id} />
      </div>
    </div>
  );
};

export default BookingDetail;
