// The card a link to one puzzle shows where links are posted: that puzzle, lying on its side
// (1200 by 630, the shape those places show). On the left the number and the goal, the four
// operators and a "play" button; on the right the bubbles over the bowl.
//
// It is written as an SVG drawing, in plain text, so that it can be made without a browser's
// canvas: scripts/puzzle-link-cards turns each into a picture file under public/ogp, once, and
// the files are kept with the project (a site that shows links wants a picture file, and the
// pages are served as files with nothing to draw them on request). The app itself never loads
// this file.
import { getBeadKind } from '@/game/beads';
import type { Stage } from '@/game/types';

import { getPuzzleCard } from './puzzle-card';
import type { PuzzleCardBubble, PuzzleCardLayout, PuzzleCardOperator } from './puzzle-card';

export const PUZZLE_LINK_CARD_WIDTH = 1200;
export const PUZZLE_LINK_CARD_HEIGHT = 630;

/**
 * Counts up whenever the drawing below changes what a card looks like. The kept pictures say
 * which drawing they were made with, and a test fails when they are not from this one.
 */
export const PUZZLE_LINK_CARD_DRAWING = 1;

// The field of a board 400 by 350, drawn 1.6 times as big on the right of the card.
const LAYOUT: PuzzleCardLayout = {
  field: { width: 400, height: 350, scale: 1.6, left: 536, top: 40 },
  bubbleRowY: 66,
  operators: { left: 40, top: 300, width: 104, height: 88, gap: 16 },
};
const K = LAYOUT.field.scale;
// The left of the card: the title over the operators, and "play" under them.
const PANEL = { centerX: 272, width: 464, titleBaseline: 236, playY: 498, playRadius: 62 };

const WATER = '#C6E8F4';
const INK = '#12334A';
const ACCENT = '#0284C7';
const OPERATOR_BLUE = '#38BDF8';
const FONT = 'Helvetica, Arial, sans-serif';
// How wide a figure of the bold face is, as a share of its size (the same in Helvetica and Arial).
const FIGURE_WIDTH = 0.556;
const EQUALS_WIDTH = 0.584;

/** The file a puzzle's card is kept in, under public/ogp. */
export function getPuzzleLinkCardFile(number: number) {
  return `puzzle-${number}.jpg`;
}

/** The card of one puzzle, as the text of an SVG drawing. */
export function drawPuzzleLinkCard(number: number, stage: Pick<Stage, 'target' | 'bubbleCounts' | 'operatorLimits'>): string {
  const card = getPuzzleCard(number, stage, LAYOUT);
  const { bowl } = card;
  const bowlStart = { x: bowl.centerX + bowl.radius * Math.sin(bowl.halfAngle), y: bowl.centerY + bowl.radius * Math.cos(bowl.halfAngle) };
  const bowlEnd = { x: bowl.centerX - bowl.radius * Math.sin(bowl.halfAngle), y: bowlStart.y };

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${PUZZLE_LINK_CARD_WIDTH}" height="${PUZZLE_LINK_CARD_HEIGHT}" viewBox="0 0 ${PUZZLE_LINK_CARD_WIDTH} ${PUZZLE_LINK_CARD_HEIGHT}" font-family="${FONT}" font-weight="900">`,
    `<rect width="${PUZZLE_LINK_CARD_WIDTH}" height="${PUZZLE_LINK_CARD_HEIGHT}" fill="${WATER}"/>`,
    // A few of the bubbles that drift over the board, kept clear of the puzzle's own.
    ...[
      [44, 66, 30],
      [508, 78, 20],
      [70, 566, 46],
      [500, 596, 24],
    ].map(([x, y, radius]) => `<circle cx="${x}" cy="${y}" r="${radius}" fill="rgba(255,255,255,0.28)" stroke="rgba(125,211,252,0.42)" stroke-width="6"/>`),
    `<path d="M ${n(bowlStart.x)} ${n(bowlStart.y)} A ${n(bowl.radius)} ${n(bowl.radius)} 0 ${bowl.halfAngle > Math.PI / 2 ? 1 : 0} 1 ${n(bowlEnd.x)} ${n(bowlEnd.y)}" fill="none" stroke="rgba(125,211,252,0.9)" stroke-width="${n(bowl.thickness)}" stroke-linecap="round"/>`,
    ...card.bubbles.map(drawBubble),
    // The counts go on last: where bubbles lie over each other, every count can still be read.
    ...card.bubbles.map(drawBubbleCount),
    drawTitle(number, card.goal),
    ...card.operators.map(drawOperator),
    drawPlay(),
    '</svg>',
  ].join('\n');
}

/** "#46 = 28", as the board's header has it: the number small and blue, the goal big. */
function drawTitle(number: number, goal: number) {
  const parts = [
    { text: `#${number}`, size: 72, color: ACCENT, width: String(number).length * FIGURE_WIDTH + FIGURE_WIDTH },
    { text: '=', size: 78, color: INK, width: EQUALS_WIDTH },
    { text: String(goal), size: 124, color: INK, width: String(goal).length * FIGURE_WIDTH },
  ];
  const gap = 28;
  const fullWidth = parts.reduce((sum, part) => sum + part.width * part.size, 0) + gap * (parts.length - 1);
  // The longest there can be ("#100 = 999") is a little too wide for the panel: drawn smaller, it fits.
  const shrink = Math.min(1, PANEL.width / fullWidth);
  let x = PANEL.centerX - (fullWidth * shrink) / 2;
  return parts
    .map((part) => {
      const size = part.size * shrink;
      const width = part.width * size;
      const text = `<text x="${n(x + width / 2)}" y="${PANEL.titleBaseline}" font-size="${n(size)}" text-anchor="middle" fill="${part.color}">${part.text}</text>`;
      x += width + gap * shrink;
      return text;
    })
    .join('\n');
}

