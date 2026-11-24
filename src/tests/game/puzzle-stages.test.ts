import { describe, expect, it } from 'vitest';

import { createPuzzleGameStage, getPuzzleId, getPuzzleProgress, pickStartPuzzle, PUZZLE_GAME_STAGES } from '@/game/puzzle-game';
import { PUZZLE_START_GROUPS, PUZZLE_STAGES, PuzzleStage } from '@/game/puzzle-stages';
import { solveStage } from '@/game/stage-rules';

/** The ways the game's own rules find, with "3 + 2 ..." and "2 + 3 ..." (or ×) counted as one. */
function waysOf(puzzle: PuzzleStage): string[] {
  const ways = solveStage(createPuzzleGameStage(puzzle, 1)).winning.map((way) => {
    const [first, operator, second, ...rest] = way.split(' ');
    const isSwappedStart = (operator === '+' || operator === '×') && Number(second) < Number(first);
    return (isSwappedStart ? [second, operator, first, ...rest] : [first, operator, second, ...rest]).join(' ');
  });
  return [...new Set(ways)];
}

/** The amount after each step of a way. */
function amountsOf(way: string): number[] {
  const tokens = way.split(' ');
  const amounts = [Number(tokens[0])];
  for (let index = 1; index < tokens.length; index += 2) {
    const value = Number(tokens[index + 1]);
    const last = amounts[amounts.length - 1];
    amounts.push(tokens[index] === '+' ? last + value : tokens[index] === '-' ? last - value : tokens[index] === '×' ? last * value : last / value);
  }
  return amounts;
}

const operatorsOf = (way: string) => way.split(' ').filter((_, index) => index % 2 === 1);

describe('the puzzles of the puzzle game', () => {
  it('have exactly one way to the goal each, by the rules the board plays by', () => {
    for (const puzzle of [...PUZZLE_STAGES, ...PUZZLE_START_GROUPS.flat()]) {
      expect(waysOf(puzzle)).toEqual([puzzle.solution]);
    }
  });

  it('stay between 1 and 99 all the way, with every number different', () => {
    for (const puzzle of [...PUZZLE_STAGES, ...PUZZLE_START_GROUPS.flat()]) {
      const amounts = amountsOf(puzzle.solution);

      expect(amounts[amounts.length - 1]).toBe(puzzle.goal);
      expect(Math.min(...amounts)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...amounts)).toBeLessThanOrEqual(99);
      expect(amounts.every((amount) => Number.isInteger(amount))).toBe(true);
      expect(new Set(puzzle.bubbles).size).toBe(puzzle.bubbles.length);
    }
  });

  it('grow from three bubbles to six, and ration the operators from five bubbles on', () => {
    expect(PUZZLE_STAGES).toHaveLength(100);
    expect(PUZZLE_STAGES.map((puzzle) => puzzle.bubbles.length)).toEqual([
      ...Array.from({ length: 15 }, () => 3),
      ...Array.from({ length: 30 }, () => 4),
      ...Array.from({ length: 30 }, () => 5),
      ...Array.from({ length: 25 }, () => 6),
    ]);

    for (const puzzle of PUZZLE_STAGES) {
      const limits = Object.values(puzzle.limits);
      if (puzzle.bubbles.length <= 4) {
        expect(limits.every((limit) => limit === 'infinite')).toBe(true);
      } else {
        // As many uses as there are steps: every one of them is needed.
        expect(limits.reduce<number>((sum, limit) => sum + Number(limit), 0)).toBe(puzzle.bubbles.length - 1);
        expect(limits.every((limit) => Number(limit) >= 1)).toBe(true);
      }
      // No puzzle is plain adding up.
      expect(operatorsOf(puzzle.solution).some((operator) => operator === '×' || operator === '÷')).toBe(true);
    }
  });

  it('do not put the same goal, or nearly the same numbers, close together', () => {
    PUZZLE_STAGES.forEach((puzzle, index) => {
      const sameTierBefore = PUZZLE_STAGES.slice(Math.max(0, index - 3), index).filter((earlier) => earlier.bubbles.length === puzzle.bubbles.length);
      for (const earlier of sameTierBefore) {
        expect(earlier.goal).not.toBe(puzzle.goal);
        expect([...earlier.bubbles].sort().join(',')).not.toBe([...puzzle.bubbles].sort().join(','));
      }
      // Nor the same kind of way twice in a row ("a - b × c" after "a - b × c").
      const shapeOf = (way: string) => way.replace(/\d+/g, 'n');
      if (index > 0 && PUZZLE_STAGES[index - 1].bubbles.length === puzzle.bubbles.length) {
        expect(shapeOf(PUZZLE_STAGES[index - 1].solution)).not.toBe(shapeOf(puzzle.solution));
      }
    });
  });

  it('have ids of their own that say what the puzzle is', () => {
    const ids = PUZZLE_GAME_STAGES.map((stage) => stage.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(getPuzzleId({ bubbles: [4, 2, 3], goal: 20, limits: { '+': 'infinite', '-': 0, '×': 2, '÷': 1 }, solution: '2 + 3 × 4' })).toBe('puzzle-2.3.4-20-axs0m2d1');
    expect(PUZZLE_GAME_STAGES[0]).toMatchObject({ islandId: 'puzzle', target: PUZZLE_STAGES[0].goal, bubbleCounts: PUZZLE_STAGES[0].bubbles });
  });
});

