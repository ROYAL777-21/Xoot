import type { ReactNode } from "react";
import { NavLink, Link } from "react-router-dom";
import { AlertCircle, FileText, Heart, LockKeyhole, ShieldCheck, Cookie, CreditCard, UserRound, MessageSquare, Mail, Trash2, Search } from "lucide-react";
import { Logo } from "@/components/kit/Logo";
import { SEO } from "@/components/SEO";
import "@/styles/legal-handoff.css";

const documents = [
  ["/legal/terms", "Terms & conditions", FileText],
  ["/legal/privacy", "Privacy policy", LockKeyhole],
  ["/legal/popia", "POPIA", ShieldCheck],
  ["/legal/cookies", "Cookie policy", Cookie],
  ["/legal/refunds-cancellations", "Refunds & cancellations", CreditCard],
  ["/legal/care-plus-terms", "Care+ membership", Heart],
  ["/legal/xooter-terms", "Xooter terms", UserRound],
  ["/legal/acceptable-use", "Acceptable use", FileText],
  ["/legal/ai-concierge", "AI Concierge", MessageSquare],
  ["/legal/account-deletion", "Account deletion", Trash2],
  ["/legal/trust-safety", "Trust & safety", ShieldCheck],
] as const;

type LegalLayoutProps = {
  title: string;
  description: string;
  canonical: string;
  eyebrow: string;
  /** Date of the document text, independent of presentation changes. */
  lastUpdated: string;
  children: ReactNode;
};

/** Reading layout from Xoot Legal.dc.html; repository text stays in each document. */
export function LegalLayout({ title, description, canonical, eyebrow, lastUpdated, children }: LegalLayoutProps) {
  return <div className="xoot-legal">
    <SEO title={title} description={description} canonical={canonical} />
    <header className="xoot-legal-header"><div className="xoot-legal-header-inner">
      <div className="xoot-legal-top"><Link to="/" className="xoot-legal-back"><Logo size={24} tone="inverse" /><span>← Back to Xoot</span></Link><span className="xoot-legal-mono">Legal centre</span></div>
      <div className="xoot-legal-intro"><h1>The rules, in plain language.</h1><p>Documents covering how Xoot works, what we do with your information, and what happens when something goes wrong. Written to be read, not to be survived.</p></div>
      <div className="xoot-legal-draft" role="note"><AlertCircle size={19} /><p><strong>Draft — pending legal review.</strong> These operational launch documents still require confirmed business details and South African legal review before public launch.</p></div>
    </div></header>
    <main className="xoot-legal-main">
      <nav className="xoot-legal-nav" aria-label="Legal documents"><span>{documents.length} documents</span>
        {documents.map(([href, name, Icon]) => <NavLink to={href} key={href} className={({ isActive }) => isActive ? "is-active" : undefined}><Icon size={16} strokeWidth={1.9} /><span>{name}</span></NavLink>)}
        <Link to="/bug-bounty" className="xoot-legal-security-link"><Search size={16} />Bug bounty programme</Link>
      </nav>
      <article className="xoot-legal-article">
        <div className="xoot-legal-document-head"><span>{eyebrow}</span><h2>{title.replace(/^Xoot /, "")}</h2><p>{description}</p><small>Last updated: {lastUpdated} · Operational draft</small></div>
        {children}
        <aside className="xoot-legal-questions"><h3>Questions about this document?</h3><p>Contact Xoot support with the document name and your question. For a request about your own information, choose privacy or account deletion so it reaches the appropriate queue.</p><Link to="/app/support"><Mail size={16} /> Contact support</Link></aside>
      </article>
    </main>
    <footer className="xoot-legal-footer"><span>© {new Date().getFullYear()} Xoot</span><Link to="/">Back to Xoot</Link><Link to="/legal/privacy">Privacy</Link></footer>
  </div>;
}

export const LegalSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className="xoot-legal-clause"><h3>{title}</h3><div>{children}</div></section>
);
export const LegalList = ({ children }: { children: ReactNode }) => <ul className="xoot-legal-list">{children}</ul>;
