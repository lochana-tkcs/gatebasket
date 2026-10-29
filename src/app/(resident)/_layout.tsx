import { Tabs } from 'expo-router';

import { tabIcon } from '@/components/ui';
import { cartSummary, useCart } from '@/lib/cart';
import { Colors } from '@/lib/theme';

export default function ResidentTabs() {
  const count = cartSummary(useCart((s) => s.lines)).count;
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        headerStyle: { backgroundColor: Colors.card },
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerShown: false,
          tabBarIcon: tabIcon('home'),
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Store',
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: Colors.accent },
          tabBarIcon: tabIcon('storefront'),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarIcon: tabIcon('receipt'),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: tabIcon('person-circle'),
        }}
      />
    </Tabs>
  );
}
