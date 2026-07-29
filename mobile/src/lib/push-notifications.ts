import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from '@/lib/supabase';

const ZOOT_ANDROID_NOTIFICATION_CHANNELS: Array<{
  id: string;
  name: string;
  importance: Notifications.AndroidImportance;
  description: string;
  visibility: Notifications.AndroidNotificationVisibility;
}> = [
  {
    id: 'zoot-booking-updates',
    name: 'Booking updates',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Booking status, assignment, arrival, and job-day updates without sensitive access details.',
    visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  },
  {
    id: 'zoot-support-updates',
    name: 'Support updates',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Support case progress and safe Concierge handoff updates.',
    visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  },
  {
    id: 'zoot-care-plus',
    name: 'Care+ reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    description: 'Care+ reminders, saved-home prompts, and preference updates.',
    visibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  },
  {
    id: 'zoot-security',
    name: 'Account security',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Security, login, and account-protection updates.',
    visibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  },
  {
    id: 'zoot-zooter-jobs',
    name: 'Xooter jobs',
    importance: Notifications.AndroidImportance.HIGH,
    description: 'Accepted job, job-day, and sensitive-access availability prompts that require opening Xoot.',
    visibility: Notifications.AndroidNotificationVisibility.PRIVATE,
  },
];

const configureAndroidNotificationChannels = async () => {
  if (Platform.OS !== 'android') return;

  await Promise.all(
    ZOOT_ANDROID_NOTIFICATION_CHANNELS.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        lockscreenVisibility: channel.visibility,
        vibrationPattern: [0, 140, 90, 140],
      }),
    ),
  );
};

export async function registerForXootPushNotifications(userId: string) {
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

  await configureAndroidNotificationChannels();

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
