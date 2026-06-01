import { describe, expect, it } from 'vitest';

import { createMergeAnimationPlan, getMergeAnimationDuration } from '@/animation/merge';
import { MergeAnimation } from '@/domain/game/types';

const simpleMerge: MergeAnimation = {
  id: 'merge-1',
  leftValue: 2,
  rightValue: 3,
  resultValue: 5,
  carryEvents: [],
  carrySteps: [],
};

const carryMerge: MergeAnimation = {
  id: 'merge-2',
  leftValue: 7,
  rightValue: 5,
  resultValue: 12,
  carryEvents: [1],
  carrySteps: [
    {
      fromDigit: 1,
      toDigit: 10,
      beforeCount: 12,
      carryCount: 1,
      remainderCount: 2,
    },
  ],
};

describe('merge animation plan', () => {
  it('uses a shorter tactile plan for simple addition', () => {
    const plan = createMergeAnimationPlan(simpleMerge);

    expect(plan.hasCarry).toBe(false);
    expect(plan.phases.map((phase) => phase.name)).toEqual(['gather', 'tremble', 'flash', 'land']);
    expect(plan.durationMs).toBe(640);
    expect(getMergeAnimationDuration(simpleMerge)).toBe(plan.durationMs);
  });

  it('keeps carry addition slower and explicit', () => {
    const plan = createMergeAnimationPlan(carryMerge);

    expect(plan.hasCarry).toBe(true);
    expect(plan.phases.map((phase) => phase.name)).toEqual(['gather', 'tremble', 'spin', 'flash', 'land']);
    expect(plan.durationMs).toBe(890);
    expect(plan.durationMs).toBeGreaterThan(getMergeAnimationDuration(simpleMerge));
  });
});
