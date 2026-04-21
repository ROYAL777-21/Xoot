import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Heart, Calendar, Gift, Repeat, GraduationCap, LifeBuoy, ShieldCheck, LogOut, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/app", label: "Book", icon: Home, end: true },
  { to: "/app/bookings", label: "Bookings", icon: Calendar },
  { to: "/app/favorites", label: "My Zooters", icon: Heart },
  { to: "/app/loyalty", label: "Rewards", icon: Gift },
  { to: "/app/plans", label: "Plans", icon: Repeat },
  { to: "/app/training", label: "Training", icon: GraduationCap },
  { to: "/app/support", label: "Support", icon: LifeBuoy },
  { to: "/app/insurance", label: "Insurance", icon: ShieldCheck },
];

export const AppShell = ({ children }: { children: ReactNode }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-5 sticky top-0 h-screen">
        <NavLink to="/" className="flex items-center gap-2 mb-8">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-warm shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">zoot</span>
        </NavLink>

        <nav className="flex-1 space-y-1">
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
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

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border flex justify-around py-2">
        {nav.slice(0, 5).map((n) => {
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
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

      <main className="flex-1 pb-24 lg:pb-0 min-w-0">{children}</main>
    </div>
  );
};