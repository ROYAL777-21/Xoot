import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";
import { CARE_PLUS_WELCOME_CREDIT_CENTS } from "@/lib/care-plus";
import { formatRand } from "@/lib/xoot-pricing";

/*
 * The welcome credit is read from the constant, not typed into the sentence.
 *
 * This is the legal page. If `care/CarePlus.tsx` advertises one figure and this document states
 * another, the discrepancy is only ever discovered by the person disputing the difference — and
 * the terms are the document they will be held against. Both now read the same constant.
 */

const CarePlusTerms = () => (
  <LegalLayout
    title="Xoot Care+ Terms"
    description="Terms for Xoot Care+ membership, Home Memory, favourite Xooter workflows, priority support, XootCred benefits, billing, cancellation, and limitations."
    canonical="/legal/care-plus-terms"
    eyebrow="Care+"
    lastUpdated="13 August 2026"
  >
    <LegalSection title="Membership benefits">
      <p>
        Care+ is Xoot's membership layer for repeat homes and properties. It may include Home Memory, favourite Xooter workflows where availability allows, priority support handling, smart reminders, and member XootCred benefits.
      </p>
      <p>
        Care+ does not guarantee instant availability, a specific Xooter, automatic replacement, refund approval, or unlimited support outcomes.
      </p>
    </LegalSection>

    <LegalSection title="Billing and activation">
      <LegalList>
        <li>Care+ activates only after backend payment confirmation.</li>
        <li>A redirect, success screen, or screenshot does not prove payment success.</li>
        <li>Membership billing, past-due state, cancellation, and rejoin flows must be handled through server-side systems.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="XootCred and the welcome credit">
      <p>
        XootCred is not cash, cannot be withdrawn, may expire, and may be reversed for refunds, chargebacks, cancelled bookings, abuse, duplicates, or fraud indicators. The {formatRand(CARE_PLUS_WELCOME_CREDIT_CENTS)} add-on credit is granted once, when membership starts. It does not recur, and its rules should be shown clearly in the live membership flow.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default CarePlusTerms;
