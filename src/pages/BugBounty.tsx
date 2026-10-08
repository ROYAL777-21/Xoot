import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, FileText, KeyRound, ListChecks, MessageCircle, ShieldCheck, UserRound, Wallet, X } from "lucide-react";
import { SEO } from "@/components/SEO";
import { Logo } from "@/components/kit/Logo";
import { TextFlippingBoard } from "@/components/kit/TextFlippingBoard";
import { Footer } from "@/components/xoot/Footer";
import "@/styles/security-handoff.css";

const tiers = [
  ["Critical", "careplus", "Account takeover, payment manipulation, bulk private-data exposure, or access to a customer's home access codes."],
  ["High", "honey", "Authentication bypass, access to another person's bookings or messages, or privilege escalation."],
  ["Medium", "mist", "Cross-site scripting, state-changing request forgery, or a reproducible business-logic flaw."],
  ["Low", "sage", "Information disclosure, missing protections or rate-limit gaps with a demonstrated impact."],
] as const;
const rules = [
  [UserRound, "Use your own accounts", "Only use accounts and data you own or have explicit permission to test. Ask before testing a restricted role."],
  [ShieldCheck, "Stop at proof", "Stop when the issue is demonstrated. Do not access, change, download or retain another person's information."],
  [KeyRound, "Protect people's homes", "Do not use exposed addresses, access codes or contact information. Describe the exposure without including private values."],
  [MessageCircle, "Keep the report private", "Use a private support case and coordinate the next steps with Xoot before sharing details publicly."],
] as const;
const steps = [
  ["Submit", "Save a private support case with enough detail to reproduce the issue."],
  ["Review", "A human must assess the report, its scope and its practical impact."],
  ["Resolve", "Track the fix and verify whether it closes the reported issue."],
  ["Coordinate", "Agree on disclosure and any acknowledgement after the issue is resolved."],
] as const;
const reportItems = [
  "The URL or feature and the account role involved",
  "Numbered steps using your own test data",
  "Expected behaviour and what actually happened",
  "A small, redacted demonstration",
  "Your assessment of the impact",
];
const links = [
  ["safe-harbour", "Policy", ShieldCheck], ["rewards", "Rewards", Wallet], ["scope", "Scope", ListChecks],
  ["rules", "Rules", KeyRound], ["timeline", "Process", Clock], ["report", "Report", MessageCircle],
] as const;
function Section({id, alt = false, children}: {id?: string; alt?: boolean; children: ReactNode}) {
  return <section id={id} className={`xoot-public-section ${alt ? "xoot-public-section--alt" : ""}`}><div className="xoot-public-inner">{children}</div></section>;
}
function Head({eyebrow, title, children}: {eyebrow: string; title: string; children: ReactNode}) {
  return <div className="xoot-section-head" style={{maxWidth:640}}><p className="xoot-section-eyebrow">{eyebrow}</p><h2 className="xoot-section-title">{title}</h2><p className="xoot-section-sub">{children}</p></div>;
}

