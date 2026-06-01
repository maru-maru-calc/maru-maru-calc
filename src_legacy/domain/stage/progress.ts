import { Stage, StageId } from '@/domain/stage/types';

export type StageProgressItem = {
  stage: Stage;
  completed: boolean;
  current: boolean;
  recommended: boolean;
};

export type StageProgressSummary = {
  completedCount: number;
  totalCount: number;
  allCompleted: boolean;
};

export type StageProgressSections = {
  mvp: StageProgressItem[];
  practice: StageProgressItem[];
};

export function getStageProgressSummary(stages: Stage[], completedStageIds: StageId[]): StageProgressSummary {
  const completedCount = sanitizeCompletedStageIds(stages, completedStageIds).length;

  return {
    completedCount,
    totalCount: stages.length,
    allCompleted: stages.length > 0 && completedCount === stages.length,
  };
}

export function isKnownStageId(stages: Stage[], stageId: StageId) {
  return stages.some((stage) => stage.id === stageId);
}

export function getNextRecommendedStageId(
  stages: Stage[],
  completedStageIds: StageId[],
  lastPlayedStageId?: StageId,
): StageId | undefined {
  const knownStageIds = new Set(stages.map((stage) => stage.id));
  const knownLastPlayedStageId = lastPlayedStageId && knownStageIds.has(lastPlayedStageId) ? lastPlayedStageId : undefined;

  if (knownLastPlayedStageId && !completedStageIds.includes(knownLastPlayedStageId)) {
    return knownLastPlayedStageId;
  }

  const firstIncompleteStage = stages.find((stage) => !completedStageIds.includes(stage.id));
  if (firstIncompleteStage) {
    return firstIncompleteStage.id;
  }

  return knownLastPlayedStageId ?? stages[0]?.id;
}

export function getStageIdAfterClear(stages: Stage[], completedStageIds: StageId[], clearedStageId: StageId): StageId | undefined {
  const nextCompletedStageIds = addCompletedStageId(completedStageIds, clearedStageId);

  return getNextRecommendedStageId(stages, nextCompletedStageIds, clearedStageId);
}

export function addCompletedStageId(completedStageIds: StageId[], stageId: StageId): StageId[] {
  if (completedStageIds.includes(stageId)) {
    return completedStageIds;
  }

  return [...completedStageIds, stageId];
}

export function sanitizeCompletedStageIds(stages: Stage[], completedStageIds: StageId[]): StageId[] {
  const knownStageIds = new Set(stages.map((stage) => stage.id));
  const seenStageIds = new Set<StageId>();
  const sanitizedStageIds: StageId[] = [];

  completedStageIds.forEach((stageId) => {
    if (!knownStageIds.has(stageId) || seenStageIds.has(stageId)) {
      return;
    }

    seenStageIds.add(stageId);
    sanitizedStageIds.push(stageId);
  });

  return sanitizedStageIds;
}

export function getStageProgressItems(
  stages: Stage[],
  completedStageIds: StageId[],
  lastPlayedStageId?: StageId,
): StageProgressItem[] {
  const recommendedStageId = getNextRecommendedStageId(stages, completedStageIds, lastPlayedStageId);

  return stages.map((stage) => ({
    stage,
    completed: completedStageIds.includes(stage.id),
    current: lastPlayedStageId === stage.id,
    recommended: recommendedStageId === stage.id,
  }));
}

export function getStageProgressSections(items: StageProgressItem[]): StageProgressSections {
  return {
    mvp: items.filter((item) => item.stage.kind === 'mvp'),
    practice: items.filter((item) => item.stage.kind === 'practice'),
  };
}
