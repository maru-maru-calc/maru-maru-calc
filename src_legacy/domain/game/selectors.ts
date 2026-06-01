import { toDisplayExpression } from '@/domain/math/expression';
import { getAdditionBreakdown, getAdditionReadiness } from '@/domain/math/normalize';
import { AdditionReadiness, CarryStep, DigitCounts, ExpressionHistoryItem, NumberGroup } from '@/domain/math/types';
import { GameStatus, GroupPosition } from '@/domain/game/types';

export type AddOperationPreview =
  | {
      ok: true;
      leftValue: number;
      rightValue: number;
      resultValue: number;
      hasCarry: boolean;
      normalizedCounts: DigitCounts;
      carrySteps: CarryStep[];
      expression: string;
    }
  | {
      ok: false;
      reason: 'needs-two-groups' | 'group-not-found' | 'result-out-of-range';
    };

export function getSelectedGroups(numberGroups: NumberGroup[], selectedGroupIds: string[]) {
  return selectedGroupIds
    .map((groupId) => numberGroups.find((group) => group.id === groupId))
    .filter((group) => group !== undefined);
}

export function canExecuteAdd(selectedGroupIds: string[]) {
  return selectedGroupIds.length === 2;
}

export function canSelectGroup(status: GameStatus) {
  return status !== 'evaluating' && status !== 'clear';
}

export function canDragGroup(status: GameStatus) {
  return status !== 'evaluating';
}

export function getNearestGroupIdWithinRadius(
  numberGroups: NumberGroup[],
  groupPositions: Record<string, GroupPosition>,
  sourceGroupId: string,
  sourcePosition: GroupPosition,
  radius: number,
) {
  let nearestGroupId: string | undefined;
  let nearestDistance = Number.POSITIVE_INFINITY;

  numberGroups.forEach((group) => {
    if (group.id === sourceGroupId) {
      return;
    }

    const targetPosition = groupPositions[group.id];
    if (!targetPosition) {
      return;
    }

    const distance = getGroupDistance(sourcePosition, targetPosition);
    if (distance <= radius && distance < nearestDistance) {
      nearestGroupId = group.id;
      nearestDistance = distance;
    }
  });

  return nearestGroupId;
}

export function getSelectedAdditionReadiness(numberGroups: NumberGroup[], selectedGroupIds: string[]): AdditionReadiness | undefined {
  const selectedGroups = getSelectedGroups(numberGroups, selectedGroupIds);

  if (selectedGroups.length !== 2) {
    return undefined;
  }

  return getAdditionReadiness(selectedGroups[0].value, selectedGroups[1].value);
}

export function getAddOperationPreview(numberGroups: NumberGroup[], selectedGroupIds: string[]): AddOperationPreview {
  const selectedGroups = getSelectedGroups(numberGroups, selectedGroupIds);

  if (selectedGroupIds.length !== 2) {
    return { ok: false, reason: 'needs-two-groups' };
  }

  if (selectedGroups.length !== 2) {
    return { ok: false, reason: 'group-not-found' };
  }

  const [leftGroup, rightGroup] = selectedGroups;
  const resultValue = leftGroup.value + rightGroup.value;
  if (resultValue > 999) {
    return { ok: false, reason: 'result-out-of-range' };
  }

  const readiness = getAdditionReadiness(leftGroup.value, rightGroup.value);
  const breakdown = getAdditionBreakdown(leftGroup.value, rightGroup.value);

  return {
    ok: true,
    leftValue: leftGroup.value,
    rightValue: rightGroup.value,
    resultValue,
    hasCarry: readiness.state === 'ready',
    normalizedCounts: breakdown.normalizedCounts,
    carrySteps: breakdown.carrySteps,
    expression: `${leftGroup.value} + ${rightGroup.value} = ${resultValue}`,
  };
}

export function getLatestExpression(history: ExpressionHistoryItem[]) {
  return history.at(-1)?.expressionNode;
}

export function getDisplayExpressionHistory(history: ExpressionHistoryItem[]) {
  return history.map((item) => toDisplayExpression(item.expressionNode));
}

export function getLatestHistoryItem(history: ExpressionHistoryItem[]) {
  return history.at(-1);
}

export function getLatestDisplayExpression(history: ExpressionHistoryItem[]) {
  const latestHistoryItem = getLatestHistoryItem(history);

  return latestHistoryItem ? toDisplayExpression(latestHistoryItem.expressionNode) : undefined;
}

function getGroupDistance(left: GroupPosition, right: GroupPosition) {
  const x = left.x - right.x;
  const y = left.y - right.y;

  return Math.sqrt(x * x + y * y);
}
