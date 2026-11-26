import { describe, expect, it } from 'vitest';

import { getPuzzleCard, getPuzzleCardFileName, getPuzzleQuery, PUZZLE_CARD_PANEL, readRequestedPuzzle } from '@/components/puzzle/puzzle-card';
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

  it('keeps every part on the picture, the bubbles clear of the panel and the maru inside their bubbles', () => {
    PUZZLE_GAME_STAGES.forEach((stage, index) => {
      const card = getPuzzleCard(index + 1, stage);
      for (const bubble of card.bubbles) {
        expect(bubble.x - bubble.radius >= PUZZLE_CARD_PANEL.right).toBe(true);
        expect(bubble.x + bubble.radius <= RESULT_CARD_WIDTH).toBe(true);
        expect(bubble.y - bubble.radius >= 0).toBe(true);
        expect(bubble.y + bubble.radius <= RESULT_CARD_HEIGHT).toBe(true);
        for (const maru of bubble.maru) {
          expect(Math.hypot(maru.x - bubble.x, maru.y - bubble.y) + maru.radius <= bubble.radius).toBe(true);
        }
      }
      for (const operator of card.operators) {
        expect(operator.x >= PUZZLE_CARD_PANEL.left && operator.x + operator.width <= PUZZLE_CARD_PANEL.right).toBe(true);
        expect(operator.y + operator.height <= RESULT_CARD_HEIGHT - 80).toBe(true);
      }
      // The bowl's lowest point is on the picture, under the bubbles.
      const bottom = card.bowl.centerY + card.bowl.radius + card.bowl.thickness / 2;
      expect(bottom <= RESULT_CARD_HEIGHT).toBe(true);
      expect(Math.max(...card.bubbles.map((bubble) => bubble.y + bubble.radius)) < bottom).toBe(true);
    });
  });

  it('puts the operators in two rows of two, and a puzzle of six bubbles in two rows of three', () => {
    const card = getPuzzleCard(77, PUZZLE_GAME_STAGES[76]);
    const [plus, minus, times, divide] = card.operators;
    expect(minus.y).toBe(plus.y);
    expect(divide.y).toBe(times.y);
    expect(times.x).toBe(plus.x);
    expect(times.y >= plus.y + plus.height).toBe(true);
    expect(minus.x >= plus.x + plus.width).toBe(true);
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

  it('names the file and the address after the number', () => {
    expect(getPuzzleCardFileName(46)).toBe('maru-puzzle-46.png');
    expect(getPuzzleQuery(46)).toBe('p=46');
  });
});

describe('the puzzle an address asks for', () => {
  it('is the number after "p", whatever else the address carries', () => {
    expect(readRequestedPuzzle('?p=46', 100)).toBe(46);
    expect(readRequestedPuzzle('?p=1', 100)).toBe(1);
    expect(readRequestedPuzzle('?p=100', 100)).toBe(100);
    expect(readRequestedPuzzle('?utm_source=x&p=7&fbclid=abc', 100)).toBe(7);
    expect(readRequestedPuzzle('?p=007', 100)).toBe(7);
    // What the picture's own address gives is read back as the same puzzle.
    expect(readRequestedPuzzle(`?${getPuzzleQuery(83)}`, 100)).toBe(83);
  });

  it('is none when the address asks for nothing, or for a puzzle there is not', () => {
    for (const search of ['', '?', '?q=46', '?p=', '?p=0', '?p=101', '?p=-3', '?p=4.5', '?p=abc', '?p=1e2', '?p=99999', '?p=%20', '?P=46']) {
      expect(readRequestedPuzzle(search, 100)).toBe(undefined);
    }
    expect(readRequestedPuzzle('?p=46', 0)).toBe(undefined);
  });
});
