import { Navbar } from "@/components/zoot/Navbar";
import { Footer } from "@/components/zoot/Footer";

const Section = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <section className="mb-10">
    <h2 className="font-display text-2xl md:text-3xl font-bold mb-4 flex items-baseline gap-3">
      <span className="text-primary">{n}.</span> {title}
    </h2>
    <div className="prose prose-sm md:prose-base max-w-none text-muted-foreground space-y-3">
      {children}
    </div>
  </section>
);

const Terms = () => (
  <div className="min-h-screen bg-background">
    <Navbar />
    <main className="container max-w-3xl py-12 md:py-20">
      <p className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Legal</p>
      <h1 className="font-display text-4xl md:text-6xl font-bold tracking-tight mb-3">Terms & Conditions</h1>
      <p className="text-muted-foreground mb-12">
        These Terms and Conditions govern the use of Zoot's Placement Services and Subscription Services.
        By proceeding with a placement application, paying any applicable fee, or activating a Subscription,
        the Client agrees to be bound by these Terms.
      </p>

      <Section n="1" title="Definitions">
        <p><strong>"Client"</strong> means the individual or household engaging a Candidate through Zoot.</p>
        <p><strong>"Candidate"</strong> means any cleaner or housekeeper introduced through Zoot.</p>
        <p><strong>"Placement"</strong> means the introduction and matching of a Candidate to a Client.</p>
        <p><strong>"Private Placement"</strong> means engagement of a Candidate off the Zoot platform following payment of a Placement Fee.</p>
        <p><strong>"Subscription"</strong> (HomeCare+) means the ongoing on-platform engagement model where the Client pays a recurring monthly fee to retain a Candidate through Zoot at a self-determined rate.</p>
        <p><strong>"Subscription Bookings"</strong> means recurring bookings created under the HomeCare+ Subscription product.</p>
      </Section>

      <Section n="2" title="Nature of services">
        <p>Zoot provides two distinct engagement models following a successful match:</p>
        <h3 className="font-display font-bold text-foreground mt-4">2.1 Private Placement (Off-Platform)</h3>
        <p>Upon payment of the Placement Fee, the Client engages the Candidate independently outside of the Zoot platform. Zoot exits operational involvement; all payment, scheduling, compliance, and employment obligations transfer to the Client.</p>
        <h3 className="font-display font-bold text-foreground mt-4">2.2 HomeCare+ Subscription</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>The Candidate remains active on the Zoot platform.</li>
          <li>An employment relationship is created between Client and Candidate.</li>
          <li>The Client sets a recurring daily rate (subject to minimums defined by Zoot).</li>
          <li>100% of the agreed rate is paid to the Candidate.</li>
          <li>Zoot charges a separate recurring monthly Subscription fee of <strong>R99</strong> to manage payments, payouts, and platform admin.</li>
          <li>Subscription Bookings are a distinct product category separate from standard one-time or recurring bookings.</li>
        </ul>
      </Section>

      <Section n="3" title="Independent contractor status">
        <p>All Candidates remain independent contractors of Zoot unless engaged under a Private Placement.</p>
        <p>Under HomeCare+: an employment relationship is created between Client and Candidate. The Candidate remains free to accept other work outside of their agreed contract with the Client.</p>
        <p>Under Private Placement: an employment relationship is created between Client and Candidate. Zoot does not act as employer, co-employer, or labour broker.</p>
      </Section>

      <Section n="4" title="Screening & matching">
        <p>Zoot conducts reasonable screening including: identity verification, right-to-work checks, reference checks, criminal background checks, skills assessment (where applicable). Zoot does not guarantee accuracy or completeness of information provided by Candidates. Final hiring decisions remain the Client's responsibility.</p>
      </Section>

      <Section n="5" title="Fees">
        <h3 className="font-display font-bold text-foreground mt-4">5.1 Initiation Fee</h3>
        <p>A non-refundable administrative fee of <strong>R399</strong> is payable to begin the placement process and cover the vetting process of candidates.</p>
        <h3 className="font-display font-bold text-foreground mt-4">5.2 Placement Fee (Private Placement only)</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>R1 249 (incl. VAT)</strong> — Housekeeper</li>
        </ul>
        <p>Payment of the Placement Fee constitutes formal release of the Candidate from the Zoot platform for purposes of Client engagement.</p>
        <h3 className="font-display font-bold text-foreground mt-4">5.3 HomeCare+ Subscription Fee</h3>
        <p>The Client pays <strong>R99 per month</strong>. The fee recurs automatically until cancelled. Subscription may be cancelled by written request to Support. If cancelled, all upcoming Subscription Bookings will automatically cancel.</p>
      </Section>

      <Section n="6" title="Subscription rate rules">
        <p>Clients may set their own daily rate for HomeCare+ Bookings. However, the minimum daily rate is:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>R300</strong> for Housekeeping (indoor cleaning)</li>
        </ul>
        <p>Zoot reserves the right to update minimum rates at any time. Rates may not be set below the applicable minimum. Zoot does not deduct any percentage or commission from HomeCare+ Booking payments. All HomeCare+ earnings are paid 100% to the Candidate via standard weekly payout processes.</p>
      </Section>

      <Section n="7" title="Backup & replacements (HomeCare+ only)">
        <h3 className="font-display font-bold text-foreground mt-4">7.1 Temporary absence</h3>
        <p>If a Candidate cancels an individual HomeCare+ Booking, Zoot will make reasonable efforts to provide a backup Candidate unless otherwise stated by the Client. Backup services are subject to availability.</p>
        <h3 className="font-display font-bold text-foreground mt-4">7.2 Permanent departure</h3>
        <p>If a Candidate permanently leaves the Zoot platform due to retirement, illness, voluntary departure, or termination and the Client originally sourced the Candidate through Placements and activated HomeCare+, Zoot may provide one replacement round at no additional Placement Fee, provided HomeCare+ remains active and all HomeCare+ fees are up to date.</p>
      </Section>

      <Section n="8" title="Employment compliance (UIF, COIDA & labour law)">
        <h3 className="font-display font-bold text-foreground mt-4">8.1 Full transfer of employer responsibility</h3>
        <p>Upon confirmation of a Private Placement and payment of the Placement Fee, the Client becomes the sole legal employer of the Candidate. All statutory, tax, and labour law obligations transfer immediately to the Client. Zoot ceases all responsibility for compliance, administration, or oversight.</p>
        <h3 className="font-display font-bold text-foreground mt-4">8.2 Mandatory UIF registration</h3>
        <p>The Client must register as an employer with the UIF, obtain a valid UIF reference number, register the Candidate, and submit monthly declarations and contributions. Failure may result in financial penalties, interest on arrears, and legal enforcement by the Department of Labour.</p>
        <h3 className="font-display font-bold text-foreground mt-4">8.3 COIDA registration</h3>
        <p>Where applicable, the Client is responsible for registering with the Compensation Fund (COIDA), submitting documentation, paying annual assessment fees, and maintaining compliance for workplace injury cover.</p>
        <h3 className="font-display font-bold text-foreground mt-4">8.4 No advisory or intermediary role</h3>
        <p>Zoot does not provide UIF or COIDA registration services, does not act as intermediary with government departments, does not submit declarations or payments on behalf of the Client, and does not verify or audit Client compliance. Any guidance provided by Zoot is general informational guidance only and does not constitute legal, tax, or compliance advice.</p>
        <h3 className="font-display font-bold text-foreground mt-4">8.5 Indemnity for non-compliance</h3>
        <p>The Client agrees to indemnify and hold Zoot harmless from any claims, penalties, or legal action arising from failure to register for UIF or COIDA, failure to make required contributions, misclassification of employment, or breach of labour laws.</p>
      </Section>

      <Section n="9" title="Liability">
        <p>Zoot acts solely as a platform and introduction service. To the fullest extent permitted by law, Zoot disclaims liability for loss, injury, damage, or theft arising from the actions or omissions of any Candidate, including any failure by Zoot to disclose information about a candidate as a result of the candidate's non-disclosure of such information to Zoot. Zoot does not supervise day-to-day services and does not guarantee continuous availability of any Candidate.</p>
      </Section>

      <Section n="10" title="Non-circumvention">
        <p>A Client may not directly engage a Candidate introduced by Zoot outside the platform within 12 months of introduction unless the applicable Placement Fee has been paid. If a Client engages a Candidate privately without payment of the Placement Fee, Zoot reserves the right to charge the applicable Placement Fee and/or suspend access to platform services.</p>
      </Section>

      <Section n="11" title="Cancellation of HomeCare+">
        <p>HomeCare+ may be cancelled at any time by written notice to Support. Cancellation will result in termination of the recurring R99 fee and automatic cancellation of all future HomeCare+ Bookings. Cancellation does not entitle the Client to refund of fees already billed for the current month.</p>
      </Section>

      <Section n="12" title="Booking cancellation fees">
        <p>For on-demand bookings cancelled by the Client after a Zooter has accepted, a cancellation fee applies based on time-to-booking, Zooter distance, and booking status:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>10%</strong> — More than 24 hours before booking and Zooter is more than 5 km away.</li>
          <li><strong>25%</strong> — Less than 24 hours notice or Zooter is within 2–5 km.</li>
          <li><strong>40%</strong> — Zooter is within 2 km and has prepared for the visit.</li>
          <li><strong>50%</strong> — Zooter is en route, has arrived, or is in progress.</li>
        </ul>
        <p>If the Zooter cancels after acceptance, Zoot will make reasonable efforts to source a replacement Zooter. Replacement options remain subject to availability.</p>
      </Section>

      <Section n="13" title="Placement replacement policy">
        <p>For Private Placements only, Zoot may offer one replacement round within 90 days of the Candidate's start date, subject to written request within 7 days of departure, confirmation of last working day, and one replacement round consisting of up to 5 interviews. Initiation Fees and Placement Fees remain non-refundable.</p>
      </Section>

      <Section n="14" title="Indemnity">
        <p>The Client agrees to indemnify and hold harmless Zoot, its directors, employees, and agents from any claims arising from off-platform employment relationships, failure to comply with labour or tax laws, or disputes with Candidates.</p>
      </Section>

      <Section n="15" title="Acceptance">
        <p>By submitting an application, paying any applicable fee, or activating HomeCare+, the Client confirms acceptance of these Terms and Conditions.</p>
      </Section>

      <p className="text-xs text-muted-foreground mt-12 pt-8 border-t border-border">
        Last updated: {new Date().toLocaleDateString("en-ZA", { year: "numeric", month: "long", day: "numeric" })}
      </p>
    </main>
    <Footer />
  </div>
);

export default Terms;
