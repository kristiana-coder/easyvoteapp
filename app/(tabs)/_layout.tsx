import React from 'react';
import { Stack } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { View } from 'react-native';

const TABS = [
  {
    name: '(home)',
    route: '/(tabs)/(home)' as const,
    icon: 'thumb-up' as const,
    label: 'Vote',
  },
  {
    name: 'results',
    route: '/(tabs)/results' as const,
    icon: 'bar-chart' as const,
    label: 'Results',
  },
  {
    name: 'collections',
    route: '/(tabs)/collections' as const,
    icon: 'folder' as const,
    label: 'Folders',
  },
  {
    name: 'admin',
    route: '/(tabs)/admin' as const,
    icon: 'settings' as const,
    label: 'Admin',
  },
];

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none',
        }}
      >
        <Stack.Screen name="(home)" />
        <Stack.Screen name="results" />
        <Stack.Screen name="collections" />
        <Stack.Screen name="admin" />
      </Stack>
      <FloatingTabBar tabs={TABS} containerWidth={380} />
    </View>
  );
}
