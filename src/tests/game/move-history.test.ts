import { describe, expect, it } from 'vitest';

import { BoardPosition, spendOperatorUse, takeBackLastMove } from '@/game/move-history';
import { OperatorUsageLimits } from '@/game/types';

const usage: OperatorUsageLimits = { '+': 'infinite', '-': 2, '×': 1, '÷': 0 };
const position = (total: number, bubbles: number[]): BoardPosition<number> => ({ tokens: [String(total)], total, pendingBubbles: bubbles, operatorUsage: usage });

describe('taking back a move', () => {
  it('spends one use of a limited operator and leaves the others alone', () => {
    expect(spendOperatorUse(usage, '-')).toEqual({ '+': 'infinite', '-': 1, '×': 1, '÷': 0 });
    expect(spendOperatorUse(usage, '×')).toEqual({ '+': 'infinite', '-': 2, '×': 0, '÷': 0 });
    expect(spendOperatorUse(usage, '+')).toEqual(usage);
    expect(spendOperatorUse(usage, '÷')).toEqual(usage);
    // The first bubble goes in without an operator.
    expect(spendOperatorUse(usage, undefined)).toEqual(usage);
    expect(usage).toEqual({ '+': 'infinite', '-': 2, '×': 1, '÷': 0 });
  });

  it('has nothing to take back before the first move', () => {
    expect(takeBackLastMove([])).toBeUndefined();
  });

  it('returns to the empty board from the first move', () => {
    const result = takeBackLastMove([position(2, [3, 4])]);

    expect(result?.positions).toEqual([]);
    expect(result?.restore).toBeUndefined();
  });

  it('returns to the position before the last move, one move at a time', () => {
    const positions = [position(2, [3, 4]), position(5, [4]), position(20, [])];

    const once = takeBackLastMove(positions);
    expect(once?.restore).toEqual(position(5, [4]));
    expect(once?.positions).toHaveLength(2);

    const twice = takeBackLastMove(once!.positions);
    expect(twice?.restore).toEqual(position(2, [3, 4]));
    expect(twice?.positions).toHaveLength(1);
    // The list that was passed in is left as it was.
    expect(positions).toHaveLength(3);
  });
});
