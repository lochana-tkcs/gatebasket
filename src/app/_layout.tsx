import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Loading } from '@/components/ui';
import { AuthProvider, useAuth } from '@/lib/auth';
import { registerForPush } from '@/lib/notifications';
import { Colors } from '@/lib/theme';

function RootNavigator() {
  const { session, profile, loading } = useAuth();

  useEffect(() => {
    if (profile?.id) registerForPush(profile.id);
  }, [profile?.id]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background }}>
        <Loading />
      </View>
    );
  }

  const signedIn = !!session && !!profile;
  const isOwner = signedIn && profile.role === 'store_owner';
  const isResident = signedIn && !isOwner && !!profile.flat_id;
  const needsOnboarding = signedIn && !isOwner && !profile.flat_id;

  return (
    <Stack
      screenOptions={{
        headerTintColor: Colors.text,
        headerStyle: { backgroundColor: Colors.card },
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: Colors.background },
      }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={needsOnboarding}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      </Stack.Protected>
      <Stack.Protected guard={isResident}>
        <Stack.Screen name="(resident)" options={{ headerShown: false }} />
        <Stack.Screen name="cart" options={{ title: 'Your cart' }} />
      </Stack.Protected>
      <Stack.Protected guard={isOwner}>
        <Stack.Screen name="(store)" options={{ headerShown: false }} />
        <Stack.Screen name="product-edit" options={{ title: 'Product', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={isResident || isOwner}>
        <Stack.Screen name="order/[id]" options={{ title: 'Order details' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000 } } }));
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <RootNavigator />
      </AuthProvider>
    </QueryClientProvider>
  );
}
