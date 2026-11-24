// The puzzle game: one-way puzzles in a fixed order, and a start screen that is itself a puzzle.
import { PUZZLE_START_GROUPS, PUZZLE_STAGES, PuzzleStage } from '@/game/puzzle-stages';
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
