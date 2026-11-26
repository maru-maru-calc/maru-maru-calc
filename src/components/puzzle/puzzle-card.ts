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

/** Where a picture of a puzzle puts the field and the row of operators. */
export type PuzzleCardLayout = {
  /** The board's field (its size on the board), how many times as big it is drawn, and where. */
  field: { width: number; height: number; scale: number; left: number; top: number };
  /** How far down the field the first row of bubbles sits. */
  bubbleRowY: number;
  operators: { left: number; top: number; width: number; height: number; gap: number };
};

const UPRIGHT: PuzzleCardLayout = {
  field: PUZZLE_CARD_FIELD,
  bubbleRowY: BUBBLE_ROW_Y,
  operators: { left: PUZZLE_CARD_PANEL.operatorsLeft, top: PUZZLE_CARD_PANEL.operatorsTop, width: PUZZLE_CARD_PANEL.operatorWidth, height: PUZZLE_CARD_PANEL.operatorHeight, gap: PUZZLE_CARD_PANEL.operatorGap },
};

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

/** The parts of a puzzle's picture: upright as it is sent, unless another layout is given (the card a link shows lies on its side). */
export function getPuzzleCard(mark: number | 'pencil', stage: Pick<Stage, 'target' | 'bubbleCounts' | 'operatorLimits'>, layout: PuzzleCardLayout = UPRIGHT): PuzzleCard {
  const FIELD = layout.field;
  const toCardX = (x: number) => FIELD.left + x * FIELD.scale;
  const toCardY = (y: number) => FIELD.top + y * FIELD.scale;

  // The bubbles where the board itself puts them: in one row, or two when one would be crowded.
  const bubbles = createPendingBubbles(FIELD.width, stage.bubbleCounts, 'fit', layout.bubbleRowY).map((bubble): PuzzleCardBubble => {
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

  const operators = OPERATORS.map((symbol, index): PuzzleCardOperator => ({
    symbol,
    x: layout.operators.left + index * (layout.operators.width + layout.operators.gap),
    y: layout.operators.top,
    width: layout.operators.width,
    height: layout.operators.height,
    limit: stage.operatorLimits?.[symbol] ?? 'infinite',
  }));

  return { mark, goal: stage.target, bubbles, bowl, operators };
}

/** The file's name: no words a player has to read, only what tells two puzzles apart. */
export function getPuzzleCardFileName(number: number) {
  return `maru-puzzle-${number}.png`;
}

/**
 * The puzzle in one line, for the message its address is posted with: "#46  6 · 2 · 4 · 10 · 5 → 28 ?".
 * Figures and signs only, so it reads the same in any language: these bubbles, that goal. The
 * bubbles are set apart by dots and not by the signs to be found ("6 ? 2 ? 4"): that would look
 * as if they had to be used in this order, and any order is allowed. A puzzle a player made has
 * no number.
 */
export function getPuzzleLine(number: number | undefined, stage: Pick<Stage, 'target' | 'bubbleCounts'>) {
  return `${number === undefined ? '' : `#${number}  `}${stage.bubbleCounts.join(' · ')} → ${stage.target} ?`;
}

/**
 * The page of one puzzle, as the site's address continues to reach it: "p/46". Every numbered
 * puzzle has a page of its own, so that a link to it shows a card with that puzzle on it (a site
 * that shows links reads the page as it is served, and one page can only say one thing).
 */
export function getPuzzlePage(number: number) {
  return `p/${number}`;
}

/** The puzzle a page's path names ("/maru-maru-calc/p/46"), if it is one of the `count` puzzles. */
export function readPuzzlePage(pathname: string, count: number): number | undefined {
  const text = /\/p\/([0-9]{1,4})\/?$/.exec(pathname)?.[1];
  if (text === undefined) {
    return undefined;
  }
  const number = Number(text);
  return number >= 1 && number <= count ? number : undefined;
}

/**
 * The site's own path, with the "/" that ends it, from the path of one of the puzzle game's
 * pages: "/maru-maru-calc/puzzle" and "/maru-maru-calc/p/46" both give "/maru-maru-calc/".
 */
export function getSitePath(pathname: string) {
  return `${pathname.replace(/\/(?:puzzle|p\/[0-9]+)\/?$/, '').replace(/\/$/, '')}/`;
}

/**
 * The puzzle an address asks for after "?" ("?p=46"), if it names one of the `count` puzzles.
 * This is how addresses were written before every puzzle had a page; they are still about, so
 * they still open their puzzle. Anything else (no "p", not a number, a number there is no puzzle
 * for) asks for none.
 */
export function readRequestedPuzzle(search: string, count: number): number | undefined {
  const text = new URLSearchParams(search).get('p');
  if (text === null || !/^[0-9]{1,4}$/.test(text)) {
    return undefined;
  }
  const number = Number(text);
  return number >= 1 && number <= count ? number : undefined;
}
