import { describe, expect, it } from 'vitest';

import {
  canDragGroup,
  canExecuteAdd,
  canSelectGroup,
  getAddOperationPreview,
  getDisplayExpressionHistory,
  getLatestDisplayExpression,
  getLatestHistoryItem,
  getLatestExpression,
  getNearestGroupIdWithinRadius,
  getSelectedAdditionReadiness,
  getSelectedGroups,
} from '@/domain/game/selectors';
import { evaluateAdd } from '@/domain/math/evaluate';
import { createNumberGroup } from '@/domain/math/groups';
import { ExpressionHistoryItem } from '@/domain/math/types';

describe('game selectors', () => {
  it('returns selected groups in selection order', () => {
    const left = createNumberGroup(7, 'left').group;
    const right = createNumberGroup(5, 'right').group;

    expect(getSelectedGroups([left, right], ['right', 'left']).map((group) => group.id)).toEqual(['right', 'left']);
  });

  it('allows add only when exactly two groups are selected', () => {
    expect(canExecuteAdd([])).toBe(false);
    expect(canExecuteAdd(['left'])).toBe(false);
    expect(canExecuteAdd(['left', 'right'])).toBe(true);
  });

  it('distinguishes selection and dragging availability by status', () => {
    expect(canSelectGroup('selecting')).toBe(true);
    expect(canSelectGroup('clear')).toBe(false);
    expect(canDragGroup('clear')).toBe(true);
    expect(canDragGroup('evaluating')).toBe(false);
  });

  it('returns addition readiness for two selected groups', () => {
    const left = createNumberGroup(7, 'left').group;
    const right = createNumberGroup(5, 'right').group;

    expect(getSelectedAdditionReadiness([left, right], ['left', 'right'])).toMatchObject({
      state: 'ready',
      digit: 1,
      count: 12,
    });
  });

  it('builds an add operation preview for selected groups', () => {
    const left = createNumberGroup(7, 'left').group;
    const right = createNumberGroup(5, 'right').group;

    expect(getAddOperationPreview([left, right], ['left', 'right'])).toEqual({
      ok: true,
      leftValue: 7,
      rightValue: 5,
      resultValue: 12,
      hasCarry: true,
      normalizedCounts: {
        1: 2,
        10: 1,
        100: 0,
      },
      carrySteps: [
        {
          fromDigit: 1,
          toDigit: 10,
          beforeCount: 12,
          carryCount: 1,
          remainderCount: 2,
        },
      ],
      expression: '7 + 5 = 12',
    });
  });

  it('reports add preview errors without throwing', () => {
    const left = createNumberGroup(2, 'left').group;
    const largeLeft = createNumberGroup(900, 'large-left').group;
    const largeRight = createNumberGroup(100, 'large-right').group;

    expect(getAddOperationPreview([left], ['left'])).toEqual({
      ok: false,
      reason: 'needs-two-groups',
    });
    expect(getAddOperationPreview([left], ['left', 'missing'])).toEqual({
      ok: false,
      reason: 'group-not-found',
    });
    expect(getAddOperationPreview([largeLeft, largeRight], ['large-left', 'large-right'])).toEqual({
      ok: false,
      reason: 'result-out-of-range',
    });
  });

  it('finds the nearest group inside a drop radius', () => {
    const source = createNumberGroup(2, 'source').group;
    const near = createNumberGroup(3, 'near').group;
    const far = createNumberGroup(10, 'far').group;

    expect(
      getNearestGroupIdWithinRadius(
        [source, near, far],
        {
          source: { x: 0.2, y: 0.2 },
          near: { x: 0.52, y: 0.5 },
          far: { x: 0.8, y: 0.8 },
        },
        'source',
        { x: 0.5, y: 0.48 },
        0.08,
      ),
    ).toBe('near');
  });

  it('does not return a group outside the drop radius', () => {
    const source = createNumberGroup(2, 'source').group;
    const far = createNumberGroup(10, 'far').group;

    expect(
      getNearestGroupIdWithinRadius(
        [source, far],
        {
          source: { x: 0.2, y: 0.2 },
          far: { x: 0.8, y: 0.8 },
        },
        'source',
        { x: 0.5, y: 0.5 },
        0.1,
      ),
    ).toBeUndefined();
  });

  it('formats expression history', () => {
    const left = createNumberGroup(2, 'left').group;
    const right = createNumberGroup(3, 'right').group;
    const evaluation = evaluateAdd(left, right);
    if (!evaluation.ok) {
      throw new Error('expected evaluation to succeed');
    }

    const history: ExpressionHistoryItem[] = [
      {
        id: 'step-1',
        expressionNode: evaluation.expressionNode,
        operator: 'add',
        leftValue: 2,
        rightValue: 3,
        resultValue: 5,
        stepIndex: 1,
      },
    ];

    expect(getLatestExpression(history)).toBe(evaluation.expressionNode);
    expect(getLatestHistoryItem(history)).toBe(history[0]);
    expect(getLatestDisplayExpression(history)).toBe('2 + 3 = 5');
    expect(getDisplayExpressionHistory(history)).toEqual(['2 + 3 = 5']);
  });
});
