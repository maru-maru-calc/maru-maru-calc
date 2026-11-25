import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { Platform } from 'react-native';
import type { View } from 'react-native';

/**
 * Whether taps on plain water are reported (see `useWaterTaps`). Where they are not, a decoration
 * has to take its own presses, as it always did.
 */
export const HAS_WATER_TAPS = Platform.OS === 'web' && typeof document !== 'undefined';

// What a tap was meant for, when it lands on one of these: anything that says what it is, or can be focused.
const MEANT_FOR = 'button, a, input, textarea, select, [role], [aria-label], [tabindex]';

/**
 * Web: tells a layer of decorations (drifting bubbles, sea creatures) where the player tapped
 * plain water, in the layer's own points.
 *
 * The decorations drift over the whole screen, over buttons too. If they took presses themselves,
 * a tap on a button would pop the bubble that happened to be passing over it, and the button would
 * do nothing. So the layer lets every press through, and learns about a tap only when it was not
 * meant for anything else: not for a button, not for a maru, not for a number bubble.
 *
 * It listens on the layer's parent, which is the screen the decorations drift over.
 */
export function useWaterTaps(layerRef: RefObject<View | null>, onTap: (x: number, y: number) => void) {
  const latestOnTap = useRef(onTap);
  useEffect(() => {
    latestOnTap.current = onTap;
  });

  useEffect(() => {
    if (!HAS_WATER_TAPS) {
      return undefined;
    }
    const layer = layerRef.current as unknown as HTMLElement | null;
    const screen = layer?.parentElement;
    if (!layer || !screen) {
      return undefined;
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || !screen.contains(target)) {
        return;
      }
      const meantFor = target.closest(MEANT_FOR);
      if (meantFor && meantFor !== screen && screen.contains(meantFor)) {
        return;
      }
      // A pressable without a name (one that covers the board to skip a replay, say) still shows the hand.
      if (getComputedStyle(target).cursor === 'pointer') {
        return;
      }
      // The screen may be drawn smaller than it is laid out (a board fitted to a short window).
      const box = layer.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) {
        return;
      }
      latestOnTap.current(((event.clientX - box.left) * layer.offsetWidth) / box.width, ((event.clientY - box.top) * layer.offsetHeight) / box.height);
    };

    screen.addEventListener('click', onClick);
    return () => screen.removeEventListener('click', onClick);
  }, [layerRef]);
}
