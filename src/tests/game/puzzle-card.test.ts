import { describe, expect, it } from 'vitest';

import { getPuzzleCard, getPuzzleCardFileName, getPuzzleLine, getPuzzlePage, getSitePath, getSolvedCardFileName, PUZZLE_CARD_PANEL, readPuzzlePage, readRequestedPuzzle } from '@/components/puzzle/puzzle-card';
import { createMadePuzzleStage } from '@/game/made-puzzle';
import { PUZZLE_GAME_STAGES } from '@/game/puzzle-game';
import { RESULT_CARD_HEIGHT, RESULT_CARD_WIDTH } from '@/game/result-card';

describe('the picture of one puzzle', () => {
  it('shows the puzzle as the board has it: the number, the goal, every bubble, every operator with its count', () => {
    PUZZLE_GAME_STAGES.forEach((stage, index) => {
      const card = getPuzzleCard(index + 1, stage);
      expect(card.mark).toBe(index + 1);
      expect(card.goal).toBe(stage.target);
      expect(card.bubbles.map((bubble) => bubble.count)).toEqual(stage.bubbleCounts);
      expect(card.operators.map((operator) => operator.symbol)).toEqual(['+', '-', '×', '÷']);
      card.operators.forEach((operator) => expect(operator.limit).toBe(stage.operatorLimits?.[operator.symbol]));
      // The maru inside a bubble add up to its count.
      card.bubbles.forEach((bubble) => expect(bubble.maru.reduce((sum, maru) => sum + maru.value, 0)).toBe(bubble.count));
    });
  });

  it('keeps every part on the picture, the bubbles under the operators and the maru inside their bubbles', () => {
    PUZZLE_GAME_STAGES.forEach((stage, index) => {
      const card = getPuzzleCard(index + 1, stage);
      const operatorsBottom = Math.max(...card.operators.map((operator) => operator.y + operator.height));
      for (const bubble of card.bubbles) {
        expect(bubble.y - bubble.radius >= operatorsBottom).toBe(true);
        expect(bubble.x - bubble.radius >= 0).toBe(true);
        expect(bubble.x + bubble.radius <= RESULT_CARD_WIDTH).toBe(true);
        expect(bubble.y + bubble.radius <= RESULT_CARD_HEIGHT).toBe(true);
        for (const maru of bubble.maru) {
          expect(Math.hypot(maru.x - bubble.x, maru.y - bubble.y) + maru.radius <= bubble.radius).toBe(true);
        }
      }
      for (const operator of card.operators) {
        expect(operator.x >= 0 && operator.x + operator.width <= RESULT_CARD_WIDTH).toBe(true);
        expect(operator.y > PUZZLE_CARD_PANEL.titleBaseline).toBe(true);
      }
      // The bowl's lowest point is on the picture, under the bubbles.
      const bottom = card.bowl.centerY + card.bowl.radius + card.bowl.thickness / 2;
      expect(bottom <= RESULT_CARD_HEIGHT).toBe(true);
      expect(Math.max(...card.bubbles.map((bubble) => bubble.y + bubble.radius)) < bottom).toBe(true);
    });
  });

  it('is laid out as a phone held upright shows the board: four operators in a row, six bubbles in two rows of three', () => {
    expect(RESULT_CARD_HEIGHT > RESULT_CARD_WIDTH).toBe(true);
    const card = getPuzzleCard(77, PUZZLE_GAME_STAGES[76]);
    const [plus, minus, times, divide] = card.operators;
    expect(new Set([plus.y, minus.y, times.y, divide.y]).size).toBe(1);
    expect(minus.x >= plus.x + plus.width && times.x >= minus.x + minus.width && divide.x >= times.x + times.width).toBe(true);
    // The row is in the middle of the picture.
    expect(Math.abs(plus.x - (RESULT_CARD_WIDTH - (divide.x + divide.width))) < 1).toBe(true);
    expect(card.bubbles.length).toBe(6);
    expect(new Set(card.bubbles.map((bubble) => bubble.y)).size).toBe(2);
  });

  it('has a pencil where the number would be, on a puzzle a player made', () => {
    const made = createMadePuzzleStage({ bubbles: [2, 4, 10, 5], goal: 28 });
    const card = getPuzzleCard('pencil', made);
    expect(card.mark).toBe('pencil');
    expect(card.goal).toBe(28);
    expect(card.bubbles.map((bubble) => bubble.count)).toEqual([2, 4, 10, 5]);
    // Every operator is free: none has a count.
    expect(card.operators.every((operator) => operator.limit === 'infinite')).toBe(true);
  });

  it('names the file and the page after the number', () => {
    expect(getPuzzleCardFileName(46)).toBe('maru-puzzle-46.png');
    expect(getPuzzlePage(46)).toBe('p/46');
  });
});

