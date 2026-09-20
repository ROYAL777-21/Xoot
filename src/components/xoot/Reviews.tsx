import { MessageSquareQuote } from "lucide-react";

/**
 * There is no public, moderation-approved review feed in the current schema. The private
 * post_job_reviews table is intentionally scoped to booking participants and admins, so the
 * homepage must not republish its notes or turn prototype testimonials into customer evidence.
 */
export function Reviews() {
  return (
    <section id="reviews" className="xoot-public-section" aria-labelledby="reviews-title">
      <div className="xoot-public-inner">
        <div className="xoot-section-head xoot-section-head--center" style={{ maxWidth: 560 }}>
          <p className="xoot-section-eyebrow">What people say</p>
          <h2 id="reviews-title" className="xoot-section-title">Booked, cleaned, and <span className="xoot-squiggle">left alone</span>.</h2>
          <p className="xoot-section-sub">Only customer reviews approved for public display will appear here.</p>
        </div>
        <div className="xoot-card xoot-reviews__state" role="status">
          <MessageSquareQuote aria-hidden="true" />
          <h3>Published reviews are coming</h3>
          <p>Xoot does not have a public review feed yet. Reviews stay attached to completed bookings until a safe publication workflow is available.</p>
        </div>
      </div>
    </section>
  );
}
