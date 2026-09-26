import { useEffect, useState } from 'react';
import { Animated, StyleSheet, type DimensionValue } from 'react-native';

import { colors, radius, type RadiusToken } from '@/data/theme';
import { useReduceMotion } from '@/hooks/useReduceMotion';

import type { JSX } from 'react';

export interface SkeletonProps {
  readonly width: DimensionValue;
  readonly height: number;
  readonly rounded?: RadiusToken;
}

const PULSE_MS = 700;
const DIM_OPACITY = 0.55;

/**
 * Loading placeholder with a gentle opacity pulse (native driver). Static when
 * the OS asks to reduce motion.
 */
export function Skeleton({ width, height, rounded = 'sm' }: SkeletonProps): JSX.Element {
  const reduceMotion = useReduceMotion();
  const opacity = useState(() => new Animated.Value(1))[0];

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: DIM_OPACITY,
          duration: PULSE_MS,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, { toValue: 1, duration: PULSE_MS, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => {
      pulse.stop();
    };
  }, [reduceMotion, opacity]);

  return (
    <Animated.View
      style={[styles.block, { width, height, borderRadius: radius[rounded], opacity }]}
    />
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.border },
});
