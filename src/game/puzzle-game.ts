// The puzzle game: one-way puzzles in a fixed order, and a start screen that is itself a puzzle.
import { PUZZLE_START_GROUPS, PUZZLE_STAGES, PuzzleStage } from '@/game/puzzle-stages';
import { applyMove } from '@/game/stage-rules';
import type { OperatorSymbol, Stage } from '@/game/types';

const OPERATOR_CODES: Record<OperatorSymbol, string> = { '+': 'a', '-': 's', '×': 'm', '÷': 'd' };

/**
 * An id made from what the puzzle is (its numbers, goal and limits), not from where it stands in
 * the list, so that progress saved under it still fits if the list is chosen again.
 */
export function getPuzzleId(puzzle: PuzzleStage): string {
  const numbers = [...puzzle.bubbles].sort((left, right) => left - right).join('.');
  const limits = (Object.keys(OPERATOR_CODES) as OperatorSymbol[])
    .map((operator) => `${OPERATOR_CODES[operator]}${puzzle.limits[operator] === 'infinite' ? 'x' : puzzle.limits[operator]}`)
    .join('');
  return `puzzle-${numbers}-${puzzle.goal}-${limits}`;
}

/** The puzzle as a stage the board can play. `number` is what the header shows. */
export function createPuzzleGameStage(puzzle: PuzzleStage, number: number): Stage {
  return {
    id: getPuzzleId(puzzle),
    title: `puzzle ${number}`,
    target: puzzle.goal,
    allowedValues: [1, 10, 100, 1000],
    islandId: 'puzzle',
    islandTitle: 'puzzle',
    setTitle: `${puzzle.bubbles.length}`,
    bubbleCounts: puzzle.bubbles,
    operatorLimits: puzzle.limits,
  };
}

/** Every puzzle of the game as a stage, numbered from 1. */
export const PUZZLE_GAME_STAGES: Stage[] = PUZZLE_STAGES.map((puzzle, index) => createPuzzleGameStage(puzzle, index + 1));

/**
 * The puzzle for the start screen. The screen has no words, so the first three visits go through
 * the three rules in order (every bubble goes in, the order matters, left to right); after that
 * any of them comes up.
 */
export function pickStartPuzzle(visitsSoFar: number, random: () => number = Math.random): PuzzleStage {
  const groups = PUZZLE_START_GROUPS;
  const group = visitsSoFar < groups.length ? groups[Math.max(0, visitsSoFar)] : groups[Math.floor(random() * groups.length) % groups.length];
  return group[Math.floor(random() * group.length) % group.length];
}

/** How many puzzles of the game are solved, and the number (from 1) of the first one that is not; undefined when all are. */
export function getPuzzleProgress(solvedIds: readonly string[]): { solved: number; next: number | undefined } {
  const solved = new Set(solvedIds);
  const nextIndex = PUZZLE_GAME_STAGES.findIndex((stage) => !solved.has(stage.id));
  return {
    solved: PUZZLE_GAME_STAGES.filter((stage) => solved.has(stage.id)).length,
    next: nextIndex === -1 ? undefined : nextIndex + 1,
  };
}

export type PuzzleSection = {
  /** How many bubbles the puzzles of this section have. */
  bubbleCount: number;
  /** Their numbers (1 is the first puzzle), in order. */
  numbers: number[];
};

/** The numbered puzzles as the list shows them: in order, a section for each number of bubbles. */
export function getPuzzleSections(stages: Stage[] = PUZZLE_GAME_STAGES): PuzzleSection[] {
  const sections: PuzzleSection[] = [];
  stages.forEach((stage, index) => {
    const bubbleCount = stage.bubbleCounts.length;
    const last = sections[sections.length - 1];
    if (last && last.bubbleCount === bubbleCount) {
      last.numbers.push(index + 1);
    } else {
      sections.push({ bubbleCount, numbers: [index + 1] });
    }
  });
  return sections;
}

const QUICK_OPERATORS: OperatorSymbol[] = ['+', '-', '×', '÷'];

/**
 * A puzzle for the one-minute game, made on the spot: three different numbers from 2 to 9 and a
 * goal that can be reached in one way only, without leaving 1 to 99 on the way. There are 594 of
 * these, so they are found by trying, not stored. `avoid` is a puzzle not to hand out again (the
 * one just played).
 */
export function createQuickPuzzle(random: () => number = Math.random, avoid?: PuzzleStage): PuzzleStage {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const numbers: number[] = [];
    while (numbers.length < 3) {
      const value = 2 + (Math.floor(random() * 8) % 8);
      if (!numbers.includes(value)) {
        numbers.push(value);
      }
    }

    // Every goal these numbers reach, with the ways to it ("3 + 2" and "2 + 3" are one way, as are "3 × 2" and "2 × 3").
    const ways = new Map<number, Set<string>>();
    const calmGoals = new Set<number>();
    const visit = (total: number, rest: number[], way: string, isCalm: boolean) => {
      if (rest.length === 0) {
        ways.set(total, (ways.get(total) ?? new Set()).add(way));
        if (isCalm) {
          calmGoals.add(total);
        }
        return;
      }
      rest.forEach((value, index) => {
        for (const operator of QUICK_OPERATORS) {
          const next = applyMove(total, operator, value);
          if (next === undefined) {
            continue;
          }
          const first = rest.length === 2 ? Number(way) : undefined;
          const isSwappedStart = first !== undefined && (operator === '+' || operator === '×') && value < first;
          visit(next, [...rest.slice(0, index), ...rest.slice(index + 1)], isSwappedStart ? `${value} ${operator} ${first}` : `${way} ${operator} ${value}`, isCalm && next >= 1 && next <= 99);
        }
      });
    };
    numbers.forEach((value, index) => visit(value, [...numbers.slice(0, index), ...numbers.slice(index + 1)], String(value), true));

    const goals = [...ways.entries()].filter(([goal, found]) => found.size === 1 && calmGoals.has(goal) && Number.isInteger(goal) && goal >= 1 && goal <= 99);
    if (goals.length === 0) {
      continue;
    }
    const [goal, found] = goals[Math.floor(random() * goals.length) % goals.length];
    const puzzle: PuzzleStage = {
      bubbles: numbers,
      goal,
      limits: { '+': 'infinite', '-': 'infinite', '×': 'infinite', '÷': 'infinite' },
      solution: [...found][0],
    };
    if (!avoid || getPuzzleId(avoid) !== getPuzzleId(puzzle)) {
      return puzzle;
    }
  }
  // Not reached in practice: almost every draw has several one-way goals.
  return PUZZLE_STAGES[0];
}
