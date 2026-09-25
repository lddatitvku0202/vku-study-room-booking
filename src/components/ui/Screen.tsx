import { StyleSheet } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors } from '@/data/theme';

import type { JSX, ReactNode } from 'react';

export interface ScreenProps {
  readonly children: ReactNode;
  /** Which edges receive safe-area insets. Defaults to all but the bottom. */
  readonly edges?: readonly Edge[];
}

const DEFAULT_EDGES: readonly Edge[] = ['top', 'left', 'right'];

/** Full-screen container that respects notches and system bars. */
export function Screen({ children, edges = DEFAULT_EDGES }: ScreenProps): JSX.Element {
  return (
    <SafeAreaView edges={edges} style={styles.screen}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
});
