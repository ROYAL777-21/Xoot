import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const ZooterTerms = () => (
  <LegalLayout
    title="Zoot Zooter Terms"
    description="Terms for Zooter applicants and independent contractors using Zoot onboarding, training, booking, earnings, support, and sensitive-access workflows."
    canonical="/legal/zooter-terms"
    eyebrow="Zooters"
  >
    <LegalSection title="Application and verification">
      <LegalList>
        <li>Zooter applicants must provide truthful identity, experience, reference, coverage, transport, document, and training information.</li>
        <li>False, misleading, incomplete, or unverifiable information may lead to rejection, suspension, or removal.</li>
        <li>Identity documents, banking information, screening notes, and background-check information must be uploaded only through protected onboarding workflows.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="Service standards">
      <p>
        Zooters must follow accepted booking details, arrival expectations, in-app communication rules, privacy requirements, service-quality standards, and training requirements. Sensitive household details are provided only where needed for the job.
      </p>
    </LegalSection>

    <LegalSection title="Sensitive access information">
      <p>
        Gate codes, alarm codes, lockbox notes, parking instructions, pet notes, and access instructions are time-limited and logged where revealed. They must not be copied into personal notes, screenshots, ordinary chat, email, or social media.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default ZooterTerms;