describe('the start screen of the puzzle game', () => {
  it('shows one rule per group: all the bubbles, the order, left to right', () => {
    const [allBubbles, order, leftToRight] = PUZZLE_START_GROUPS;

    expect(PUZZLE_START_GROUPS.map((group) => group.length)).toEqual([8, 8, 8]);
    for (const puzzle of allBubbles) {
      expect(puzzle.bubbles).toHaveLength(2);
      expect(operatorsOf(puzzle.solution)).toEqual(['+']);
      expect(puzzle.limits).toEqual({ '+': 'infinite', '-': 0, '×': 0, '÷': 0 });
    }
    for (const puzzle of order) {
      // Taking away works one way round only; adding is on offer and leads elsewhere.
      expect(puzzle.bubbles).toHaveLength(2);
      expect(operatorsOf(puzzle.solution)).toEqual(['-']);
    }
    for (const puzzle of leftToRight) {
      // "a + b × c" has to be read from the left: with × first it would be a different number.
      const [first, , second, , third] = puzzle.solution.split(' ').map(Number);
      expect(operatorsOf(puzzle.solution)).toEqual(['+', '×']);
      expect((first + second) * third).toBe(puzzle.goal);
      expect(first + second * third).not.toBe(puzzle.goal);
    }
  });

  it('goes through the rules in order on the first three visits, and then draws from all of them', () => {
    const first = () => 0;

    expect(pickStartPuzzle(0, first)).toBe(PUZZLE_START_GROUPS[0][0]);
    expect(pickStartPuzzle(1, first)).toBe(PUZZLE_START_GROUPS[1][0]);
    expect(pickStartPuzzle(2, first)).toBe(PUZZLE_START_GROUPS[2][0]);

    let seed = 1;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    const later = new Set(Array.from({ length: 300 }, () => pickStartPuzzle(7, random)));
    expect(later.size).toBe(24);
    // A random number of exactly 1 must not fall off the end.
    expect(pickStartPuzzle(9, () => 0.999999)).toBe(PUZZLE_START_GROUPS[2][7]);
  });
});

describe('progress through the puzzle game', () => {
  it('counts what is solved and names the first puzzle that is not', () => {
    const ids = PUZZLE_GAME_STAGES.map((stage) => stage.id);

    expect(getPuzzleProgress([])).toEqual({ solved: 0, next: 1 });
    expect(getPuzzleProgress([ids[0], ids[1], ids[3]])).toEqual({ solved: 3, next: 3 });
    expect(getPuzzleProgress(['something-else', ids[0]])).toEqual({ solved: 1, next: 2 });
    // Nothing left: the game has to be able to say so.
    expect(getPuzzleProgress(ids)).toEqual({ solved: 100, next: undefined });
  });
});
