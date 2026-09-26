import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** True when the user asked the OS to reduce motion; animations should then be skipped. */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isActive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isActive) {
          setReduceMotion(enabled);
        }
      })
      .catch(() => {
        // Unknown: keep animations on; they are subtle.
      });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      isActive = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
