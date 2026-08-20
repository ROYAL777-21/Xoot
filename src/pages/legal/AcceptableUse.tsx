import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const AcceptableUse = () => (
  <LegalLayout
    title="Xoot Acceptable Use Policy"
    description="Rules for safe, lawful, respectful use of Xoot bookings, support, Concierge, Xooter onboarding, reviews, communication, and property workflows."
    canonical="/legal/acceptable-use"
    eyebrow="Platform rules"
    lastUpdated="29 July 2026"
  >
    <LegalSection title="Use Xoot honestly">
      <LegalList>
        <li>Provide accurate identity, contact, address, booking, payment, and Xooter application information.</li>
        <li>Do not create fake accounts, fake bookings, fake reviews, fake referrals, or misleading support claims.</li>
        <li>Do not attempt to bypass platform payments, safety checks, Xooter onboarding, or support workflows.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Keep people safe">
      <LegalList>
        <li>No harassment, threats, discrimination, intimidation, stalking, or unsafe conduct toward clients, Xooters, staff, or support reviewers.</li>
        <li>No instructions that create unsafe work, illegal entry, unlawful surveillance, or unauthorised handling of private property.</li>
        <li>Report damage, theft concerns, safety incidents, harassment, and access-code issues through protected Support for human review.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Protect sensitive information">
      <p>
        Do not send passwords, OTPs, card details, gate codes, alarm codes, lockbox codes, private keys, identity documents, or private household notes through public chat, ordinary email, screenshots, or social media.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default AcceptableUse;
