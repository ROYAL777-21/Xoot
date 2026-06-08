import { Capacitor } from "@capacitor/core";

export type NativeNotificationPlatform = "ios" | "android" | "web" | "unknown";
export type NativePushPermissionStatus = "prompt" | "prompt-with-rationale" | "granted" | "denied" | "unknown";
export type NativePushTokenType = "capacitor" | "web_push" | "unknown";

export type NativePushSubscriptionInput = {
  userId: string;
  deviceId: string;
  platform?: string | null;
  pushToken?: string | null;
  tokenType?: string | null;
  permissionStatus?: string | null;
  appVersion?: string | null;
  now?: string;
  revokedAt?: string | null;
};

export type NativePushSubscriptionRecord = {
  user_id: string;
  device_id: string;
  platform: NativeNotificationPlatform;
  push_token: string | null;
  token_type: NativePushTokenType;
  permission_status: NativePushPermissionStatus;
  app_version: string | null;
  last_seen_at: string;
  revoked_at: string | null;
};

export type NativePushCapability = {
  available: boolean;
  platform: NativeNotificationPlatform;
};

export type NativePushRegistrationResult = NativePushCapability & {
  permissionStatus: NativePushPermissionStatus;
  token?: string;
  error?: string;
};

const DEVICE_ID_KEY = "zoot.native.device_id";
const permissionStatuses = new Set<NativePushPermissionStatus>(["prompt", "prompt-with-rationale", "granted", "denied", "unknown"]);
const tokenTypes = new Set<NativePushTokenType>(["capacitor", "web_push", "unknown"]);

const stripUnsafeText = (value: string) =>
  value
    .split("")
    .map((character) => {
      const code = character.charCodeAt(0);
      return code <= 31 || code === 127 || character === "<" || character === ">" || character === "`" || character === "\\"
        ? " "
        : character;
    })
    .join("");

const safeText = (value: unknown, maxLength = 240) => {
  if (typeof value !== "string" && typeof value !== "number") return "";
  return stripUnsafeText(String(value)).replace(/\s+/g, " ").trim().slice(0, maxLength);
};

const randomDeviceId = () => {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();

  const bytes = new Uint8Array(16);
  globalThis.crypto?.getRandomValues?.(bytes);
  const suffix = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `zoot-device-${suffix || Date.now().toString(36)}`;
};

export const getOrCreateNativeDeviceId = () => {
  if (typeof window === "undefined") return randomDeviceId();

  try {
    const existing = window.localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const next = randomDeviceId();
    window.localStorage.setItem(DEVICE_ID_KEY, next);
    return next;
  } catch {
    return randomDeviceId();
  }
};

export const normalisePushPlatform = (value: string | null | undefined): NativeNotificationPlatform => {
  const platform = value?.toLowerCase();
  if (platform === "ios" || platform === "android" || platform === "web") return platform;
  return "unknown";
};

export const normalisePermissionStatus = (value: string | null | undefined): NativePushPermissionStatus => {
  const status = value as NativePushPermissionStatus | null | undefined;
  return status && permissionStatuses.has(status) ? status : "unknown";
};

export const normaliseTokenType = (value: string | null | undefined): NativePushTokenType => {
  const tokenType = value as NativePushTokenType | null | undefined;
  return tokenType && tokenTypes.has(tokenType) ? tokenType : "unknown";
};

export const buildNativePushSubscriptionRecord = ({
  userId,
  deviceId,
  platform,
  pushToken,
  tokenType,
  permissionStatus,
  appVersion,
  now,
  revokedAt,
}: NativePushSubscriptionInput): NativePushSubscriptionRecord | null => {
  const safeUserId = safeText(userId, 80);
  const safeDeviceId = safeText(deviceId, 160);
  const safeToken = safeText(pushToken ?? "", 2048);
  const safeStatus = normalisePermissionStatus(permissionStatus ?? (safeToken ? "granted" : "unknown"));

  if (!safeUserId || safeDeviceId.length < 8) return null;
  if (safeStatus === "granted" && safeToken.length <= 8) return null;

  return {
    user_id: safeUserId,
    device_id: safeDeviceId,
    platform: normalisePushPlatform(platform),
    push_token: safeToken || null,
    token_type: normaliseTokenType(tokenType ?? "capacitor"),
    permission_status: safeStatus,
    app_version: safeText(appVersion ?? "", 80) || null,
    last_seen_at: now ?? new Date().toISOString(),
    revoked_at: revokedAt ?? null,
  };
};

export const getNativePushCapability = (): NativePushCapability => {
  const platform = normalisePushPlatform(Capacitor.getPlatform());
  return { platform, available: platform === "ios" || platform === "android" };
};

export const requestNativePushRegistration = async (): Promise<NativePushRegistrationResult> => {
  const capability = getNativePushCapability();
  if (!capability.available) return { ...capability, permissionStatus: "unknown" };

  try {
    const { PushNotifications } = await import("@capacitor/push-notifications");
    const current = await PushNotifications.checkPermissions();
    const requested = current.receive === "granted" ? current : await PushNotifications.requestPermissions();
    const permissionStatus = normalisePermissionStatus(requested.receive);

    if (permissionStatus !== "granted") {
      return { ...capability, permissionStatus };
    }

    const handles: Array<{ remove: () => Promise<void> }> = [];
    try {
      const token = await new Promise<string>((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error("registration timed out")), 12_000);

        void Promise.all([
          PushNotifications.addListener("registration", (registration) => {
            window.clearTimeout(timeout);
            resolve(registration.value);
          }),
          PushNotifications.addListener("registrationError", (error) => {
            window.clearTimeout(timeout);
            reject(new Error(error.error || "registration failed"));
          }),
        ]).then((registeredHandles) => {
          handles.push(...registeredHandles);
          return PushNotifications.register();
        }).catch((error) => {
          window.clearTimeout(timeout);
          reject(error instanceof Error ? error : new Error("registration failed"));
        });
      });

      return { ...capability, permissionStatus: "granted", token };
    } finally {
      await Promise.all(handles.map((handle) => handle.remove().catch(() => undefined)));
    }
  } catch (error) {
    return {
      ...capability,
      permissionStatus: "unknown",
      error: error instanceof Error ? error.message : "native push registration failed",
    };
  }
};
