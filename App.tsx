import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { StyleSheet, Text, View } from 'react-native';

/**
 * Placeholder root component for TASK 01 (scaffold only).
 *
 * Navigation (TASK 16), providers (TASK 11), theming (TASK 05) and every
 * feature screen are intentionally absent — see PLAN.md.
 */
export default function App(): JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>VKU Study Room Booking</Text>
      <Text style={styles.subtitle}>Expo + React Native + TypeScript</Text>
      <Text style={styles.note}>Scaffold ready — TASK 01</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#101828',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: '#475467',
    textAlign: 'center',
  },
  note: {
    marginTop: 24,
    fontSize: 13,
    color: '#667085',
    textAlign: 'center',
  },
});
