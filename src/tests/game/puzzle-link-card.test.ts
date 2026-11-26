import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { drawPuzzleLinkCard, getPuzzleLinkCardFile, PUZZLE_LINK_CARD_DRAWING, PUZZLE_LINK_CARD_HEIGHT, PUZZLE_LINK_CARD_WIDTH } from '@/components/puzzle/puzzle-link-card';
import { PUZZLE_GAME_STAGES } from '@/game/puzzle-game';

// Three folders up from this file; where a test runner gives no `__dirname`, the folder it was started in, which is the project's.
const projectDir = typeof __dirname === 'string' ? path.resolve(__dirname, '..', '..', '..') : process.cwd();
const cardsDir = path.join(projectDir, 'public', 'ogp');

/** The width and height a JPEG file says it has (from its "start of frame" part), or undefined if it is not one. */
function readJpegSize(bytes: Buffer): [number, number] | undefined {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return undefined;
  }
  let at = 2;
  while (at + 9 < bytes.length && bytes[at] === 0xff) {
    const kind = bytes[at + 1];
    // The frame parts are C0 to CF, but for C4, C8 and CC, which are tables.
    if (kind >= 0xc0 && kind <= 0xcf && kind !== 0xc4 && kind !== 0xc8 && kind !== 0xcc) {
      return [bytes.readUInt16BE(at + 7), bytes.readUInt16BE(at + 5)];
    }
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  return undefined;
}

/** Every round thing of a drawing: [x, y, radius]. */
function readCircles(drawing: string) {
  return [...drawing.matchAll(/<circle cx="([-0-9.]+)" cy="([-0-9.]+)" r="([-0-9.]+)"/g)].map((match) => match.slice(1, 4).map(Number));
}

/** What a drawing says in figures and signs, in the order it is drawn. */
function readTexts(drawing: string) {
  return [...drawing.matchAll(/<text [^>]*>([^<]*)<\/text>/g)].map((match) => match[1]);
}

describe('the card a link to a puzzle shows', () => {
  it('shows that puzzle: every bubble with its count, then the number and the goal, then how often each operator may be used', () => {
    PUZZLE_GAME_STAGES.forEach((stage, index) => {
      const number = index + 1;
      const texts = readTexts(drawPuzzleLinkCard(number, stage));
      const limits = Object.values(stage.operatorLimits ?? {}).filter((limit) => typeof limit === 'number' && limit > 0);
      expect(texts, `puzzle ${number}`).toEqual([...stage.bubbleCounts.map(String), `#${number}`, '=', String(stage.target), ...limits.map(String)]);
    });
  });

  it('is a drawing 1200 by 630 with everything on it', () => {
    PUZZLE_GAME_STAGES.forEach((stage, index) => {
      const drawing = drawPuzzleLinkCard(index + 1, stage);
      expect(drawing.startsWith(`<svg xmlns="http://www.w3.org/2000/svg" width="${PUZZLE_LINK_CARD_WIDTH}" height="${PUZZLE_LINK_CARD_HEIGHT}"`)).toBe(true);
      expect(drawing.endsWith('</svg>')).toBe(true);
      expect(drawing).not.toMatch(/NaN|undefined|Infinity/);
      for (const [x, y, radius] of readCircles(drawing)) {
        expect(x - radius, `puzzle ${index + 1}`).toBeGreaterThanOrEqual(0);
        expect(y - radius, `puzzle ${index + 1}`).toBeGreaterThanOrEqual(0);
        expect(x + radius, `puzzle ${index + 1}`).toBeLessThanOrEqual(PUZZLE_LINK_CARD_WIDTH);
        expect(y + radius, `puzzle ${index + 1}`).toBeLessThanOrEqual(PUZZLE_LINK_CARD_HEIGHT);
      }
    });
  });

  it('keeps the puzzle\'s bubbles to the right of the title, the operators and "play"', () => {
    PUZZLE_GAME_STAGES.forEach((stage, index) => {
      // The bubbles are the rounds filled with the pale blue of a bubble; the left 520 of the card is the panel's.
      const bubbles = [...drawPuzzleLinkCard(index + 1, stage).matchAll(/<circle cx="([-0-9.]+)" cy="([-0-9.]+)" r="([-0-9.]+)" fill="rgba\(224,247,255,0\.5\)"/g)].map((match) => match.slice(1, 4).map(Number));
      expect(bubbles.length, `puzzle ${index + 1}`).toBe(stage.bubbleCounts.length);
      for (const [x, , radius] of bubbles) {
        expect(x - radius, `puzzle ${index + 1}`).toBeGreaterThan(520);
      }
    });
  });

  it('is the same text every time for the same puzzle, and another for another', () => {
    expect(drawPuzzleLinkCard(46, PUZZLE_GAME_STAGES[45])).toBe(drawPuzzleLinkCard(46, PUZZLE_GAME_STAGES[45]));
    expect(drawPuzzleLinkCard(46, PUZZLE_GAME_STAGES[45])).not.toBe(drawPuzzleLinkCard(47, PUZZLE_GAME_STAGES[46]));
  });

  it('draws the longest title there can be no wider than its panel', () => {
    const drawing = drawPuzzleLinkCard(100, { target: 999, bubbleCounts: [2, 3], operatorLimits: undefined });
    const sizes = [...drawing.matchAll(/<text x="([0-9.]+)" y="236" font-size="([0-9.]+)"/g)].map((match) => [Number(match[1]), Number(match[2])]);
    expect(sizes.length).toBe(3);
    // The first part starts and the last part ends inside the panel (40 to 504).
    expect(sizes[0][0] - (4 * 0.556 * sizes[0][1]) / 2).toBeGreaterThanOrEqual(40 - 0.5);
    expect(sizes[2][0] + (3 * 0.556 * sizes[2][1]) / 2).toBeLessThanOrEqual(504 + 0.5);
    expect(sizes[2][1]).toBeLessThan(124);
  });
});

describe('the pictures kept with the project (public/ogp)', () => {
  const kept = JSON.parse(fs.readFileSync(path.join(projectDir, 'scripts', 'puzzle-link-cards', 'cards.json'), 'utf8')) as {
    drawing: number;
    puzzles: Array<{ number: number; id: string; goal: number; bubbles: number[] }>;
  };
  const remake = 'Run `npm run make:puzzle-cards` and commit what it writes.';

  it('were made with the drawing as it is now', () => {
    expect(kept.drawing, remake).toBe(PUZZLE_LINK_CARD_DRAWING);
  });

  it('were made for the puzzles as they are now, each under its own number', () => {
    expect(kept.puzzles, remake).toEqual(PUZZLE_GAME_STAGES.map((stage, index) => ({ number: index + 1, id: stage.id, goal: stage.target, bubbles: stage.bubbleCounts })));
  });

  it('are all there, each a JPEG picture 1200 by 630, and none for a puzzle there is not', () => {
    const files = fs.readdirSync(cardsDir).filter((file) => file.startsWith('puzzle-'));
    expect([...files].sort(), remake).toEqual(PUZZLE_GAME_STAGES.map((_stage, index) => getPuzzleLinkCardFile(index + 1)).sort());
    for (const file of files) {
      expect(readJpegSize(fs.readFileSync(path.join(cardsDir, file))), file).toEqual([PUZZLE_LINK_CARD_WIDTH, PUZZLE_LINK_CARD_HEIGHT]);
    }
  });
});
