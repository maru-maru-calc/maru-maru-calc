// Shows what is inside at a size the board can be laid out in, shrunk to fit the screen when the
// screen is too short or too narrow (see layout/fit-board.ts). The game must be playable at any
// screen shape, a phone held sideways included.
import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';

import { BoardViewportProvider } from '@/components/marumaru/board-viewport';
import { fitBoardToScreen } from '@/layout/fit-board';

export function FitToScreen({ children }: { children: ReactNode }) {
  const { width, height } = useWindowDimensions();
  const viewport = useMemo(() => fitBoardToScreen(width, height), [height, width]);

  return (
    <View style={styles.screen}>
      {/* Laid out at its own size around the middle of the screen, then shrunk about its middle: it ends up covering the screen exactly. */}
      <View
        testID="fit-to-screen"
        style={[
          styles.board,
          { left: (width - viewport.width) / 2, top: (height - viewport.height) / 2, width: viewport.width, height: viewport.height, transform: [{ scale: viewport.scale }] },
        ]}
      >
        <BoardViewportProvider value={viewport}>{children}</BoardViewportProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#C6E8F4',
  },
  board: {
    position: 'absolute',
  },
});
