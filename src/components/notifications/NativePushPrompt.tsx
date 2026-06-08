import { useCallback, useEffect, useState } from "react";
import { BellOff, BellRing, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  buildNativePushSubscriptionRecord,
  getNativePushCapability,
  getOrCreateNativeDeviceId,
  requestNativePushRegistration,
  type NativePushSubscriptionRecord,
} from "@/lib/native-notifications";

type PromptState = "checking" | "unsupported" | "idle" | "saving" | "enabled" | "denied" | "error";

type UnsafeSupabaseTable = {
  upsert: (
    payload: NativePushSubscriptionRecord,
    options: { onConflict: string },
  ) => {
    select: (columns: string) => {
      maybeSingle: () => Promise<{ error: Error | null }>;
    };
  };
};

const nativePushTable = () =>
  (supabase as unknown as { from: (table: string) => UnsafeSupabaseTable }).from("native_push_subscriptions");

export const NativePushPrompt = () => {
  const { user } = useAuth();
  const [state, setState] = useState<PromptState>("checking");

  useEffect(() => {
    const capability = getNativePushCapability();
    setState(capability.available ? "idle" : "unsupported");
  }, []);

  const persistSubscription = useCallback(async (record: NativePushSubscriptionRecord) => {
    const { error } = await nativePushTable()
      .upsert(record, { onConflict: "user_id,device_id" })
      .select("id")
      .maybeSingle();

    if (error) throw error;
  }, []);

  const enableNotifications = useCallback(async () => {
    if (!user) return;

    setState("saving");
    const deviceId = getOrCreateNativeDeviceId();
    const registration = await requestNativePushRegistration();
    const record = buildNativePushSubscriptionRecord({
      userId: user.id,
      deviceId,
      platform: registration.platform,
      pushToken: registration.token,
      permissionStatus: registration.permissionStatus,
      appVersion: import.meta.env.VITE_APP_VERSION,
      revokedAt: registration.permissionStatus === "granted" ? null : new Date().toISOString(),
    });

    if (!record) {
      setState("error");
      toast.error("App alerts could not be prepared. Try again from the installed app.");
      return;
    }

    try {
      await persistSubscription(record);
      if (registration.permissionStatus === "granted") {
        setState("enabled");
        toast.success("App alerts are enabled for this device.");
      } else {
        setState("denied");
        toast.message("Notifications are off for this device.");
      }
    } catch {
      setState("error");
      toast.error("Notification preferences could not be saved.");
    }
  }, [persistSubscription, user]);

  if (!user || state === "checking" || state === "unsupported") return null;

  const isBusy = state === "saving";
  const isEnabled = state === "enabled";
  const isDenied = state === "denied";

  return (
    <div className="border-b border-border bg-muted/30 px-4 py-3">
      <Button
        type="button"
        variant={isEnabled ? "secondary" : "outline"}
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
