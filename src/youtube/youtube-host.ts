import type { GameHost } from '@/platform/game-host';

import type { YtGameSdk } from './ytgame-sdk';

export type YouTubeHost = GameHost & {
  /** Something is on screen (the water, while the saved progress loads). */
  noteFirstFrame: () => void;
};

/**
 * The puzzle game inside YouTube. YouTube's rules decide the shape of this:
 * - progress is saved with its SDK and in no other way, and never before a load has succeeded
 *   (an earlier save is refused, and a save after a failed load could wipe what is stored);
 * - the game stops when YouTube says pause and goes on only when it says resume;
 * - sound follows YouTube's own switch;
 * - "first frame" is reported before "ready", each once.
 *
 * Without an SDK (the page opened outside YouTube) nothing is saved and nothing pauses.
 * `effects` is what muting and pausing do to the page; they are passed in so that this can be
 * tried without a browser.
 */
export function createYouTubeHost(
  sdk: YtGameSdk | undefined,
  effects: { setMuted: (isMuted: boolean) => void; setPaused: (isPaused: boolean) => void },
): YouTubeHost {
  let hasLoaded = false;
  let hasNotedFirstFrame = false;
  let hasNotedReady = false;
  let lastSave: Promise<void> = Promise.resolve();
  const pauseListeners = new Set<(isPaused: boolean) => void>();

  const setPaused = (isPaused: boolean) => {
    effects.setPaused(isPaused);
    pauseListeners.forEach((listener) => listener(isPaused));
  };

  if (sdk) {
    effects.setMuted(!sdk.system.isAudioEnabled());
    sdk.system.onAudioEnabledChange((isAudioEnabled) => effects.setMuted(!isAudioEnabled));
    sdk.system.onPause(() => setPaused(true));
    sdk.system.onResume(() => setPaused(false));
  }

  const noteFirstFrame = () => {
    if (!hasNotedFirstFrame) {
      hasNotedFirstFrame = true;
      sdk?.game.firstFrameReady();
    }
  };

  return {
    saveSlot: {
      async read() {
        if (!sdk) {
          return null;
        }
        const text = await sdk.game.loadData();
        hasLoaded = true;
        return text === '' ? null : text;
      },
      write(text) {
        if (!sdk || !hasLoaded) {
          return Promise.resolve();
        }
        // One after another, so an older save can never land on top of a newer one.
        lastSave = lastSave.then(
          () => sdk.game.saveData(text),
          () => sdk.game.saveData(text),
        );
        return lastSave;
      },
    },
    loadTimeoutMs: undefined,
    onPauseChange(listener) {
      pauseListeners.add(listener);
      return () => {
        pauseListeners.delete(listener);
      };
    },
    noteFirstFrame,
    noteReady() {
      if (!hasNotedReady) {
        hasNotedReady = true;
        noteFirstFrame();
        sdk?.game.gameReady();
      }
    },
    noteBestQuickScore(score) {
      if (sdk && Number.isSafeInteger(score) && score >= 0) {
        void sdk.engagement.sendScore({ value: score }).catch(() => {});
      }
    },
    // A game on YouTube may not lead out of it.
    prepareResultShare: undefined,
    preparePuzzleShare: undefined,
    prepareSolvedShare: undefined,
    ShareButton: undefined,
    making: undefined,
    // There is one way in, and it leads to the start.
    getRequestedPuzzle: undefined,
  };
}
