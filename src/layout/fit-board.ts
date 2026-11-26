// The board is laid out for a screen at least this big: the bowl needs room under two rows of
// bubbles, and the header, the operators and the line of the calculation need theirs.
export const BOARD_MIN_WIDTH = 320;
export const BOARD_MIN_HEIGHT = 640;

// On a screen that is wide and short (a phone held sideways, a player on a desktop page), the
// goal, the operators and the line of the calculation go into a panel beside the bowl instead of
// above and below it. That needs far less height: the bowl's own.
export const SIDE_PANEL_WIDTH = 288;
export const SIDE_BY_SIDE_MIN_WIDTH = SIDE_PANEL_WIDTH + BOARD_MIN_WIDTH;
export const SIDE_BY_SIDE_MIN_HEIGHT = 360;
// A wide screen with room to spare (a desktop page, a tablet) shows the board bigger, as if the
// screen were this size, instead of a small board in a lot of water. Everything on the board is
// drawn, not a picture, so bigger is as sharp.
export const SIDE_BY_SIDE_ROOMY_WIDTH = 768;
export const SIDE_BY_SIDE_ROOMY_HEIGHT = 480;
// Beside the panel the bowl is at most this many times as wide as it is tall. On a wider screen
// the panel and the bowl sit in the middle with water on both sides, instead of a bowl stretched flat.
export const SIDE_BY_SIDE_FIELD_MAX_ASPECT = 1.25;

/** Whether the goal, operators and line are above and below the bowl, or in a panel beside it. */
export type BoardArrangement = 'stacked' | 'sideBySide';

/** The space the board lays itself out in, how it is arranged there, and how much it is shrunk (or, on a big wide screen, enlarged) to fit the screen. */
export type BoardViewport = { width: number; height: number; scale: number; arrangement: BoardArrangement };

/**
 * On a screen that is too short or too narrow for the board (a small window, a tiny phone), the
 * board keeps the screen's shape but is laid out bigger and shown shrunk, so that all of it is in
 * view.
 *
 * A screen that is wider than tall gets the panel beside the bowl. That never needs more shrinking
 * than the usual arrangement would there, and mostly needs none: a phone held sideways (844 × 390)
 * is shown at full size, where the usual arrangement would be shrunk to 61%. A wide screen much
 * bigger than a phone shows the board enlarged.
 *
 * An upright screen that is big enough is left as it is.
 */
export function fitBoardToScreen(screenWidth: number, screenHeight: number): BoardViewport {
  if (!(screenWidth > 0) || !(screenHeight > 0)) {
    return { width: Math.max(0, screenWidth || 0), height: Math.max(0, screenHeight || 0), scale: 1, arrangement: 'stacked' };
  }
  const arrangement: BoardArrangement = screenWidth > screenHeight ? 'sideBySide' : 'stacked';
  const scale = arrangement === 'sideBySide' ? getSideBySideScale(screenWidth, screenHeight) : Math.min(1, screenWidth / BOARD_MIN_WIDTH, screenHeight / BOARD_MIN_HEIGHT);
  return { width: screenWidth / scale, height: screenHeight / scale, scale, arrangement };
}

function getSideBySideScale(screenWidth: number, screenHeight: number) {
  const toFit = Math.min(screenWidth / SIDE_BY_SIDE_MIN_WIDTH, screenHeight / SIDE_BY_SIDE_MIN_HEIGHT);
  if (toFit < 1) {
    return toFit;
  }
  return Math.max(1, Math.min(screenWidth / SIDE_BY_SIDE_ROOMY_WIDTH, screenHeight / SIDE_BY_SIDE_ROOMY_HEIGHT));
}
