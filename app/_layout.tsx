import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect, useState } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { createClient } from '@/lib/supabase/client';

export default function RootLayout() {
  useFrameworkReady();

  const colorScheme = useColorScheme();
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);
  const supabase = createClient();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setIsSignedIn(!!session);
      })();
    });

    return () => subscription?.unsubscribe();
  }, []);

  useEffect(() => {
    if (isSignedIn === null) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isSignedIn && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (isSignedIn && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [isSignedIn, segments]);

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsSignedIn(!!session);
  };

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
