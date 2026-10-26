import { MessageSquareQuote } from "lucide-react";
import { HandoffTape } from "./HeroArtwork";
import "@/styles/referrals-reviews-handoff.css";
import "@/styles/homepage-sections.css";

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
          <p className="xoot-section-sub">Experiences from the people who book and the Xooters who make it happen.</p>
        </div>
        <div className="xoot-review-groups">
          <div className="xoot-review-group"><HandoffTape /><MessageSquareQuote aria-hidden="true" />
            <h3>From customers</h3>
            <p>Published reviews are coming. Customer feedback stays with completed bookings until it is approved for public display.</p>
          </div>
          <div className="xoot-review-group"><HandoffTape /><MessageSquareQuote aria-hidden="true" />
            <h3>From Xooters</h3>
            <p>Xooter stories are coming. Only feedback shared with permission will appear here.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
