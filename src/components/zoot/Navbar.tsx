import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { label: "Services", href: "#services" },
  { label: "Zooters", href: "#workers" },
  { label: "How it works", href: "#how" },
  { label: "Become a Zooter", href: "#pro" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const ctaTo = user ? "/app" : "/auth";
  const ctaLabel = user ? "Open app" : "Get started";
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm shadow-warm transition-transform group-hover:scale-105">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            zoot
          </span>
        </a>

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {!user && <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>}
          <Button asChild size="sm" className="rounded-full px-5"><Link to={ctaTo}>{ctaLabel}</Link></Button>
        </div>

        <button
          className="md:hidden p-2 rounded-md hover:bg-muted"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-border/60 bg-background animate-fade-in">
          <div className="container py-4 flex flex-col gap-2">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-medium text-muted-foreground"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              {!user && <Button asChild variant="ghost" className="flex-1"><Link to="/auth">Sign in</Link></Button>}
              <Button asChild className="flex-1 rounded-full"><Link to={ctaTo}>{ctaLabel}</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
