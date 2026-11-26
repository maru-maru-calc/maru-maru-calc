// A picture drawn by the game and handed to the device's own "share" (a phone's share sheet), or
// saved as a file where the browser cannot share pictures. Web only: nothing here runs without a
// document, and YouTube's build does not include it (its rules allow no way out of the game).
import { RESULT_CARD_HEIGHT, RESULT_CARD_WIDTH } from '@/game/result-card';
import type { PictureShare } from '@/platform/game-host';

export const CARD_WATER = '#C6E8F4';
export const CARD_INK = '#12334A';
export const CARD_FONT = 'Helvetica, Arial, sans-serif';

/**
 * Draws a picture and gets it ready to hand over. The drawing is done before the player asks: a
 * browser only lets a page open the share sheet in the moment of a tap, with nothing to wait for
 * in between. Undefined where there is no page to draw on.
 *
 * `query` is what the game's address needs after it to lead to what the picture shows ("p=46"
 * for a puzzle); the address itself is this page's own, without what a visit may have added.
 */
export async function preparePictureShare(fileName: string, query: string | undefined, draw: (context: CanvasRenderingContext2D, shownAddress: string) => void): Promise<PictureShare | undefined> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return undefined;
  }
  const canvas = document.createElement('canvas');
  canvas.width = RESULT_CARD_WIDTH;
  canvas.height = RESULT_CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) {
    return undefined;
  }
  const address = `${window.location.origin}${window.location.pathname}${query ? `?${query}` : ''}`;
  draw(context, address.replace(/^https?:\/\//, ''));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    return undefined;
  }
  const file = new File([blob], fileName, { type: 'image/png' });
  const canShareFile = canShare(file);

  return {
    share() {
      if (!canShareFile) {
        saveFile(file);
        return;
      }
      const saveUnlessClosed = (error: unknown) => {
        // Closing the share sheet without choosing is not a failure. Anything else: the file, at least.
        if (!(error instanceof Error && error.name === 'AbortError')) {
          saveFile(file);
        }
      };
      try {
        navigator.share({ files: [file], text: address }).catch(saveUnlessClosed);
      } catch (error) {
        saveUnlessClosed(error);
      }
    },
  };
}

/** Whether this browser's "share" takes a picture. Asking must never be what breaks the result screen. */
function canShare(file: File) {
  try {
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function saveFile(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

// The bubbles that drift over the board, standing still: [x, y, radius].
const WATER_BUBBLES: Array<[number, number, number]> = [
  [1085, 150, 96],
  [118, 392, 62],
  [226, 118, 30],
  [1010, 452, 40],
  [932, 60, 18],
];

/** The water, with or without the bubbles that drift over the board. */
export function drawWater(context: CanvasRenderingContext2D, bubbles: Array<[number, number, number]> = WATER_BUBBLES) {
  context.fillStyle = CARD_WATER;
  context.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT);
  for (const [x, y, radius] of bubbles) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.28)';
    context.fill();
    context.lineWidth = 8;
    context.strokeStyle = 'rgba(125, 211, 252, 0.42)';
    context.stroke();
  }
}

/** The bowl: an arc of the circle around (centerX, centerY), `halfAngle` to either side of straight down. */
export function drawBowl(context: CanvasRenderingContext2D, bowl: { centerX: number; centerY: number; radius: number; halfAngle: number }, thickness: number) {
  // Canvas angles run clockwise from "right"; straight down is a quarter turn.
  context.beginPath();
  context.arc(bowl.centerX, bowl.centerY, bowl.radius, Math.PI / 2 - bowl.halfAngle, Math.PI / 2 + bowl.halfAngle);
  context.lineWidth = thickness;
  context.lineCap = 'round';
  context.strokeStyle = 'rgba(125, 211, 252, 0.9)';
  context.stroke();
}

/** A maru as it lies in the bowl. */
export function drawMaru(context: CanvasRenderingContext2D, x: number, y: number, radius: number, kind: { color: string; rimColor: string; shineColor: string }) {
  const rim = Math.max(2, radius * 0.14);
  context.beginPath();
  context.arc(x, y, radius - rim / 2, 0, Math.PI * 2);
  context.fillStyle = kind.color;
  context.fill();
  context.lineWidth = rim;
  context.strokeStyle = kind.rimColor;
  context.stroke();
  context.beginPath();
  context.arc(x - radius * 0.3, y - radius * 0.3, radius * 0.24, 0, Math.PI * 2);
  context.fillStyle = kind.shineColor;
  context.fill();
}

/** The game's address, small, in a bottom corner. */
export function drawAddress(context: CanvasRenderingContext2D, shownAddress: string, side: 'left' | 'right', size = 26) {
  context.font = `700 ${size}px ${CARD_FONT}`;
  context.textBaseline = 'alphabetic';
  context.textAlign = side;
  context.fillStyle = 'rgba(18, 51, 74, 0.6)';
  context.fillText(shownAddress, side === 'right' ? RESULT_CARD_WIDTH - 36 : 36, RESULT_CARD_HEIGHT - 28, RESULT_CARD_WIDTH - 72);
}

/** The same clock face as the one-minute game's sign. */
export function drawClock(context: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) {
  const stroke = size * 0.1;
  context.lineWidth = stroke;
  context.lineCap = 'round';
  context.strokeStyle = CARD_INK;
  context.beginPath();
  context.arc(centerX, centerY, size / 2 - stroke / 2, 0, Math.PI * 2);
  context.stroke();
  context.beginPath();
  context.moveTo(centerX, centerY - size * 0.26);
  context.lineTo(centerX, centerY);
  context.lineTo(centerX + size * 0.2, centerY);
  context.lineJoin = 'round';
  context.stroke();
}
