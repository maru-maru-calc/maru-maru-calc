import type { ComponentType } from 'react';

import type { MadePuzzle } from '@/game/made-puzzle';
import type { Stage } from '@/game/types';
import type { PuzzleSaveSlot } from '@/storage/puzzle-progress';

/** The places a link can be posted to straight from the game. */
export type ShareLinkId = 'x' | 'line' | 'facebook' | 'bluesky' | 'hatena';

/**
 * A picture drawn and ready, with the address that leads to what it shows, and the ways of
 * sending them. Everything here can be called from a tap, with nothing to wait for first.
 */
export type PictureShare = {
  /**
   * What the ways of sending put first. A puzzle is sent to be solved by as many as will: the
   * places that post it lead. A result is shown to somebody: the picture is the point, so the
   * device's own share leads, which is the one way the picture goes along.
   */
  lead: 'places' | 'device';
  /** Shows the picture on the screen, until `release` gives its memory back. */
  previewUrl: string;
  release: () => void;
  /**
   * Hands the picture and the address to the device's own "share" (a phone's share sheet), the
   * only way a picture can go along. Undefined where the browser cannot share pictures.
   */
  shareWithDevice: (() => void) | undefined;
  /** Saves the picture as a file. */
  save: () => void;
  /** Puts the address on the clipboard; resolves to whether that worked. */
  copyAddress: () => Promise<boolean>;
  /** Opens the page of that place that posts the address. Such pages take an address and no picture. */
  openLink: (place: ShareLinkId) => void;
};

/** A puzzle that can be sent and asked for by address: one of the numbered ones, or one a player made. */
export type SharedPuzzle = { number: number } | { made: MadePuzzle };

/** What the share button is told: its name, what the picture shows (a new key draws a new picture), and how to draw it. */
export type ShareButtonProps = {
  label: string;
  testID: string;
  shareKey: string;
  prepare: () => Promise<PictureShare | undefined>;
  /** Whether what it sends is that a puzzle was solved: the button then stands out, with a tick on it. */
  isSolved?: boolean;
};

/**
 * Everything of making a puzzle: its three screens, and a made puzzle as a stage the board can
 * play. It comes from the host so that a build where nothing can be made does not carry it.
 */
export type PuzzleMaking = {
  /** The bubbles a new puzzle starts from. */
  firstBubbles: number[];
  /** Step one: the bubbles. */
  Bubbles: ComponentType<{ bubbles: number[]; onChange: (bubbles: number[]) => void; onBack: () => void; onNext: () => void; onRandom: () => void }>;
  /** Step two: the board on which the maker works them out; what they come to is the goal. */
  Board: ComponentType<{ bubbles: number[]; onBack: () => void; onMade: (puzzle: MadePuzzle) => void }>;
  /** Step three: the finished puzzle, as it will be sent. */
  Finished: ComponentType<{
    puzzle: MadePuzzle;
    prepareShare: (puzzle: SharedPuzzle, stage: Stage) => Promise<PictureShare | undefined>;
    onBack: () => void;
    onAgain: () => void;
    onPlay: () => void;
    onRandom: () => void;
  }>;
  createStage: (puzzle: MadePuzzle) => Stage;
  /** A whole puzzle made by chance, of this many bubbles: numbers and a goal that can be reached. */
  createRandom: (count: number) => MadePuzzle;
};

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
   * Gets a picture of a puzzle ready for the player to send to someone, with the address that
   * opens that puzzle. Undefined where nothing can be shared.
   */
  preparePuzzleShare: ((puzzle: SharedPuzzle, stage: Stage) => Promise<PictureShare | undefined>) | undefined;
  /**
   * Gets a picture ready that says this puzzle was solved (without the way), with the address
   * that opens the puzzle for whoever is shown it. Undefined where nothing can be shared.
   */
  prepareSolvedShare: ((puzzle: SharedPuzzle, stage: Stage) => Promise<PictureShare | undefined>) | undefined;
  /**
   * The puzzle this visit asks for (the address of a shared puzzle): one of the `count` numbered
   * ones, or a made one. Undefined where a visit cannot ask for one, or when it asks for none.
   */
  getRequestedPuzzle: ((count: number) => SharedPuzzle | undefined) | undefined;
  /** The share button, with the ways of sending it opens. Undefined where nothing can be shared. */
  ShareButton: ComponentType<ShareButtonProps> | undefined;
  /**
   * Making a puzzle of one's own. Undefined where nothing can be shared: a made puzzle exists
   * only in the address it is sent with.
   */
  making: PuzzleMaking | undefined;
};
