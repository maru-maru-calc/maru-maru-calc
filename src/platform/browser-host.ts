import AsyncStorage from '@react-native-async-storage/async-storage';

import type { GameHost } from './game-host';

const PUZZLE_PROGRESS_STORAGE_KEY = 'marumaru-calc:puzzle-progress';
const LOAD_TIMEOUT_MS = 1500;

/** The puzzle game as a web page of its own: the browser keeps the progress, and a hidden tab is a pause. */
export const browserHost: GameHost = {
  saveSlot: {
    read: () => AsyncStorage.getItem(PUZZLE_PROGRESS_STORAGE_KEY),
    write: (text) => AsyncStorage.setItem(PUZZLE_PROGRESS_STORAGE_KEY, text),
  },
  loadTimeoutMs: LOAD_TIMEOUT_MS,
  onPauseChange(listener) {
    if (typeof document === 'undefined') {
      return () => {};
    }
    const tell = () => listener(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', tell);
    return () => document.removeEventListener('visibilitychange', tell);
  },
  noteReady: () => {},
  noteBestQuickScore: () => {},
};
