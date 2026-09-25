import { StyleSheet, View, type DimensionValue } from 'react-native';

import { colors, radius, type RadiusToken } from '@/data/theme';

import type { JSX } from 'react';

export interface SkeletonProps {
  readonly width: DimensionValue;
  readonly height: number;
  readonly rounded?: RadiusToken;
}

/**
 * Static loading placeholder. Deliberately not animated — motion belongs to the
 * Reanimated phase (PLAN.md TASK 40).
 */
export function Skeleton({ width, height, rounded = 'sm' }: SkeletonProps): JSX.Element {
  return <View style={[styles.block, { width, height, borderRadius: radius[rounded] }]} />;
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border },
});
