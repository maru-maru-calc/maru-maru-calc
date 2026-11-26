// The picture of one puzzle, as the board stands before the first move, and the address that
// opens that puzzle.
import { getPuzzleCard, getPuzzleCardFileName, getPuzzleLine, getPuzzlePage, PUZZLE_CARD_FIELD, PUZZLE_CARD_PANEL } from '@/components/puzzle/puzzle-card';
import type { PuzzleCard, PuzzleCardBubble, PuzzleCardOperator } from '@/components/puzzle/puzzle-card';
import { getBeadKind } from '@/game/beads';
import { getMadePuzzleQuery, writeMadePuzzle } from '@/game/made-puzzle';
import type { Stage } from '@/game/types';
import type { PictureShare, SharedPuzzle } from '@/platform/game-host';
import { CARD_FONT, CARD_INK, drawBowl, drawWater, preparePictureShare } from '@/platform/share-picture';

const ACCENT = '#0284C7';
const OPERATOR_BLUE = '#38BDF8';

// How much bigger than at the board's own size the bubbles' outlines, shines and labels are drawn.
const K = PUZZLE_CARD_FIELD.scale;

export function preparePuzzleShare(puzzle: SharedPuzzle, stage: Stage): Promise<PictureShare | undefined> {
  const isMade = 'made' in puzzle;
  const fileName = isMade ? `maru-made-${writeMadePuzzle(puzzle.made)}.png` : getPuzzleCardFileName(puzzle.number);
  // A numbered puzzle has a page of its own; a made one is told to the game's page after "?".
  const page = isMade ? `puzzle?${getMadePuzzleQuery(puzzle.made)}` : getPuzzlePage(puzzle.number);
  return preparePictureShare(fileName, { page, line: getPuzzleLine(isMade ? undefined : puzzle.number, stage), lead: 'places' }, (context) => {
    const card = getPuzzleCard(isMade ? 'pencil' : puzzle.number, stage);
    // Only small bubbles drift here: big ones would lie over the puzzle's own.
    drawWater(context, [
      [70, 96, 44],
      [1010, 150, 30],
      [990, 1290, 60],
    ]);
    drawBowl(context, card.bowl, card.bowl.thickness);
    card.bubbles.forEach((bubble) => drawBubble(context, bubble));
    // The counts go on last: where bubbles lie over each other, every count can still be read.
    card.bubbles.forEach((bubble) => drawBubbleCount(context, bubble));
    drawTitle(context, card);
    card.operators.forEach((operator) => drawOperator(context, operator));
  });
}

/** Where a picture's title stands: its middle, the line its figures stand on, and how many times as big as on the puzzle's picture. */
export type TitlePlace = { centerX: number; baseline: number; scale: number };

/** "#46 = 28", as the board's header has it: the number small and blue, the goal big. A made puzzle has a pencil for a number. */
export function drawTitle(context: CanvasRenderingContext2D, card: Pick<PuzzleCard, 'mark' | 'goal'>, place: TitlePlace = { centerX: PUZZLE_CARD_PANEL.centerX, baseline: PUZZLE_CARD_PANEL.titleBaseline, scale: 1 }) {
  const size = place.scale;
  const PENCIL = 92 * size;
  const parts: Array<{ pencil: number } | { text: string; font: string; color: string }> = [
    card.mark === 'pencil' ? { pencil: PENCIL } : { text: `#${card.mark}`, font: `900 ${Math.round(88 * size)}px ${CARD_FONT}`, color: ACCENT },
    { text: '=', font: `900 ${Math.round(96 * size)}px ${CARD_FONT}`, color: CARD_INK },
    { text: String(card.goal), font: `900 ${Math.round(150 * size)}px ${CARD_FONT}`, color: CARD_INK },
  ];
  const gap = 34 * size;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  const widths = parts.map((part) => {
    if ('pencil' in part) {
      return part.pencil;
    }
    context.font = part.font;
    return context.measureText(part.text).width;
  });
  let x = place.centerX - (widths.reduce((sum, width) => sum + width, 0) + gap * (parts.length - 1)) / 2;
  parts.forEach((part, index) => {
    if ('pencil' in part) {
      drawPencil(context, x + part.pencil / 2, place.baseline - part.pencil * 0.42, part.pencil);
    } else {
      context.font = part.font;
      context.fillStyle = part.color;
      context.fillText(part.text, x, place.baseline);
    }
    x += widths[index] + gap;
  });
}

/** The same pencil as the header's: point down to the left. */
function drawPencil(context: CanvasRenderingContext2D, centerX: number, centerY: number, size: number) {
  const width = size * 0.3;
  const body = size * 0.62;
  const tip = width * 0.9;
  const cap = width * 0.5;
  const space = size * 0.06;
  const top = -(cap + space + body + tip) / 2;
  context.save();
  context.translate(centerX, centerY);
  context.rotate(Math.PI / 4);
  context.fillStyle = ACCENT;
  roundedRect(context, -width / 2, top, width, cap, width * 0.25);
  context.fill();
  context.fillRect(-width / 2, top + cap + space, width, body);
  context.beginPath();
  context.moveTo(-width / 2, top + cap + space + body);
  context.lineTo(width / 2, top + cap + space + body);
  context.lineTo(0, top + cap + space + body + tip);
  context.closePath();
  context.fill();
  context.restore();
}

