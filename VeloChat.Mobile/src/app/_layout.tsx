import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import { AuthProvider, useAuth } from '@/context/auth-context';
import { colors } from '@/constants/colors';

SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({ duration: 450, fade: true });

function RootNavigator() {
  const { user, isBooting } = useAuth();

  useEffect(() => {
    if (!isBooting) SplashScreen.hide();
  }, [isBooting]);

  if (isBooting) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false }}>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return <AuthProvider><RootNavigator /></AuthProvider>;
}
