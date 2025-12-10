import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { PaperProvider } from 'react-native-paper';
import { initializeDeepLinking } from '../src/utils/deepLinking';
import { TRPCProvider } from '../src/providers/TRPCProvider';

export default function RootLayout(): React.JSX.Element {
  useEffect(() => {
    // Initialize deep linking when the app starts
    initializeDeepLinking();
  }, []);

  return (
    <TRPCProvider>
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
    </TRPCProvider>
  );
}
