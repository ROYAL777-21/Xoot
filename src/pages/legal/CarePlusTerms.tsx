import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const CarePlusTerms = () => (
  <LegalLayout
    title="Zoot Care+ Terms"
    description="Terms for Zoot Care+ membership, Home Memory, favourite Zooter workflows, priority support, ZootCred benefits, billing, cancellation, and limitations."
    canonical="/legal/care-plus-terms"
    eyebrow="Care+"
  >
    <LegalSection title="Membership benefits">
      <p>
        Care+ is Zoot's membership layer for repeat homes and properties. It may include Home Memory, favourite Zooter workflows where availability allows, priority support handling, smart reminders, and member ZootCred benefits.
      </p>
      <p>
        Care+ does not guarantee instant availability, a specific Zooter, automatic replacement, refund approval, or unlimited support outcomes.
      </p>
    </LegalSection>

    <LegalSection title="Billing and activation">
      <LegalList>
        <li>Care+ activates only after backend payment confirmation.</li>
        <li>A redirect, success screen, or screenshot does not prove payment success.</li>
        <li>Membership billing, past-due state, cancellation, and rejoin flows must be handled through server-side systems.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="ZootCred and monthly credit">
      <p>
        ZootCred is not cash, cannot be withdrawn, may expire, and may be reversed for refunds, chargebacks, cancelled bookings, abuse, duplicates, or fraud indicators. Monthly credit rules should be shown clearly in the live membership flow.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default CarePlusTerms;
