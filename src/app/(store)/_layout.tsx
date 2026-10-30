import { Tabs } from 'expo-router';
import { Alert } from 'react-native';

import { HeaderTabBar, HeaderTitle } from '@/components/header-tabs';
import { useMyStore } from '@/lib/queries';
import { Colors } from '@/lib/theme';

export const unstable_settings = { initialRouteName: 'queue' };

export default function StoreTabs() {
  const store = useMyStore();
  return (
    <Tabs
      tabBar={(props) => (
        <HeaderTabBar
          {...props}
          title={
            <HeaderTitle
              title={store.data?.name ?? 'Your store'}
              subtitle={store.data ? (store.data.is_open ? 'Open for orders' : 'Closed') : undefined}
            />
          }
          left={{
            icon: 'notifications-outline',
            label: 'Notifications',
            onPress: () => Alert.alert('Notifications', 'New orders ring on the Orders tab and arrive as push notifications.'),
          }}
        />
      )}
      screenOptions={{ headerShown: false, tabBarPosition: 'top', sceneStyle: { backgroundColor: Colors.background } }}>
      <Tabs.Screen name="queue" options={{ title: 'Orders' }} />
      <Tabs.Screen name="catalog" options={{ title: 'Catalog' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
