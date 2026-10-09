import { useState } from "react";
import { Link } from "react-router-dom";
import { PayFastCheckout } from "@/components/PayFastCheckout";
import { FareSplitPanel } from "@/components/xoot/FareSplitPanel";
import { JobChecklist } from "@/components/xooter/JobChecklist";
import { canTransition, normaliseBookingStatus } from "@/lib/booking-state-machine";
import { requiresCompletionPhotos } from "@/lib/trust";
import { captureOrSelectImage } from "@/lib/mobile-upload";
import { safeFileName, validateCompletionPhotoUpload } from "@/lib/upload-validation";
import { supabase } from "@/integrations/supabase/client";
import { buildBookingEtaShareText, createNativeBookingActionPayload, openBookingDirections, sendNativeBookingAction } from "@/lib/native-booking-actions";
import { notifyBookingLiveActivity } from "@/lib/native-live-activity";
import { visitLiveActivity, visitNativeInput } from "./visit-native";
import type { VisitResource } from "@/pages/app/BookingDetail";
import { money, paymentSummary, scheduledLabel, visitService, type VisitData } from "./visit-data";
import { VisitCard } from "./VisitPrimitives";

export function VisitPaymentCard({ data, resource }: { data: VisitData; resource: VisitResource }) {
  const summary = paymentSummary(data.booking, data.payments);
  return <VisitCard tone="flat" className="xoot-detail-payment"><span className="xoot-label">Payment</span>
    {summary.lines.map(line => <div key={line.label}><span>{line.label}</span><span>{line.cents < 0 ? "−" : ""}{money(Math.abs(line.cents))}</span></div>)}
    <div className="xoot-detail-total"><strong>Payment total · recorded</strong><strong>{summary.total === null ? "Unavailable" : money(summary.total)}</strong></div>
    <p className="xoot-detail-caption">{summary.itemized ? "Itemized from the stored payment breakdown." : "Detailed add-ons and discounts are unavailable. Stored service amounts and payment records are shown separately."}</p>
    {!summary.valid ? <p role="alert">Payment records contain an unsupported currency or amount. Contact support before paying.</p> : <>
      <p>Verified paid by you: {summary.paid === null ? "Unavailable" : money(summary.paid)}</p>
      {summary.records.length === 0 && <p className="xoot-detail-caption">No payment record is available. Payment has not been verified here.</p>}
      {summary.pending && <><p>Your pending payment{summary.pendingShare ? " · your share" : ""}: {money(Math.round(summary.pending.amount * 100))}</p><PayFastCheckout paymentRecordId={summary.pending.id} label="Retry secure checkout" isCurrent={resource.isCurrent} invoke={resource.invoke} /></>}
    </>}
  </VisitCard>;
}
export function VisitOptions({ id, owner, data, resource, panel, assignedWorker, support }: { id: string; owner: string; data: VisitData; resource: VisitResource; panel: string; assignedWorker: boolean; support: string }) {
  const { booking } = data;
  const [notes, setNotes] = useState("");
  const [kind, setKind] = useState("poor_quality");
  const status = normaliseBookingStatus(booking.status), isOwner = booking.user_id === owner;
  const proofRequired = booking.completion_photo_required || requiresCompletionPhotos(booking.service_type);
  const proofComplete = ["before", "after"].every(type => data.photos.some(photo => photo.photo_type === type));
  const upload = (type: "before" | "after") => resource.act(async () => {
    const file = await captureOrSelectImage();
    if (!file || !resource.isCurrent()) return null;
    const validation = validateCompletionPhotoUpload(file); if (validation) throw new Error(validation);
    await resource.authorization();
    const path = `${id}/${type}-${crypto.randomUUID()}-${safeFileName(file.name)}`;
    const result = await supabase.storage.from("booking-completion-photos").upload(path, file, { upsert: false, contentType: file.type, cacheControl: "0" });
    if (!resource.isCurrent()) return null;
    if (result.error) throw new Error("Photo upload failed. Please retry.");
    await resource.authorization();
    const insert = await supabase.from("booking_completion_photos").insert({ booking_id: id, xooter_id: booking.xooter_id, photo_type: type, storage_path: path });
    if (!resource.isCurrent()) return null;
    if (insert.error) throw new Error("Photo uploaded, but its visit record was not saved. Contact support before retrying.");
    await resource.refresh(); return "Completion photo recorded.";
  });
  if (panel === "reschedule" || panel === "cancel") return <VisitCard tone="flat"><h2>{panel === "reschedule" ? "Reschedule your visit" : "Cancel your visit"}</h2><p>Send a support request to review {panel === "reschedule" ? "a new time and availability" : "cancellation terms and any refund"} for this visit. Your booking stays as recorded until the request is handled.</p><form onSubmit={event => { event.preventDefault(); void resource.act(async () => {
    const result = await resource.invoke<{ success: boolean; data?: { case_id?: string } }>("create-support-case", { bookingId: id, category: panel === "cancel" ? "cancellation" : "reschedule", subject: panel === "cancel" ? "Visit cancellation request" : "Visit reschedule request", description: notes.trim() });
    if (!result.success || !result.data?.case_id) throw new Error("Support request was not recorded. Please retry.");
    if (resource.isCurrent()) setNotes("");
    return "Support request recorded. Your visit has not been changed; support will review the next step.";
  }); }}><label htmlFor="visit-change-request">{panel === "reschedule" ? "Preferred new day/time and anything we should know" : "Tell us why you need to cancel"}</label><textarea id="visit-change-request" maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} /><button type="submit" className="xoot-detail-button is-outline" disabled={resource.busy || notes.trim().length < 8}>Send support request</button></form></VisitCard>;
  return <VisitCard tone="flat" className="xoot-detail-more"><h2>More visit options</h2>
    <div className="xoot-detail-action-row"><button type="button" className="xoot-detail-button is-outline" onClick={() => void resource.act(async () => { const result = openBookingDirections({ ...visitNativeInput(data), address: booking.address }); if (!result.fallbackUrl) throw new Error("No destination is recorded for this visit."); return "Directions opened."; })}>Directions</button><button type="button" className="xoot-detail-button is-outline" disabled={resource.busy} onClick={() => void resource.act(async () => {
      const payload = createNativeBookingActionPayload("share_eta", visitNativeInput(data));
      const text = buildBookingEtaShareText(payload);
      const url = new URL(payload.route, window.location.origin).href;
      if (!resource.isCurrent()) return null;
      const delivered = sendNativeBookingAction(payload);
      if (navigator.share) {
        try { await navigator.share({ title: "Xoot visit update", text, url }); return "Visit update shared."; }
        catch (failure) {
          if (failure && typeof failure === "object" && "name" in failure && failure.name === "AbortError") return delivered ? "Browser share cancelled. Native share options were requested." : "Share cancelled.";
        }
      }
      if (!resource.isCurrent()) return null;
      if (navigator.clipboard?.writeText) {
        try { await navigator.clipboard.writeText(`${text}\n${url}`); return "Visit update and link copied."; }
        catch { /* A successful native dispatch can still open share options. */ }
      }
      if (delivered) return "Native share options requested.";
      throw new Error("Sharing is unavailable on this device.");
    })}>Share visit update</button></div>
    <h3>Recorded status events</h3>{data.events.length ? <ul>{data.events.map(event => <li key={event.id}>{event.label} · {scheduledLabel(event.created_at)}</li>)}</ul> : <p>No status events have been recorded.</p>}
    <h3>Completion proof</h3>{data.photos.length ? <ul>{data.photos.map(photo => <li key={photo.id}>{photo.photo_type} photo recorded · {scheduledLabel(photo.created_at)}</li>)}</ul> : <p>No completion photos are recorded.</p>}
    {assignedWorker && status && !["completed", "rated", "cancelled"].includes(status) && <>
      {data.jobs.filter(job => job.state === "accepted" && job.xooter_id === booking.xooter_id).map(job => <JobChecklist key={job.id} jobId={job.id} bookingId={id} />)}
      {proofRequired && <div className="xoot-detail-action-row">{(["before", "after"] as const).map(type => <button key={type} type="button" className="xoot-detail-button is-outline" disabled={resource.busy} onClick={() => void upload(type)}>Upload {type} photo</button>)}</div>}
      <div className="xoot-detail-action-row">{(status === "contractor_accepted" ? [{ status: "en_route", label: "On the way" }] : status === "en_route" ? [{ status: "arrived", label: "Arrived" }] : status === "in_progress" && !booking.job_started_at ? [{ status: "in_progress", label: "Start work" }] : status === "in_progress" ? [{ status: "completed", label: "Complete visit" }] : []).map(action => <button key={action.status} type="button" className="xoot-detail-button is-outline" disabled={resource.busy || (action.status === "completed" && proofRequired && !proofComplete)} onClick={() => void resource.act(async () => {
        const result = await resource.invoke<{status?:string;timeline_status?:string}>("ops-workflow", { action: "booking_status_changed", bookingId: id, status: action.status });
        const saved = await resource.refresh();
        if (!saved || !resource.isCurrent()) return "Your request completed, but the visit could not be refreshed. Please retry the refresh.";
        if (!result.status || normaliseBookingStatus(saved.booking.status) !== normaliseBookingStatus(result.status)) throw new Error("The visit status was not verified. Please refresh or contact support.");
        const timestamp = action.status === "arrived" ? "arrived_at" : action.status === "in_progress" ? "job_started_at" : action.status === "completed" ? "job_completed_at" : null;
        if (timestamp && (!saved.booking[timestamp] || saved.booking[timestamp] === booking[timestamp])) throw new Error("The visit update was not verified. Please refresh or contact support.");
        notifyBookingLiveActivity(visitLiveActivity(saved,result.timeline_status || result.status));
        return "Visit status recorded.";
      })}>{action.label}</button>)}</div>
    </>}
    {isOwner && <>
      {paymentSummary(booking, data.payments).service !== null && booking.payment_status === "pending" && <><p className="xoot-detail-caption">Fare splitting currently divides the stored service amount, {money(Math.round(booking.price * 100))}. Fees, credits and other adjustments are separate; it does not settle the full payment.</p><FareSplitPanel bookingId={id} totalRands={booking.price} paymentStatus={booking.payment_status} serviceType={booking.service_type} scheduledAt={booking.scheduled_at} isCurrent={resource.isCurrent} invoke={resource.invoke} /></>}
      {booking.xooter_id && <form onSubmit={event => { event.preventDefault(); void resource.act(async () => { await resource.invoke("ops-workflow", { action: "trust_incident_submitted", bookingId: id, incidentType: kind, notes }); if (resource.isCurrent()) setNotes(""); return "Incident recorded for Trust & Safety review."; }); }}><label htmlFor="visit-incident">Report a service concern</label><select id="visit-incident" value={kind} onChange={event => setKind(event.target.value)}>{["lateness", "disrespect", "poor_quality", "suspicious_behaviour", "damages", "complaint", "support_escalation"].map(value => <option key={value} value={value}>{value.replace(/_/g, " ")}</option>)}</select><label htmlFor="visit-incident-notes">What happened?</label><textarea id="visit-incident-notes" value={notes} maxLength={1000} onChange={event => setNotes(event.target.value)} /><button type="submit" disabled={resource.busy || !notes.trim()} className="xoot-detail-button is-outline">Send to Trust & Safety</button></form>}
      {status && canTransition(status, "cancelled") && <Link to={`${support}&kind=cancel`}>Ask support about cancellation</Link>}
    </>}
    <Link className="xoot-detail-button is-outline" to={`/app/book?service=${encodeURIComponent(visitService(booking))}`}>Plan another visit</Link><p className="xoot-detail-caption">Opens a new booking request. Xooter availability and price are confirmed in the booking flow.</p><Link to={support}>Contact support about this visit</Link>
  </VisitCard>;
}
