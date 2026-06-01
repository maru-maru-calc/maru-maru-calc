import { assertMvpNumber } from '@/domain/math/normalize';
import { Stage } from '@/domain/stage/types';

export type StageValidationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      errors: string[];
    };

export function validateStage(stage: Stage): StageValidationResult {
  const errors: string[] = [];

  if (!assertMvpNumber(stage.targetValue)) {
    errors.push('targetValue must be an MVP number');
  }

  if (stage.worldId !== 'addition-island') {
    errors.push('MVP stages must be in addition-island');
  }

  if (stage.kind !== 'mvp' && stage.kind !== 'practice') {
    errors.push('stage kind must be mvp or practice');
  }

  if (stage.initialGroups.length < 2) {
    errors.push('stage must start with at least two groups');
  }

  if (stage.solution.steps.length === 0) {
    errors.push('stage solution must have at least one step');
  }

  if (stage.allowedOperators.length === 0) {
    errors.push('stage must allow at least one operator');
  }

  for (const initialGroup of stage.initialGroups) {
    if (!assertMvpNumber(initialGroup.value)) {
      errors.push(`initial group value must be an MVP number: ${initialGroup.value}`);
    }
  }

  const workingValues = [...stage.initialGroups.map((group) => group.value)];

  stage.solution.steps.forEach((step, index) => {
    const stepLabel = `step ${index + 1}`;

    if (!stage.allowedOperators.includes(step.operator)) {
      errors.push(`${stepLabel} uses an operator that is not allowed`);
    }

    if (step.operator !== 'add') {
      errors.push(`${stepLabel} uses an unsupported MVP operator`);
      return;
    }

    const leftIndex = workingValues.indexOf(step.leftValue);
    if (leftIndex === -1) {
      errors.push(`${stepLabel} left value is not available`);
      return;
    }

    const rightIndex = workingValues.findIndex((value, valueIndex) => valueIndex !== leftIndex && value === step.rightValue);
    if (rightIndex === -1) {
      errors.push(`${stepLabel} right value is not available`);
      return;
    }

    const expectedResult = step.leftValue + step.rightValue;
    if (expectedResult !== step.resultValue) {
      errors.push(`${stepLabel} resultValue does not match left + right`);
      return;
    }

    if (!assertMvpNumber(step.resultValue)) {
      errors.push(`${stepLabel} resultValue must be an MVP number`);
      return;
    }

    removeAtDescending(workingValues, leftIndex, rightIndex);
    workingValues.push(step.resultValue);
  });

  if (workingValues.length !== 1 || workingValues[0] !== stage.targetValue) {
    errors.push('solution must leave exactly one group matching the target');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

export function validateStages(stages: Stage[]): StageValidationResult {
  const errors: string[] = [];
  const seenStageIds = new Set<string>();
  const seenOrders = new Set<number>();
  let firstPracticeOrder = Number.POSITIVE_INFINITY;
  let lastMvpOrder = 0;

  stages.forEach((stage) => {
    if (seenStageIds.has(stage.id)) {
      errors.push(`duplicate stage id: ${stage.id}`);
    }
    seenStageIds.add(stage.id);

    if (seenOrders.has(stage.order)) {
      errors.push(`duplicate stage order: ${stage.order}`);
    }
    seenOrders.add(stage.order);

    if (stage.kind === 'mvp') {
      lastMvpOrder = Math.max(lastMvpOrder, stage.order);
    }

    if (stage.kind === 'practice') {
      firstPracticeOrder = Math.min(firstPracticeOrder, stage.order);
    }

    const result = validateStage(stage);
    if (!result.ok) {
      result.errors.forEach((error) => errors.push(`${stage.id}: ${error}`));
    }
  });

  const sortedOrders = [...seenOrders].sort((left, right) => left - right);
  sortedOrders.forEach((order, index) => {
    const expectedOrder = index + 1;
    if (order !== expectedOrder) {
      errors.push(`stage order must be contiguous from 1: missing ${expectedOrder}`);
    }
  });

  if (Number.isFinite(firstPracticeOrder) && firstPracticeOrder <= lastMvpOrder) {
    errors.push('practice stages must come after MVP stages');
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true };
}

function removeAtDescending(values: number[], firstIndex: number, secondIndex: number) {
  [firstIndex, secondIndex]
    .sort((left, right) => right - left)
    .forEach((index) => {
      values.splice(index, 1);
    });
}
