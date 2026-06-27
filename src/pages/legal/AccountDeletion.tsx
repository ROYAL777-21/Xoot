import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const AccountDeletion = () => (
  <LegalLayout
    title="Zoot Account Deletion"
    description="How users can request Zoot account deletion, what data may be deleted, and what information may need to be retained for legal, safety, payment, or dispute reasons."
    canonical="/legal/account-deletion"
    eyebrow="Account rights"
  >
    <LegalSection title="How to request deletion">
      <p>
        Signed-in users should request account deletion from in-app support once the account settings flow is live. Until then, use protected support after signing in so Zoot can verify the account owner before processing the request.
      </p>
    </LegalSection>

    <LegalSection title="What can usually be deleted or anonymised">
      <LegalList>
        <li>Profile display details not needed for an active booking, dispute, or legal record.</li>
        <li>Saved preferences and non-essential property notes.</li>
        <li>Marketing preferences and optional product feedback records where retention is not required.</li>
        <li>Device push tokens and app session records.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="What may be retained">
      <p>
        Zoot may retain records required for payment reconciliation, tax/accounting, fraud prevention, support disputes, safety investigations, chargebacks, legal compliance, Zooter screening, audit logs, and completed booking records.
      </p>
    </LegalSection>

    <LegalSection title="Before deletion">
      <p>
        Active bookings, pending payments, open disputes, outstanding refunds, Zooter payouts, and unresolved safety cases may need to be completed or closed before deletion is finalised.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default AccountDeletion;
