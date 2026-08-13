import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";
import { TERMS_CLAUSE } from "@/lib/recording-notice";

const Terms = () => (
  <LegalLayout
    title="Xoot Terms and Conditions"
    description="Terms for using Xoot's website, app, booking marketplace, Care+ membership, XootCred, support workflows, and related home-care services in South Africa."
    canonical="/legal/terms"
    eyebrow="Legal"
  >
    <LegalSection title="1. Who these terms apply to">
      <p>
        These terms apply when you browse Xoot, create an account, request a booking, join Care+, apply as a Xooter, use support, or interact with Xoot's website, web app, PWA, or future Expo mobile app.
      </p>
      <p>
        Xoot may update these terms before launch and as the product expands. Material changes should be communicated through the app, website, or email where appropriate.
      </p>
    </LegalSection>

    <LegalSection title="2. Xoot's role">
      <p>
        Xoot operates a home-services platform for booking vetted independent service providers, called Xooters. Xoot provides technology, support routing, trust workflows, booking records, and payment coordination.
      </p>
      <p>
        Unless a separate written agreement states otherwise, Xoot is not the employer of a customer and does not become the legal employer of a household worker engaged outside the platform.
      </p>
    </LegalSection>

    <LegalSection title="3. Accounts and truthful information">
      <LegalList>
        <li>You must provide accurate account, booking, address, and contact information.</li>
        <li>You are responsible for keeping your login credentials secure.</li>
        <li>You may not share OTPs, passwords, payment details, gate codes, alarm codes, lockbox codes, or private keys in chat, email, screenshots, or support messages.</li>
        <li>Xoot may restrict accounts that create safety, fraud, payment, harassment, or platform-integrity risk.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="4. Bookings and service availability">
      <p>
        A booking is not final until the platform confirms the request, price, payment status, service details, and available Xooter assignment where applicable.
      </p>
      <p>
        Xoot does not promise universal coverage, instant availability, a guaranteed replacement, or a specific Xooter unless that has been confirmed in the live booking flow.
      </p>
    </LegalSection>

    <LegalSection title="5. Payments, refunds, and cancellations">
      <p>
        Payment initiation, payment confirmation, refunds, cancellations, Care+ activation, and XootCred changes must be processed by server-side Xoot systems and verified provider events. A frontend success page or mobile return URL does not prove payment success.
      </p>
      <p>
        Cancellation and refund handling is explained in the Refunds and Cancellations Policy.
      </p>
    </LegalSection>

    <LegalSection title="6. Care+ membership">
      <p>
        Care+ is Xoot's membership layer for Home Memory, favourite Xooter workflows where availability allows, priority support handling, smart reminders, and XootCred benefits. Care+ is not an insurance product and does not guarantee availability or replacement timing.
      </p>
      <p>
        Care+ benefits activate only after backend payment confirmation. XootCred credits are not cash, cannot be withdrawn, and may expire or be reversed under the XootCred rules.
      </p>
    </LegalSection>

    <LegalSection title="7. Sensitive household information">
      <p>
        Gate codes, alarm codes, lockbox notes, parking instructions, pet notes, and access instructions are sensitive. They should be stored only in protected app fields and revealed only to authorised users within approved booking windows.
      </p>
      <p>
        Do not send sensitive household access information through email, SMS, public chat, screenshots, or the Xoot Concierge bot.
      </p>
    </LegalSection>

    <LegalSection title="8. Support bot and AI-assisted help">
      <p>
        Xoot Concierge may answer general Xoot, Care+, booking, launch-area, and support questions. It must not approve refunds, change payments, override admin decisions, request secrets, or perform account actions.
      </p>
      <p>
        Safety, theft, damage, harassment, legal threats, payment disputes, cancellations, identity issues, and access-code concerns require human review.
      </p>
    </LegalSection>

    {/*
      Rendered from `src/lib/recording-notice.ts` rather than typed here, so this clause, the
      booking-time disclosure and the in-call indicator cannot drift apart. A promise made in the
      terms and contradicted on screen is worse than either alone.

      ⚠️ Recording is OFF. This clause describes what happens when it is switched on, and exists
      because it has to exist *first* — under RICA s4 the lawful recorder is a party to the call,
      and POPIA s18 requires the parties to be told before the fact, not after.
    */}
    <LegalSection title="9. Recording in-app calls">
      <p>
        Xoot's in-app calling does not record by default, and Xoot does not record calls on its own
        initiative. If in-call recording is switched on for your booking, the following applies.
      </p>
      <LegalList>
        {TERMS_CLAUSE.map((clause) => (
          <li key={clause}>{clause}</li>
        ))}
      </LegalList>
    </LegalSection>

    <LegalSection title="10. Xooter applicants">
      <p>
        Xooter applicants must provide truthful identity, right-to-work, background-check, training, reference, and document information. Uploading false, incomplete, or misleading information may result in rejection, suspension, or removal from the platform.
      </p>
    </LegalSection>

    <LegalSection title="11. Liability">
      <p>
        Xoot will take reasonable operational and security steps, but home services involve real-world risk. To the fullest extent allowed by South African law, Xoot is not liable for indirect loss, loss of profit, unsupported guarantees, or losses caused by inaccurate information supplied by users, Xooters, or third-party providers.
      </p>
      <p>
        Nothing in these terms excludes liability that cannot legally be excluded.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Terms;
