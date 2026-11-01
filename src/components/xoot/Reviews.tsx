import { MessageSquareQuote, Star } from "lucide-react";
import { customerReviews } from "@/content/customer-reviews";
import { HandoffTape } from "./HeroArtwork";
import "@/styles/referrals-reviews-handoff.css";
import "@/styles/homepage-sections.css";

/**
 * There is no public, moderation-approved review feed in the current schema. The private
 * post_job_reviews table is intentionally scoped to booking participants and admins, so the
 * homepage must not republish its notes. The separate approved collection contains only
 * founder-supplied customer quotes with explicit authenticity/rating/publication confirmation.
 */
export function Reviews() {
  return (
    <section id="reviews" className="xoot-public-section" aria-labelledby="reviews-title">
      <div className="xoot-public-inner">
        <div className="xoot-section-head xoot-section-head--center" style={{ maxWidth: 560 }}>
          <p className="xoot-section-eyebrow">What people say</p>
          <h2 id="reviews-title" className="xoot-section-title">Booked, cleaned, and <span className="xoot-squiggle">left alone</span>.</h2>
          <p className="xoot-section-sub">Experiences from the people who book and the Xooters who make it happen.</p>
        </div>
        <div className="xoot-review-groups">
          {customerReviews.map(review => <figure className="xoot-review-group" key={review.name}><HandoffTape />
            <span className="xoot-review-stars" role="img" aria-label={`${review.rating} out of 5 stars`}>{Array.from({ length: review.rating }, (_, index) => <Star key={index} size={16} fill="currentColor" aria-hidden="true" />)}</span>
            <blockquote><p>{review.quote}</p></blockquote>
            <figcaption><strong>{review.name}</strong><small>{"service" in review ? review.service : "Xoot customer"}</small></figcaption>
          </figure>)}
          <div className="xoot-review-group"><HandoffTape /><MessageSquareQuote aria-hidden="true" />
            <h3>From Xooters</h3>
            <p>Xooter stories are coming. Only feedback shared with permission will appear here.</p>
          </div>
        </div>
        <p className="xoot-reviews-permission">Customer experiences shared with permission.</p>
      </div>
    </section>
  );
}
