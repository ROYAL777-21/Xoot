import { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Briefcase, GraduationCap, Wallet, ShieldCheck, User, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const nav = [
  { to: "/zooter", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/zooter/jobs", label: "Jobs", icon: Briefcase },
  { to: "/zooter/training", label: "Training", icon: GraduationCap },
  { to: "/zooter/earnings", label: "Earnings", icon: Wallet },
  { to: "/zooter/kyc", label: "Verification", icon: ShieldCheck },
  { to: "/zooter/profile", label: "Profile", icon: User },
];

export const ZooterShell = ({ children }: { children: ReactNode }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const handleSignOut = async () => { await signOut(); navigate("/"); };

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 p-5 sticky top-0 h-screen">
        <NavLink to="/" className="flex items-center gap-2 mb-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl gradient-sage shadow-warm">
            <span className="font-display text-lg font-bold text-primary-foreground">Z</span>
          </span>
          <span className="font-display text-2xl font-bold tracking-tight">zoot</span>
        </NavLink>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-2.5 py-1 mb-7 self-start border border-accent/20">
          <Sparkles className="h-3 w-3 text-sage-deep" />
          <span className="text-[10px] font-bold uppercase tracking-wider text-sage-deep">Pro</span>
        </div>

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
                    isActive ? "bg-accent/15 text-sage-deep" : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
        {nav.slice(0, 5).map((n) => {
          const Icon = n.icon;
          return (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                  isActive ? "text-sage-deep" : "text-muted-foreground"
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