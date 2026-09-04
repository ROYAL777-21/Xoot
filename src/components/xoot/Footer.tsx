import { Logo } from "@/components/kit/Logo";
const cols: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Cleaning services",
    links: [
      { label: "Residential cleaning", href: "/app" },
      { label: "Airbnb turnovers", href: "/app" },
      { label: "Office cleaning", href: "/app" },
      { label: "Deep clean", href: "/app" },
    ],
  },
  {
    title: "Membership & accounts",
    links: [
      { label: "Care+ membership", href: "/care-plus" },
      { label: "Find full-time help", href: "/care-plus" },
      { label: "Pricing", href: "/care-plus" },
    ],
  },
  {
    title: "Join Xoot",
    links: [
      { label: "Become a Xooter", href: "/xooter/apply" },
      { label: "Xooter dashboard", href: "/xooter" },
      { label: "Training", href: "/xooter/training" },
      { label: "Trust policy", href: "/trust-centre" },
    ],
  },
  {
    title: "Guides & support",
    links: [
      { label: "Blogs", href: "/articles" },
      { label: "Contact support", href: "/app/support" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms & Conditions", href: "/legal/terms" },
      { label: "Privacy", href: "/legal/privacy" },
      { label: "POPIA", href: "/legal/popia" },
      { label: "Cookies", href: "/legal/cookies" },
      { label: "Refunds & cancellations", href: "/legal/refunds-cancellations" },
      { label: "Care+ terms", href: "/legal/care-plus-terms" },
      { label: "Xooter terms", href: "/legal/xooter-terms" },
      { label: "Acceptable use", href: "/legal/acceptable-use" },
      { label: "AI Concierge", href: "/legal/ai-concierge" },
      { label: "Account deletion", href: "/legal/account-deletion" },
      { label: "Trust & safety", href: "/legal/trust-safety" },
      { label: "Install app", href: "/install" },
    ],
  },
];

export const Footer = () => (
  <footer className="border-t border-border bg-background">
    <div className="container py-16">
      <div className="mb-12 grid gap-10 lg:grid-cols-6">
        <div className="lg:col-span-1">
          <div className="mb-4 flex items-center gap-2">
            <Logo size={36} title="" className="rounded-xl" />
            <span className="font-display text-2xl font-bold">Xoot</span>
          </div>
          <p className="max-w-xs text-sm text-muted-foreground">
            Premium home, office and Airbnb cleaning in Xoot launch suburbs with vetting, training and trust workflows.
          </p>
        </div>
        {cols.map((column) => (
          <div key={column.title}>
            <h4 className="mb-4 font-display font-semibold">{column.title}</h4>
            <ul className="space-y-2.5">
              {column.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-col justify-between gap-4 border-t border-border pt-8 text-xs text-muted-foreground md:flex-row">
        {/*
          The © symbol was missing here, which is the one thing a copyright line exists to carry.
          South African copyright subsists automatically under the Copyright Act 98 of 1978 whether
          or not it is marked — but the mark is what puts a copier on notice, and an unmarked work
          lets an infringer argue innocent infringement in mitigation of damages.

          Says "Xoot", not "Xoot (Pty) Ltd". The registered entity name is not recorded anywhere in
          this repository, and naming a company form that may not exist would be a false statement
          about the company on every page. docs/legal/intellectual-property.md asks the founder for
          it; the moment it is known this line takes it.
        */}
        <p>© {new Date().getFullYear()} Xoot. All rights reserved.</p>
        <p>Made with care, for every home.</p>
      </div>
    </div>
  </footer>
);
