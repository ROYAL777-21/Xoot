import { ReactNode } from "react";
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
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile top header */}
      <header className="lg:hidden fixed top-0 inset-x-0 z-40 bg-background/95 backdrop-blur border-b border-border" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between px-4 h-14">
          <NavLink to="/" className="flex items-center gap-2" onClick={() => haptic("selection")}>
            <span className="grid h-8 w-8 place-items-center rounded-lg gradient-warm shadow-warm">
              <span className="font-display text-base font-bold text-primary-foreground">Z</span>
            </span>
            <span className="font-display text-xl font-bold tracking-tight">zoot</span>
          </NavLink>
          <NotificationBell />
        </div>
      </header>

      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-5 sticky top-0 h-screen">
        <div className="flex items-center justify-between mb-8">
          <NavLink to="/" className="flex items-center gap-2" onClick={() => haptic("selection")}>
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
            <span className="font-display text-2xl font-bold tracking-tight">zoot</span>
          </NavLink>
          <NotificationBell />
        </div>

        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                onClick={() => haptic("selection")}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`
                }
              >
                <Icon className="h-4 w-4" />
                {n.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="border-t border-border pt-4 mt-4">
          <p className="text-xs text-muted-foreground truncate mb-2">{user?.email}</p>
          <Button variant="ghost" size="sm" onClick={handleSignOut} className="w-full justify-start">
            <LogOut className="h-4 w-4 mr-2" /> Sign out
          </Button>
        </div>
      </aside>

      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border flex justify-around py-2">
      </nav>
      {/* spacer pushed below; we add safe-area via style */}
      <nav aria-hidden className="hidden" />
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border flex justify-around pt-2" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}>
        {nav.slice(0, 5).map((n) => {
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => haptic("selection")}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {n.label}
            </NavLink>
          );
        })}
      </nav>

      <main className="flex-1 pt-16 lg:pt-0 pb-24 lg:pb-0 min-w-0">{children}</main>
    </div>
  );
};
