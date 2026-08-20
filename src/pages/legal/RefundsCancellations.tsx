import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const RefundsCancellations = () => (
  <LegalLayout
    title="Xoot Refunds and Cancellations"
    description="How Xoot handles cancellations, refunds, replacement support, Care+ billing, payment disputes, and XootCred adjustments."
    canonical="/legal/refunds-cancellations"
    eyebrow="Payments"
    lastUpdated="29 July 2026"
  >
    <LegalSection title="Payment confirmation">
      <p>
        A booking, Care+, or XootCred-related benefit is treated as paid only after the payment provider event is verified by Xoot's backend. A success URL, redirect, screenshot, or browser return state is not enough.
      </p>
    </LegalSection>

    <LegalSection title="Customer cancellations">
      <p>
        Cancellation fees may depend on booking status, time to service, Xooter acceptance, Xooter travel/preparation, and operational cost already incurred. The live app should show the applicable cancellation outcome before confirmation where possible.
      </p>
      <LegalList>
        <li>Unassigned or early cancellations may have lower or no cancellation fees.</li>
        <li>Accepted, en-route, arrived, or in-progress bookings may attract higher fees.</li>
        <li>Completed bookings cannot be cancelled through ordinary client flow.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Xooter cancellations and replacement support">
      <p>
        If a Xooter cancels, Xoot will route the case into replacement support where operationally possible. Replacement support is subject to availability, service area, timing, scope, and trust checks. Xoot should not promise a guaranteed replacement unless the live operations team confirms it.
      </p>
    </LegalSection>

    <LegalSection title="Refund review">
      <p>
        Refunds may be reviewed for provider confirmation, service status, photos, support history, cancellation reason, disputes, chargeback risk, and fraud signals. Safety, damage, theft, harassment, payment disputes, and legal complaints require human review.
      </p>
    </LegalSection>

    <LegalSection title="Care+ billing">
      <p>
        Care+ is billed monthly after activation. Membership benefits start only after verified payment. Cancelling Care+ stops future membership billing but does not automatically refund the current billing period unless Xoot support approves a refund under the relevant facts.
      </p>
    </LegalSection>

    <LegalSection title="XootCred">
      <p>
        XootCred is not cash, cannot be withdrawn, and may expire. XootCred can be reversed for refunds, chargebacks, cancelled bookings, abuse, duplicate credits, or fraud indicators.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default RefundsCancellations;
