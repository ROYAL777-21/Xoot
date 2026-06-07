import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { resolveNativeRoute } from "@/lib/native-routing";

const editableSelector = 'input, textarea, select, [contenteditable="true"]';

type NativeListenerHandle = { remove: () => Promise<void> | void };
type CapacitorAppUrlOpen = { url?: string };
type CapacitorPushAction = { notification?: { data?: unknown } & Record<string, unknown> };

const isEditable = (target: EventTarget | null) =>
  target instanceof HTMLElement && Boolean(target.closest(editableSelector));

const isListenerHandle = (value: unknown): value is NativeListenerHandle => {
  const handle = value as NativeListenerHandle | null;
  return typeof handle?.remove === "function";
};

const blurActiveField = () => {
  if (!(document.activeElement instanceof HTMLElement)) return;
  if (!isEditable(document.activeElement)) return;
  document.activeElement.blur();
};

export const NativeInteractionLayer = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const viewport = window.visualViewport;

    const syncViewport = () => {
      const height = viewport?.height ?? window.innerHeight;
      const keyboardOffset = Math.max(0, window.innerHeight - height - (viewport?.offsetTop ?? 0));

      document.documentElement.style.setProperty("--visual-viewport-height", `${height}px`);
      document.documentElement.style.setProperty("--keyboard-offset", `${keyboardOffset}px`);
      document.body.dataset.keyboardOpen = keyboardOffset > 80 ? "true" : "false";
    };

    const handlePointerDown = (event: PointerEvent) => {
      if (!isEditable(event.target)) {
        blurActiveField();
      }
    };

    syncViewport();
    viewport?.addEventListener("resize", syncViewport);
    viewport?.addEventListener("scroll", syncViewport);
    window.addEventListener("resize", syncViewport);
    window.addEventListener("scroll", blurActiveField, { passive: true });
    document.addEventListener("pointerdown", handlePointerDown, { capture: true });

    return () => {
      viewport?.removeEventListener("resize", syncViewport);
      viewport?.removeEventListener("scroll", syncViewport);
      window.removeEventListener("resize", syncViewport);
      window.removeEventListener("scroll", blurActiveField);
      document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
      document.body.dataset.keyboardOpen = "false";
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let disposed = false;
    const removers: Array<() => Promise<void> | void> = [];

    const addRemover = (handle: unknown) => {
      if (!isListenerHandle(handle)) return;

      const remove = () => handle.remove();
      if (disposed) {
        void remove();
        return;
      }

      removers.push(remove);
    };

    const routeNativePayload = (payload: unknown) => {
      const route = resolveNativeRoute(payload);
      if (!route) return;
      navigate(route);
    };

    const handleNativeRouteEvent: EventListener = (event) => {
      routeNativePayload((event as CustomEvent<unknown>).detail);
    };

    const registerAppListeners = async () => {
      try {
        const { App } = await import("@capacitor/app");
        const launch = await App.getLaunchUrl();
        if (!disposed) routeNativePayload(launch?.url);

        const handle = await App.addListener("appUrlOpen", (event: CapacitorAppUrlOpen) => {
          routeNativePayload(event?.url);
        });
        addRemover(handle);
      } catch {
        // Capacitor plugins are only available in the native shell.
      }
    };

    const registerPushListeners = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const handle = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event: CapacitorPushAction) => {
            routeNativePayload(event?.notification?.data ?? event?.notification);
          },
        );
        addRemover(handle);
      } catch {
        // Browser/PWA builds should not request native push plugins.
      }
    };

    window.addEventListener("zoot:native-route", handleNativeRouteEvent);
    void registerAppListeners();
    void registerPushListeners();

    return () => {
      disposed = true;
      window.removeEventListener("zoot:native-route", handleNativeRouteEvent);
      removers.forEach((remove) => void remove());
    };
  }, [navigate]);

  return null;
};
