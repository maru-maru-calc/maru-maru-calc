import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmptyPuzzleProgress, parsePuzzleProgress, serializePuzzleProgress } from './puzzle-progress-codec';
import type { PuzzleProgress } from './puzzle-progress-codec';

/**
 * Where the puzzle game keeps its progress. On the web that is the browser's own storage; a host
 * that has to do the saving itself (YouTube's game platform allows no other way) supplies its own
 * slot. The puzzle game's progress is kept apart from the learning app's.
 */
export type PuzzleSaveSlot = {
  read: () => Promise<string | null>;
  write: (text: string) => Promise<void>;
};

const PUZZLE_PROGRESS_STORAGE_KEY = 'marumaru-calc:puzzle-progress';
const LOAD_TIMEOUT_MS = 1500;

export const browserSaveSlot: PuzzleSaveSlot = {
  read: () => AsyncStorage.getItem(PUZZLE_PROGRESS_STORAGE_KEY),
  write: (text) => AsyncStorage.setItem(PUZZLE_PROGRESS_STORAGE_KEY, text),
};

/** Never rejects: when the slot is unavailable or slow, the game starts with empty progress. */
export async function loadPuzzleProgress(slot: PuzzleSaveSlot = browserSaveSlot): Promise<PuzzleProgress> {
  try {
    const raw = await Promise.race([
      slot.read(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
      }),
    ]);
    return parsePuzzleProgress(raw);
  } catch {
    return createEmptyPuzzleProgress();
  }
}

export function savePuzzleProgress(progress: PuzzleProgress, slot: PuzzleSaveSlot = browserSaveSlot) {
  try {
    void slot.write(serializePuzzleProgress(progress)).catch(() => {});
  } catch {
    // The slot can be unavailable; progress then lasts only for this visit.
  }
}
