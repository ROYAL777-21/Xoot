import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const Privacy = () => (
  <LegalLayout
    title="Xoot Privacy Policy"
    description="How Xoot collects, uses, protects, shares, and retains personal information for booking, Care+, support, Xooter onboarding, payments, safety, and product operations."
    canonical="/legal/privacy"
    eyebrow="Privacy"
    lastUpdated="29 July 2026"
  >
    <LegalSection title="Information we collect">
      <LegalList>
        <li>Account details such as name, email address, phone number, role, and authentication metadata.</li>
        <li>Booking and property information such as service type, suburb, address, schedule, notes, add-ons, photos where uploaded, and booking status.</li>
        <li>Sensitive household access information only where needed for a booking, such as gate, alarm, parking, pet, and access instructions.</li>
        <li>Xooter onboarding information such as identity, verification, training, screening, document, location-coverage, and payout-readiness data.</li>
        <li>Payment metadata, reconciliation references, XootCred ledger entries, Care+ membership status, and provider event metadata.</li>
        <li>Support, safety, fraud, device, diagnostics, push-token, email-delivery, and app-usage data needed to operate and secure Xoot.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="How we use information">
      <p>
        Xoot uses information to create accounts, verify users and Xooters, price and manage bookings, process payments through providers, route support, protect sensitive household data, prevent fraud, send transactional notifications, improve reliability, and prepare legally required records.
      </p>
      <p>
        Xoot does not sell personal information. Marketing communication should be consent-based or otherwise lawful, and users must be able to opt out where required.
      </p>
    </LegalSection>

    <LegalSection title="Optional journey location and mapping">
      <p>
        Where Xoot enables the live-journey feature, an accepted Xooter may explicitly choose to share their device's precise foreground location for an active, en-route booking. The assigned customer and MFA-verified Xoot dispatch administrators can view the latest location. Sharing stops when the Xooter chooses Stop, leaves the foreground sharing screen, or the job ends. This is optional, and Xoot does not use this feature to collect background movement history.
      </p>
      <p>
        Xoot keeps only one current GPS position for an eligible booking. A position becomes unavailable to readers no later than 60 seconds after its capture; a database cleanup job runs each minute to remove expired records. If you open an authorised journey map or request a road-time estimate, the displayed position and, for directions, the booking destination are sent to Mapbox. Mapbox SDK usage may involve map-related telemetry under Mapbox's applicable policies. Road-time estimates reflect provider routing at request time and are not guaranteed arrival times.
      </p>
      <p>
        This functionality remains subject to a separate launch approval and appropriate international-transfer, service-provider, security and privacy checks before being enabled.
      </p>
    </LegalSection>

    <LegalSection title="Where information is stored">
      <p>
        Xoot uses Supabase and trusted operational providers for authentication, database, storage, Edge Functions, notifications, payment workflows, support, monitoring, and automation. Service-role keys and provider secrets must never be exposed in the website, Expo app, public JavaScript, screenshots, or support chat.
      </p>
    </LegalSection>

    <LegalSection title="Security and access controls">
      <LegalList>
        <li>Row Level Security and role checks restrict access to account, booking, payment, Xooter, support, and property data.</li>
        <li>Sensitive household access fields are intended to be time-locked and logged when revealed to assigned Xooters.</li>
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
