import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CarePlusMark } from "@/components/care-plus/CarePlusMark";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/kit/Logo";
import { toast } from "sonner";

const links = [
  { label: "Services", href: "/#services" },
  { label: "Care+", href: "/care-plus" },
  { label: "Trust", href: "/trust-centre" },
  { label: "Journal", href: "/articles" },
  { label: "How it works", href: "/#how" },
] as const;

const routePrefetchers: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/pages/Index"),
  "/care-plus": () => import("@/pages/care/CarePlus"),
  "/trust-centre": () => import("@/pages/legal/TrustSafety"),
  "/articles": () => import("@/pages/Blog"),
  "/auth": () => import("@/pages/Auth"),
  "/app": () => import("@/pages/app/Book"),
  "/book": () => import("@/pages/WebsiteBooking"),
};

const pathFor = (href: string) => href.split("#")[0] || "/";

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const currentOwner = useRef(user?.id);
  currentOwner.current = user?.id;
  const ctaTo = "/book";

  const handleSignOut = async () => {
    if (signingOut) return;
    const owner = user?.id;
    setSigningOut(true);
    try {
      await signOut();
      if (currentOwner.current && currentOwner.current !== owner) return;
      setOpen(false);
      navigate("/auth?mode=signin", { replace: true });
    } catch {
      if (currentOwner.current === owner) toast.error("Sign out failed. Please try again.");
    } finally { setSigningOut(false); }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const prefetchRoute = (href: string) => {
    void routePrefetchers[pathFor(href)]?.();
  };

  const renderLabel = (label: string) =>
    label === "Care+" ? (
      <span className="inline-flex h-[22px] items-center gap-1 rounded-full bg-care-plus px-[10px] text-[10px] font-extrabold uppercase leading-none tracking-[0.04em] text-care-plus-foreground">
        <CarePlusMark plusClassName="text-care-plus-foreground" />
      </span>
    ) : <span>{label}</span>;

  return (
    <>
      <header
        className="xoot-reference-nav fixed left-[14px] right-[14px] top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 rounded-[26px] border-0 bg-white/90 shadow-[0_10px_35px_rgba(38,29,28,0.10)] backdrop-blur-md transition-shadow duration-300"
        data-scrolled={scrolled ? "true" : "false"}
      >
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-2 px-3 sm:px-5">
          <Link
            to="/"
            aria-label="Xoot home"
            onMouseEnter={() => prefetchRoute("/")}
            className="xoot-wordmark min-w-[60px] shrink-0 text-[2.5rem] leading-none text-[var(--xoot-violet-500)] transition-opacity hover:opacity-80"
          >
            <Logo size={26} tone="violet" />
          </Link>

          <nav className="hidden items-center gap-[2px] rounded-full bg-black/[0.07] p-1 text-[15px] min-[1080px]:flex">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onFocus={() => prefetchRoute(link.href)}
                onMouseEnter={() => prefetchRoute(link.href)}
                className={`xoot-reference-nav-item rounded-full px-[14px] py-[9px] text-[13px] font-semibold transition-colors hover:bg-white/80 hover:text-foreground ${link.label === "Care+" ? "text-care-plus" : "text-foreground/70"}`}
              >
                {renderLabel(link.label)}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-[10px] min-[1080px]:flex">
            {user && <>
              <Button asChild variant="ghost" size="sm" className="h-9 min-h-0 min-w-0 rounded-full font-semibold"><Link to="/app">Your account</Link></Button>
              <Button variant="ghost" size="sm" className="h-9 min-h-0 min-w-0 rounded-full font-semibold" disabled={signingOut} onClick={() => void handleSignOut()}>{signingOut ? "Signing out…" : "Sign out"}</Button>
            </>}
            {!user && (
            <Button asChild variant="ghost" size="sm" className="min-h-0 min-w-0 h-9 rounded-full font-semibold">
                <Link to="/auth?mode=signin" onMouseEnter={() => prefetchRoute("/auth")}>Sign in</Link>
              </Button>
            )}
            <Button asChild size="sm" className="min-h-0 min-w-0 h-9 rounded-full bg-foreground px-[10px] text-background shadow-md hover:bg-foreground/90">
              <Link to={ctaTo} onMouseEnter={() => prefetchRoute(ctaTo)}>
                Book now <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="flex items-center gap-2 min-[1080px]:hidden">
            <button
              type="button"
              className="grid h-10 w-10 place-items-center rounded-full bg-black/[0.07] text-foreground transition-colors hover:bg-black/[0.12]"
              onClick={() => setOpen((value) => !value)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="xoot-mobile-menu"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Button
              asChild
              size="sm"
              className="h-10 rounded-full bg-foreground px-4 text-background shadow-md hover:bg-foreground/90"
            >
              <Link to={ctaTo} aria-label="Book now" onClick={() => setOpen(false)}>Book now <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </div>

        {open && (
          <div id="xoot-mobile-menu" className="border-t border-black/10 px-3 pb-3 pt-2 min-[1080px]:hidden">
            <div className="grid gap-2 sm:grid-cols-2">
              {links.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onFocus={() => prefetchRoute(link.href)}
                  onMouseEnter={() => prefetchRoute(link.href)}
                  onClick={() => setOpen(false)}
                  className="rounded-2xl bg-black/[0.04] px-4 py-3 text-sm font-semibold text-foreground/80 hover:bg-black/[0.08]"
                >
                  {renderLabel(link.label)}
                </a>
              ))}
              {!user && (
                <Link to="/auth?mode=signin" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground/80 hover:bg-black/[0.04]">
                  Sign in
                </Link>
              )}
              {user && <>
                <Link to="/app" onClick={() => setOpen(false)} className="rounded-2xl px-4 py-3 text-sm font-semibold text-foreground/80 hover:bg-black/[0.04]">Your account</Link>
                <button type="button" className="rounded-2xl px-4 py-3 text-left text-sm font-semibold text-foreground/80 hover:bg-black/[0.04]" disabled={signingOut} onClick={() => void handleSignOut()}>{signingOut ? "Signing out…" : "Sign out"}</button>
              </>}
            </div>
          </div>
        )}
      </header>
      <div aria-hidden="true" className="h-[calc(5.5rem+env(safe-area-inset-top))]" />
    </>
  );
};
