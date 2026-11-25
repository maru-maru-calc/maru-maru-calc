import type { PuzzleSaveSlot } from '@/storage/puzzle-progress';

/**
 * What the puzzle game needs from wherever it runs: a web page of its own (browser-host.ts) or
 * YouTube's game platform (youtube/youtube-host.ts), which insists on doing the saving, the
 * pausing and the muting itself.
 */
export type GameHost = {
  saveSlot: PuzzleSaveSlot;
  /** How long to wait for saved progress before starting without it. Undefined: as long as the slot takes. */
  loadTimeoutMs: number | undefined;
  /** Tells `listener` whenever the game is put on hold or let go on. Returns a way to stop listening. */
  onPauseChange: (listener: (isPaused: boolean) => void) => () => void;
  /** The first screen is up and can be played. */
  noteReady: () => void;
  /** The player's best one-minute count has gone up to `score`. */
  noteBestQuickScore: (score: number) => void;
};
