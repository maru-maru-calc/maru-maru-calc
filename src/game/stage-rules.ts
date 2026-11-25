import type { OperatorSymbol, OperatorUsageLimits, Stage } from './types';

const OPERATORS: OperatorSymbol[] = ['+', '-', '×', '÷'];

/**
 * What the board holds after `operator` is used with the bubble `bubble`, or `undefined` when the
 * game does not allow that move.
 *
 * The game works left to right: every operator acts on everything on the board. Adding and taking
 * away always work. Multiplying and dividing need a positive amount on the board (the maru are
 * wrapped into one group first, and there is nothing to wrap at zero or below), and a division
 * has to come out even.
 */
export function applyMove(total: number, operator: OperatorSymbol, bubble: number): number | undefined {
  if (operator === '+') {
    return total + bubble;
  }
  if (operator === '-') {
    return total - bubble;
  }
  if (total <= 0) {
    return undefined;
  }
  if (operator === '×') {
    return total * bubble;
  }
  return total % bubble === 0 ? total / bubble : undefined;
}

function canUse(usage: OperatorUsageLimits, operator: OperatorSymbol) {
  const limit = usage[operator];
  return limit === 'infinite' || limit > 0;
}

/**
 * Whether the player can still do anything: is there a bubble and an operator, among those with
 * uses left, that the game will accept? When this is false with bubbles still waiting, the stage
 * cannot be finished and has to be started again.
 */
export function hasLegalMove(total: number, bubbles: number[], usage: OperatorUsageLimits): boolean {
  return bubbles.some((bubble) => OPERATORS.some((operator) => canUse(usage, operator) && applyMove(total, operator, bubble) !== undefined));
}

/** The operators a stage starts with. Mirrors what the game screen sets up for a stage. */
export function getStageOperatorUsage(stage: Stage): OperatorUsageLimits {
  const base: OperatorUsageLimits =
    stage.islandId === 'addition'
      ? { '+': 'infinite', '-': 0, '×': 0, '÷': 0 }
      : stage.islandId === 'subtraction'
        ? { '+': 'infinite', '-': 'infinite', '×': 0, '÷': 0 }
        : { '+': 0, '-': 0, '×': 0, '÷': 0 };
  return { ...base, ...stage.operatorLimits };
}

export type StageSolutions = {
  /** Every way of using up all the bubbles that reaches the target, written out ("2 × 3 + 4"). */
  winning: string[];
  /** Ways of using up all the bubbles, winning or not. */
  complete: number;
  /** Ways of playing that run out of moves before the bubbles are used up. */
  deadEnds: number;
};

/**
 * Plays a stage in every possible way. The first bubble goes onto the board as it is; each later
 * bubble needs an operator.
 */
export function solveStage(stage: Stage): StageSolutions {
  const result: StageSolutions = { winning: [], complete: 0, deadEnds: 0 };
  const startUsage = getStageOperatorUsage(stage);

  const play = (total: number, remaining: number[], usage: OperatorUsageLimits, text: string) => {
    if (remaining.length === 0) {
      result.complete += 1;
      if (total === stage.target) {
        result.winning.push(text);
      }
      return;
    }

    let moved = false;
    const tried = new Set<number>();
    remaining.forEach((bubble, index) => {
      // Two bubbles with the same number are the same choice.
      if (tried.has(bubble)) {
        return;
      }
      tried.add(bubble);
      const rest = [...remaining.slice(0, index), ...remaining.slice(index + 1)];
      for (const operator of OPERATORS) {
        if (!canUse(usage, operator)) {
          continue;
        }
        const next = applyMove(total, operator, bubble);
        if (next === undefined) {
          continue;
        }
        moved = true;
        const limit = usage[operator];
        play(next, rest, limit === 'infinite' ? usage : { ...usage, [operator]: limit - 1 }, `${text} ${operator} ${bubble}`);
      }
    });
    if (!moved) {
      result.deadEnds += 1;
    }
  };

  const firsts = new Set<number>();
  stage.bubbleCounts.forEach((bubble, index) => {
    if (firsts.has(bubble)) {
      return;
    }
    firsts.add(bubble);
    play(bubble, [...stage.bubbleCounts.slice(0, index), ...stage.bubbleCounts.slice(index + 1)], startUsage, String(bubble));
  });

  return result;
}
