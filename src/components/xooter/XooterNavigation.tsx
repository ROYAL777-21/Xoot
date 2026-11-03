import { ReactNode, useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Bell, CircleUserRound, LogOut, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/kit/Logo";
import { HandoffFlowerField } from "@/components/xoot/HeroArtwork";
import { haptic } from "@/lib/haptics";
import "@/styles/xooter-navigation-handoff.css";

export type XooterNavigationItem = { to: string; label: string; icon: LucideIcon; end?: boolean };
type Props = {
  items: readonly XooterNavigationItem[];
  email?: string;
  signingOut: boolean;
  onSignOut: () => void;
  children: ReactNode;
};

/** Frame.jsx/TabBar.jsx geometry, adapted to the worker's existing destinations. */
export const XooterNavigation = ({ items, email, signingOut, onSignOut, children }: Props) => {
  const { pathname } = useLocation();
  const account = useRef<HTMLDetailsElement>(null);
  const mobileWork = items.filter(item => ["/xooter", "/xooter/jobs", "/xooter/training", "/xooter/earnings"].includes(item.to));
  const accountItems = items.filter(item => !mobileWork.includes(item));
  const accountSelected = accountItems.some(item => pathname === item.to || pathname.startsWith(`${item.to}/`));
  const updates = items.find(item => item.to === "/xooter/updates");
  const closeAccount = () => { if (account.current) account.current.open = false; };

  useEffect(closeAccount, [pathname]);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (account.current?.open && event.target instanceof Node && !account.current.contains(event.target)) account.current.open = false;
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && account.current?.open) {
        account.current.open = false;
        account.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, []);

  const signOutButton = <button type="button" className="xoot-worker-sign-out" disabled={signingOut} onClick={onSignOut}>
    <LogOut size={18} aria-hidden="true" /><span>{signingOut ? "Signing out…" : "Sign out"}</span>
  </button>;

  return <div className="xoot-worker-shell">
    <aside className="xoot-worker-sidebar">
      <div className="xoot-worker-brand">
        <NavLink to="/" aria-label="Xoot home"><Logo size={32} /></NavLink>
        <span>For Xooters</span>
        <HandoffFlowerField className="xoot-worker-brand-flower" items={[{ size: 64, palette: "lilac", left: "0", top: "0", opacity: .65 }]} />
      </div>
      <p className="xoot-worker-section-label">Your workspace</p>
      <nav className="xoot-worker-sidebar-links" aria-label="Xooter workspace">
        {items.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => haptic("selection")}
          className={({ isActive }) => `xoot-worker-side-link${isActive ? " is-active" : ""}`}>
          <span className="xoot-worker-side-icon"><Icon size={20} strokeWidth={2.1} aria-hidden="true" /></span><span>{label}</span>
        </NavLink>)}
      </nav>
      <div className="xoot-worker-sidebar-account">
        {email && <p className="xoot-worker-account-email">{email}</p>}
        {signOutButton}
      </div>
    </aside>

    <div className="xoot-worker-content">
      <header className="xoot-worker-mobile-header">
        <NavLink to="/" aria-label="Xoot home"><Logo size={28} /></NavLink>
        <span>For Xooters</span>
        {updates && <NavLink to={updates.to} className="xoot-worker-updates" aria-label="Your updates"><Bell size={20} aria-hidden="true" /></NavLink>}
      </header>
      <main className="xoot-worker-main">{children}</main>
    </div>

    <div className="xoot-worker-tab-dock">
      <nav className="xoot-worker-tabs" aria-label="Xooter tabs">
        {mobileWork.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => { closeAccount(); haptic("selection"); }}
          className={({ isActive }) => `xoot-worker-tab${isActive ? " is-active" : ""}`}>
          <Icon size={21} strokeWidth={2.1} aria-hidden="true" /><span>{to === "/xooter" ? "Home" : label}</span>
        </NavLink>)}
        <details className="xoot-worker-account-disclosure" ref={account}>
          <summary className={`xoot-worker-tab${accountSelected ? " is-active" : ""}`} aria-current={accountSelected ? "page" : undefined}>
            <CircleUserRound size={21} strokeWidth={2.1} aria-hidden="true" /><span>You</span>
          </summary>
          <div className="xoot-worker-account-panel">
            <h2>Your workspace</h2>
            {email && <p className="xoot-worker-account-email">{email}</p>}
            <nav aria-label="Your Xooter account">
              {accountItems.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={closeAccount}
                className={({ isActive }) => `xoot-worker-side-link${isActive ? " is-active" : ""}`}>
                <span className="xoot-worker-side-icon"><Icon size={20} aria-hidden="true" /></span><span>{label}</span>
              </NavLink>)}
              {signOutButton}
            </nav>
          </div>
        </details>
      </nav>
    </div>
  </div>;
};
