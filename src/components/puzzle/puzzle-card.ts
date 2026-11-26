// The picture of one puzzle that a player can send to someone: where its parts go.
//
// It is the board as it stands before the first move, laid out as on a wide screen: the number
// and the goal and the four operators (with how often each may be used) on the left, the bubbles
// over the bowl on the right. No words, and no way to the goal. Drawing it is
// platform/share-puzzle.ts.
import { BASIN_BODY_THICKNESS, BUBBLE_ROW_Y_BESIDE_PANEL, OPERATORS } from '@/components/marumaru/constants';
import { createPendingBubbles, getBasinCurveMetrics, getContainedBeadParts, getContainedBeadPositions, getEntityRadius } from '@/components/marumaru/field-layout';
import type { OperatorSymbol, OperatorUsageLimit, PlaceValue, Stage } from '@/game/types';

// The field of a board 440 by 420, drawn one and a half times as big on the right of the picture.
const FIELD = { width: 440, height: 420, scale: 1.5, left: 520, top: 0 };
// The panel on the left: the goal over two rows of two operators.
export const PUZZLE_CARD_PANEL = { left: 52, right: 468, titleBaseline: 158, operatorsTop: 214, operatorWidth: 200, operatorHeight: 104, operatorGap: 16 };

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
  const toCardX = (x: number) => FIELD.left + x * FIELD.scale;
  const toCardY = (y: number) => FIELD.top + y * FIELD.scale;

  // The bubbles where the board itself puts them: in one row, or two when one would be crowded.
  const bubbles = createPendingBubbles(FIELD.width, stage.bubbleCounts, 'fit', BUBBLE_ROW_Y_BESIDE_PANEL).map((bubble): PuzzleCardBubble => {
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

  const { left, operatorsTop, operatorWidth, operatorHeight, operatorGap } = PUZZLE_CARD_PANEL;
  const operators = OPERATORS.map((symbol, index): PuzzleCardOperator => ({
    symbol,
    x: left + (index % 2) * (operatorWidth + operatorGap),
    y: operatorsTop + Math.floor(index / 2) * (operatorHeight + operatorGap),
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
