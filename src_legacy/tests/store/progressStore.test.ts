import { beforeEach, describe, expect, it } from 'vitest';

import { StageId } from '@/domain/stage/types';
import { useProgressStore } from '@/store/progressStore';

describe('progressStore', () => {
  beforeEach(() => {
    useProgressStore.setState({
      completedStageIds: [],
      lastPlayedStageId: undefined,
    });
  });

  it('marks stages completed without duplicates', () => {
    useProgressStore.getState().markStageCompleted('stage-1');
    useProgressStore.getState().markStageCompleted('stage-1');

    expect(useProgressStore.getState().completedStageIds).toEqual(['stage-1']);
    expect(useProgressStore.getState().lastPlayedStageId).toBe('stage-2');
    expect(useProgressStore.getState().isStageCompleted('stage-1')).toBe(true);
  });

  it('stores the last played stage only for known stages', () => {
    useProgressStore.getState().setLastPlayedStage('stage-2');
    useProgressStore.getState().setLastPlayedStage('stage-99' as StageId);

    expect(useProgressStore.getState().lastPlayedStageId).toBe('stage-2');
  });

  it('ignores completion for unknown stages', () => {
    useProgressStore.getState().markStageCompleted('stage-99' as StageId);

    expect(useProgressStore.getState().completedStageIds).toEqual([]);
  });

  it('resets local progress', () => {
    useProgressStore.getState().markStageCompleted('stage-1');
    useProgressStore.getState().resetProgress();

    expect(useProgressStore.getState().completedStageIds).toEqual([]);
    expect(useProgressStore.getState().lastPlayedStageId).toBeUndefined();
  });
});
