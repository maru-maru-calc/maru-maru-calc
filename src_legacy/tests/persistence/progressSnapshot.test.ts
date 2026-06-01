import { describe, expect, it } from 'vitest';

import { StageId } from '@/domain/stage/types';
import { parseProgressSnapshot, serializeProgressSnapshot } from '@/persistence/progressSnapshot';

describe('progress snapshot persistence', () => {
  it('round-trips progress snapshots', () => {
    const snapshot = {
      completedStageIds: ['stage-1', 'stage-2'] as StageId[],
      lastPlayedStageId: 'stage-3' as const,
    };

    expect(parseProgressSnapshot(serializeProgressSnapshot(snapshot))).toEqual(snapshot);
  });

  it('sanitizes unknown and duplicate stage ids when parsing', () => {
    expect(
      parseProgressSnapshot(
        JSON.stringify({
          completedStageIds: ['stage-1', 'stage-99', 'stage-1', 'stage-6'],
          lastPlayedStageId: 'stage-99',
        }),
      ),
    ).toEqual({
      completedStageIds: ['stage-1', 'stage-6'],
      lastPlayedStageId: undefined,
    });
  });
});
