import { create } from 'zustand';

import { initialStages } from '@/data/stages';
import { addCompletedStageId, getStageIdAfterClear, isKnownStageId } from '@/domain/stage/progress';
import { appStorage } from '@/persistence/appStorage';
import { parseProgressSnapshot, ProgressSnapshot, serializeProgressSnapshot } from '@/persistence/progressSnapshot';
import { StageId } from '@/domain/stage/types';

const PROGRESS_STORAGE_KEY = 'progress';

type ProgressState = ProgressSnapshot & {
  markStageCompleted: (stageId: StageId) => void;
  setLastPlayedStage: (stageId: StageId) => void;
  isStageCompleted: (stageId: StageId) => boolean;
  resetProgress: () => void;
};

function persistProgress(snapshot: ProgressSnapshot) {
  void appStorage.setItem(PROGRESS_STORAGE_KEY, serializeProgressSnapshot(snapshot));
}

export const useProgressStore = create<ProgressState>()((set, get) => ({
  completedStageIds: [],
  lastPlayedStageId: undefined,
  markStageCompleted: (stageId) => {
    if (!isKnownStageId(initialStages, stageId)) {
      return;
    }

    const { completedStageIds, lastPlayedStageId } = get();
    const nextCompletedStageIds = addCompletedStageId(completedStageIds, stageId);
    const nextLastPlayedStageId = getStageIdAfterClear(initialStages, completedStageIds, stageId) ?? lastPlayedStageId;
    if (nextCompletedStageIds === completedStageIds) {
      return;
    }

    set({ completedStageIds: nextCompletedStageIds, lastPlayedStageId: nextLastPlayedStageId });
    persistProgress({ completedStageIds: nextCompletedStageIds, lastPlayedStageId: nextLastPlayedStageId });
  },
  setLastPlayedStage: (stageId) => {
    if (!isKnownStageId(initialStages, stageId)) {
      return;
    }

    const { completedStageIds } = get();
    set({ lastPlayedStageId: stageId });
    persistProgress({ completedStageIds, lastPlayedStageId: stageId });
  },
  isStageCompleted: (stageId) => get().completedStageIds.includes(stageId),
  resetProgress: () => {
    const snapshot: ProgressSnapshot = {
      completedStageIds: [],
      lastPlayedStageId: undefined,
    };
    set(snapshot);
    persistProgress(snapshot);
  },
}));

void appStorage.getItem(PROGRESS_STORAGE_KEY).then((value) => {
  if (!value) {
    return;
  }

  const snapshot = parseProgressSnapshot(value);
  if (!snapshot) {
    return;
  }

  useProgressStore.setState(snapshot);
});
