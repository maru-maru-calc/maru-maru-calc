import type { Stage } from '@/game/types';
import type { PuzzleSaveSlot } from '@/storage/puzzle-progress';

/** A picture drawn and ready: `share` hands it over at once, so it can be called from a tap. */
export type PictureShare = { share: () => void };

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
  /**
   * Gets a picture of a one-minute result ready for the player to share. Undefined where results
   * cannot be shared (YouTube's rules allow no way out of the game); resolves to undefined when
   * the picture could not be made.
   */
  prepareResultShare: ((solved: number) => Promise<PictureShare | undefined>) | undefined;
  /**
   * Gets a picture of one of the numbered puzzles ready for the player to send to someone, with
   * the address that opens that puzzle. Undefined where nothing can be shared.
   */
  preparePuzzleShare: ((number: number, stage: Stage) => Promise<PictureShare | undefined>) | undefined;
  /**
   * The numbered puzzle this visit asks for (the address of a shared puzzle), out of `count`.
   * Undefined where a visit cannot ask for one, or when it asks for none.
   */
  getRequestedPuzzle: ((count: number) => number | undefined) | undefined;
};
