// The picture of a one-minute result that a player can share: where its parts go.
//
// No words on it, like the game, and no address either: a clock, the count, and the count again as maru lying in the
// bowl (a ten-maru for every ten, as on the board). Drawing it is platform/share-result.ts.
import { getBeadKind } from './beads';

/** Upright, 4 to 5: the pictures are mostly sent from phones and looked at on phones. */
export const RESULT_CARD_WIDTH = 1080;
export const RESULT_CARD_HEIGHT = 1350;

/** The bowl: an arc of a circle, as on the board. */
export const RESULT_CARD_BOWL = { centerX: 540, bottomY: 1170, halfWidth: 430, depth: 300, thickness: 18 };

// Maru are drawn this many times as big as on the board.
const MARU_SCALE = 2.5;
const MARU_GAP = 8;
// The share of the bowl's arc the maru may take before they are drawn smaller.
const MARU_ARC_SHARE = 0.9;

export type ResultCardMaru = { value: 1 | 10; x: number; y: number; radius: number };

/** The circle the bowl is an arc of. */
export function getResultCardBowlCircle() {
  const { centerX, bottomY, halfWidth, depth } = RESULT_CARD_BOWL;
  const radius = (halfWidth * halfWidth + depth * depth) / (2 * depth);
  return { centerX, centerY: bottomY - radius, radius, halfAngle: Math.asin(halfWidth / radius) };
}

/**
 * The count as maru lying side by side in the bottom of the bowl: the tens on the left, then the
 * ones. They touch the bowl and not each other, and are drawn smaller when there are too many
 * for the bowl (from the high twenties up; nobody solves that many in a minute).
 */
export function getResultCardMaru(solved: number): ResultCardMaru[] {
  const count = getCount(solved);
  const values: Array<1 | 10> = [...Array.from({ length: Math.floor(count / 10) }, () => 10 as const), ...Array.from({ length: count % 10 }, () => 1 as const)];
  if (values.length === 0) {
    return [];
  }

  const bowl = getResultCardBowlCircle();
  const inner = bowl.radius - RESULT_CARD_BOWL.thickness / 2;
  // The angle a maru of this radius takes on the arc its middle moves along, gap included.
  const angleOf = (radius: number) => 2 * Math.asin((radius + MARU_GAP / 2) / (inner - radius));
  const place = (scale: number) => {
    const radii = values.map((value) => getBeadKind(value).radius * MARU_SCALE * scale);
    return { radii, total: radii.reduce((sum, radius) => sum + angleOf(radius), 0) };
  };

  const room = bowl.halfAngle * 2 * MARU_ARC_SHARE;
  const atFullSize = place(1);
  const { radii, total } = atFullSize.total <= room ? atFullSize : place(room / atFullSize.total);

  let angle = -total / 2;
  return values.map((value, index) => {
    const radius = radii[index];
    const middle = angle + angleOf(radius) / 2;
    angle += angleOf(radius);
    return { value, radius, x: bowl.centerX + (inner - radius) * Math.sin(middle), y: bowl.centerY + (inner - radius) * Math.cos(middle) };
  });
}

/** The file's name: no words a player has to read, only what tells two results apart. */
export function getResultCardFileName(solved: number) {
  return `maru-1min-${getCount(solved)}.png`;
}

/** The count as a whole number that can be drawn, whatever was handed in. */
export function getCount(solved: number) {
  return Number.isFinite(solved) ? Math.max(0, Math.min(999, Math.floor(solved))) : 0;
}
