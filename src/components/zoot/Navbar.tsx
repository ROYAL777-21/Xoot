import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { CarePlusMark } from "@/components/care-plus/CarePlusMark";

const links = [
  { label: "Services", href: "/#services" },
  { label: "Care+", href: "/care-plus" },
  { label: "Trust", href: "/trust-centre" },
  { label: "Blog", href: "/blog" },
  { label: "How it works", href: "/#how" },
  { label: "Become a Zooter", href: "/zooter/apply" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const ctaTo = user ? "/app" : "/auth";
  const ctaLabel = user ? "Open app" : "Get started";
  const renderLabel = (label: string) => (label === "Care+" ? <CarePlusMark /> : label);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
    <header
      className="liquid-glass-nav fixed inset-x-0 top-0 z-50 w-full border-b border-border/70 pt-[env(safe-area-inset-top)] transition-[box-shadow,border-color] duration-300"
      data-scrolled={scrolled ? "true" : "false"}
    >
      <div className="liquid-glass-content container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex min-w-0 items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm shadow-warm transition-transform group-hover:scale-105">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            zoot
          </span>
        </Link>

        <nav className="hidden xl:flex items-center gap-5 2xl:gap-8">
          {links.map((l) => (
            <a
              key={`${l.href}-${l.label}`}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {renderLabel(l.label)}
            </a>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-3">
          {!user && <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>}
          <Button asChild size="sm" className="rounded-full px-5"><Link to={ctaTo}>{ctaLabel}</Link></Button>
        </div>

        <button
          className="xl:hidden tap-target rounded-2xl p-2 transition-smooth hover:bg-background/70"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="liquid-glass-content xl:hidden border-t border-border/60 animate-fade-in">
          <div className="container grid max-h-[calc(100vh-4rem-env(safe-area-inset-top))] gap-2 overflow-y-auto py-4 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((l) => (
              <a
                key={`${l.href}-${l.label}`}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-transparent bg-background/30 px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:bg-background/72 hover:text-foreground"
              >
                {renderLabel(l.label)}
              </a>
            ))}
            <div className="flex gap-2 pt-2 sm:col-span-2 lg:col-span-3">
              {!user && <Button asChild variant="ghost" className="flex-1"><Link to="/auth">Sign in</Link></Button>}
              <Button asChild className="flex-1 rounded-full"><Link to={ctaTo}>{ctaLabel}</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
    <div aria-hidden="true" className="h-[calc(4rem+env(safe-area-inset-top))]" />
    </>
  );
};
