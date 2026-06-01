import { initialStages } from '@/data/stages';
import { isKnownStageId, sanitizeCompletedStageIds } from '@/domain/stage/progress';
import { StageId } from '@/domain/stage/types';
import { parseJsonObject } from '@/persistence/json';

export type ProgressSnapshot = {
  completedStageIds: StageId[];
  lastPlayedStageId?: StageId;
};

export function serializeProgressSnapshot(snapshot: ProgressSnapshot) {
  return JSON.stringify(snapshot);
}

export function parseProgressSnapshot(value: string): ProgressSnapshot | undefined {
  const snapshot = parseJsonObject(value);
  if (!snapshot) {
    return undefined;
  }

  const completedStageIds = Array.isArray(snapshot.completedStageIds)
    ? sanitizeCompletedStageIds(initialStages, snapshot.completedStageIds as StageId[])
    : [];
  const lastPlayedStageId =
    typeof snapshot.lastPlayedStageId === 'string' && isKnownStageId(initialStages, snapshot.lastPlayedStageId as StageId)
      ? (snapshot.lastPlayedStageId as StageId)
      : undefined;

  return {
    completedStageIds,
    lastPlayedStageId,
  };
}
