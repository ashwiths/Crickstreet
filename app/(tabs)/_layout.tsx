import { Tabs } from 'expo-router';
import React from 'react';

/**
 * The HomeScreen manages its own floating bottom navigation.
 * The Expo tab bar is hidden globally so it doesn't double-render.
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // HomeScreen renders its own nav
      }}
    >
      <Tabs.Screen name="index"         options={{ title: 'Home' }} />
      <Tabs.Screen name="search"        options={{ title: 'Search' }} />
      <Tabs.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Tabs.Screen name="profile"       options={{ title: 'Profile' }} />
    </Tabs>
  );
}
