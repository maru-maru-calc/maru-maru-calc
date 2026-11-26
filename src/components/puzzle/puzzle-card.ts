// The picture of one puzzle that a player can send to someone: where its parts go.
//
// It is the board as it stands before the first move, as a phone held upright shows it: the
// number and the goal at the top, the four operators in a row (with how often each may be used),
// the bubbles over the bowl. No words, no address, and no way to the goal. Drawing it is
// platform/share-puzzle.ts.
import { BASIN_BODY_THICKNESS, OPERATORS } from '@/components/marumaru/constants';
import { createPendingBubbles, getBasinCurveMetrics, getContainedBeadParts, getContainedBeadPositions, getEntityRadius } from '@/components/marumaru/field-layout';
import type { OperatorSymbol, OperatorUsageLimit, PlaceValue, Stage } from '@/game/types';

// The field of a board 400 by 350, drawn 2.7 times as big across the picture, under the operators.
export const PUZZLE_CARD_FIELD = { width: 400, height: 350, scale: 2.7, left: 0, top: 398 };
// The first row of bubbles sits this far down the field: the biggest bubble is whole under the operators.
const BUBBLE_ROW_Y = 72;
// The top of the picture: the goal over a row of four operators.
export const PUZZLE_CARD_PANEL = { centerX: 540, titleBaseline: 196, operatorsLeft: 48, operatorsTop: 246, operatorWidth: 228, operatorHeight: 124, operatorGap: 24 };

export type PuzzleCardBubble = { count: number; x: number; y: number; radius: number; maru: Array<{ value: PlaceValue; x: number; y: number; radius: number }> };
export type PuzzleCardOperator = { symbol: OperatorSymbol; x: number; y: number; width: number; height: number; limit: OperatorUsageLimit };
export type PuzzleCard = {
  /** What stands before the goal: the puzzle's number, or a pencil on a puzzle a player made. */
  mark: number | 'pencil';
  goal: number;
  bubbles: PuzzleCardBubble[];
  bowl: { centerX: number; centerY: number; radius: number; halfAngle: number; thickness: number };
  operators: PuzzleCardOperator[];
};

export function getPuzzleCard(mark: number | 'pencil', stage: Pick<Stage, 'target' | 'bubbleCounts' | 'operatorLimits'>): PuzzleCard {
  const FIELD = PUZZLE_CARD_FIELD;
  const toCardX = (x: number) => FIELD.left + x * FIELD.scale;
  const toCardY = (y: number) => FIELD.top + y * FIELD.scale;

  // The bubbles where the board itself puts them: in one row, or two when one would be crowded.
  const bubbles = createPendingBubbles(FIELD.width, stage.bubbleCounts, 'fit', BUBBLE_ROW_Y).map((bubble): PuzzleCardBubble => {
    const radius = getEntityRadius(1, bubble.count);
    return {
      count: bubble.count,
      x: toCardX(bubble.x),
      y: toCardY(bubble.y),
      radius: radius * FIELD.scale,
      // The maru inside, as the board shows them: a ten-maru for every ten.
      maru: getContainedBeadPositions(getContainedBeadParts(bubble.count), radius).map(({ bead, x, y }) => ({
        value: bead.value,
        x: toCardX(bubble.x - radius + x + bead.radius),
        y: toCardY(bubble.y - radius + y + bead.radius),
        radius: bead.radius * FIELD.scale,
      })),
    };
  });

  const curve = getBasinCurveMetrics(FIELD.width, FIELD.height);
  const bowl = {
    centerX: toCardX(curve.centerX),
    centerY: toCardY(curve.arcCenterY),
    radius: curve.radius * FIELD.scale,
    halfAngle: Math.asin(Math.min(1, curve.halfWidth / curve.radius)),
    thickness: (BASIN_BODY_THICKNESS / 2) * FIELD.scale,
  };

  const { operatorsLeft, operatorsTop, operatorWidth, operatorHeight, operatorGap } = PUZZLE_CARD_PANEL;
  const operators = OPERATORS.map((symbol, index): PuzzleCardOperator => ({
    symbol,
    x: operatorsLeft + index * (operatorWidth + operatorGap),
    y: operatorsTop,
    width: operatorWidth,
    height: operatorHeight,
    limit: stage.operatorLimits?.[symbol] ?? 'infinite',
  }));

  return { mark, goal: stage.target, bubbles, bowl, operators };
}

/** The file's name: no words a player has to read, only what tells two puzzles apart. */
export function getPuzzleCardFileName(number: number) {
  return `maru-puzzle-${number}.png`;
}

/** What the game's address needs after it to open this puzzle. */
export function getPuzzleQuery(number: number) {
  return `p=${number}`;
}

/**
 * The puzzle an address asks for ("?p=46"), if it names one of the `count` puzzles. Anything
 * else (no "p", not a number, a number there is no puzzle for) asks for none.
 */
export function readRequestedPuzzle(search: string, count: number): number | undefined {
  const text = new URLSearchParams(search).get('p');
  if (text === null || !/^[0-9]{1,4}$/.test(text)) {
    return undefined;
  }
  const number = Number(text);
  return number >= 1 && number <= count ? number : undefined;
}
