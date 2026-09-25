import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Side-effect import: validates `.env` configuration at startup and fails loudly
// if anything is missing or malformed (TASK 04).
import '@/services/config';

import { QueryProvider } from '@/providers/QueryProvider';
import { BrowseRoomsScreen } from '@/screens/BrowseRoomsScreen';

import type { JSX } from 'react';

/**
 * Application root.
 *
 * Provider order: safe-area insets outermost, then the server-state cache.
 * EMERGENCY MVP: a single screen, no navigation yet (PLAN.md TASK 16).
 */
export default function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <BrowseRoomsScreen />
        <StatusBar style="dark" />
      </QueryProvider>
    </SafeAreaProvider>
  );
}
