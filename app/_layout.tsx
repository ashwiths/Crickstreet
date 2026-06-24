import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '../src/hooks/useAuth';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

// Custom premium dark theme to avoid screen flashes
const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#000000',
  },
};

function RootLayoutNav() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    // Check if the user is currently inside the (auth) group of screens
    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to welcome screen if not logged in
      // router.replace('/(auth)/welcome'); // TEMPORARY: Commented out to allow testing the home page directly without login
    } else if (user && inAuthGroup) {
      // Redirect to home/tabs screen if successfully authenticated
      router.replace('/(tabs)');
    }
  }, [user, loading, segments, router]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FFFFFF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="create-matches" options={{ headerShown: false }} />
      <Stack.Screen name="scorecard" options={{ headerShown: false }} />
      <Stack.Screen name="my-teams" options={{ headerShown: false }} />
      <Stack.Screen name="team-details/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="my-players" options={{ headerShown: false }} />
      <Stack.Screen name="my-grounds" options={{ headerShown: false }} />
      <Stack.Screen name="ground-details/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="support" options={{ headerShown: false }} />
      <Stack.Screen name="notification-settings" options={{ headerShown: false }} />
      <Stack.Screen name="qr-scanner" options={{ headerShown: false, presentation: 'fullScreenModal' }} />
      <Stack.Screen name="player-profile/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="modal"
        options={{ presentation: 'modal', title: 'Modal', headerShown: true }}
      />
    </Stack>
  );
}

import { TourProvider } from '../src/hooks/useTour';

export default function RootLayout() {
  return (
    <ThemeProvider value={CustomDarkTheme}>
      <AuthProvider>
        <TourProvider>
          <RootLayoutNav />
          <StatusBar style="light" />
        </TourProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