/** An operator's button, with how often it may be used in the corner; one that may not be used at all is pale. */
function drawOperator(operator: PuzzleCardOperator) {
  const { x, y, width, height, limit, symbol } = operator;
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const size = 40;
  const stroke = size * 0.18;
  const reach = (size * 0.74) / 2 - stroke / 2;
  const line = (fromX: number, fromY: number, toX: number, toY: number) =>
    `<line x1="${n(centerX + fromX)}" y1="${n(centerY + fromY)}" x2="${n(centerX + toX)}" y2="${n(centerY + toY)}" stroke="${OPERATOR_BLUE}" stroke-width="${n(stroke)}" stroke-linecap="round"/>`;
  const sign: string[] = [];
  if (symbol === '+' || symbol === '-' || symbol === '÷') {
    sign.push(line(-reach, 0, reach, 0));
  }
  if (symbol === '+') {
    sign.push(line(0, -reach, 0, reach));
  }
  if (symbol === '×') {
    const diagonal = reach * Math.SQRT1_2;
    sign.push(line(-diagonal, -diagonal, diagonal, diagonal), line(-diagonal, diagonal, diagonal, -diagonal));
  }
  if (symbol === '÷') {
    sign.push(...[-1, 1].map((side) => `<circle cx="${n(centerX)}" cy="${n(centerY + side * size * 0.3)}" r="${n(size * 0.09)}" fill="${OPERATOR_BLUE}"/>`));
  }
  const isUsable = limit === 'infinite' || limit > 0;
  const badge =
    typeof limit === 'number' && limit > 0
      ? [
          `<circle cx="${x + width - 6}" cy="${y + 6}" r="19" fill="#0EA5E9" stroke="#FFFFFF" stroke-width="3"/>`,
          `<text x="${x + width - 6}" y="${y + 6}" dy="0.36em" font-size="23" text-anchor="middle" fill="${INK}">${limit}</text>`,
        ]
      : [];
  return [
    `<g${isUsable ? '' : ' opacity="0.45"'}>`,
    `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="22" fill="rgba(255,255,255,0.86)" stroke="rgba(186,230,253,0.9)" stroke-width="4"/>`,
    ...sign,
    '</g>',
    ...badge,
  ].join('\n');
}

/** "Play": a white round button with a triangle. The card is a way into the game, and says so. */
function drawPlay() {
  const { centerX, playY, playRadius } = PANEL;
  const half = playRadius * 0.46;
  // The triangle sits a little to the right: its weight, not its box, is in the middle.
  const left = centerX - half * 0.62;
  return [
    `<circle cx="${centerX}" cy="${playY}" r="${playRadius}" fill="rgba(255,255,255,0.95)" stroke="rgba(125,211,252,0.9)" stroke-width="5"/>`,
    `<path d="M ${n(left)} ${n(playY - half)} L ${n(left)} ${n(playY + half)} L ${n(left + half * 1.64)} ${playY} Z" fill="${INK}" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>`,
  ].join('\n');
}

/** A waiting bubble with its maru inside. */
function drawBubble(bubble: PuzzleCardBubble) {
  const { x, y, radius } = bubble;
  const shineX = x - radius * 0.56;
  const shineY = y - radius * 0.6;
  return [
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius - 1.5 * K)}" fill="rgba(224,247,255,0.5)" stroke="rgba(125,211,252,0.85)" stroke-width="${n(3 * K)}"/>`,
    `<circle cx="${n(x)}" cy="${n(y)}" r="${n(radius - 7 * K)}" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="${n(1.2 * K)}"/>`,
    // The maru inside are still to come: drawn as rings, as on the board.
    ...bubble.maru.map((maru) => {
      const kind = getBeadKind(maru.value);
      return `<circle cx="${n(maru.x)}" cy="${n(maru.y)}" r="${n(maru.radius - K)}" fill="${maru.value === 1 ? 'rgba(253,230,138,0.38)' : kind.color}" stroke="${kind.rimColor}" stroke-width="${n(1.9 * K)}"/>`;
    }),
    // The shine at the upper left.
    `<rect x="${n(shineX - radius * 0.24)}" y="${n(shineY - radius * 0.11)}" width="${n(radius * 0.48)}" height="${n(radius * 0.22)}" rx="${n(radius * 0.11)}" fill="rgba(255,255,255,0.82)" transform="rotate(-30 ${n(shineX)} ${n(shineY)})"/>`,
  ].join('\n');
}

/** A bubble's count, on a label at its lower right. */
function drawBubbleCount(bubble: PuzzleCardBubble) {
  const { x, y, radius } = bubble;
  const text = String(bubble.count);
  // Bigger than on the board: the counts are what a small card has to get across.
  const height = 25 * K;
  const size = 18 * K;
  const width = Math.max(30 * K, text.length * FIGURE_WIDTH * size + 14 * K);
  const centerX = x + radius * 0.74;
  const centerY = y + radius * 0.74;
  return [
    `<rect x="${n(centerX - width / 2)}" y="${n(centerY - height / 2)}" width="${n(width)}" height="${n(height)}" rx="${n(height / 2)}" fill="rgba(255,255,255,0.95)" stroke="rgba(186,230,253,0.95)" stroke-width="${n(1.5 * K)}"/>`,
    `<text x="${n(centerX)}" y="${n(centerY)}" dy="0.36em" font-size="${n(size)}" text-anchor="middle" fill="${INK}">${text}</text>`,
  ].join('\n');
}

/** A length as it is written into the drawing: to a tenth, so the same puzzle always gives the same text. */
function n(value: number) {
  return String(Math.round(value * 10) / 10);
}
