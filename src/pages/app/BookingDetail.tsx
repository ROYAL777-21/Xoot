import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, Ellipsis, MessageCircle, Phone, Repeat, Star, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { ServiceIcon } from "@/components/kit/ServiceIcon";
import { SectionLabel } from "@/components/kit/SectionLabel";
import { DockedCTA } from "@/components/kit/DockedCTA";
import { SosButton } from "@/components/xoot/SosButton";
import { BookingChat } from "@/components/xoot/BookingChat";
import { VoiceCallPanel } from "@/components/xoot/VoiceCallPanel";
import { canAccessSensitiveBookingData } from "@/lib/operations";
import { getClientVisibleStatus, normaliseBookingStatus } from "@/lib/booking-state-machine";
import { createNativeBookingActionPayload, sendNativeBookingAction } from "@/lib/native-booking-actions";
import { visitNativeInput } from "@/components/visits/visit-native";
import { useVisit } from "@/components/visits/useVisit";
import { VisitCard, VisitHeader } from "@/components/visits/VisitPrimitives";
import { VisitPaymentCard, VisitOptions } from "@/components/visits/VisitOptions";
import { reviewEligible, scheduledLabel, visitService } from "@/components/visits/visit-data";
import { TrackingVisit } from "@/components/visits/TrackingVisit";
import { RateVisit } from "./RateVisit";
import "@/styles/visit-detail-handoff.css";

