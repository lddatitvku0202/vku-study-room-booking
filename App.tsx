import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/data/theme';
import { appConfig } from '@/services/config';

import type { JSX } from 'react';

/**
 * Placeholder root component for the scaffold.
 *
 * Importing the config module runs configuration validation at startup, so a
 * missing or malformed `.env` fails immediately and visibly (TASK 04).
 * Styling comes entirely from the design tokens (TASK 05) — no hard-coded
 * colours or spacing live here.
 *
 * Navigation (TASK 16), providers (TASK 11) and every feature screen are
 * intentionally absent — see PLAN.md.
 */
export default function App(): JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>VKU Study Room Booking</Text>
        <Text style={styles.subtitle}>Expo + React Native + TypeScript</Text>
        <Text style={styles.note}>
          env: {appConfig.appEnv} · emulator: {String(appConfig.useFirebaseEmulator)}
        </Text>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  note: {
    ...typography.caption,
    marginTop: spacing.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
