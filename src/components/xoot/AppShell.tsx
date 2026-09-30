import { ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, CircleUserRound, House, ListChecks, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";
import "@/styles/today-handoff.css";

const tabs = [
  { to: "/app", label: "Home", icon: House, end: true },
  { to: "/app/bookings", label: "Visits", icon: ListChecks },
  { to: "/app/loyalty", label: "Rewards", icon: Trophy },
  { to: "/app/profile", label: "You", icon: CircleUserRound },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const showTabs = ["/app", "/app/bookings", "/app/loyalty", "/app/profile"].includes(pathname);
  const hasOwnBack = pathname === "/app/book" || pathname.startsWith("/app/bookings/");

  const accountNav = pathname === "/app/profile" && <nav className="xoot-app-account-links" aria-label="Account destinations">
    <NavLink to="/app/properties">Properties</NavLink><NavLink to="/app/favorites">My Xooters</NavLink>
    <NavLink to="/app/plans">Care+</NavLink><NavLink to="/app/gifts">Gift Clean</NavLink>
    <NavLink to="/app/insurance">Trust policy</NavLink><NavLink to="/app/support">Support</NavLink>
    <button type="button" onClick={async () => { await signOut(); navigate("/"); }}>Sign out</button>
  </nav>;

  return <div className="xoot-app-shell">
    <main className={showTabs ? "xoot-app-main has-tabs" : "xoot-app-main"}>
      {!showTabs && !hasOwnBack && <nav className="xoot-app-back" aria-label="Page navigation"><NavLink to="/app"><ArrowLeft size={20} aria-hidden="true" />Home</NavLink></nav>}
      {children}{accountNav}
    </main>
    {showTabs && <div className="xoot-app-tab-dock">
      <nav className="xoot-app-tabs" aria-label="Main navigation">
        {tabs.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} onClick={() => haptic("selection")}
          className={({ isActive }) => `xoot-app-tab${isActive ? " is-active" : ""}`} aria-label={label}>
          <Icon size={21} strokeWidth={2.15} aria-hidden="true" /><span>{label}</span>
        </NavLink>)}
      </nav>
      <NavLink to="/app/book" className="xoot-app-book" onClick={() => haptic("selection")} aria-label="Book a visit">
        <Calendar size={22} strokeWidth={2.2} aria-hidden="true" /><span>Book</span>
      </NavLink>
    </div>}
  </div>;
};
