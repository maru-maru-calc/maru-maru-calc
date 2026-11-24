// Taking back the last move in まるまるモード: the position after each move is noted, and
// "undo" returns to the one before the last.
import { OperatorSymbol } from '@/game/expression';
import { OperatorUsageLimits } from '@/game/types';

/** Everything needed to set the board up again as it stood after a move. */
export type BoardPosition<Bubble> = {
  /** The calculation so far, as shown under the board. */
  tokens: string[];
  /** The amount on the board. */
  total: number;
  /** The bubbles not used yet. */
  pendingBubbles: Bubble[];
  /** How often each operator may still be used. */
  operatorUsage: OperatorUsageLimits;
};

/** `usage` after `operator` has been used once. The first bubble goes in without an operator. */
export function spendOperatorUse(usage: OperatorUsageLimits, operator: OperatorSymbol | undefined): OperatorUsageLimits {
  if (!operator) {
    return usage;
  }
  const remaining = usage[operator];
  if (remaining === 'infinite' || remaining <= 0) {
    return usage;
  }
  return { ...usage, [operator]: remaining - 1 };
}

/**
 * Where taking back the last move leads: the positions that remain, and the one to set up.
 * `restore` is undefined when the move taken back was the first, which leads to the empty board.
 * Returns undefined when no move has been made.
 */
export function takeBackLastMove<Bubble>(positions: BoardPosition<Bubble>[]): { positions: BoardPosition<Bubble>[]; restore: BoardPosition<Bubble> | undefined } | undefined {
  if (positions.length === 0) {
    return undefined;
  }
  const remaining = positions.slice(0, -1);
  return { positions: remaining, restore: remaining[remaining.length - 1] };
}
