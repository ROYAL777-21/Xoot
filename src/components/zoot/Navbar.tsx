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
  { label: "Blog", href: "/articles" },
  { label: "How it works", href: "/#how" },
  { label: "Become a Zooter", href: "/zooter/apply" },
];

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Index"),
  "/care-plus": () => import("@/pages/care/CarePlus"),
  "/trust-centre": () => import("@/pages/legal/TrustSafety"),
  "/articles": () => import("@/pages/Blog"),
  "/zooter/apply": () => import("@/pages/zooter/Apply"),
  "/auth": () => import("@/pages/Auth"),
  "/app": () => import("@/pages/app/Book"),
};

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user } = useAuth();
  const ctaTo = user ? "/app" : "/auth";
  const ctaLabel = user ? "Open app" : "Get started";
  const renderLabel = (label: string) => (label === "Care+" ? <CarePlusMark /> : <span>{label}</span>);
  const prefetchRoute = (href: string) => {
    const [path] = href.split("#");
    if (!path) return;
    void routePrefetchers[path]?.();
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <>
    <header
      className="liquid-glass-nav zoot-top-nav fixed left-3 right-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 rounded-[1.6rem] border border-border/60 transition-[box-shadow,border-color,transform] duration-300 sm:left-4 sm:right-4"
      data-scrolled={scrolled ? "true" : "false"}
    >
      <div className="liquid-glass-content mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-2 group">
          <span className="grid h-9 w-9 place-items-center rounded-[1rem] gradient-warm shadow-warm transition-transform group-hover:scale-105">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            Zoot
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/20 bg-background/12 p-1 transition-[transform,box-shadow] duration-300 xl:flex">
          {links.map((l) => (
            <a
              key={`${l.href}-${l.label}`}
              href={l.href}
              onFocus={() => prefetchRoute(l.href)}
              onMouseEnter={() => prefetchRoute(l.href)}
              onTouchStart={() => prefetchRoute(l.href)}
              className="zoot-liquid-nav-item liquid-glass-interactive interactive-press rounded-full px-3 py-2 text-sm font-semibold text-foreground/76 transition-colors hover:text-foreground 2xl:px-4"
            >
              {renderLabel(l.label)}
            </a>
          ))}
        </nav>

        <div className="hidden xl:flex items-center gap-3">
          {!user && <Button asChild variant="ghost" size="sm" className="rounded-full"><Link to="/auth">Sign in</Link></Button>}
          <Button asChild size="sm" className="interactive-press rounded-full px-5 shadow-card"><Link to={ctaTo} onFocus={() => prefetchRoute(ctaTo)} onMouseEnter={() => prefetchRoute(ctaTo)}>{ctaLabel}</Link></Button>
        </div>

        <button
          className="liquid-glass-interactive xl:hidden tap-target rounded-2xl p-2 transition-smooth hover:bg-background/70"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
          aria-expanded={open}
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {open && (
        <div className="liquid-glass-content animate-fade-in border-t border-border/60 xl:hidden">
          <div className="grid max-h-[calc(100vh-6rem-env(safe-area-inset-top))] gap-2 overflow-y-auto px-3 py-4 sm:grid-cols-2 lg:grid-cols-3">
            {links.map((l) => (
              <a
                key={`${l.href}-${l.label}`}
                href={l.href}
                onFocus={() => prefetchRoute(l.href)}
                onMouseEnter={() => prefetchRoute(l.href)}
                onTouchStart={() => prefetchRoute(l.href)}
                onClick={() => setOpen(false)}
                className="zoot-liquid-nav-item liquid-glass-interactive interactive-press rounded-2xl bg-background/18 px-3 py-3 text-sm font-semibold text-foreground/78 transition-colors hover:border-border hover:bg-background/72 hover:text-foreground"
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
    <div aria-hidden="true" className="h-[calc(5.75rem+env(safe-area-inset-top))]" />
    </>
  );
};
