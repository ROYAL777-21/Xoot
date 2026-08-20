import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const Popia = () => (
  <LegalLayout
    title="Xoot POPIA Notice"
    description="Xoot's Protection of Personal Information Act notice for South African users, Xooters, applicants, clients, and operational partners."
    canonical="/legal/popia"
    eyebrow="POPIA"
    lastUpdated="29 July 2026"
  >
    <LegalSection title="Responsible party">
      <p>
        Xoot is the responsible party for personal information collected through its website, app, booking, support, Xooter onboarding, Care+, XootCred, and operational workflows unless another provider acts as an independent responsible party under its own terms.
      </p>
    </LegalSection>

    <LegalSection title="Purpose specification">
      <LegalList>
        <li>Provide, price, assign, support, and complete home-care bookings.</li>
        <li>Verify Xooters, screen applications, manage training, and monitor reliability.</li>
        <li>Operate Care+, Home Memory, favourite Xooter, XootCred, and property-profile features.</li>
        <li>Process payments, provider callbacks, refunds, disputes, and reconciliation.</li>
        <li>Prevent fraud, abuse, platform circumvention, account takeover, unsafe behaviour, and unauthorised access.</li>
        <li>Comply with applicable legal, tax, accounting, safety, dispute, and law-enforcement obligations.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Data minimisation">
      <p>
        Xoot should collect only the information needed for the relevant workflow. Sensitive access notes, identity documents, payment metadata, and trust incidents should have stricter access controls, retention rules, and audit logs than ordinary marketing or website analytics data.
      </p>
    </LegalSection>

    <LegalSection title="Operator and third-party access">
      <p>
        Xoot may use trusted operators such as Supabase, payment providers, email providers, Twilio, OpenAI, Sentry, EAS/Expo, hosting providers, and other approved processors where needed. Each provider should receive only the data needed for its task.
      </p>
    </LegalSection>

    <LegalSection title="Data subject requests">
      <p>
        Data subjects may request access, correction, deletion, objection, or restriction where POPIA allows it. Xoot may need to verify identity before actioning a request and may retain certain information where required for bookings, safety, fraud, accounting, payment disputes, or legal obligations.
      </p>
    </LegalSection>

    <LegalSection title="Information Regulator">
      <p>
        If a privacy matter is not resolved through Xoot support, South African users may contact the Information Regulator of South Africa. Xoot should maintain a response process for suspected data incidents and POPIA complaints before public launch.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Popia;
