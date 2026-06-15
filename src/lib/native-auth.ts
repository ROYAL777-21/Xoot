import { Capacitor } from "@capacitor/core";
import { Preferences } from "@capacitor/preferences";

const NATIVE_QUICK_UNLOCK_KEY = "zoot.native.quick_unlock_enabled";

export const isNativeAuthPlatform = () => Capacitor.getPlatform() !== "web";

export const getNativeQuickUnlockEnabled = async () => {
  if (!isNativeAuthPlatform()) return false;

  try {
    const { value } = await Preferences.get({ key: NATIVE_QUICK_UNLOCK_KEY });
    return value === "true";
  } catch {
    return false;
  }
};

export const enableNativeQuickUnlock = async () => {
  if (!isNativeAuthPlatform()) return;

  try {
    await Preferences.set({ key: NATIVE_QUICK_UNLOCK_KEY, value: "true" });
  } catch {
    // Native quick unlock is an optional convenience. Auth still works without it.
  }
};

export const clearNativeQuickUnlock = async () => {
  if (!isNativeAuthPlatform()) return;

  try {
    await Preferences.remove({ key: NATIVE_QUICK_UNLOCK_KEY });
  } catch {
    // Optional preference cleanup should not interrupt sign-in.
  }
};
