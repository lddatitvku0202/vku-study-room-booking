/**
 * TanStack Query provider — the owner of server state (CLAUDE.md §4).
 *
 * Rooms are read through `useQuery`, never copied into client state. In the
 * emergency MVP the query function returns local mock data, but the separation
 * between server-data access and UI state is the real one.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import type { JSX, ReactNode } from 'react';

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000,
        retry: 1,
      },
    },
  });
}

interface QueryProviderProps {
  readonly children: ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps): JSX.Element {
  // Lazy initializer: exactly one client for the lifetime of the app.
  const [queryClient] = useState(createQueryClient);
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
