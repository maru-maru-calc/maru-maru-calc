import { describe, expect, it } from 'vitest';

import { initialStages } from '@/data/stages';
import {
  addCompletedStageId,
  getNextRecommendedStageId,
  getStageIdAfterClear,
  getStageProgressItems,
  getStageProgressSections,
  getStageProgressSummary,
  isKnownStageId,
  sanitizeCompletedStageIds,
} from '@/domain/stage/progress';

describe('stage progress', () => {
  it('starts from the first incomplete stage when there is no last played stage', () => {
    expect(getNextRecommendedStageId(initialStages, [])).toBe('stage-1');
    expect(getNextRecommendedStageId(initialStages, ['stage-1'])).toBe('stage-2');
  });

  it('continues an unfinished last played stage first', () => {
    expect(getNextRecommendedStageId(initialStages, ['stage-1'], 'stage-3')).toBe('stage-3');
  });

  it('moves past a completed last played stage', () => {
    expect(getNextRecommendedStageId(initialStages, ['stage-1', 'stage-2'], 'stage-2')).toBe('stage-3');
  });

  it('ignores an unknown last played stage', () => {
    expect(getNextRecommendedStageId(initialStages, [], 'stage-99')).toBe('stage-1');
  });

  it('marks completed, current, and recommended stages separately', () => {
    const items = getStageProgressItems(initialStages, ['stage-1'], 'stage-2');

    expect(items[0]).toMatchObject({ completed: true, current: false, recommended: false });
    expect(items[1]).toMatchObject({ completed: false, current: true, recommended: true });
  });

  it('adds completed stage ids without duplicates', () => {
    const completedStageIds = ['stage-1'] as const;

    expect(addCompletedStageId([...completedStageIds], 'stage-2')).toEqual(['stage-1', 'stage-2']);
    expect(addCompletedStageId([...completedStageIds], 'stage-1')).toEqual(['stage-1']);
  });

  it('sanitizes restored completed stage ids against known stages', () => {
    expect(sanitizeCompletedStageIds(initialStages, ['stage-1', 'stage-99', 'stage-1', 'stage-3'])).toEqual([
      'stage-1',
      'stage-3',
    ]);
  });

  it('summarizes completed progress against known stages', () => {
    expect(getStageProgressSummary(initialStages, ['stage-1', 'stage-99', 'stage-1'])).toEqual({
      completedCount: 1,
      totalCount: initialStages.length,
      allCompleted: false,
    });
  });

  it('summarizes MVP progress independently from practice stages', () => {
    const mvpStages = initialStages.filter((stage) => stage.kind === 'mvp');

    expect(getStageProgressSummary(mvpStages, ['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5'])).toEqual({
      completedCount: 5,
      totalCount: 5,
      allCompleted: true,
    });
  });

  it('groups progress items by stage kind', () => {
    const sections = getStageProgressSections(getStageProgressItems(initialStages, [], undefined));

    expect(sections.mvp.map((item) => item.stage.id)).toEqual(['stage-1', 'stage-2', 'stage-3', 'stage-4', 'stage-5']);
    expect(sections.practice.map((item) => item.stage.id)).toEqual(['stage-6']);
  });

  it('checks known stage ids against the stage collection', () => {
    expect(isKnownStageId(initialStages, 'stage-1')).toBe(true);
    expect(isKnownStageId(initialStages, 'stage-99')).toBe(false);
  });

  it('recommends the next incomplete stage after a clear', () => {
    expect(getStageIdAfterClear(initialStages, [], 'stage-1')).toBe('stage-2');
  });
});
