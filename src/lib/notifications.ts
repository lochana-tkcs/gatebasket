import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Ask for notification permission and save this device's Expo push token on the profile.
 * Push needs a physical device and an EAS project id (development build); otherwise it's skipped.
 */
export async function registerForPush(userId: string): Promise<void> {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('orders', {
      name: 'Orders',
      // eslint-disable-next-line import/namespace -- exported via `export *`, which the rule can't follow
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 400, 200, 400],
    });
  }

  const current = await Notifications.getPermissionsAsync();
  const status = current.granted ? current.status : (await Notifications.requestPermissionsAsync()).status;
  if (status !== 'granted') return;

  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) {
    console.warn('No EAS projectId; push notifications are disabled. Run `npx eas-cli@latest init`.');
    return;
  }

  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    await supabase.from('profiles').update({ expo_push_token: token }).eq('id', userId);
  } catch (e) {
    console.warn('Could not register for push notifications', e);
  }
}