describe('the puzzle in one line, for the message its address is posted with', () => {
  it('is its number, its bubbles as they are laid out, and its goal: figures and signs, no words', () => {
    expect(getPuzzleLine(46, PUZZLE_GAME_STAGES[45])).toBe(`#46  ${PUZZLE_GAME_STAGES[45].bubbleCounts.join(' · ')} → ${PUZZLE_GAME_STAGES[45].target} ?`);
    expect(getPuzzleLine(1, { target: 11, bubbleCounts: [2, 8, 6] })).toBe('#1  2 · 8 · 6 → 11 ?');
    PUZZLE_GAME_STAGES.forEach((stage, index) => {
      expect(getPuzzleLine(index + 1, stage)).toMatch(/^#[0-9]+ {2}[0-9]+( · [0-9]+)+ → [0-9]+ \?$/);
    });
  });

  it('has no number for a puzzle a player made', () => {
    expect(getPuzzleLine(undefined, createMadePuzzleStage({ bubbles: [2, 4, 10, 5], goal: 28 }))).toBe('2 · 4 · 10 · 5 → 28 ?');
  });

  it('ends in a tick when it is sent by someone who solved it, and still does not say how', () => {
    expect(getPuzzleLine(1, { target: 11, bubbleCounts: [2, 8, 6] }, true)).toBe('#1  2 · 8 · 6 → 11 ✓');
    expect(getPuzzleLine(undefined, createMadePuzzleStage({ bubbles: [2, 3, 4], goal: 14 }), true)).toBe('2 · 3 · 4 → 14 ✓');
    PUZZLE_GAME_STAGES.forEach((stage, index) => {
      expect(getPuzzleLine(index + 1, stage, true)).toMatch(/^#[0-9]+ {2}[0-9]+( · [0-9]+)+ → [0-9]+ ✓$/);
    });
    expect(getSolvedCardFileName(46)).toBe('maru-solved-46.png');
  });
});

describe('the page of one puzzle', () => {
  it('is read from the path it is served at, with or without the site\'s own path before it', () => {
    expect(readPuzzlePage('/maru-maru-calc/p/46', 100)).toBe(46);
    expect(readPuzzlePage('/p/1', 100)).toBe(1);
    expect(readPuzzlePage('/maru-maru-calc/p/100', 100)).toBe(100);
    expect(readPuzzlePage('/maru-maru-calc/p/46/', 100)).toBe(46);
    expect(readPuzzlePage('/p/007', 100)).toBe(7);
    // What a shared address ends in is read back as the same puzzle.
    expect(readPuzzlePage(`/maru-maru-calc/${getPuzzlePage(83)}`, 100)).toBe(83);
  });

  it('is none on any other page, or for a puzzle there is not', () => {
    for (const pathname of ['', '/', '/puzzle', '/maru-maru-calc/puzzle', '/p', '/p/', '/p/0', '/p/101', '/p/-3', '/p/4.5', '/p/abc', '/p/46/x', '/p/99999', '/xp/46x', '/P/46', '/maru-maru-calc/play']) {
      expect(readPuzzlePage(pathname, 100)).toBe(undefined);
    }
    expect(readPuzzlePage('/p/46', 0)).toBe(undefined);
  });

  it('and the game\'s page both give the site\'s own path, which every shared address starts from', () => {
    expect(getSitePath('/maru-maru-calc/puzzle')).toBe('/maru-maru-calc/');
    expect(getSitePath('/maru-maru-calc/p/46')).toBe('/maru-maru-calc/');
    expect(getSitePath('/maru-maru-calc/p/46/')).toBe('/maru-maru-calc/');
    expect(getSitePath('/maru-maru-calc/puzzle/')).toBe('/maru-maru-calc/');
    // Served at the top of a site, as while the app is developed.
    expect(getSitePath('/puzzle')).toBe('/');
    expect(getSitePath('/p/7')).toBe('/');
    // A site that happens to be called "p" is not a puzzle's page.
    expect(getSitePath('/p/puzzle')).toBe('/p/');
  });
});

describe('the puzzle an address asks for after "?" (how addresses were written before puzzles had pages)', () => {
  it('is the number after "p", whatever else the address carries', () => {
    expect(readRequestedPuzzle('?p=46', 100)).toBe(46);
    expect(readRequestedPuzzle('?p=1', 100)).toBe(1);
    expect(readRequestedPuzzle('?p=100', 100)).toBe(100);
    expect(readRequestedPuzzle('?utm_source=x&p=7&fbclid=abc', 100)).toBe(7);
    expect(readRequestedPuzzle('?p=007', 100)).toBe(7);
  });

  it('is none when the address asks for nothing, or for a puzzle there is not', () => {
    for (const search of ['', '?', '?q=46', '?p=', '?p=0', '?p=101', '?p=-3', '?p=4.5', '?p=abc', '?p=1e2', '?p=99999', '?p=%20', '?P=46']) {
      expect(readRequestedPuzzle(search, 100)).toBe(undefined);
    }
    expect(readRequestedPuzzle('?p=46', 0)).toBe(undefined);
  });
});
