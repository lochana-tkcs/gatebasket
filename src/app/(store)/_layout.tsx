import { Tabs } from 'expo-router';

import { tabIcon } from '@/components/ui';
import { Colors } from '@/lib/theme';

export const unstable_settings = { initialRouteName: 'queue' };

export default function StoreTabs() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerStyle: { backgroundColor: Colors.card },
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="queue"
        options={{ title: 'Orders', tabBarIcon: tabIcon('receipt') }}
      />
      <Tabs.Screen
        name="catalog"
        options={{ title: 'Catalog', tabBarIcon: tabIcon('pricetags') }}
      />
      <Tabs.Screen
        name="settings"
        options={{ title: 'Settings', tabBarIcon: tabIcon('settings') }}
      />
    </Tabs>
  );
}
