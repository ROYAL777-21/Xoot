import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { CarePlusMark } from "@/components/care-plus/CarePlusMark";
import { CARE_PLUS_MONTHLY_CENTS } from "@/lib/care-plus";
import { formatBookingMoney } from "@/lib/booking-flow";
import type { ReviewedBookingQuote } from "@/lib/booking-contract";
import { HandoffFlowerField } from "./HeroArtwork";

/** Explain the actual quote's fee benefit, without calculating a new booking total. */
export function BookingCarePlusTip({ quote }: { quote: ReviewedBookingQuote }) {
  const fees = quote.lines.filter(line => line.id === "booking_fee");
  if (typeof quote.carePlusMember !== "boolean" || !Number.isSafeInteger(quote.bookingFeeCents)
    || quote.bookingFeeCents < 0 || fees.length !== 1 || fees[0].amountCents !== quote.bookingFeeCents
    || (quote.carePlusMember ? quote.bookingFeeCents !== 0 : quote.bookingFeeCents === 0)) return null;

  return <aside className="xoot-booking-careplus" aria-label="Care+ booking tip">
    <HandoffFlowerField className="xoot-booking-careplus-flowers" items={[
      {size:94,palette:"petal",left:"90%",top:"-12%",opacity:.35},
      {size:54,palette:"honey",left:"96%",top:"66%",opacity:.25},
    ]} />
    <div className="xoot-booking-careplus-copy">
      <CarePlusMark className="xoot-booking-careplus-mark" />
      <h2>{quote.carePlusMember ? "Your booking fee is waived" : `Save ${formatBookingMoney(quote.bookingFeeCents)} on the booking fee`}</h2>
      <p>{quote.carePlusMember
        ? "Your Care+ booking-fee benefit is already included in this reviewed quote."
        : `Care+ members don’t pay this booking fee. Membership is ${formatBookingMoney(CARE_PLUS_MONTHLY_CENTS)}/month.`}</p>
      {!quote.carePlusMember && <>
        <p className="xoot-booking-careplus-note">Benefits apply after membership confirmation. Refresh your quote after joining.</p>
        <Link to="/care-plus" target="_blank" rel="noopener noreferrer" className="xoot-booking-careplus-link">
          See Care+ benefits <ArrowUpRight size={16} aria-hidden="true" /><span className="sr-only"> (opens in a new tab)</span>
        </Link>
      </>}
    </div>
  </aside>;
}
