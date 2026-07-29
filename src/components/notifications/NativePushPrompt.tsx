import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellOff, BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getNativePushCapability } from "@/lib/native-notifications";
import { initialisePushNotifications } from "@/lib/push-notifications";

type PromptState = "checking" | "unsupported" | "idle" | "saving" | "enabled" | "denied" | "error";

export const NativePushPrompt = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<PromptState>("checking");

  useEffect(() => {
    const capability = getNativePushCapability();
    setState(capability.available ? "idle" : "unsupported");
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!user) return;

    setState("saving");
    const registration = await initialisePushNotifications(user.id, navigate);

    if (registration.status === "registered") {
        setState("enabled");
        toast.success("App alerts are enabled for this device.");
      return;
    }

    if (registration.status === "denied") {
      setState("denied");
      toast.message("Notifications are off for this device.");
      return;
    }

    setState("error");
    toast.error(registration.error ?? "Notification preferences could not be saved.");
  }, [navigate, user]);

  if (!user || state === "checking" || state === "unsupported") return null;

  const isBusy = state === "saving";
  const isEnabled = state === "enabled";
  const isDenied = state === "denied";

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-3">
      <Button
        type="button"
        variant={isEnabled ? "secondary" : "outline-solid"}
        size="sm"
        className="h-9 w-full justify-start rounded-xl"
        onClick={() => void enableNotifications()}
        disabled={isBusy || isEnabled}
      >
        {isBusy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : isEnabled ? (
          <CheckCircle2 className="h-4 w-4 text-sage-deep" />
        ) : isDenied ? (
          <BellOff className="h-4 w-4" />
        ) : (
          <BellRing className="h-4 w-4" />
        )}
        {isEnabled ? "App alerts enabled" : isDenied ? "Notifications off" : "Enable app alerts"}
      </Button>
    </div>
  );
};
