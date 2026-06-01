import { describe, expect, it } from 'vitest';

import { initialStages } from '@/data/stages';
import {
  formatSolutionStep,
  formatStageSolution,
  getMinimumMoveCount,
  getNextSolutionStep,
  getSolutionHintGroupIds,
  isSolutionStepMatched,
  formatSolutionHint,
} from '@/domain/stage/solution';
import { createNumberGroup } from '@/domain/math/groups';

describe('stage solution', () => {
  it('reads the minimum move count from the solution steps', () => {
    expect(getMinimumMoveCount(initialStages[0])).toBe(1);
  });

  it('matches addition solution steps regardless of operand order', () => {
    const step = initialStages[0].solution.steps[0];

    expect(isSolutionStepMatched(step, 2, 3, 5)).toBe(true);
    expect(isSolutionStepMatched(step, 3, 2, 5)).toBe(true);
    expect(isSolutionStepMatched(step, 2, 3, 6)).toBe(false);
  });

  it('formats solution steps for clear summaries', () => {
    expect(formatSolutionStep(initialStages[2].solution.steps[0])).toBe('7 + 5 = 12');
    expect(formatStageSolution(initialStages[4])).toEqual(['55 + 45 = 100']);
  });

  it('returns and formats the next solution step from history length', () => {
    const stage = initialStages[5];

    expect(getNextSolutionStep(stage, [])).toEqual(stage.solution.steps[0]);
    expect(formatSolutionHint(stage.solution.steps[1])).toBe('5 と 10 をあわせてみよう');
  });

  it('finds the current groups used by a solution hint', () => {
    const two = createNumberGroup(2, 'two').group;
    const three = createNumberGroup(3, 'three').group;
    const ten = createNumberGroup(10, 'ten').group;

    expect(getSolutionHintGroupIds([two, three, ten], initialStages[0].solution.steps[0])).toEqual(['two', 'three']);
  });
});
