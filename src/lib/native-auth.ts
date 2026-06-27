import { importOptionalNativePlugin, isOptionalNativePlatform } from "@/lib/optional-capacitor";

type PreferencesModule = {
  Preferences?: {
    get: (options: { key: string }) => Promise<{ value: string | null }>;
    set: (options: { key: string; value: string }) => Promise<void>;
    remove: (options: { key: string }) => Promise<void>;
  };
};

const NATIVE_QUICK_UNLOCK_KEY = "zoot.native.quick_unlock_enabled";

export const isNativeAuthPlatform = () => isOptionalNativePlatform();

const getPreferences = async () =>
  (await importOptionalNativePlugin<PreferencesModule>("@capacitor/preferences"))?.Preferences ?? null;

export const getNativeQuickUnlockEnabled = async () => {
  if (!isNativeAuthPlatform()) return false;

  try {
    const preferences = await getPreferences();
    if (!preferences) return false;
    const { value } = await preferences.get({ key: NATIVE_QUICK_UNLOCK_KEY });
    return value === "true";
  } catch {
    return false;
  }
};

export const enableNativeQuickUnlock = async () => {
  if (!isNativeAuthPlatform()) return;

  try {
    const preferences = await getPreferences();
    await preferences?.set({ key: NATIVE_QUICK_UNLOCK_KEY, value: "true" });
  } catch {
    // Native quick unlock is an optional convenience. Auth still works without it.
  }
};

export const clearNativeQuickUnlock = async () => {
  if (!isNativeAuthPlatform()) return;

  try {
    const preferences = await getPreferences();
    await preferences?.remove({ key: NATIVE_QUICK_UNLOCK_KEY });
  } catch {
    // Optional preference cleanup should not interrupt sign-in.
  }
};
