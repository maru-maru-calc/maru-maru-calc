// Hands the picture of a one-minute result to the device's own "share" (a phone's share sheet),
// or saves it as a file where the browser cannot share pictures. Web only: nothing here runs
// without a document, and YouTube's build does not include it (its rules allow no way out of
// the game).
import { getBeadKind } from '@/game/beads';
import {
  getCount,
  getResultCardBowlCircle,
  getResultCardFileName,
  getResultCardMaru,
  RESULT_CARD_BOWL,
  RESULT_CARD_HEIGHT,
  RESULT_CARD_WIDTH,
} from '@/game/result-card';
import type { ResultShare } from '@/platform/game-host';

const WATER = '#C6E8F4';
const INK = '#12334A';
const FONT = 'Helvetica, Arial, sans-serif';

// The bubbles that drift over the board, standing still: [x, y, radius].
const BUBBLES: Array<[number, number, number]> = [
  [1085, 150, 96],
  [118, 392, 62],
  [226, 118, 30],
  [1010, 452, 40],
  [932, 60, 18],
];

/**
 * Draws the picture and gets it ready to hand over. The drawing is done before the player asks:
 * a browser only lets a page open the share sheet in the moment of a tap, with nothing to wait
 * for in between. Undefined where there is no page to draw on.
 */
export async function prepareResultShare(solved: number): Promise<ResultShare | undefined> {
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
  // Where the game is: this page's own address, without what a visit may have added to it.
  const address = `${window.location.origin}${window.location.pathname}`;
  drawResultCard(context, solved, address.replace(/^https?:\/\//, ''));

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    return undefined;
  }
  const file = new File([blob], getResultCardFileName(solved), { type: 'image/png' });
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

function drawResultCard(context: CanvasRenderingContext2D, solved: number, address: string) {
  context.fillStyle = WATER;
  context.fillRect(0, 0, RESULT_CARD_WIDTH, RESULT_CARD_HEIGHT);

  for (const [x, y, radius] of BUBBLES) {
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = 'rgba(255, 255, 255, 0.28)';
    context.fill();
    context.lineWidth = 8;
    context.strokeStyle = 'rgba(125, 211, 252, 0.42)';
    context.stroke();
  }

  // The bowl. Canvas angles run clockwise from "right"; straight down is a quarter turn.
  const bowl = getResultCardBowlCircle();
  context.beginPath();
  context.arc(bowl.centerX, bowl.centerY, bowl.radius, Math.PI / 2 - bowl.halfAngle, Math.PI / 2 + bowl.halfAngle);
  context.lineWidth = RESULT_CARD_BOWL.thickness;
  context.lineCap = 'round';
  context.strokeStyle = 'rgba(125, 211, 252, 0.9)';
  context.stroke();

  for (const maru of getResultCardMaru(solved)) {
    const kind = getBeadKind(maru.value);
    const rim = Math.max(2, maru.radius * 0.14);
    context.beginPath();
    context.arc(maru.x, maru.y, maru.radius - rim / 2, 0, Math.PI * 2);
    context.fillStyle = kind.color;
    context.fill();
    context.lineWidth = rim;
    context.strokeStyle = kind.rimColor;
    context.stroke();
    context.beginPath();
    context.arc(maru.x - maru.radius * 0.3, maru.y - maru.radius * 0.3, maru.radius * 0.24, 0, Math.PI * 2);
    context.fillStyle = kind.shineColor;
    context.fill();
  }

  // The clock and the count, side by side in the middle.
  const clock = 150;
  const gap = 44;
  const text = String(getCount(solved));
  context.font = `900 250px ${FONT}`;
  context.textBaseline = 'alphabetic';
  const textWidth = context.measureText(text).width;
  const left = (RESULT_CARD_WIDTH - (clock + gap + textWidth)) / 2;
  const middleY = 200;
  drawClock(context, left + clock / 2, middleY, clock);
  context.fillStyle = INK;
  context.textAlign = 'left';
  // Digits stand on the line and are about 0.72 of the size tall: this puts their middle on the clock's.
  context.fillText(text, left + clock + gap, middleY + 250 * 0.36);

  context.font = `700 26px ${FONT}`;
  context.textAlign = 'right';
  context.fillStyle = 'rgba(18, 51, 74, 0.6)';
  context.fillText(address, RESULT_CARD_WIDTH - 36, RESULT_CARD_HEIGHT - 28, RESULT_CARD_WIDTH - 72);
}

/** The same clock face as the one-minute game's sign. */
function drawClock(context: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) {
  const stroke = size * 0.1;
  context.lineWidth = stroke;
  context.lineCap = 'round';
  context.strokeStyle = INK;
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
