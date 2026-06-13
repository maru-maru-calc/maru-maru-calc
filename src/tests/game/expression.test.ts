import { describe, expect, it } from 'vitest';

import {
  evaluateExpressionOnEquals,
  getDisplayBeadsForPendingPriorityExpression,
  getPendingOperationExpressionValue,
  replaceTrailingOperator,
} from '@/game/expression';
import { BeadSnapshot } from '@/game/types';

describe('expression driven wrapped display', () => {
  it('evaluates the pending grouped expression before multiplication', () => {
    expect(getPendingOperationExpressionValue(['(2 ÷ 2 + 2)', '×'])).toBe(3);
    expect(getPendingOperationExpressionValue(['(2 ÷ 2 + 2) ×'])).toBe(3);
  });

  it('renders a single wrapped group for the displayed expression value', () => {
    const beads: BeadSnapshot[] = [
      { id: 'divided-two', value: 1, count: 2, sign: 1, role: 'division', x: 100, y: 100 },
      { id: 'loose-one', value: 1, count: 1, sign: 1, role: 'normal', x: 130, y: 120 },
    ];

    const displayBeads = getDisplayBeadsForPendingPriorityExpression(beads, ['(2 ÷ 2 + 2)', '×']);
    const compactDisplayBeads = getDisplayBeadsForPendingPriorityExpression(beads, ['(2 ÷ 2 + 2) ×']);

    expect(displayBeads).toHaveLength(1);
    expect(displayBeads[0]).toMatchObject({
      id: 'expression-wrap-preview',
      value: 1,
      count: 3,
      sign: 1,
      role: 'multiplicand',
    });
    expect(compactDisplayBeads[0]).toMatchObject({ count: 3, role: 'multiplicand' });
  });

  it('keeps the grouped expression when multiplying after equals', () => {
    const pendingTokens = replaceTrailingOperator(['2', '÷', '2', '+', '2', '=', '3'], '×');
    expect(pendingTokens).toEqual(['(2 ÷ 2 + 2)', '×']);

    expect(evaluateExpressionOnEquals([...pendingTokens, '2'])).toEqual(['(2 ÷ 2 + 2)', '×', '2', '=', '6']);
  });

  it('does not wrap multiplication and division chains that are equivalent without parentheses', () => {
    expect(replaceTrailingOperator(['6', '×', '4', '=', '24'], '÷')).toEqual(['6', '×', '4', '÷']);
    expect(evaluateExpressionOnEquals(['6', '×', '4', '÷', '3'])).toEqual(['6', '×', '4', '÷', '3', '=', '8']);
  });

  it('keeps parentheses when a low-priority expression is multiplied or divided as one group', () => {
    expect(replaceTrailingOperator(['6', '+', '4', '=', '10'], '×')).toEqual(['(6 + 4)', '×']);
    expect(evaluateExpressionOnEquals(['(6 + 4)', '×', '3'])).toEqual(['(6 + 4)', '×', '3', '=', '30']);
  });
});
