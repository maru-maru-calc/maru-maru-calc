import { ExpressionNode } from '@/domain/math/types';

export function createNumberExpression(value: number, sourceGroupId?: string): ExpressionNode {
  return {
    type: 'number',
    value,
    sourceGroupId,
  };
}

export function toDisplayExpression(node: ExpressionNode): string {
  if (node.type === 'number') {
    return String(node.value);
  }

  return `${toDisplayExpression(node.left)} + ${toDisplayExpression(node.right)} = ${node.value}`;
}
