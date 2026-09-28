import { useAuth } from "@/contexts/AuthContext";
import { BookingFlow } from "./BookingFlow";

// Discard private draft/quote state immediately on account changes. Nothing is stored locally.
export default function Book({ variant = "app", initialAddress = "" }: { variant?: "app" | "website"; initialAddress?: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="xoot-booking-page" role="status">Loading your account…</div>;
  return <BookingFlow key={user?.id ?? "signed-out"} buyerId={user?.id ?? null} variant={variant} initialAddress={initialAddress} />;
}
