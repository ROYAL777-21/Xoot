import { ReactNode, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { House, Briefcase, GraduationCap, Wallet, ShieldCheck, User, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { XooterNavigation } from "./XooterNavigation";

const nav = [
  { to: "/xooter", label: "Dashboard", icon: House, end: true },
  { to: "/xooter/jobs", label: "Jobs", icon: Briefcase },
  { to: "/xooter/training", label: "Training", icon: GraduationCap },
  { to: "/xooter/earnings", label: "Earnings", icon: Wallet },
  { to: "/xooter/kyc", label: "Verification", icon: ShieldCheck },
  { to: "/xooter/profile", label: "Profile", icon: User },
];

export const XooterShell = ({ children, updatesAvailable = false }: { children: ReactNode; updatesAvailable?: boolean }) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const currentOwner = useRef(user?.id);
  currentOwner.current = user?.id;
  const handleSignOut = async () => {
    if (signingOut) return;
    const owner = user?.id;
    setSigningOut(true);
    try {
      await signOut();
      if (!currentOwner.current || currentOwner.current === owner) navigate("/", { replace: true });
    } catch {
      if (currentOwner.current === owner) toast.error("Sign out failed. Please try again.");
    } finally { setSigningOut(false); }
  };

  const items = updatesAvailable ? [...nav, { to: "/xooter/updates", label: "Your updates", icon: Bell }] : nav;
  return <XooterNavigation key={user?.id ?? "signed-out"} items={items} email={user?.email}
    signingOut={signingOut} onSignOut={() => void handleSignOut()}>{children}</XooterNavigation>;
};
