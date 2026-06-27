import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const Privacy = () => (
  <LegalLayout
    title="Zoot Privacy Policy"
    description="How Zoot collects, uses, protects, shares, and retains personal information for booking, Care+, support, Zooter onboarding, payments, safety, and product operations."
    canonical="/legal/privacy"
    eyebrow="Privacy"
  >
    <LegalSection title="Information we collect">
      <LegalList>
        <li>Account details such as name, email address, phone number, role, and authentication metadata.</li>
        <li>Booking and property information such as service type, suburb, address, schedule, notes, add-ons, photos where uploaded, and booking status.</li>
        <li>Sensitive household access information only where needed for a booking, such as gate, alarm, parking, pet, and access instructions.</li>
        <li>Zooter onboarding information such as identity, verification, training, screening, document, location-coverage, and payout-readiness data.</li>
        <li>Payment metadata, reconciliation references, ZootCred ledger entries, Care+ membership status, and provider event metadata.</li>
        <li>Support, safety, fraud, device, diagnostics, push-token, email-delivery, and app-usage data needed to operate and secure Zoot.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="How we use information">
      <p>
        Zoot uses information to create accounts, verify users and Zooters, price and manage bookings, process payments through providers, route support, protect sensitive household data, prevent fraud, send transactional notifications, improve reliability, and prepare legally required records.
      </p>
      <p>
        Zoot does not sell personal information. Marketing communication should be consent-based or otherwise lawful, and users must be able to opt out where required.
      </p>
    </LegalSection>

    <LegalSection title="Where information is stored">
      <p>
        Zoot uses Supabase and trusted operational providers for authentication, database, storage, Edge Functions, notifications, payment workflows, support, monitoring, and automation. Service-role keys and provider secrets must never be exposed in the website, Expo app, public JavaScript, screenshots, or support chat.
      </p>
    </LegalSection>

    <LegalSection title="Security and access controls">
      <LegalList>
        <li>Row Level Security and role checks restrict access to account, booking, payment, Zooter, support, and property data.</li>
        <li>Sensitive household access fields are intended to be time-locked and logged when revealed to assigned Zooters.</li>
        <li>Admin actions must be typed, auditable, and protected by role checks and MFA where available.</li>
        <li>Payment success is verified server-side and never trusted from the frontend alone.</li>
        <li>Push notifications, Live Activities, widgets, and emails must avoid full addresses, access codes, private complaints, payment references, and identity documents.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Your choices and rights">
      <p>
        You may request access, correction, deletion, objection, or restriction of your personal information where applicable under South African law. Some records may need to be retained for safety, fraud prevention, tax, payment, dispute, or legal reasons.
      </p>
      <p>
        See the POPIA Notice and Account Deletion page for the operational process.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Privacy;
