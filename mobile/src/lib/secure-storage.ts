import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const memoryStore = new Map<string, string>();

const webStorage = {
  getItem: (key: string) => {
    if (typeof window === 'undefined') return memoryStore.get(key) ?? null;
    return window.localStorage.getItem(key);
  },
  setItem: (key: string, value: string) => {
    if (typeof window === 'undefined') {
      memoryStore.set(key, value);
      return;
    }
    window.localStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window === 'undefined') {
      memoryStore.delete(key);
      return;
    }
    window.localStorage.removeItem(key);
  },
};

export const secureSessionStorage = {
  getItem: async (key: string) => {
    if (Platform.OS === 'web') return webStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      webStorage.setItem(key, value);
      return;
    }
    await SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      webStorage.removeItem(key);
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};
