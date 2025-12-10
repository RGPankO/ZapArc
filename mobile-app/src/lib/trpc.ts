import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';
import { QueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';
import { tokenService } from '../services/tokenService';
import { NetworkConfig } from '../config/network';

// Import the AppRouter type from backend-trpc
// This provides full end-to-end type safety
import type { AppRouter } from '../../../backend-trpc/src/server/router';

// Create the tRPC React hooks
export const trpc = createTRPCReact<AppRouter>();

// Get tRPC API URL based on platform
function getTrpcBaseUrl(): string {
  const networkIp = NetworkConfig.NETWORK_IP;
  const trpcPort = 3001;

  if (Platform.OS === 'web') {
    return `http://localhost:${trpcPort}/api/trpc`;
  }

  if (Platform.OS === 'android') {
    // For Android physical devices, use network IP
    // For emulator, use 10.0.2.2
    return `http://${networkIp}:${trpcPort}/api/trpc`;
  }

  // iOS - use network IP for both simulator and physical devices
  return `http://${networkIp}:${trpcPort}/api/trpc`;
}

// Create a new QueryClient instance
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale time of 5 minutes
        staleTime: 5 * 60 * 1000,
        // Retry failed requests once
        retry: 1,
        // Refetch on window focus
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

// Create the tRPC client
export function createTrpcClient() {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: getTrpcBaseUrl(),
        async headers() {
          const token = await tokenService.getAccessToken();
          return {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          };
        },
      }),
    ],
  });
}

// Export types for convenience
export type { AppRouter };
