// A picture drawn by the game and handed to the device's own "share" (a phone's share sheet), or
// saved as a file where the browser cannot share pictures. Web only: nothing here runs without a
// document, and YouTube's build does not include it (its rules allow no way out of the game).
import { getSitePath } from '@/components/puzzle/puzzle-card';
import { RESULT_CARD_HEIGHT, RESULT_CARD_WIDTH } from '@/game/result-card';
import { getA11yLocale } from '@/i18n/a11y-label';
import type { A11yLocale } from '@/i18n/a11y-label';
import type { PictureShare, ShareLinkId } from '@/platform/game-host';

export const CARD_WATER = '#C6E8F4';
export const CARD_INK = '#12334A';
export const CARD_FONT = 'Helvetica, Arial, sans-serif';

/**
 * Draws a picture and gets it ready to send. The drawing is done before the player asks: a
 * browser only lets a page open the share sheet in the moment of a tap, with nothing to wait for
 * in between. Undefined where there is no page to draw on.
 *
 * `page` is the page of the site that leads to what the picture shows ("p/46" for a puzzle,
 * "puzzle" for the game itself). The address that goes along is the site's own with that page,
 * without anything a visit may have added. It goes along as text and is not drawn on the picture.
 *
 * `line` is what the message says before the address, where the place it is posted to takes a
 * message: the puzzle itself in one line. It is what shows the puzzle where the address's card
 * cannot (a puzzle a player made has no card of its own). The game's name follows it as a tag.
 *
 * `lead` is what the ways of sending put first (see PictureShare).
 */
export async function preparePictureShare(
  fileName: string,
  { page, line, lead }: { page: string; line?: string; lead: PictureShare['lead'] },
  draw: (context: CanvasRenderingContext2D) => void,
): Promise<PictureShare | undefined> {
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
  const address = `${window.location.origin}${getSitePath(window.location.pathname)}${page}`;
  const message = line === undefined ? undefined : `${line}  ${SHARE_TAGS[getA11yLocale()]}`;
  draw(context);

  const blob = await toPngBlob(canvas);
  if (!blob) {
    return undefined;
  }
  const file = new File([blob], fileName, { type: 'image/png' });
  const previewUrl = URL.createObjectURL(blob);

  return {
    lead,
    previewUrl,
    release: () => URL.revokeObjectURL(previewUrl),
    shareWithDevice: canShare(file)
      ? () => {
          // Closing the share sheet without choosing is not a failure. Anything else: the file, at least.
          const saveUnlessClosed = (error: unknown) => {
            if (!(error instanceof Error && error.name === 'AbortError')) {
              saveFile(file);
            }
          };
          try {
            navigator.share({ files: [file], text: message === undefined ? address : `${message}\n${address}` }).catch(saveUnlessClosed);
          } catch (error) {
            saveUnlessClosed(error);
          }
        }
      : undefined,
    save: () => saveFile(file),
    copyAddress: () => copyText(address),
    openLink: (place) => {
      window.open(SHARE_PAGES[place](encodeURIComponent(address), message === undefined ? undefined : encodeURIComponent(message)), '_blank', 'noopener,noreferrer');
    },
  };
}

// How long the browser gets to make the file in its own time before it is made on the spot.
const BLOB_PATIENCE_MS = 300;

/**
 * The drawing as a PNG file. A browser makes it in the page's idle moments, which is kind to the
 * game; but Chrome, when it finds no idle moment (a page that is not being repainted), only gives
 * up waiting after almost seven seconds, and the share button would be that late. So the browser
 * gets a moment, and after that the file is made at once, which takes a few hundredths of a second.
 */
function toPngBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    let isDone = false;
    const done = (blob: Blob | null) => {
      if (!isDone) {
        isDone = true;
        resolve(blob);
      }
    };
    canvas.toBlob(done, 'image/png');
    setTimeout(() => {
      if (isDone) {
        return;
      }
      try {
        const bytes = atob(canvas.toDataURL('image/png').split(',')[1]);
        const data = new Uint8Array(bytes.length);
        for (let index = 0; index < bytes.length; index += 1) {
          data[index] = bytes.charCodeAt(index);
        }
        done(new Blob([data], { type: 'image/png' }));
      } catch {
        // Left to the browser after all.
      }
    }, BLOB_PATIENCE_MS);
  });
}

// The game's name, as a tag after the message: posts about it can be found together. The message
// is written in the browser of the one who posts it, so the tag follows that browser's language
// (what language its readers use cannot be known when it is written).
const SHARE_TAGS: Record<A11yLocale, string> = { ja: '#まるまる電卓', en: '#MaruMaruCalc' };

// The pages that post a link, as each place documents them. All take the address and none takes a
// picture; X, LINE and Bluesky also take a message to go with it (Bluesky as one text with the
// address in it). Facebook and Hatena Bookmark take the address alone. Both come in already encoded.
const SHARE_PAGES: Record<ShareLinkId, (address: string, message: string | undefined) => string> = {
  x: (address, message) => `https://twitter.com/intent/tweet?${message === undefined ? '' : `text=${message}&`}url=${address}`,
  line: (address, message) => `https://social-plugins.line.me/lineit/share?url=${address}${message === undefined ? '' : `&text=${message}`}`,
  facebook: (address) => `https://www.facebook.com/sharer/sharer.php?u=${address}`,
  bluesky: (address, message) => `https://bsky.app/intent/compose?text=${message === undefined ? '' : `${message}%0A`}${address}`,
  hatena: (address) => `https://b.hatena.ne.jp/add?mode=confirm&url=${address}`,
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // An older browser, or one that keeps the clipboard to itself: the old way, through a text box.
    try {
      const box = document.createElement('textarea');
      box.value = text;
      box.style.position = 'fixed';
      box.style.opacity = '0';
      document.body.appendChild(box);
      box.select();
      const copied = document.execCommand('copy');
      box.remove();
      return copied;
    } catch {
      return false;
    }
  }
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
  [960, 210, 120],
  [110, 760, 78],
  [170, 150, 38],
  [930, 900, 50],
  [760, 80, 24],
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
