import AsyncStorage from '@react-native-async-storage/async-storage';

import { readRequestedPuzzle } from '@/components/puzzle/puzzle-card';

import type { GameHost } from './game-host';
import { preparePuzzleShare } from './share-puzzle';
import { prepareResultShare } from './share-result';

const PUZZLE_PROGRESS_STORAGE_KEY = 'marumaru-calc:puzzle-progress';
const LOAD_TIMEOUT_MS = 1500;

// The address as the page was opened. The router rewrites the address while the page comes up
// (and loses what follows "?" when a "#" follows that), which is before the game asks.
const ADDRESS_AT_LOAD = typeof window === 'undefined' ? undefined : { pathname: window.location.pathname, search: window.location.search };

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
  prepareResultShare,
  preparePuzzleShare,
  getRequestedPuzzle(count) {
    if (typeof window === 'undefined') {
      return undefined;
    }
    // Still on the page that was opened: what it was opened with. Reached from another page of the site: what the address says now.
    const search = ADDRESS_AT_LOAD?.pathname === window.location.pathname ? ADDRESS_AT_LOAD.search : window.location.search;
    return readRequestedPuzzle(search, count);
  },
};
