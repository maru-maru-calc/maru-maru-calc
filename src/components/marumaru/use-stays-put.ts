import { useEffect } from 'react';
import type { RefObject } from 'react';
import { Platform } from 'react-native';
import type { View } from 'react-native';

/**
 * Web: keeps a box that clips its content from ever being scrolled.
 *
 * The decorative bubbles drift past the edge of the screen, so the board's box holds a little
 * more than it shows. The player cannot scroll it, but a script can, and so can the browser when
 * it brings a focused control into view; the whole board then sits shifted sideways and stays
 * there. Any such scroll is put back before it is drawn.
 */
export function useStaysPut(ref: RefObject<View | null>) {
  useEffect(() => {
    if (Platform.OS !== 'web') {
      return undefined;
    }
    const node = ref.current as unknown as HTMLElement | null;
    if (!node || typeof node.addEventListener !== 'function') {
      return undefined;
    }
    const putBack = () => {
      if (node.scrollLeft !== 0) {
        node.scrollLeft = 0;
      }
      if (node.scrollTop !== 0) {
        node.scrollTop = 0;
      }
    };
    putBack();
    node.addEventListener('scroll', putBack);
    return () => node.removeEventListener('scroll', putBack);
  }, [ref]);
}
