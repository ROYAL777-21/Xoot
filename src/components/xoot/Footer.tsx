import { Logo } from "@/components/kit/Logo";
import "@/styles/homepage-sections.css";

type FooterLink = { label: string; href?: string };

const columns: { title: string; links: FooterLink[] }[] = [
  { title: "Cleaning services", links: [
    { label: "Regular cleaning", href: "/book?service=residential" }, { label: "Airbnb turnovers", href: "/book?service=airbnb" },
    { label: "Office cleaning", href: "/book?service=office" }, { label: "Express cleaning", href: "/book?service=express" },
    { label: "Moving cleans", href: "/book?service=moving" }, { label: "Laundry & ironing" },
  ] },
  { title: "Membership & accounts", links: [
    { label: "Care+ membership", href: "/care-plus" }, { label: "Full-time help" },
    { label: "Pricing", href: "/book" }, { label: "Gift a clean", href: "/app/gifts" }, { label: "Refer & earn", href: "/#refer" },
  ] },
  { title: "Join Xoot", links: [
    { label: "Become a Xooter", href: "/xooter/apply" }, { label: "Xooter dashboard", href: "/xooter" },
    { label: "Training", href: "/xooter/training" }, { label: "Trust policy", href: "/trust-centre" },
  ] },
  { title: "Guides & support", links: [
    { label: "Journal", href: "/articles" }, { label: "Contact support", href: "/app/support" }, { label: "Bug bounty programme", href: "/bug-bounty" },
  ] },
  { title: "Legal", links: [
    { label: "Terms & Conditions", href: "/legal/terms" }, { label: "Privacy", href: "/legal/privacy" },
    { label: "POPIA", href: "/legal/popia" }, { label: "Cookies", href: "/legal/cookies" },
    { label: "Refunds & cancellations", href: "/legal/refunds-cancellations" }, { label: "Care+ terms", href: "/legal/care-plus-terms" },
    { label: "Xooter terms", href: "/legal/xooter-terms" }, { label: "Acceptable use", href: "/legal/acceptable-use" },
    { label: "AI Concierge", href: "/legal/ai-concierge" }, { label: "Account deletion", href: "/legal/account-deletion" },
    { label: "Trust & safety", href: "/legal/trust-safety" }, { label: "XootCover terms" },
  ] },
];

export function Footer() {
  return (
    <footer className="xoot-site-footer">
      <div className="xoot-site-footer__inner">
        <div className="xoot-site-footer__grid">
          <div className="xoot-site-footer__brand">
            <div className="xoot-site-footer__lockup"><Logo variant="icon" size={34} tone="violet" /><Logo size={26} tone="ink" /></div>
            <p>Premium home, office and Airbnb cleaning in Xoot launch suburbs with vetting, training and trust workflows.</p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h4>{column.title}</h4>
              <ul>{column.links.map((link) => <li key={link.label}>{link.href ? <a href={link.href}>{link.label}</a> : <span className="xoot-site-footer__soon">{link.label} · soon</span>}</li>)}</ul>
            </div>
          ))}
        </div>
        <div className="xoot-site-footer__bottom"><p>© {new Date().getFullYear()} Xoot. All rights reserved.</p><p>Made with care, for every home.</p></div>
      </div>
    </footer>
  );
}
