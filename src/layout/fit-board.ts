// The board is laid out for a screen at least this big: the bowl needs room under two rows of
// bubbles, and the header, the operators and the line of the calculation need theirs.
export const BOARD_MIN_WIDTH = 320;
export const BOARD_MIN_HEIGHT = 640;

/** The space the board lays itself out in, and how much it is shrunk to fit the screen. */
export type BoardViewport = { width: number; height: number; scale: number };

/**
 * On a screen that is too short or too narrow for the board (a phone held sideways, a small
 * window), the board keeps the screen's shape but is laid out bigger and shown shrunk, so that
 * all of it is in view. On a screen that is big enough nothing changes.
 */
export function fitBoardToScreen(screenWidth: number, screenHeight: number): BoardViewport {
  if (!(screenWidth > 0) || !(screenHeight > 0)) {
    return { width: Math.max(0, screenWidth || 0), height: Math.max(0, screenHeight || 0), scale: 1 };
  }
  const scale = Math.min(1, screenWidth / BOARD_MIN_WIDTH, screenHeight / BOARD_MIN_HEIGHT);
  return { width: screenWidth / scale, height: screenHeight / scale, scale };
}
