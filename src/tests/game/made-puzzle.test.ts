import { describe, expect, it } from 'vitest';

import { countWays, countWaysByGoal, createMadePuzzleStage, createRandomPuzzle, getMadePuzzleQuery, isMadePuzzleShape, readMadePuzzle, writeMadePuzzle } from '@/game/made-puzzle';
import { solveStage } from '@/game/stage-rules';
import { PUZZLE_STAGES } from '@/game/puzzle-stages';

describe('a puzzle a player made', () => {
  it('is written into an address and read back as the same puzzle', () => {
    const puzzle = { bubbles: [2, 4, 10, 5], goal: 28 };
    expect(writeMadePuzzle(puzzle)).toBe('2.4.10.5-28');
    expect(getMadePuzzleQuery(puzzle)).toBe('m=2.4.10.5-28');
    expect(readMadePuzzle('?m=2.4.10.5-28')).toEqual(puzzle);
    // Whatever else the address carries.
    expect(readMadePuzzle('?utm_source=x&m=3.4-12&fbclid=y')).toEqual({ bubbles: [3, 4], goal: 12 });
    // The order of the bubbles is kept: it is how they are laid out.
    expect(readMadePuzzle('?m=5.2.3-13')?.bubbles).toEqual([5, 2, 3]);
  });

  it('counts the ways to the goal as the numbered puzzles do', () => {
    // 3 + 4 and 4 + 3 are one way.
    expect(countWays({ bubbles: [3, 4], goal: 7 })).toBe(1);
    expect(countWays({ bubbles: [3, 4], goal: 12 })).toBe(1);
    // 6 - 2 = 4, and nothing else.
    expect(countWays({ bubbles: [6, 2], goal: 4 })).toBe(1);
    expect(countWays({ bubbles: [6, 2], goal: 5 })).toBe(0);
    // 2 + 2 × 2 = 8 (left to right), 2 × 2 × 2 = 8: two ways, though the bubbles are all alike.
    expect(countWays({ bubbles: [2, 2, 2], goal: 8 })).toBe(2);
    // Left to right: 2 + 3 × 4 is 20, never 14.
    expect(countWays({ bubbles: [2, 3, 4], goal: 20 }) > 0).toBe(true);
    // 3 × 4 + 2 and 3 + 4 × 2 (seven, twice): two ways to 14.
    expect(countWays({ bubbles: [2, 3, 4], goal: 14 })).toBe(2);
  });

  it('agrees with the numbered puzzles that have free operators: each has exactly one way', () => {
    const free = PUZZLE_STAGES.filter((stage) => Object.values(stage.limits).every((limit) => limit === 'infinite'));
    expect(free.length > 0).toBe(true);
    for (const stage of free) {
      expect(countWays({ bubbles: stage.bubbles, goal: stage.goal })).toBe(1);
    }
  });

  it('agrees with playing a puzzle in every possible way', () => {
    // The plain count of winning ways, with the two readings of a start folded into one.
    for (const puzzle of [{ bubbles: [2, 3, 4], goal: 14 }, { bubbles: [2, 4, 10, 5], goal: 28 }, { bubbles: [3, 3, 6, 2], goal: 12 }, { bubbles: [2, 2, 2], goal: 8 }]) {
      const seen = new Set<string>();
      for (const way of solveStage(createMadePuzzleStage(puzzle)).winning) {
        const steps = way.split(' ');
        if ((steps[1] === '+' || steps[1] === '×') && Number(steps[2]) < Number(steps[0])) {
          [steps[0], steps[2]] = [steps[2], steps[0]];
        }
        seen.add(steps.join(' '));
      }
      expect(countWays(puzzle)).toBe(seen.size);
    }
  });

  it('makes a puzzle by chance: different numbers, a goal that can be reached, in one way where there is one', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let count = 2; count <= 6; count += 1) {
      for (let round = 0; round < (count === 6 ? 3 : 12); round += 1) {
        const puzzle = createRandomPuzzle(count, random);
        expect(puzzle.bubbles.length).toBe(count);
        expect(new Set(puzzle.bubbles).size).toBe(count);
        expect(isMadePuzzleShape(puzzle)).toBe(true);
        const ways = countWaysByGoal(puzzle.bubbles);
        expect((ways.get(puzzle.goal) ?? 0) >= 1).toBe(true);
        // No other goal within reach has fewer ways.
        const fewest = Math.min(...[...ways.entries()].filter(([goal]) => Number.isInteger(goal) && goal >= 1 && goal <= 999).map(([, n]) => n));
        expect(ways.get(puzzle.goal)).toBe(fewest);
        // What it makes can be sent and read back.
        expect(readMadePuzzle(`?m=${writeMadePuzzle(puzzle)}`)).toEqual(puzzle);
      }
    }
    // A count out of range is brought into it.
    expect(createRandomPuzzle(1, random).bubbles.length).toBe(2);
    expect(createRandomPuzzle(9, random).bubbles.length).toBe(6);
  });

  it('counts six bubbles without taking long', () => {
    const started = Date.now();
    const ways = countWays({ bubbles: [7, 11, 10, 6, 9, 8], goal: 43 });
    expect(ways > 0).toBe(true);
    expect(Date.now() - started < 5000).toBe(true);
    console.log(`      (six bubbles counted in ${Date.now() - started}ms)`);
  });

  it('carries no puzzle when the address has none, or one that cannot be played', () => {
    for (const search of ['', '?p=46', '?m=', '?m=5-5', '?m=2.3', '?m=2.3-', '?m=2.3-0', '?m=2.3-1000', '?m=0.3-3', '?m=13.2-15', '?m=2.3.4.5.6.7.8-35', '?m=2,3-5', '?m=2.3-5.5', '?m=a.b-c', '?m=2.3--1', '?m=2..3-5', '?M=2.3-5']) {
      expect(readMadePuzzle(search)).toBe(undefined);
    }
    // The shape is right but nothing reaches the goal.
    expect(readMadePuzzle('?m=6.2-5')).toBe(undefined);
    expect(readMadePuzzle('?m=6.2-4')).toEqual({ bubbles: [6, 2], goal: 4 });
    // The edges of what is allowed.
    expect(readMadePuzzle('?m=1.1-1')).toEqual({ bubbles: [1, 1], goal: 1 });
    expect(readMadePuzzle('?m=12.12.6-864')).toEqual({ bubbles: [12, 12, 6], goal: 864 });
    expect(isMadePuzzleShape({ bubbles: [2, 3, 4, 5, 6, 7], goal: 999 })).toBe(true);
    expect(isMadePuzzleShape({ bubbles: [2, 3, 4, 5, 6, 7, 8], goal: 35 })).toBe(false);
    expect(isMadePuzzleShape({ bubbles: [2], goal: 2 })).toBe(false);
  });

  it('is a stage with every operator free, named after what it is', () => {
    const stage = createMadePuzzleStage({ bubbles: [2, 4, 10, 5], goal: 28 });
    expect(stage.id).toBe('made-2.4.10.5-28');
    expect(stage.target).toBe(28);
    expect(stage.bubbleCounts).toEqual([2, 4, 10, 5]);
    expect(stage.operatorLimits).toEqual({ '+': 'infinite', '-': 'infinite', '×': 'infinite', '÷': 'infinite' });
  });
});
