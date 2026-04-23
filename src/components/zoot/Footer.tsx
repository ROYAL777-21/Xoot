const cols: { title: string; links: { label: string; href: string }[] }[] = [
  { title: "Services", links: [
    { label: "House cleaning", href: "/app" },
    { label: "Office cleaning", href: "/app" },
    { label: "Move-out cleaning", href: "/app" },
    { label: "Care+ subscription", href: "/care-plus" },
    { label: "Find full-time help", href: "/care-plus" },
  ]},
  { title: "Company", links: [
    { label: "How it works", href: "/#how" },
    { label: "Safety & trust", href: "/legal/trust-safety" },
    { label: "MyHome Hub", href: "/#myhome-hub" },
    { label: "Contact", href: "/app/support" },
  ]},
  { title: "For Zooters", links: [
    { label: "Become a Zooter", href: "/zooter/apply" },
    { label: "Zooter app", href: "/zooter" },
    { label: "Training", href: "/zooter/training" },
    { label: "Insurance", href: "/app/insurance" },
  ]},
  { title: "Legal", links: [
    { label: "Terms & Conditions", href: "/legal/terms" },
    { label: "Privacy", href: "/legal/privacy" },
    { label: "Trust & safety", href: "/legal/trust-safety" },
  ]},
];

export const Footer = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="container py-16">
        <div className="grid lg:grid-cols-5 gap-10 mb-12">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm">
                <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
              </span>
              <span className="font-display text-2xl font-bold">zoot</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              Trusted help for every home. Cleaners, gardeners and more — on demand.
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="font-display font-semibold mb-4">{c.title}</h4>
              <ul className="space-y-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between gap-4 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Zoot, Inc. All rights reserved.</p>
          <p>Made with care for every home.</p>
        </div>
      </div>
    </footer>
  );
};
