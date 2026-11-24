import { useEffect, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * True when the device asks for less motion (the "Reduce motion" accessibility setting, or
 * `prefers-reduced-motion` on the web). Decorative movement should stop; movement that is the
 * game itself (the maru falling and merging) stays.
 */
// On the web the answer is available at once, which keeps autoplaying media from starting for a moment.
function getInitialValue() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(getInitialValue);

  useEffect(() => {
    let isMounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        if (isMounted) {
          setPrefersReducedMotion(isEnabled);
        }
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setPrefersReducedMotion);

    return () => {
      isMounted = false;
      subscription?.remove?.();
    };
  }, []);

  return prefersReducedMotion;
}
