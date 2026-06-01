import { createNumberExpression } from '@/domain/math/expression';
import { digitValues, normalizeNumber } from '@/domain/math/normalize';
import { ExpressionNode, NumberGroup, NumberObject } from '@/domain/math/types';

export function createNumberGroup(value: number, groupId: string, expressionNode?: ExpressionNode) {
  const normalized = normalizeNumber(value);
  const objects: NumberObject[] = [];

  for (const digitValue of digitValues) {
    for (let index = 0; index < normalized.counts[digitValue]; index += 1) {
      objects.push({
        id: `${groupId}-${digitValue}-${index}`,
        value: digitValue,
        groupId,
      });
    }
  }

  const group: NumberGroup = {
    id: groupId,
    objectIds: objects.map((object) => object.id),
    value,
    expressionNode: expressionNode ?? createNumberExpression(value, groupId),
  };

  return { group, objects };
}

export function getTotalValue(objects: NumberObject[]) {
  return objects.reduce((sum, object) => sum + object.value, 0);
}
