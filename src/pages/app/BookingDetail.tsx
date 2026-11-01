import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Star, ArrowLeft, CheckCircle2, Camera, Clock, ShieldCheck, Phone, AlertTriangle, Navigation, Share2, RefreshCw } from "lucide-react";
import { resolvePhoto } from "@/components/xoot/XooterCard";
import { TrustBadges } from "@/components/xoot/TrustBadges";
import { BookingChat } from "@/components/xoot/BookingChat";
import { VoiceCallPanel } from "@/components/xoot/VoiceCallPanel";
import { PayFastCheckout } from "@/components/PayFastCheckout";
import { formatZAR } from "@/lib/format";
import { SosButton } from "@/components/xoot/SosButton";
import { TipCard } from "@/components/xoot/TipCard";
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
import { JobChecklist } from "@/components/xooter/JobChecklist";
import { WorkerRoadEstimate } from "@/components/xoot/WorkerRoadEstimate";
import { LiveJobJourney } from "@/components/xoot/LiveJobJourney";
import { safeFileName, validateCompletionPhotoUpload } from "@/lib/upload-validation";
import { BookingVisitSummary, type VisitPayment } from "@/components/xoot/BookingVisitSummary";
import "@/styles/visit-detail-handoff.css";

type Msg = { id: string; sender_type: string; body: string; created_at: string };
type TimelineEvent = { id: string; status: string; label: string; created_at: string };
type CompletionPhoto = { id: string; photo_type: "before" | "after"; storage_path: string; created_at: string };
type Review = { id: string; rating: number; notes: string | null };
type MaskedCallDetails = {
  call_session_id?: string;
  status?: string;
  proxy_numbers?: {
    client?: string | null;
    xooter?: string | null;
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

const BookingDetailView = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = user?.id;
  const viewKey = `${userId ?? ""}:${id ?? ""}`;
  const currentView = useRef(viewKey);
  const loadSequence = useRef(0);
  currentView.current = viewKey;
  const [loadedView, setLoadedView] = useState<string | null>(null);
  const returnedFromPayfast = searchParams.get("payment") === "return";
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
  const [payment, setPayment] = useState<VisitPayment | null>(null);
  const pendingPayment = payment?.status === "pending" && normaliseBookingStatus(booking?.status) !== "cancelled" ? payment : null;
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const isCurrentView = () => currentView.current === viewKey;

  useEffect(() => {
    currentView.current = viewKey;
    return () => { currentView.current = ""; loadSequence.current += 1; };
  }, [viewKey]);

  const load = useCallback(async () => {
    if (!userId || !id) return;
    const requestedView = `${userId}:${id}`;
    const sequence = ++loadSequence.current;
    const [{ data }, { data: xooter }, { data: m }, { data: ev }, { data: ph }, { data: rv }, { data: pay }] = await Promise.all([
      supabase.from("bookings").select("*").eq("id", id).maybeSingle(),
      supabase.from("booking_xooter_profiles").select("*").eq("booking_id", id).maybeSingle(),
      supabase.from("messages").select("*").eq("booking_id", id).order("created_at"),
      supabase.from("booking_status_events").select("*").eq("booking_id", id).order("created_at"),
      supabase.from("booking_completion_photos").select("*").eq("booking_id", id).order("created_at"),
      supabase.from("post_job_reviews").select("*").eq("booking_id", id).eq("user_id", userId).maybeSingle(),
      /*
       * The owner's booking payment, including a receipt that arrives after return. Scoped to
       * user_id, booking_id and payment kind: RLS already restricts reads to
       * the owner, but a fare-split booking can carry several people's records and only the
       * caller's is theirs to pay.
       */
      supabase
        .from("payment_records")
        .select("id,amount,status,currency")
        .eq("booking_id", id)
        .eq("user_id", userId)
        .eq("payment_kind", "booking")
        .is("meta->>fare_split_id", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (currentView.current !== requestedView || sequence !== loadSequence.current) return;
    if (!data) { navigate("/app/bookings"); return; }
    const { data: activeJob } = await supabase.from("xooter_jobs").select("id").eq("booking_id", id).eq("state", "accepted").maybeSingle();
    if (currentView.current !== requestedView || sequence !== loadSequence.current) return;
    setBooking({ ...data, xooter: xooter ?? null });
    setActiveJobId(activeJob?.id ?? null);
    setMessages((m ?? []) as Msg[]);
    setEvents((ev ?? []) as TimelineEvent[]);
    setPhotos((ph ?? []) as CompletionPhoto[]);
    setReview(rv as Review | null);
    setPayment((pay as VisitPayment | null) ?? null);
    setLoadedView(requestedView);
    setLoading(false);
  }, [id, navigate, userId]);

  useEffect(() => { load(); }, [load]);

  // A browser return is not a receipt. Briefly refresh saved server state, then leave an
  // explicit refresh action; never poll indefinitely or repeat a checkout/charge.
  useEffect(() => {
    if (!returnedFromPayfast || !pendingPayment?.id || loadedView !== viewKey) return;
    let stopped = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = async () => {
      if (stopped) return;
      await load();
      if (!stopped && ++attempts < 6) timer = setTimeout(() => void refresh(), 2000);
    };
    timer = setTimeout(() => void refresh(), 2000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [returnedFromPayfast, pendingPayment?.id, loadedView, viewKey, load]);

  useEffect(() => {
    if (!id || !userId) return;
    const subscribedView = `${userId}:${id}`;
    const ch = supabase.channel(`messages:${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${id}` }, (p) => { if (currentView.current === subscribedView) setMessages((m) => [...m, p.new as Msg]); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, userId]);

  const getNativeBookingActionInput = (): NativeBookingActionInput | null => {
    if (!id || !booking) return null;
    const canonicalStatus = getCanonicalStatus(booking.status);
    const liveStatus = toLiveActivityStatus(canonicalStatus ?? booking.status ?? "pending");

    return {
      bookingId: id,
      status: liveStatus,
      statusLabel: getVisibleStatusLabel(booking.status),
      serviceName: serviceNameForBooking(booking),
      xooterName: booking.xooter?.name,
      propertyName: booking.property_name ?? booking.address_label ?? booking.property?.name,
      suburb: booking.suburb,
      address: booking.address,
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
        if (!isCurrentView()) return;
        toast.success("Booking update shared");
        return;
      }

      if (navigatorWithShare.clipboard?.writeText) {
        await navigatorWithShare.clipboard.writeText(`${shareText} ${shareUrl}`);
        if (!isCurrentView()) return;
        toast.success("Booking update copied");
        return;
      }

      if (delivered) {
        toast.success("Booking update sent to native app");
        return;
      }

      toast.error("Sharing is unavailable on this device.");
    } catch {
      if (!isCurrentView()) return;
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
      if (!isCurrentView()) return;
      toast.error(error instanceof Error ? error.message : "Booking status update failed");
      return;
    }

    if (!isCurrentView()) return;
    const liveStatus = toLiveActivityStatus(status);
    notifyBookingLiveActivity({
      bookingId: id,
      status: liveStatus,
      statusLabel: statusLabel[status] ?? status,
      serviceName: serviceNameForBooking(booking),
      xooterName: booking.xooter?.name,
      propertyName: booking.property_name ?? booking.address_label ?? booking.property?.name ?? "Xoot home",
      suburb: booking.suburb,
      scheduledAt: booking.scheduled_at,
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
      if (!isCurrentView()) return;
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
        : call.proxy_numbers?.xooter;
      if (callerProxyNumber && isOptionalNativePlatform()) {
        window.location.href = `tel:${callerProxyNumber.replace(/[^\d+]/g, "")}`;
      }
    } catch (error) {
      if (!isCurrentView()) return;
      setRequestingCall(false);
      toast.error(error instanceof Error ? error.message : "Masked call request failed");
      return;
    }
    setRequestingCall(false);
    haptic("success");
    toast.success("Masked call request queued");
  };

  const submitIncident = async () => {
    if (!user || !id || !booking?.xooter_id || !incidentNotes.trim()) return;
    try {
      await invokeOpsWorkflow({
        action: "trust_incident_submitted",
        bookingId: id,
        incidentType,
        notes: incidentNotes,
      });
    } catch (error) {
      if (!isCurrentView()) return;
      toast.error(error instanceof Error ? error.message : "Trust incident submission failed");
      return;
    }
    if (!isCurrentView()) return;
    setIncidentNotes("");
    toast.success("Incident sent to Trust & Safety");
  };

  const submitReview = async () => {
    if (!user || !id || !booking?.xooter_id) return;
    const { data: savedReview, error } = await supabase.from("post_job_reviews").insert({
      booking_id: id,
      user_id: user.id,
      xooter_id: booking.xooter_id,
      rating: reviewRating,
      quality_rating: reviewRating,
      punctuality_rating: reviewRating,
      complaint: reviewRating <= 2,
      notes: reviewNotes || null,
    }).select("id, rating, notes").single();
    if (!isCurrentView()) return;
    if (error) return toast.error(error.message);
    setReview(savedReview as Review);

    // The tip is a second write, and deliberately not allowed to undo the first. The
    // rating is the record that matters for trust and safety; losing it because a tip
    // failed would be the worse outcome, so this reports and carries on rather than
    // rolling back or blocking the follow-up routing below.
    const tipRow =
      canOfferTip() && booking
        ? buildTipRow({ bookingId: id, userId: user.id, xooterId: booking.xooter_id ?? null, cents: tipCents })
        : null;

    if (tipRow) {
      // `booking_tips`, not a column on `bookings` — RLS is row-level, so a tip stored
      // on the booking would be readable by the assigned Xooter immediately, which is
      // exactly what the founder ruled against. See the migration for the full reason.
      //
      // The `as any` that used to be here is gone: the migration is applied on both projects and
      // the table is in the generated types, so the cast would now hide real column mismatches
      // rather than work around a missing type.
      //
      // `canOfferTip()` still gates this — the schema existing is not the same as tipping being
      // switched on, and `TIP_READINESS` remains the switch for that.
      const { error: tipError } = await supabase.from("booking_tips").insert(tipRow);
      if (!isCurrentView()) return;
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
        if (!isCurrentView()) return;
        toast.warning("Review saved, but support follow-up routing is unavailable.");
      }
    }
    if (isCurrentView()) toast.success("Review submitted");
  };

  const uploadPhoto = async (photoType: "before" | "after", file: File) => {
    if (!user || !id || !booking?.xooter_id) return;
    const validationError = validateCompletionPhotoUpload(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setUploading(photoType);
    const uploadId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const path = `${id}/${photoType}-${uploadId}-${safeFileName(file.name)}`;
    const { error } = await supabase.storage.from("booking-completion-photos").upload(path, file, {
      upsert: false,
      contentType: file.type,
      cacheControl: "0",
    });
    if (!isCurrentView()) return;
    if (error) { setUploading(null); toast.error(error.message); return; }
    const { error: insertError } = await supabase.from("booking_completion_photos").insert({ booking_id: id, xooter_id: booking.xooter_id, photo_type: photoType, storage_path: path });
    if (!isCurrentView()) return;
    setUploading(null);
    if (insertError) return toast.error(insertError.message);
    toast.success(`${photoType} photo uploaded`);
    load();
  };

  const chooseAndUploadPhoto = async (photoType: "before" | "after") => {
    const file = await captureOrSelectImage();
    if (!file || !isCurrentView()) return;
    await uploadPhoto(photoType, file);
  };

  if (loading || loadedView !== viewKey) return <div role="status" className="grid place-items-center gap-3 py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span>Loading your visit…</span></div>;
  if (!booking) return null;

  const z = booking.xooter;
  const serviceType = serviceNameForBooking(booking);
  const photoProofRequired = booking.completion_photo_required || requiresCompletionPhotos(serviceType);
  const beforeDone = photos.some((p) => p.photo_type === "before");
  const afterDone = photos.some((p) => p.photo_type === "after");
  const canonicalStatus = getCanonicalStatus(booking.status);
  const visibleStatus = getVisibleStatusLabel(booking.status);
  const timeline = events.length ? events : [{ id: "current", status: canonicalStatus ?? booking.status, label: visibleStatus, created_at: booking.updated_at }];
  const hasArrivedEvent = timeline.some((event) => event.status === "arrived");
  const hasStartedEvent = timeline.some((event) => event.status === "in_progress");
  const isAssignedXooter = Boolean(booking.xooter?.user_id && booking.xooter.user_id === user?.id);
  /**
   * The window where someone is on their way to, or inside, the home.
   *
   * The same window masked calling uses, and for the same reason. Deliberately not gated on
   * role: `raise-sos-alert` derives customer-or-Xooter from the session, and a Xooter alone in
   * a stranger's house needs this at least as much as the customer does.
   *
   * Renders nothing until `canArmSos()` is true — see `SosButton`. It is placed now so that
   * advancing readiness is the only step left, rather than readiness plus remembering to put
   * the control on a screen.
   */
  const activeVisit = Boolean(canonicalStatus && ["en_route", "in_progress"].includes(canonicalStatus));
  const maskedCallAvailable = Boolean(canonicalStatus && ["en_route", "in_progress"].includes(canonicalStatus) && canAccessSensitiveBookingData({
    scheduledAt: booking.scheduled_at,
    status: booking.status,
    completedAt: booking.job_completed_at,
    cancelledAt: booking.cancelled_at,
    durationHours: booking.duration_hours,
  }));

  return (
    <div className="xoot-visit-detail">
      <Button variant="ghost" onClick={() => navigate("/app/bookings")} className="mb-4 -ml-2"><ArrowLeft className="h-4 w-4 mr-1" /> Your visits</Button>

      {/* Above the fold, before the map and the timeline. Anything that has to be scrolled to
          is not an emergency control. */}
      {activeVisit && <SosButton bookingId={id} className="mb-5" />}

      <div className="xoot-visit-detail-layout">
        <div className="xoot-visit-detail-main">
          <BookingVisitSummary booking={booking} payment={payment} returnedFromPayfast={returnedFromPayfast} />
          {returnedFromPayfast && pendingPayment && <Button variant="outline" className="rounded-full xoot-visit-detail-check" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh payment status</Button>}
          {!z && canonicalStatus !== "cancelled" && <section className="xoot-visit-detail-card"><h2>Your Xooter</h2><p className="mt-2 text-sm text-muted-foreground">Your Xooter’s details will appear here once they’re confirmed for your visit.</p></section>}
          {z && <Card className="rounded-3xl overflow-hidden border-border xoot-visit-detail-xooter">

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
              {isAssignedXooter && canonicalStatus === "in_progress" && (!hasArrivedEvent || hasStartedEvent) && <Button onClick={() => setStatus("completed")} disabled={photoProofRequired && (!beforeDone || !afterDone)} className="rounded-xl col-span-2"><CheckCircle2 className="h-4 w-4 mr-1" /> Complete job</Button>}
              {maskedCallAvailable && (
                <Button onClick={requestMaskedCall} disabled={requestingCall} variant="outline" className="rounded-xl col-span-2">
                  {requestingCall ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Phone className="h-4 w-4 mr-1" />}
                  Call by phone instead
                </Button>
              )}
            </div>
            {/*
              In-app calling sits above the phone route, not beside it, because they are not equal
              options: this one needs no number pool, costs nothing to provision and works on wifi,
              while the masked-PSTN path rents numbers and carries the Twilio Proxy end-of-life
              question. Same eligibility for both — `maskedCallAvailable` is passed in rather than
              recomputed, so the two transports cannot drift into disagreeing about who may call.
            */}
            {id && <VoiceCallPanel bookingId={id} available={maskedCallAvailable} />}
            {maskedCall?.proxy_numbers && (
              <div className="mx-5 mb-5 rounded-2xl border border-border bg-muted/35 p-3 text-sm">
                <p className="mb-2 font-semibold">Masked call proxy numbers</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-background/75 p-2">
                    <p className="text-xs text-muted-foreground">Client proxy</p>
                    <p className="font-medium">{maskedCall.proxy_numbers.client ?? "Assigned when the call starts"}</p>
                  </div>
                  <div className="rounded-xl bg-background/75 p-2">
                    <p className="text-xs text-muted-foreground">Xooter proxy</p>
                    <p className="font-medium">{maskedCall.proxy_numbers.xooter ?? "Assigned when the call starts"}</p>
                  </div>
                </div>
              </div>
            )}
          </Card>}

          {/*
            Finish an unpaid booking.

            A customer who closed the PayFast tab had no way back before this: `create-booking`
            returned a `payment_session_url` that nothing in the app read, so an abandoned checkout
            was an abandoned booking. The amount shown is the record's own — the server's price,
            not a recomputed one, so this screen and the charge cannot disagree.
          */}
          {pendingPayment && (
            <Card className="rounded-3xl p-5 border-primary/30 bg-primary/5">
              <h2 className="font-display text-xl font-bold mb-1 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" /> Payment outstanding
              </h2>
              <p className="text-sm text-muted-foreground mb-4">
                {returnedFromPayfast ? "We’re waiting for PayFast’s confirmation. You can leave this page and check your visits later."
                  : `Your booking is saved at ${formatZAR(Number(pendingPayment.amount))}. Your Xooter is confirmed separately after payment.`}
              </p>
              {!returnedFromPayfast && <PayFastCheckout
                paymentRecordId={pendingPayment.id}
                label={`Pay ${formatZAR(Number(pendingPayment.amount))}`}
              />}
            </Card>
          )}

          {/* Split checkout is held: its legacy base-only total omits the booking fee, and a
              partial payment must not be presented as fulfilment of this single-payment visit. */}

          {activeJobId && id && <JobChecklist jobId={activeJobId} bookingId={id} readOnly />}
          <Card className="rounded-3xl p-5">
            <h2 className="font-display text-xl font-bold mb-4 flex items-center gap-2"><Clock className="h-5 w-5 text-primary" /> Your visit journey</h2>
            {activeVisit && <div className="mb-4 grid grid-cols-2 gap-2">
              <Button onClick={handleOpenDirections} variant="outline" className="rounded-xl justify-center"><Navigation className="h-4 w-4 mr-1" /> Directions</Button>
              <Button onClick={shareEta} variant="outline" className="rounded-xl justify-center"><Share2 className="h-4 w-4 mr-1" /> Share booking update</Button>
            </div>}
            <p className="mb-3 text-xs text-muted-foreground">{import.meta.env.VITE_ENABLE_LIVE_JOURNEY === "true"
              ? "When your Xooter is on the way and shares their location, you’ll see their estimated arrival here."
              : "Follow your visit’s recorded updates here."}</p>
            {isAssignedXooter && activeVisit && typeof booking.address === "string" && booking.address.trim().length >= 4 && id &&
              <div className="mb-4"><WorkerRoadEstimate bookingId={id} destinationAddress={booking.address} /></div>}
            {id && canonicalStatus === "en_route" && <LiveJobJourney bookingId={id} isAssignedWorker={isAssignedXooter} destinationAddress={typeof booking.address === "string" ? booking.address : undefined} />}
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
                  <Button onClick={submitReview} className="rounded-xl">
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

        <BookingChat bookingId={id} booking={booking} xooter={z} messages={messages} currentUserId={user?.id} />
      </div>
    </div>
  );
};

// Remount every view-owned field, not just loaded records. Unsent reviews/incidents, tips,
// proxy numbers and in-flight UI state must never carry into another visit or account.
const BookingDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  return <BookingDetailView key={`${user?.id ?? ""}:${id ?? ""}`} />;
};

export default BookingDetail;
