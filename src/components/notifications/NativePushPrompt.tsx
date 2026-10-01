import { useAuth } from "@/contexts/AuthContext";
import { getNativePushCapability } from "@/lib/native-notifications";

/** Legacy Capacitor setup stays unavailable until device/listener ownership is coherent. */
export const NativePushPrompt = () => {
  const { user, loading } = useAuth();
  if (loading || !user || !getNativePushCapability().available) return null;
  return <div role="status" className="border-b border-border px-4 py-3 text-sm text-muted-foreground">
    Device alert setup is unavailable in this runtime.
  </div>;
};
