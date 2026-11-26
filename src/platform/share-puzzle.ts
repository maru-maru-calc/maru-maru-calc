// The picture of one puzzle, as the board stands before the first move, and the address that
// opens that puzzle.
import { getPuzzleCard, getPuzzleCardFileName, getPuzzleQuery, PUZZLE_CARD_PANEL } from '@/components/puzzle/puzzle-card';
import type { PuzzleCard, PuzzleCardBubble, PuzzleCardOperator } from '@/components/puzzle/puzzle-card';
import { getBeadKind } from '@/game/beads';
import type { Stage } from '@/game/types';
import type { PictureShare } from '@/platform/game-host';
import { CARD_FONT, CARD_INK, drawAddress, drawBowl, drawWater, preparePictureShare } from '@/platform/share-picture';

const ACCENT = '#0284C7';
const OPERATOR_BLUE = '#38BDF8';

export function preparePuzzleShare(number: number, stage: Stage): Promise<PictureShare | undefined> {
  return preparePictureShare(getPuzzleCardFileName(number), getPuzzleQuery(number), (context, shownAddress) => {
    const card = getPuzzleCard(number, stage);
    // Only the small bubbles drift here: the big ones would lie over the puzzle's own.
    drawWater(context, [
      [30, 78, 34],
      [488, 520, 22],
      [1150, 600, 46],
    ]);
    drawBowl(context, card.bowl, card.bowl.thickness);
    card.bubbles.forEach((bubble) => drawBubble(context, bubble));
    // The counts go on last: where bubbles lie over each other, every count can still be read.
    card.bubbles.forEach((bubble) => drawBubbleCount(context, bubble));
    drawTitle(context, card);
    card.operators.forEach((operator) => drawOperator(context, operator));
    // A little smaller than on the result's picture: it has to end before the bowl begins.
    drawAddress(context, shownAddress, 'left', 24);
  });
}

/** "#46 = 28", as the board's header has it: the number small and blue, the goal big. */
function drawTitle(context: CanvasRenderingContext2D, card: PuzzleCard) {
  const parts = [
    { text: `#${card.number}`, font: `900 56px ${CARD_FONT}`, color: ACCENT },
    { text: '=', font: `900 62px ${CARD_FONT}`, color: CARD_INK },
    { text: String(card.goal), font: `900 96px ${CARD_FONT}`, color: CARD_INK },
  ];
  const gap = 22;
  context.textBaseline = 'alphabetic';
  context.textAlign = 'left';
  const widths = parts.map((part) => {
    context.font = part.font;
    return context.measureText(part.text).width;
  });
  let x = (PUZZLE_CARD_PANEL.left + PUZZLE_CARD_PANEL.right) / 2 - (widths.reduce((sum, width) => sum + width, 0) + gap * (parts.length - 1)) / 2;
  parts.forEach((part, index) => {
    context.font = part.font;
    context.fillStyle = part.color;
    context.fillText(part.text, x, PUZZLE_CARD_PANEL.titleBaseline);
    x += widths[index] + gap;
  });
}

/** An operator's button, with how often it may be used in the corner; one that may not be used at all is pale. */
function drawOperator(context: CanvasRenderingContext2D, operator: PuzzleCardOperator) {
  const { x, y, width, height, limit, symbol } = operator;
  const isUsable = limit === 'infinite' || limit > 0;
  context.globalAlpha = isUsable ? 1 : 0.45;
  roundedRect(context, x, y, width, height, 26);
  context.fillStyle = 'rgba(255, 255, 255, 0.86)';
  context.fill();
  context.lineWidth = 5;
  context.strokeStyle = 'rgba(186, 230, 253, 0.9)';
  context.stroke();

  // The sign: the same strokes and dots as on the board's buttons.
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const size = 52;
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
    const badgeX = x + width - 8;
    const badgeY = y + 6;
    context.beginPath();
    context.arc(badgeX, badgeY, 24, 0, Math.PI * 2);
    context.fillStyle = '#0EA5E9';
    context.fill();
    context.lineWidth = 4;
    context.strokeStyle = '#FFFFFF';
    context.stroke();
    context.font = `900 28px ${CARD_FONT}`;
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
  context.arc(x, y, radius - 4, 0, Math.PI * 2);
  context.fillStyle = 'rgba(224, 247, 255, 0.5)';
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = 'rgba(125, 211, 252, 0.85)';
  context.stroke();
  context.beginPath();
  context.arc(x, y, radius - 18, 0, Math.PI * 2);
  context.lineWidth = 3;
  context.strokeStyle = 'rgba(255, 255, 255, 0.7)';
  context.stroke();

  // The maru inside are still to come: drawn as rings, as on the board.
  for (const maru of bubble.maru) {
    const kind = getBeadKind(maru.value);
    context.beginPath();
    context.arc(maru.x, maru.y, maru.radius - 3, 0, Math.PI * 2);
    context.fillStyle = maru.value === 1 ? 'rgba(253, 230, 138, 0.38)' : kind.color;
    context.fill();
    context.lineWidth = 5;
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
  context.font = `900 36px ${CARD_FONT}`;
  const labelWidth = Math.max(60, context.measureText(text).width + 34);
  const labelX = x + radius * 0.74 - labelWidth / 2;
  const labelY = y + radius * 0.74 - 25;
  roundedRect(context, labelX, labelY, labelWidth, 50, 25);
  context.fillStyle = 'rgba(255, 255, 255, 0.95)';
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = 'rgba(186, 230, 253, 0.95)';
  context.stroke();
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillStyle = CARD_INK;
  context.fillText(text, labelX + labelWidth / 2, labelY + 27);
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
