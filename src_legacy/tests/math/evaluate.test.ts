import { describe, expect, it } from 'vitest';

import { evaluateAdd } from '@/domain/math/evaluate';
import { createNumberGroup, getTotalValue } from '@/domain/math/groups';
import { toDisplayExpression } from '@/domain/math/expression';

describe('evaluateAdd', () => {
  it('adds two number groups and preserves the expression tree', () => {
    const left = createNumberGroup(23, 'left').group;
    const right = createNumberGroup(8, 'right').group;

    const result = evaluateAdd(left, right);

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    expect(result.resultValue).toBe(31);
    expect(result.carryEvents).toEqual([1]);
    expect(result.breakdown).toMatchObject({
      rawCounts: { 100: 0, 10: 2, 1: 11 },
      normalizedCounts: { 100: 0, 10: 3, 1: 1 },
    });
    expect(result.expressionNode).toMatchObject({
      type: 'operation',
      operator: 'add',
      value: 31,
    });
    expect(toDisplayExpression(result.expressionNode)).toBe('23 + 8 = 31');
  });

  it('rejects results above 999', () => {
    const left = createNumberGroup(900, 'left').group;
    const right = createNumberGroup(100, 'right').group;

    expect(evaluateAdd(left, right)).toEqual({
      ok: false,
      reason: 'result-out-of-range',
    });
  });
});

describe('number groups', () => {
  it('creates place-value objects from normalized digits', () => {
    const { group, objects } = createNumberGroup(209, 'group');

    expect(group.objectIds).toHaveLength(11);
    expect(objects.filter((object) => object.value === 100)).toHaveLength(2);
    expect(objects.filter((object) => object.value === 10)).toHaveLength(0);
    expect(objects.filter((object) => object.value === 1)).toHaveLength(9);
    expect(getTotalValue(objects)).toBe(209);
  });
});
