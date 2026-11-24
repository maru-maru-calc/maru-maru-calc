import AsyncStorage from '@react-native-async-storage/async-storage';

import { createEmptyProgress, parseStoredProgress, serializeProgress } from './progress-codec';
import type { StoredProgress } from './progress-codec';

const PROGRESS_STORAGE_KEY = 'marumaru-calc:progress';
const LOAD_TIMEOUT_MS = 1500;

/**
 * Loads saved progress. Never rejects: when storage is unavailable or slow
 * (private browsing, blocked storage in an iframe) the app starts with empty progress.
 */
export async function loadProgress(): Promise<StoredProgress> {
  try {
    const raw = await Promise.race([
      AsyncStorage.getItem(PROGRESS_STORAGE_KEY),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), LOAD_TIMEOUT_MS);
      }),
    ]);
    return parseStoredProgress(raw);
  } catch {
    return createEmptyProgress();
  }
}

export function saveProgress(progress: StoredProgress) {
  try {
    void AsyncStorage.setItem(PROGRESS_STORAGE_KEY, serializeProgress(progress)).catch(() => {});
  } catch {
    // Storage can be unavailable; progress then lasts only for this visit.
  }
}
