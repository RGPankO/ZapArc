import React, { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { trpc, createQueryClient, createTrpcClient } from '../lib/trpc';

interface TRPCProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that wraps the app with tRPC and React Query
 * Must be placed high in the component tree (usually in _layout.tsx)
 */
export function TRPCProvider({ children }: TRPCProviderProps) {
  // Create clients once and store in state to prevent recreation on re-renders
  const [queryClient] = useState(() => createQueryClient());
  const [trpcClient] = useState(() => createTrpcClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
