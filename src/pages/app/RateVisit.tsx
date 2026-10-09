import { useState } from "react";
import { Link } from "react-router-dom";
import { ServiceIcon } from "@/components/kit/ServiceIcon";
import { DockedCTA } from "@/components/kit/DockedCTA";
import { RatingStars, VisitBloom, VisitCard, VisitHeader } from "@/components/visits/VisitPrimitives";
import { reviewEligible, visitService, type VisitReview } from "@/components/visits/visit-data";
import type { VisitResource } from "./BookingDetail";

export function RateVisit({ id, owner, resource }: { id: string; owner: string; resource: VisitResource }) {
  const [stars, setStars] = useState(0);
  const [notes, setNotes] = useState("");
  const data = resource.data!;
  const { booking, review } = data;
  const solo = booking.crew_size === 1 && data.jobs.every(job => job.xooter_id === booking.xooter_id);
  const eligible = solo && reviewEligible(booking, owner, review);
  const recorded = booking.user_id === owner ? review : null;
  const value = recorded?.rating ?? stars;
  const save = () => resource.act(async () => {
    if (!eligible || stars < 1 || stars > 5) return null;
    const result = await resource.invoke<{ ok: boolean; review: VisitReview; existing?: boolean }>("submit-visit-review", { bookingId: id, rating: stars, notes: notes.trim() || null });
    if (!result.ok || !result.review) throw new Error("Rating could not be saved. Please retry.");
    resource.setData(current => current ? { ...current, review: result.review } : current);
    if (result.review.rating <= 2) {
      try {
        const followup = await resource.invoke<{ queued?: boolean }>("ops-workflow", { action: "review_followup_requested", reviewId: result.review.id });
        if (followup?.queued !== true) throw new Error("Follow-up was not confirmed");
      }
      catch { return "Rating saved. Support follow-up could not be queued; please contact support about your visit."; }
    }
    return result.existing ? "Your previously saved rating is recorded." : "Your rating is saved.";
  });
  return <div className="xoot-detail xoot-rate"><VisitHeader title="How did it go?" back={`/app/bookings/${id}`} />
    <div className="xoot-detail-content xoot-rate-content">
      {value >= 4 ? <VisitBloom /> : <ServiceIcon service={visitService(booking)} size={82} shape="circle" />}
      <div className="xoot-rate-intro"><h2>{recorded ? "Your rating is recorded" : !solo ? "Your crew visit" : stars === 0 ? "How was your visit?" : stars >= 4 ? "That’s lovely to hear" : "Thanks for being honest"}</h2><p>{recorded ? "This saved review is read-only." : !solo ? "Crew ratings are not available yet. Contact support to share feedback about your visit." : !eligible ? "Ratings are available to the booking owner after a completed visit with an assigned Xooter." : "Choose your rating. Your feedback is recorded against this visit."}</p></div>
      {(recorded || eligible) && <RatingStars value={value} onChange={eligible && !resource.busy ? setStars : undefined} />}
      {recorded?.notes && <VisitCard tone="flat"><p>{recorded.notes}</p></VisitCard>}
      {eligible && stars > 0 && <div className="xoot-rate-extras">
        <VisitCard tone="flat"><span className="xoot-label">Add a tip? Entirely up to you</span><div className="xoot-rate-tips" aria-label="Tip options unavailable">{[0, 2000, 5000, 10000].map(cents => <button key={cents} type="button" disabled>{cents === 0 ? "None" : `R${cents / 100}`}</button>)}</div><p className="xoot-detail-caption">Tipping is not available yet. No tip is selected or charged.</p></VisitCard>
        <VisitCard tone="flat"><Link className="xoot-rate-rebook" to={`/app/book?service=${encodeURIComponent(visitService(booking))}`}><span><strong>Plan another visit</strong><small>Choose a new day and time</small></span><span aria-hidden="true" className="xoot-rate-switch" /></Link><p className="xoot-detail-caption">Opens the booking flow. No repeat visit has been booked, and a particular Xooter is not guaranteed.</p></VisitCard>
        <details className="xoot-rate-feedback"><summary>Anything the team should know?</summary><label htmlFor="visit-review-notes">Optional visit feedback</label><textarea id="visit-review-notes" maxLength={1000} value={notes} disabled={resource.busy} onChange={event => setNotes(event.target.value)} /></details>
      </div>}
      {resource.actionMessage && <p role="status" className="xoot-detail-feedback">{resource.actionMessage}</p>}
      <Link to={`/app/support?booking=${encodeURIComponent(id)}`}>Contact support about this visit</Link>
    </div>
    <DockedCTA>{recorded ? <Link className="xoot-detail-button is-ink is-large" to={`/app/bookings/${id}`}>Done</Link> : <button type="button" className="xoot-detail-button is-ink is-large" disabled={!eligible || stars === 0 || resource.busy} onClick={() => void save()}>{resource.busy ? "Saving rating…" : stars === 0 ? "Pick a rating" : "Save rating"}</button>}</DockedCTA>
  </div>;
}
