import { LegalLayout, LegalList, LegalSection } from "./LegalLayout";

const Cookies = () => (
  <LegalLayout
    title="Xoot Cookie Policy"
    description="How Xoot uses cookies, local storage, analytics, crash monitoring, authentication storage, and app-like browser storage across the website and web app."
    canonical="/legal/cookies"
    eyebrow="Cookies"
  >
    <LegalSection title="What Xoot may store on your device">
      <LegalList>
        <li>Authentication/session state needed to keep signed-in users connected securely.</li>
        <li>Preference state such as theme, install mode, dismissed notices, and device-safe UI settings.</li>
        <li>Operational analytics and diagnostics used to improve reliability, performance, security, and launch readiness.</li>
        <li>Security and abuse-prevention markers such as rate-limit state for public Concierge usage.</li>
      </LegalList>
    </LegalSection>

    <LegalSection title="What Xoot should not store in browser cookies">
      <p>
        Xoot must not store service-role keys, payment secrets, provider API keys, gate codes, alarm codes, lockbox codes, full card details, identity documents, or private support records in public browser storage.
      </p>
    </LegalSection>

    <LegalSection title="Managing cookies and storage">
      <p>
        You can clear browser cookies and site data from your browser settings. Clearing site data may sign you out, remove local preferences, and require re-authentication.
      </p>
      <p>
        Mobile app sessions should use platform-secure storage where supported. Public web storage is not a place for server secrets or sensitive household access information.
      </p>
    </LegalSection>
  </LegalLayout>
);

export default Cookies;
