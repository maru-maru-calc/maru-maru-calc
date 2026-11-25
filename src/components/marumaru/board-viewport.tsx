import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';

import type { BoardViewport } from '@/layout/fit-board';

// Set by a screen that shows the board shrunk to fit (components/puzzle/fit-to-screen.tsx).
// Without it the board takes the window as it is.
const BoardViewportContext = createContext<BoardViewport | undefined>(undefined);

export const BoardViewportProvider = BoardViewportContext.Provider;

/** The space the board has to lay itself out in. */
export function useBoardViewport(): BoardViewport {
  const given = useContext(BoardViewportContext);
  const { width, height } = useWindowDimensions();
  return given ?? { width, height, scale: 1 };
}

/**
 * How much the board is shrunk on screen. A finger's travel is measured on the screen, so a drag
 * has to be divided by this to follow the finger.
 */
export function useBoardScale(): number {
  return useContext(BoardViewportContext)?.scale ?? 1;
}
