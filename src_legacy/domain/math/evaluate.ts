import { createNumberExpression } from '@/domain/math/expression';
import { getAdditionBreakdown, getCarryEvents } from '@/domain/math/normalize';
import { AddEvaluation, NumberGroup } from '@/domain/math/types';

export function evaluateAdd(left: NumberGroup, right: NumberGroup): AddEvaluation {
  const resultValue = left.value + right.value;
  if (resultValue > 999) {
    return {
      ok: false,
      reason: 'result-out-of-range',
    };
  }

  return {
    ok: true,
    leftValue: left.value,
    rightValue: right.value,
    resultValue,
    carryEvents: getCarryEvents(left.value, right.value),
    breakdown: getAdditionBreakdown(left.value, right.value),
    expressionNode: {
      type: 'operation',
      operator: 'add',
      left: left.expressionNode ?? createNumberExpression(left.value, left.id),
      right: right.expressionNode ?? createNumberExpression(right.value, right.id),
      value: resultValue,
    },
  };
}
