import { ReactNode, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Calendar, Crown, Gift, Heart, Home, LifeBuoy, LogOut, ShieldCheck, User, Building2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { haptic } from "@/lib/haptics";

const nav = [
  { to: "/app", label: "Book", icon: Home, end: true },
  { to: "/app/bookings", label: "Bookings", icon: Calendar },
  { to: "/app/plans", label: "Care+", icon: Crown },
  { to: "/app/properties", label: "Properties", icon: Building2 },
  { to: "/app/favorites", label: "My Zooters", icon: Heart },
  { to: "/app/loyalty", label: "Rewards", icon: Gift },
  { to: "/app/gifts", label: "Gift Clean", icon: Gift },
  { to: "/app/profile", label: "Profile", icon: User },
  { to: "/app/support", label: "Support", icon: LifeBuoy },
  { to: "/app/insurance", label: "Trust Policy", icon: ShieldCheck },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  useEffect(() => {
    const updateScrolled = () => setScrolled(window.scrollY > 12);
    updateScrolled();
    window.addEventListener("scroll", updateScrolled, { passive: true });
    return () => window.removeEventListener("scroll", updateScrolled);
  }, []);

  return (
    <div className="min-h-screen flex bg-background">
      <aside
        data-scrolled={scrolled ? "true" : "false"}
        className="liquid-glass-nav hidden lg:flex m-3 flex-col w-64 rounded-4xl p-4 sticky top-3 h-[calc(100vh-1.5rem)]"
      >
        <div className="liquid-glass-readable flex items-center justify-between mb-8">
          <NavLink to="/" className="flex items-center gap-2 interactive-press" onClick={() => haptic("selection")}>
            <span className="grid h-10 w-10 place-items-center rounded-2xl gradient-warm shadow-warm">
              <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
            </span>
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">Zoot</span>
          </NavLink>
          <NotificationBell />
        </div>

        <nav className="liquid-glass-readable flex-1 space-y-1.5">
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => haptic("selection")}
                className={({ isActive }) =>
                  `zoot-liquid-nav-item interactive-press liquid-glass-interactive flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary shadow-card"
                      : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{n.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="liquid-glass-readable border-t border-border/60 pt-4 mt-4">
          <p className="text-xs text-muted-foreground truncate mb-2">{user?.email}</p>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="interactive-press w-full justify-start rounded-2xl">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <nav
        data-scrolled={scrolled ? "true" : "false"}
        className="liquid-glass-nav lg:hidden fixed bottom-3 inset-x-3 z-40 rounded-[1.75rem] px-2 py-2"
      >
        <div className="liquid-glass-readable flex items-stretch justify-around gap-1">
          {nav.slice(0, 5).map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => haptic("selection")}
                className={({ isActive }) =>
                  `zoot-liquid-nav-item interactive-press liquid-glass-interactive tap-target flex flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-1 text-[10px] leading-tight font-semibold transition-colors ${
                    isActive
                      ? "bg-primary/15 text-primary shadow-card"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="max-w-[58px] text-center">{n.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>

      <main className="flex-1 pb-28 lg:pb-0 min-w-0">{children}</main>
    </div>
  );
};