export default function BookingDetail({ rate = false, tracking = false, chat = false }: { rate?: boolean; tracking?: boolean; chat?: boolean }) {
  const { id } = useParams();
  const { user, loading } = useAuth();
  if (loading) return <VisitState text="Loading your account…" />;
  if (!user) return <VisitState text="Sign in to view this visit." />;
  if (!id) return <VisitState text="Visit not found." />;
  return <AccountVisit key={`${user.id}/${id}/${rate}/${tracking}/${chat}`} id={id} owner={user.id} rate={rate} tracking={tracking} chat={chat} />;
}
function VisitState({ text, retry }: { text: string; retry?: () => void }) {
  return <div className="xoot-detail"><VisitHeader title="Visit" back="/app/bookings" /><div className="xoot-detail-state" role={retry ? "alert" : "status"}><p>{text}</p>{retry && <button type="button" className="xoot-detail-button" onClick={retry}>Try again</button>}</div></div>;
}
export type VisitResource = ReturnType<typeof useVisit>;
function AccountVisit({ id, owner, rate, tracking, chat }: { id: string; owner: string; rate: boolean; tracking: boolean; chat: boolean }) {
  const resource = useVisit(id, owner);
  const [panel, setPanel] = useState<"more" | "chat" | "call" | "reschedule" | "cancel" | null>(null);
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  if (resource.loading) return <VisitState text="Loading your visit…" />;
  if (resource.error) return <VisitState text={resource.error} retry={() => void resource.refresh()} />;
  if (!resource.data) return <VisitState text="Visit not found or unavailable for this account." />;
  if (rate) return <RateVisit id={id} owner={owner} resource={resource} />;
  if (tracking || chat) return <TrackingVisit id={id} owner={owner} resource={resource} chat={chat} />;
  const data = resource.data, { booking, xooter, tasks } = data;
  const canonicalStatus = normaliseBookingStatus(booking.status);
  const activeVisit = Boolean(canonicalStatus && ["en_route", "in_progress"].includes(canonicalStatus));
  const status = canonicalStatus ? getClientVisibleStatus(canonicalStatus) : "Status unavailable";
  const isOwner = booking.user_id === owner;
  const assignedWorker = xooter?.user_id === owner && xooter.id === booking.xooter_id;
  const solo = booking.crew_size === 1 && data.jobs.every(job => job.xooter_id === booking.xooter_id);
  const eligible = reviewEligible(booking, owner, data.review) && solo;
  const calling = activeVisit && canAccessSensitiveBookingData({ scheduledAt: booking.scheduled_at, status: booking.status, completedAt: booking.job_completed_at, cancelledAt: booking.cancelled_at, durationHours: booking.duration_hours });
  const support = `/app/support?booking=${encodeURIComponent(id)}`;
  return <div className="xoot-detail">
    <VisitHeader title="Your visit" back="/app/bookings" trailing={<button type="button" className="xoot-detail-icon" aria-label="More visit options" aria-expanded={panel === "more"} onClick={() => setPanel(panel === "more" ? null : "more")}><Ellipsis size={20} /></button>} />
    {activeVisit && <SosButton bookingId={id} className="mx-5 mb-4" />}
    <div className="xoot-detail-content">
      <Link className="xoot-detail-button is-outline" to={`/app/bookings/${id}/tracking`}>Track this visit</Link>
      <VisitCard tone="dawn" className="xoot-detail-status"><ServiceIcon service={visitService(booking)} size={56} shape="circle" /><div><span className="xoot-label">{status}</span><h2>Scheduled {scheduledLabel(booking.scheduled_at)}</h2><p>{activeVisit ? "Live location and arrival estimates are unavailable." : "Updates reflect recorded booking events."}</p></div></VisitCard>
      <VisitCard>
        {xooter ? <div className="xoot-detail-xooter">
          <span className="xoot-detail-avatar"><span className="xoot-detail-avatar-face">{xooter.photo_url ? <img src={xooter.photo_url} alt={xooter.name || "Assigned Xooter"} /> : xooter.name?.split(/\s+/).filter(Boolean).slice(0,2).map(word => word[0]).join("").toUpperCase() || <User size={26} color="var(--xoot-violet-500)" />}</span>{xooter.verified && <i aria-label="Verified"><Check size={12} strokeWidth={3.5} /></i>}</span>
          <div><h2>{xooter.name || "Assigned Xooter"}</h2>{xooter.rating !== null && <p aria-label={`Recorded Xooter rating ${xooter.rating.toFixed(2)} out of 5`}>{[1,2,3,4,5].map(star => <Star key={star} size={14} strokeWidth={2} color={xooter.rating! >= star - .25 ? "var(--xoot-honey-500)" : "var(--xoot-neutral-300)"} fill={xooter.rating! >= star - .25 ? "var(--xoot-honey-500)" : "none"} />)}<strong>{xooter.rating.toFixed(2)}</strong></p>}{xooter.role && <p>{xooter.role}</p>}{xooter.jobs_completed !== null && <span className="xoot-detail-xooter-badges"><span className="xoot-detail-visit-badge" aria-label={`${xooter.jobs_completed} recorded visits`}><Repeat size={11} strokeWidth={2.5} />{xooter.jobs_completed} visits</span></span>}</div>
        </div> : <p className="xoot-detail-muted">No Xooter profile is available yet.</p>}
        {!solo && <p className="xoot-detail-caption">{booking.crew_size} Xooters requested. This profile is one assigned member; the full crew roster is unavailable here.</p>}
        <Link className="xoot-detail-button is-outline" to={`/app/bookings/${id}/chat`}>Open booking chat</Link>
        <div className="xoot-detail-action-row"><button type="button" className="xoot-detail-button is-outline" onClick={() => setPanel(panel === "chat" ? null : "chat")}><MessageCircle size={18} />Message</button><button type="button" className="xoot-detail-button is-outline" onClick={() => setPanel(panel === "call" ? null : "call")}><Phone size={18} />Call</button></div>
      </VisitCard>
      {panel === "chat" && (solo ? <BookingChat bookingId={id} booking={booking} xooter={xooter} messages={data.messages} hasMore={data.more?.messages} currentUserId={owner} isCurrent={resource.isCurrent} invoke={resource.invoke} /> : <VisitCard><p>Crew chat is not available yet. Contact support about your visit.</p><Link to={support}>Contact support</Link></VisitCard>)}
      {panel === "call" && <VisitCard><p className="xoot-detail-muted">{calling ? "The call service verifies availability before connecting." : "Calling is unavailable outside the active booking window."}</p>{calling && solo && <><VoiceCallPanel bookingId={id} available={calling} isCurrent={resource.isCurrent} invoke={resource.invoke} /><button className="xoot-detail-button is-outline" type="button" disabled={resource.busy} onClick={() => void resource.act(async () => {
        const response = await resource.invoke<{ data?: { call_session_id?:string; status?: string; proxy_numbers?: { client?: string | null; xooter?: string | null } | null } }>("create-masked-call", { booking_id: id });
        const call = response.data, phone = isOwner ? call?.proxy_numbers?.client : call?.proxy_numbers?.xooter;
        if (call?.status !== "active" || !phone || !/^\+?[0-9]{7,15}$/.test(phone)) return "Masked calling is unavailable. Please use booking messages or support.";
        setMaskedPhone(phone);
        if (call.call_session_id) sendNativeBookingAction(createNativeBookingActionPayload("masked_call", { ...visitNativeInput(data), callSessionId:call.call_session_id }));
        return "Masked call is ready. Use the phone link to connect.";
      })}>Request a masked phone call</button>{maskedPhone && <a className="xoot-detail-button is-outline" href={`tel:${maskedPhone}`}>Call using the masked number</a>}</>}{!solo && <p>Crew calling is not available yet. Contact support about your visit.</p>}</VisitCard>}
      <div className="xoot-detail-checklist"><SectionLabel slot="plain" label="Visit checklist" count={tasks.length} /><VisitCard tone="flat">{tasks.length ? tasks.map(task => <div className="xoot-detail-task" key={task.id}><span className={task.completed_at ? "is-done" : ""} aria-label={task.completed_at ? "Completed" : "Not completed"}>{task.completed_at && <Check size={12} strokeWidth={3.4} />}</span><span className={task.completed_at ? "is-done" : ""}>{task.label}</span></div>) : <p className="xoot-detail-muted">No recorded checklist tasks are available yet.</p>}</VisitCard></div>
      {data.more?.tasks && <Link to={`/app/bookings/${id}/tracking`}>More checklist tasks are available in Tracking.</Link>}
      {isOwner && <VisitPaymentCard data={data} resource={resource} />}
      {isOwner && <div className="xoot-detail-action-row"><button type="button" className="xoot-detail-button is-ghost" onClick={() => setPanel(panel === "reschedule" ? null : "reschedule")}>Reschedule</button><button type="button" className="xoot-detail-button is-ghost is-danger" onClick={() => setPanel(panel === "cancel" ? null : "cancel")}>Cancel visit</button></div>}
      {(panel === "more" || panel === "reschedule" || panel === "cancel") && <VisitOptions id={id} owner={owner} data={data} resource={resource} panel={panel} assignedWorker={assignedWorker && solo} support={support} />}
      {resource.actionMessage && <p role="status" className="xoot-detail-feedback">{resource.actionMessage}</p>}
    </div>
    <DockedCTA note={isOwner ? "Cancellation terms and any refund are reviewed from your booking records." : undefined}>
      {eligible || (isOwner && data.review) ? <Link className="xoot-detail-button is-primary is-large" to={`/app/bookings/${id}/rate`}>{data.review ? "View recorded rating" : "Visit finished — rate it"}<Star size={18} /></Link> : <button className="xoot-detail-button is-primary is-large" type="button" disabled>{!solo && canonicalStatus === "completed" ? "Crew ratings are not available yet" : "Rating available after completion"}</button>}
    </DockedCTA>
  </div>;
}
