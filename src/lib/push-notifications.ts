import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { resolveNativeRoute } from "@/lib/native-routing";
import { getOptionalNativePlatform, importOptionalNativePlugin, isOptionalNativePlatform } from "@/lib/optional-capacitor";

type ListenerHandle = { remove: () => Promise<void> | void };
type PushPlatform = "ios" | "android" | "web";
type NativePushNotification = {
  title?: string;
  body?: string;
  data?: unknown;
};
type NativePushNotificationsModule = {
  PushNotifications?: {
    requestPermissions: () => Promise<{ receive?: string }>;
    register: () => Promise<void>;
    addListener: (
      event: "registration" | "registrationError" | "pushNotificationReceived" | "pushNotificationActionPerformed",
      callback: (payload: any) => void,
    ) => Promise<ListenerHandle>;
  };
};

export type PushNotificationInitResult = {
  status: "unsupported" | "denied" | "registered" | "error";
  platform: PushPlatform;
  token?: string;
  error?: string;
};

let listenerHandles: ListenerHandle[] = [];

const pushTokenTable = () =>
  (supabase as unknown as {
    from: (table: "push_tokens") => {
      upsert: (
        payload: { user_id: string; token: string; platform: PushPlatform; updated_at: string },
        options: { onConflict: string },
      ) => Promise<{ error: Error | null }>;
    };
  }).from("push_tokens");

const normalisePlatform = (): PushPlatform => {
  const platform = getOptionalNativePlatform();
  return platform === "ios" || platform === "android" ? platform : "web";
};

const clearListeners = async () => {
  await Promise.all(listenerHandles.map((handle) => Promise.resolve(handle.remove()).catch(() => undefined)));
  listenerHandles = [];
};

const addListener = async (handlePromise: Promise<ListenerHandle>) => {
  const handle = await handlePromise;
  listenerHandles.push(handle);
};

const dispatchNativeRoute = (payload: unknown, onRoute?: (route: string) => void) => {
  const route = resolveNativeRoute(payload);
  if (!route) return;
  if (onRoute) onRoute(route);
  else window.dispatchEvent(new CustomEvent("xoot:native-route", { detail: payload }));
};

export async function initialisePushNotifications(
  userId: string,
  onRoute?: (route: string) => void,
): Promise<PushNotificationInitResult> {
  const platform = normalisePlatform();
  if (!isOptionalNativePlatform()) return { status: "unsupported", platform };

  try {
    const PushNotifications =
      (await importOptionalNativePlugin<NativePushNotificationsModule>("@capacitor/push-notifications"))?.PushNotifications ?? null;
    if (!PushNotifications) return { status: "unsupported", platform };

    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== "granted") return { status: "denied", platform };

    await clearListeners();

    const token = await new Promise<string>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("push registration timed out")), 12_000);

      void Promise.all([
        addListener(PushNotifications.addListener("registration", async (registration) => {
          window.clearTimeout(timeout);
          const { error } = await pushTokenTable().upsert(
            {
              user_id: userId,
              token: registration.value,
              platform,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,platform" },
          );
          if (error) reject(error);
          else resolve(registration.value);
        })),
        addListener(PushNotifications.addListener("registrationError", (error) => {
          window.clearTimeout(timeout);
          reject(new Error(error.error || "push registration failed"));
        })),
      ]).then(() => PushNotifications.register()).catch((error) => {
        window.clearTimeout(timeout);
        reject(error instanceof Error ? error : new Error("push registration failed"));
      });
    });

    await addListener(PushNotifications.addListener("pushNotificationReceived", (notification: NativePushNotification) => {
      toast(notification.title ?? "Xoot", { description: notification.body });
    }));

    await addListener(PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      dispatchNativeRoute(action.notification.data ?? action.notification, onRoute);
    }));

    return { status: "registered", platform, token };
  } catch (error) {
    return {
      status: "error",
      platform,
      error: error instanceof Error ? error.message : "push notification registration failed",
    };
  }
}
