// A puzzle a player made: some bubbles and a goal, with every operator free. It has no number
// and lives in no list: all of it is in the address it is sent with ("?m=2.4.10.5-28"), so
// whoever opens the address has the puzzle.
import { applyMove } from './stage-rules';
import type { OperatorSymbol, Stage } from './types';

export type MadePuzzle = { bubbles: number[]; goal: number };

/** What a made puzzle may be: as many bubbles as the board ever holds, numbers and a goal the board shows well. */
export const MADE_PUZZLE_RULES = { minBubbles: 2, maxBubbles: 6, minNumber: 1, maxNumber: 12, minGoal: 1, maxGoal: 999 };

/** Whether these bubbles and this goal are within what a made puzzle may be (not whether the goal can be reached). */
export function isMadePuzzleShape(puzzle: MadePuzzle): boolean {
  const { minBubbles, maxBubbles, minNumber, maxNumber, minGoal, maxGoal } = MADE_PUZZLE_RULES;
  return (
    puzzle.bubbles.length >= minBubbles &&
    puzzle.bubbles.length <= maxBubbles &&
    puzzle.bubbles.every((bubble) => Number.isInteger(bubble) && bubble >= minNumber && bubble <= maxNumber) &&
    Number.isInteger(puzzle.goal) &&
    puzzle.goal >= minGoal &&
    puzzle.goal <= maxGoal
  );
}

// No amount on the board is ever this: a board that is only there to find a goal never says "clear".
const NO_GOAL_YET = 0.5;

/**
 * The bubbles of a puzzle that is being made, as a stage: the maker works them out on the board,
 * and what they come to becomes the goal.
 */
export function createMakingStage(bubbles: number[]): Stage {
  return { ...createMadePuzzleStage({ bubbles, goal: NO_GOAL_YET }), id: `making-${bubbles.join('.')}`, title: 'puzzle being made' };
}

/** Whether an amount the bubbles came to can be the goal of a made puzzle. */
export function isMadePuzzleGoal(total: number): boolean {
  return Number.isInteger(total) && total >= MADE_PUZZLE_RULES.minGoal && total <= MADE_PUZZLE_RULES.maxGoal;
}

/** The puzzle as a stage the board can play. */
export function createMadePuzzleStage(puzzle: MadePuzzle): Stage {
  return {
    id: `made-${writeMadePuzzle(puzzle)}`,
    title: 'made puzzle',
    target: puzzle.goal,
    allowedValues: [1, 10, 100, 1000],
    islandId: 'puzzle',
    islandTitle: 'puzzle',
    setTitle: `${puzzle.bubbles.length}`,
    bubbleCounts: puzzle.bubbles,
    operatorLimits: { '+': 'infinite', '-': 'infinite', '×': 'infinite', '÷': 'infinite' },
  };
}

const OPERATORS: OperatorSymbol[] = ['+', '-', '×', '÷'];

/**
 * Every amount these bubbles can come to when all are used, with the number of ways to it.
 *
 * As in the numbered puzzles, "3 + 2" and "2 + 3" at the start are one way (so are "3 × 2" and
 * "2 × 3"): which of the first two bubbles goes in first makes no difference there, so only the
 * one with the smaller bubble first is counted. Two bubbles with the same number are one choice.
 */
export function countWaysByGoal(bubbles: number[]): Map<number, number> {
  const ways = new Map<number, number>();
  const play = (total: number, rest: number[], first: number | undefined) => {
    if (rest.length === 0) {
      ways.set(total, (ways.get(total) ?? 0) + 1);
      return;
    }
    const tried = new Set<number>();
    for (let index = 0; index < rest.length; index += 1) {
      const bubble = rest[index];
      if (tried.has(bubble)) {
        continue;
      }
      tried.add(bubble);
      const others = [...rest.slice(0, index), ...rest.slice(index + 1)];
      for (const operator of OPERATORS) {
        // The second bubble of a start that reads the same both ways: the smaller one goes first.
        if (first !== undefined && (operator === '+' || operator === '×') && bubble < first) {
          continue;
        }
        const next = applyMove(total, operator, bubble);
        if (next !== undefined) {
          play(next, others, undefined);
        }
      }
    }
  };
  const firsts = new Set<number>();
  bubbles.forEach((bubble, index) => {
    if (!firsts.has(bubble)) {
      firsts.add(bubble);
      play(bubble, [...bubbles.slice(0, index), ...bubbles.slice(index + 1)], bubble);
    }
  });
  return ways;
}

/** In how many ways the goal can be reached. */
export function countWays(puzzle: MadePuzzle): number {
  return countWaysByGoal(puzzle.bubbles).get(puzzle.goal) ?? 0;
}

/**
 * A puzzle made by chance: `count` different numbers and a goal they can reach. A goal with one
 * way only is taken where there is one (there nearly always is), from 1 to 99 where there is one
 * of those, so that the puzzle is a puzzle; otherwise the goal with the fewest ways.
 */
export function createRandomPuzzle(count: number, random: () => number = Math.random): MadePuzzle {
  const { minBubbles, maxBubbles, minGoal, maxGoal } = MADE_PUZZLE_RULES;
  const size = Math.max(minBubbles, Math.min(maxBubbles, Math.floor(count) || minBubbles));
  const pick = (length: number) => Math.floor(random() * length) % length;
  // Different numbers from 2 to 10: a 1 adds little, and bigger ones make the amounts hard to follow.
  const pool = [2, 3, 4, 5, 6, 7, 8, 9, 10];
  const bubbles: number[] = [];
  while (bubbles.length < size) {
    bubbles.push(pool.splice(pick(pool.length), 1)[0]);
  }

  const goals = [...countWaysByGoal(bubbles).entries()].filter(([goal]) => Number.isInteger(goal) && goal >= minGoal && goal <= maxGoal);
  const fewest = Math.min(...goals.map(([, ways]) => ways));
  const best = goals.filter(([, ways]) => ways === fewest).map(([goal]) => goal);
  const small = best.filter((goal) => goal <= 99);
  const from = small.length > 0 ? small : best;
  return { bubbles, goal: from[pick(from.length)] };
}

/** The puzzle as it is written in an address: the bubbles with dots between, a dash, the goal. */
export function writeMadePuzzle(puzzle: MadePuzzle): string {
  return `${puzzle.bubbles.join('.')}-${puzzle.goal}`;
}

/** What the game's address needs after it to open this puzzle. */
export function getMadePuzzleQuery(puzzle: MadePuzzle): string {
  return `m=${writeMadePuzzle(puzzle)}`;
}

/**
 * The made puzzle an address carries ("?m=2.4.10.5-28"), if it is one that can be played: within
 * what a made puzzle may be, and with at least one way to its goal. Anything else carries none.
 */
export function readMadePuzzle(search: string): MadePuzzle | undefined {
  const text = new URLSearchParams(search).get('m');
  if (text === null || !/^[0-9]{1,2}(\.[0-9]{1,2}){1,5}-[0-9]{1,3}$/.test(text)) {
    return undefined;
  }
  const [bubbleText, goalText] = text.split('-');
  const puzzle: MadePuzzle = { bubbles: bubbleText.split('.').map(Number), goal: Number(goalText) };
  return isMadePuzzleShape(puzzle) && countWays(puzzle) > 0 ? puzzle : undefined;
}
