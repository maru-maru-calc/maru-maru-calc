import { describe, expect, it } from 'vitest';

import { initialStages } from '@/data/stages';
import { getStageDescription, getStageTitle } from '@/domain/stage/copy';

describe('stage copy', () => {
  it('returns normal stage copy by default text mode', () => {
    expect(getStageTitle(initialStages[0], 'normal')).toBe('ステージ 1');
    expect(getStageDescription(initialStages[0], 'normal')).toBe('2つの数をあわせる');
  });

  it('returns hiragana stage copy when requested', () => {
    expect(getStageTitle(initialStages[3], 'hiragana')).toBe('すてーじ 4');
    expect(getStageDescription(initialStages[3], 'hiragana')).toBe('2けたのかずをあわせる');
  });

  it('has copy for the intermediate-result stage', () => {
    expect(getStageDescription(initialStages[5], 'normal')).toBe('できた数をもう一度つかう');
    expect(getStageDescription(initialStages[5], 'hiragana')).toBe('できたかずをもういちどつかう');
  });
});
