import { router, Tabs } from 'expo-router';
import { Alert } from 'react-native';

import { HeaderTabBar, HeaderTitle } from '@/components/header-tabs';
import { useProfile } from '@/lib/auth';
import { cartSummary, useCart } from '@/lib/cart';
import { Colors } from '@/lib/theme';

export default function ResidentTabs() {
  const profile = useProfile();
  const count = cartSummary(useCart((s) => s.lines)).count;
  const flat = profile.flat ? `${profile.flat.block}-${profile.flat.number}` : '';

  return (
    <Tabs
      tabBar={(props) => (
        <HeaderTabBar
          {...props}
          title={<HeaderTitle title={[flat, profile.society?.name].filter(Boolean).join(', ')} />}
          left={{
            icon: 'notifications-outline',
            label: 'Notifications',
            onPress: () => Alert.alert('Notifications', 'Order updates arrive as push notifications.'),
          }}
          right={{ icon: 'settings-outline', label: 'Profile & settings', onPress: () => router.push('/profile') }}
        />
      )}
      screenOptions={{ headerShown: false, tabBarPosition: 'top', sceneStyle: { backgroundColor: Colors.background } }}>
      <Tabs.Screen name="index" options={{ title: 'Activity' }} />
      <Tabs.Screen name="store" options={{ title: 'Store', tabBarBadge: count > 0 ? count : undefined }} />
      <Tabs.Screen name="apartment" options={{ title: 'Apartment' }} />
    </Tabs>
  );
}
