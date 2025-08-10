import React from 'react';
import { Stack } from 'expo-router';

export default function MainLayout(): React.JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      <Stack.Screen name="settings" options={{ title: 'Settings' }} />
    </Stack>
  );
}