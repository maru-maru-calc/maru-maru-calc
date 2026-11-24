/** Outer size of the phone frame on the play page, before scaling. */
export const PHONE_SHELL_WIDTH = 430;
/** The game needs this much height to show its header, bowl and footer without clipping. */
export const PHONE_SHELL_MIN_HEIGHT = 700;
export const PHONE_SHELL_MAX_HEIGHT = 780;
const PHONE_SHELL_MIN_SCALE = 0.4;
const PHONE_SHELL_MAX_SCALE = 2;

/** From this width up, the web game is shown inside the phone frame instead of filling the window. */
export const PHONE_FRAME_MIN_WIDTH = 600;
/** From this width up, the play page opens in a new tab (desktop browsers). */
export const DESKTOP_MIN_WIDTH = 900;

export type PhoneFrameLayout = {
  /** Scale applied to the frame so it fills the space it is given. */
  scale: number;
  /** Size of the frame before scaling. The game inside lays itself out for this size. */
  shellWidth: number;
  shellHeight: number;
  /** Size the scaled frame takes up on the page. */
  slotWidth: number;
  slotHeight: number;
};

/**
 * Fits the phone frame into the available space. The frame keeps its own width and a height the
 * game is comfortable with, and the whole frame is scaled: up on tablets and large monitors so the
 * maru are easier to touch, down on short windows so nothing is cut off.
 */
export function getPhoneFrameLayout(availableWidth: number, availableHeight: number): PhoneFrameLayout {
  const widthScale = availableWidth / PHONE_SHELL_WIDTH;
  const heightScale = availableHeight / PHONE_SHELL_MIN_HEIGHT;
  const scale = clamp(Math.min(widthScale, heightScale), PHONE_SHELL_MIN_SCALE, PHONE_SHELL_MAX_SCALE);
  // Height left over after scaling goes to a taller frame, up to its maximum.
  const shellHeight = clamp(availableHeight / scale, PHONE_SHELL_MIN_HEIGHT, PHONE_SHELL_MAX_HEIGHT);

  return {
    scale,
    shellWidth: PHONE_SHELL_WIDTH,
    shellHeight,
    slotWidth: PHONE_SHELL_WIDTH * scale,
    slotHeight: shellHeight * scale,
  };
}

/**
 * A phone held sideways: too short for the game, which is laid out for portrait, and too small
 * for a scaled-down frame to be playable. Wide but short desktop windows are not included.
 */
export function isSidewaysPhone(width: number, height: number) {
  return width > height && height < 500 && width < 1000;
}

/** Whether the web game should sit inside the phone frame for a window of this size. */
export function shouldUsePhoneFrame(width: number, height: number) {
  return width >= PHONE_FRAME_MIN_WIDTH && !isSidewaysPhone(width, height);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