/** BugBounty.jsx composition; programme commitments and example credits are not live facts. */
export default function BugBounty() {
  return <div className="xoot-security">
    <SEO title="Xoot security reports and bug bounty" description="How to report a security concern to Xoot, protect private information and check the status of the bug bounty programme." canonical="/bug-bounty" />
    <div className="xoot-security-back"><Link to="/"><ArrowLeft size={16} /><Logo size={24} tone="violet" /><span>Back to Xoot</span></Link></div>
    <main>
      <Section><div className="xoot-security-hero">
        <span className="xoot-security-badge"><ShieldCheck size={14} /> Security at Xoot</span>
        <div role="img" aria-label="Report a bug. Protect a home." style={{width:"100%"}}><div aria-hidden="true"><TextFlippingBoard text={"REPORT A BUG\nPROTECT A HOME"} duration={2.4} /></div></div>
        <h1>Bug Bounty Program</h1>
        <p>Xoot handles private home and booking information. If you notice a security problem, share it privately with the support team and help protect the people who use Xoot.</p>
        <div className="xoot-security-facts">{[["Private", "reports through support"], ["Pending", "paid programme approval"], ["Human", "review required"]].map(([value,label]) => <span key={label}><strong>{value}</strong><small>{label}</small></span>)}</div>
      </div></Section>
      <Section id="safe-harbour" alt><div className="xoot-card xoot-card--pad xoot-security-policy"><ShieldCheck size={28} /><div><h2>Safe harbour</h2><p>The public research policy and safe-harbour commitment are awaiting business and legal approval. This page does not grant permission to test systems or promise legal protection. Contact Xoot to agree a testing scope first.</p><small>You can report a problem you have encountered through a private support case. Do not include other people's data or access codes.</small></div></div></Section>
      <Section id="rewards"><Head eyebrow="Programme status" title="Reports assessed on real impact.">Paid rewards, response times and researcher acknowledgements require an approved operating programme.</Head>
        <div className="xoot-card xoot-card--pad xoot-card--flat xoot-security-note"><Wallet size={20} /><p>Paid bounty rewards are not active yet. No payment amount or response deadline is promised. The categories below describe technical impact, not a reward offer.</p></div>
        <div className="xoot-security-tiers">{tiers.map(([name,tint,detail]) => <article className="xoot-card xoot-card--pad" key={name}><span className="xoot-security-tier" style={{background:`var(--xoot-${tint}-wash)`,color:`var(--xoot-${tint}-ink)`}}>{name}</span><h3>Impact assessment</h3><p>{detail}</p><small><Clock size={13} /> Reward programme pending</small></article>)}</div>
      </Section>
      <Section id="scope" alt><Head eyebrow="Scope" title="Agree the scope before testing.">Report observed issues in Xoot's own website and app. Third-party services need their owners' permission.</Head>
        <div className="xoot-security-scope">{([
          ["Discuss with Xoot", ["The Xoot website", "Xoot customer and Xooter journeys", "Xoot-owned application endpoints"], CheckCircle2],
          ["Do not perform", ["Denial of service or disruptive load", "Social engineering of staff, Xooters or customers", "Access to other people's data", "Testing third-party payment or identity services without permission"], X],
        ] as const).map(([title,items,Icon]) => <article className="xoot-card xoot-card--pad" key={title}><h3>{title}</h3><ul>{items.map(item => <li key={item}><Icon size={16} /><span>{item}</span></li>)}</ul></article>)}</div>
      </Section>
      <Section id="rules"><Head eyebrow="Rules of engagement" title="Protect people's homes and information.">Keep any demonstration small, private and limited to authorised test data.</Head><div className="xoot-security-rules">{rules.map(([Icon,title,body]) => <article className="xoot-card xoot-card--pad" key={title}><span><Icon size={19} /></span><h3>{title}</h3><p>{body}</p></article>)}</div></Section>
      <Section id="timeline" alt><Head eyebrow="What happens next" title="Keep the report and the response together.">Support cases retain the report. Response deadlines will be published when the programme is staffed and approved.</Head><div className="xoot-card xoot-security-timeline">{steps.map(([step,detail],index) => <div key={step}><div><b>{index + 1}</b><strong>{step}</strong></div><p>{detail}</p></div>)}</div></Section>
      <Section id="credits"><Head eyebrow="Hall of fame" title="People who found something.">Acknowledgements belong here only after a verified report and the researcher's permission.</Head><div className="xoot-card xoot-card--pad xoot-security-empty"><FileText size={24} /><p>No researcher acknowledgements have been published.</p></div></Section>
      <Section id="report" alt><div className="xoot-security-report">
        <div className="xoot-card xoot-card--pad xoot-security-report-dark"><h2>How to report</h2><p>Open a private support case with a brief description and redacted steps to reproduce. Sign-in is required for the current support queue.</p><div><strong>Programme setup</strong><small>A dedicated security mailbox, encryption key and paid reward process still need activation. Do not send sensitive evidence until a secure channel is agreed.</small></div><Link to="/app/support?kind=security" className="xoot-action xoot-action--lg xoot-action--cream"><MessageCircle size={20} /> Open security support</Link></div>
        <div className="xoot-card xoot-card--pad"><h3>What makes a useful report</h3><ul>{reportItems.map(item => <li key={item}><CheckCircle2 size={16} /><span>{item}</span></li>)}</ul><p className="xoot-security-report-note">Security reports from this page are saved for support without forwarding their content to the automated support assistant.</p></div>
      </div></Section>
    </main><Footer />
    <nav className="xoot-security-dock" aria-label="Security page sections">{links.map(([id,title,Icon]) => <a key={id} href={`#${id}`} aria-label={title}><Icon size={19} /><span>{title}</span></a>)}</nav>
  </div>;
}
