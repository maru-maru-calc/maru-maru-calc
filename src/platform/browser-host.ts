import AsyncStorage from '@react-native-async-storage/async-storage';

import { readPuzzlePage, readRequestedPuzzle } from '@/components/puzzle/puzzle-card';
import { FIRST_BUBBLES, MadePuzzleResult, MakingBoard, PuzzleMaker } from '@/components/puzzle/puzzle-maker';
import { ShareButton } from '@/components/puzzle/share-button';
import { createMadePuzzleStage, createRandomPuzzle, readMadePuzzle } from '@/game/made-puzzle';

import type { GameHost } from './game-host';
import { preparePuzzleShare } from './share-puzzle';
import { prepareResultShare } from './share-result';
import { prepareSolvedShare } from './share-solved';

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
  prepareSolvedShare,
  ShareButton,
  making: { firstBubbles: FIRST_BUBBLES, Bubbles: PuzzleMaker, Board: MakingBoard, Finished: MadePuzzleResult, createStage: createMadePuzzleStage, createRandom: createRandomPuzzle },
  getRequestedPuzzle(count) {
    if (typeof window === 'undefined') {
      return undefined;
    }
    // Still on the page that was opened: what it was opened with. Reached from another page of the site: what the address says now.
    const search = ADDRESS_AT_LOAD?.pathname === window.location.pathname ? ADDRESS_AT_LOAD.search : window.location.search;
    // A puzzle's own page ("/p/46"), or the older way of asking for it ("/puzzle?p=46").
    const number = readPuzzlePage(window.location.pathname, count) ?? readRequestedPuzzle(search, count);
    if (number !== undefined) {
      return { number };
    }
    const made = readMadePuzzle(search);
    return made ? { made } : undefined;
  },
};
