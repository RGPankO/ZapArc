import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../src/lib/queryClient';
import { initializeDeepLinking } from '../src/utils/deepLinking';

export default function RootLayout(): React.JSX.Element {
  useEffect(() => {
    // Initialize deep linking when the app starts
    initializeDeepLinking();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
            animation: 'none',
            gestureEnabled: false
          }}
        />
        <Stack.Screen
          name="auth"
          options={{
            headerShown: false,
            animation: 'none',
            gestureEnabled: false
          }}
        />
        <Stack.Screen name="(main)" options={{ headerShown: false }} />
        </Stack>
      </PaperProvider>
    </QueryClientProvider>
  );
}
