import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const AiConciergeNotice = () => (
  <LegalLayout
    title="Zoot AI Concierge Notice"
    description="How Zoot Concierge answers general questions, when it may use AI assistance, what it cannot do, and how users can request human review."
    canonical="/legal/ai-concierge"
    eyebrow="AI notice"
  >
    <LegalSection title="What Concierge can help with">
      <p>
        Zoot Concierge can answer general questions about Zoot services, Care+, ZootCred, launch areas, office cleaning, Airbnb turnovers, becoming a Zooter, booking preparation, and support routing.
      </p>
      <p>
        Guests can use Concierge for general guidance. Signed-in users can access protected support workflows for account, booking, payment, address, and ticket-specific help.
      </p>
    </LegalSection>

    <LegalSection title="What Concierge cannot do">
      <LegalList>
        <li>Approve refunds, payments, cancellations, replacements, admin actions, Zooter activation, or account changes.</li>
        <li>Ask for or process passwords, OTPs, full card numbers, private keys, gate codes, alarm codes, or lockbox codes.</li>
        <li>Guarantee availability, pricing, insurance, background-check outcomes, replacement timing, or support decisions.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Human review and reporting">
      <p>
        Users can report a Concierge answer from the chat interface. Refunds, payments, damage, theft, harassment, safety concerns, legal threats, access-code issues, and account-risk matters must be handled by human support reviewers.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default AiConciergeNotice;
