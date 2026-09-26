import { useEffect, useState } from 'react';
import { Animated } from 'react-native';

import { useReduceMotion } from '@/hooks/useReduceMotion';

import type { JSX, ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

export interface FadeInProps {
  readonly children: ReactNode;
  readonly style?: StyleProp<ViewStyle>;
}

const DURATION_MS = 260;
const OFFSET = 12;

/**
 * One short entrance (fade + slight rise) on mount, on the native driver.
 * For single screens only — never wrap list rows in it. Skipped when the OS
 * asks to reduce motion.
 */
export function FadeIn({ children, style }: FadeInProps): JSX.Element {
  const reduceMotion = useReduceMotion();
  const progress = useState(() => new Animated.Value(0))[0];

  useEffect(() => {
    if (reduceMotion) {
      progress.setValue(1);
      return undefined;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: true,
    });
    animation.start();
    return () => {
      animation.stop();
    };
  }, [reduceMotion, progress]);

  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [OFFSET, 0] });

  return (
    <Animated.View style={[style, { opacity: progress, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}
