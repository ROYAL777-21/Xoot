import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

export async function registerForZootPushNotifications(userId: string) {
  if (!Device.isDevice) {
    throw new Error('Push notifications require a physical device.');
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (existing.status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }

  if (status !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('zoot-service-updates', {
      name: 'Zoot service updates',
      importance: Notifications.AndroidImportance.DEFAULT,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) throw new Error('EAS project ID is required before registering push tokens.');

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  const deviceId = `${Platform.OS}:${Constants.sessionId ?? 'unknown-device'}`;

  const pushClient = supabase as any;
  const { error } = await pushClient.from('native_push_subscriptions').upsert(
    {
      user_id: userId,
      device_id: deviceId,
      platform: Platform.OS,
      push_token: token.data,
      token_type: 'expo_push',
      permission_status: 'granted',
      app_version: Constants.expoConfig?.version ?? null,
      revoked_at: null,
    },
    { onConflict: 'user_id,device_id' },
  );

  if (error) throw error;
  return token.data;
}
