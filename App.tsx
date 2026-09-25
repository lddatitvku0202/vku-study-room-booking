import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Side-effect import: validates `.env` configuration at startup and fails loudly
// if anything is missing or malformed (TASK 04).
import '@/services/config';

import { colors } from '@/data/theme';
import { RootNavigator } from '@/navigation/RootNavigator';
import { QueryProvider } from '@/providers/QueryProvider';

import type { JSX } from 'react';

/** React Navigation colours mapped onto the design tokens. */
const navigationTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.text,
    border: colors.border,
    notification: colors.error,
  },
};

/**
 * Application root.
 *
 * Provider order, outermost first: safe-area insets, the server-state cache,
 * then navigation. EMERGENCY MVP — see docs/progress.md.
 */
export default function App(): JSX.Element {
  return (
    <SafeAreaProvider>
      <QueryProvider>
        <NavigationContainer theme={navigationTheme}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style="dark" />
      </QueryProvider>
    </SafeAreaProvider>
  );
}
