import { ExpressionHistoryItem, NumberGroup } from '@/domain/math/types';
import { Stage, StageSolutionStep } from '@/domain/stage/types';

export function getMinimumMoveCount(stage: Stage) {
  return stage.solution.steps.length;
}

export function isSolutionStepMatched(step: StageSolutionStep, leftValue: number, rightValue: number, resultValue: number) {
  if (step.operator !== 'add' || step.resultValue !== resultValue) {
    return false;
  }

  return (
    (step.leftValue === leftValue && step.rightValue === rightValue) ||
    (step.leftValue === rightValue && step.rightValue === leftValue)
  );
}

export function formatSolutionStep(step: StageSolutionStep) {
  if (step.operator === 'add') {
    return `${step.leftValue} + ${step.rightValue} = ${step.resultValue}`;
  }

  return `${step.resultValue}`;
}

export function formatStageSolution(stage: Stage) {
  return stage.solution.steps.map(formatSolutionStep);
}

export function getNextSolutionStep(stage: Stage, history: ExpressionHistoryItem[]) {
  return stage.solution.steps[history.length];
}

export function formatSolutionHint(step: StageSolutionStep) {
  if (step.operator === 'add') {
    return `${step.leftValue} と ${step.rightValue} をあわせてみよう`;
  }

  return `${step.resultValue} をつくってみよう`;
}

export function getSolutionHintGroupIds(numberGroups: NumberGroup[], step?: StageSolutionStep) {
  if (!step) {
    return [];
  }

  const pair = findHintPair(numberGroups, step.leftValue, step.rightValue, step.resultValue);
  if (!pair && step.leftValue !== step.rightValue) {
    return getSolutionHintGroupIdsForPair(numberGroups, step.rightValue, step.leftValue, step.resultValue);
  }

  return pair?.map((group) => group.id) ?? [];
}

function getSolutionHintGroupIdsForPair(
  numberGroups: NumberGroup[],
  leftValue: number,
  rightValue: number,
  resultValue: number,
) {
  return findHintPair(numberGroups, leftValue, rightValue, resultValue)?.map((group) => group.id) ?? [];
}

function findHintPair(numberGroups: NumberGroup[], leftValue: number, rightValue: number, resultValue: number) {
  for (const leftGroup of numberGroups) {
    if (leftGroup.value !== leftValue) {
      continue;
    }

    const rightGroup = numberGroups.find((group) => group.id !== leftGroup.id && group.value === rightValue);
    if (rightGroup && leftGroup.value + rightGroup.value === resultValue) {
      return [leftGroup, rightGroup];
    }
  }

  return undefined;
}
