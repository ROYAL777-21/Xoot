import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const RefundsCancellations = () => (
  <LegalLayout
    title="Zoot Refunds and Cancellations"
    description="How Zoot handles cancellations, refunds, replacement support, Care+ billing, payment disputes, and ZootCred adjustments."
    canonical="/legal/refunds-cancellations"
    eyebrow="Payments"
  >
    <LegalSection title="Payment confirmation">
      <p>
        A booking, Care+, or ZootCred-related benefit is treated as paid only after the payment provider event is verified by Zoot's backend. A success URL, redirect, screenshot, or browser return state is not enough.
      </p>
    </LegalSection>

    <LegalSection title="Customer cancellations">
      <p>
        Cancellation fees may depend on booking status, time to service, Zooter acceptance, Zooter travel/preparation, and operational cost already incurred. The live app should show the applicable cancellation outcome before confirmation where possible.
      </p>
      <LegalList>
        <li>Unassigned or early cancellations may have lower or no cancellation fees.</li>
        <li>Accepted, en-route, arrived, or in-progress bookings may attract higher fees.</li>
        <li>Completed bookings cannot be cancelled through ordinary client flow.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Zooter cancellations and replacement support">
      <p>
        If a Zooter cancels, Zoot will route the case into replacement support where operationally possible. Replacement support is subject to availability, service area, timing, scope, and trust checks. Zoot should not promise a guaranteed replacement unless the live operations team confirms it.
      </p>
    </LegalSection>

    <LegalSection title="Refund review">
      <p>
        Refunds may be reviewed for provider confirmation, service status, photos, support history, cancellation reason, disputes, chargeback risk, and fraud signals. Safety, damage, theft, harassment, payment disputes, and legal complaints require human review.
      </p>
    </LegalSection>

    <LegalSection title="Care+ billing">
      <p>
        Care+ is billed monthly after activation. Membership benefits start only after verified payment. Cancelling Care+ stops future membership billing but does not automatically refund the current billing period unless Zoot support approves a refund under the relevant facts.
      </p>
    </LegalSection>

    <LegalSection title="ZootCred">
      <p>
        ZootCred is not cash, cannot be withdrawn, and may expire. ZootCred can be reversed for refunds, chargebacks, cancelled bookings, abuse, duplicate credits, or fraud indicators.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default RefundsCancellations;