/** An operator's button, with how often it may be used in the corner; one that may not be used at all is pale. */
function drawOperator(context: CanvasRenderingContext2D, operator: PuzzleCardOperator) {
  const { x, y, width, height, limit, symbol } = operator;
  const isUsable = limit === 'infinite' || limit > 0;
  context.globalAlpha = isUsable ? 1 : 0.45;
  roundedRect(context, x, y, width, height, 32);
  context.fillStyle = 'rgba(255, 255, 255, 0.86)';
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(186, 230, 253, 0.9)';
  context.stroke();

  // The sign: the same strokes and dots as on the board's buttons.
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const size = 64;
  const stroke = size * 0.18;
  const half = (size * 0.74) / 2;
  context.lineCap = 'round';
  context.lineWidth = stroke;
  context.strokeStyle = OPERATOR_BLUE;
  context.fillStyle = OPERATOR_BLUE;
  const line = (fromX: number, fromY: number, toX: number, toY: number) => {
    context.beginPath();
    context.moveTo(centerX + fromX, centerY + fromY);
    context.lineTo(centerX + toX, centerY + toY);
    context.stroke();
  };
  const reach = half - stroke / 2;
  if (symbol === '+' || symbol === '-' || symbol === '÷') {
    line(-reach, 0, reach, 0);
  }
  if (symbol === '+') {
    line(0, -reach, 0, reach);
  }
  if (symbol === '×') {
    const diagonal = reach * Math.SQRT1_2;
    line(-diagonal, -diagonal, diagonal, diagonal);
    line(-diagonal, diagonal, diagonal, -diagonal);
  }
  if (symbol === '÷') {
    for (const side of [-1, 1]) {
      context.beginPath();
      context.arc(centerX, centerY + side * size * 0.3, size * 0.09, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.globalAlpha = 1;

  if (typeof limit === 'number' && limit > 0) {
    const badgeX = x + width - 10;
    const badgeY = y + 8;
    context.beginPath();
    context.arc(badgeX, badgeY, 30, 0, Math.PI * 2);
    context.fillStyle = '#0EA5E9';
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = '#FFFFFF';
    context.stroke();
    context.font = `900 36px ${CARD_FONT}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = CARD_INK;
    context.fillText(String(limit), badgeX, badgeY + 2);
  }
}

/** A waiting bubble with its maru inside. */
function drawBubble(context: CanvasRenderingContext2D, bubble: PuzzleCardBubble) {
  const { x, y, radius } = bubble;
  context.beginPath();
  context.arc(x, y, radius - 1.5 * K, 0, Math.PI * 2);
  context.fillStyle = 'rgba(224, 247, 255, 0.5)';
  context.fill();
  context.lineWidth = 3 * K;
  context.strokeStyle = 'rgba(125, 211, 252, 0.85)';
  context.stroke();
  context.beginPath();
  context.arc(x, y, radius - 7 * K, 0, Math.PI * 2);
  context.lineWidth = 1.2 * K;
  context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  context.stroke();

  // The maru inside are still to come: drawn as rings, as on the board.
  for (const maru of bubble.maru) {
    const kind = getBeadKind(maru.value);
    context.beginPath();
    context.arc(maru.x, maru.y, maru.radius - K, 0, Math.PI * 2);
    context.fillStyle = maru.value === 1 ? 'rgba(253, 230, 138, 0.38)' : kind.color;
    context.fill();
    context.lineWidth = 1.9 * K;
    context.strokeStyle = kind.rimColor;
    context.stroke();
  }

  // The shine at the upper left.
  context.save();
  context.translate(x - radius * 0.56, y - radius * 0.6);
  context.rotate(-Math.PI / 6);
  roundedRect(context, -radius * 0.24, -radius * 0.11, radius * 0.48, radius * 0.22, radius * 0.11);
  context.fillStyle = 'rgba(255, 255, 255, 0.82)';
  context.fill();
  context.restore();
}

/** A bubble's count, on a label at its lower right. */
function drawBubbleCount(context: CanvasRenderingContext2D, bubble: PuzzleCardBubble) {
  const { x, y, radius } = bubble;
  const text = String(bubble.count);
  // Bigger than on the board: the counts are what a small picture has to get across.
  const height = 25 * K;
  context.font = `900 ${Math.round(18 * K)}px ${CARD_FONT}`;
  const labelWidth = Math.max(30 * K, context.measureText(text).width + 14 * K);
  const labelX = x + radius * 0.74 - labelWidth / 2;
  const labelY = y + radius * 0.74 - height / 2;
  roundedRect(context, labelX, labelY, labelWidth, height, height / 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.95)';
  context.fill();
  context.lineWidth = 1.5 * K;
  context.strokeStyle = 'rgba(186, 230, 253, 0.95)';
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = CARD_INK;
  context.fillText(text, labelX + labelWidth / 2, labelY + height * 0.54);
}

function roundedRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
