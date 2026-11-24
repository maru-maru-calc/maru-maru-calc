/** The part of an HTMLAudioElement the pool uses. */
export type PoolableAudio = {
  volume: number;
  currentTime: number;
  preload: string;
  play: () => Promise<unknown> | void;
  pause: () => void;
};

type Timers = {
  setInterval: (callback: () => void, ms: number) => unknown;
  clearInterval: (timer: unknown) => void;
};

export type WebAudioPool = {
  /** Makes sure the sound is loaded, so the first play is not late. */
  warm: (uri: string, volume: number) => void;
  /** Plays the sound from the start. `owner` is whoever asked; it decides who may fade the sound out later. */
  play: (uri: string, owner: unknown, volume: number) => void;
  /** Fades the sound out and stops it, but only if `owner` was the last one to play it. */
  fadeOut: (uri: string, owner: unknown) => void;
  /** How many sounds are loaded. */
  size: () => number;
};

const DEFAULT_FADE_OUT_MS = 220;
const FADE_STEPS = 8;

/**
 * Keeps one audio element per sound file for as long as the page lives.
 *
 * Every screen used to make its own elements when it opened and throw them away when it closed,
 * so opening a stage set up (and asked the network for) every sound effect again. With the pool a
 * sound is loaded once and every screen plays the same element.
 *
 * Because screens share an element, a screen that closes must not cut off a sound another screen
 * has started since. That is what `owner` is for.
 */
export function createWebAudioPool(
  createAudio: (uri: string) => PoolableAudio,
  timers: Timers = { setInterval: (callback, ms) => setInterval(callback, ms), clearInterval: (timer) => clearInterval(timer as ReturnType<typeof setInterval>) },
  fadeOutMs = DEFAULT_FADE_OUT_MS,
): WebAudioPool {
  const entries = new Map<string, { audio: PoolableAudio; owner: unknown; fadeTimer: unknown }>();

  const getEntry = (uri: string, volume: number) => {
    let entry = entries.get(uri);
    if (!entry) {
      const audio = createAudio(uri);
      audio.volume = volume;
      audio.preload = 'auto';
      entry = { audio, owner: undefined, fadeTimer: undefined };
      entries.set(uri, entry);
    }
    return entry;
  };

  const cancelFade = (entry: { fadeTimer: unknown }) => {
    if (entry.fadeTimer !== undefined) {
      timers.clearInterval(entry.fadeTimer);
      entry.fadeTimer = undefined;
    }
  };

  return {
    warm(uri, volume) {
      getEntry(uri, volume);
    },
    play(uri, owner, volume) {
      const entry = getEntry(uri, volume);
      cancelFade(entry);
      entry.owner = owner;
      entry.audio.volume = volume;
      entry.audio.currentTime = 0;
      const playing = entry.audio.play();
      if (playing && typeof playing.catch === 'function') {
        // Browsers refuse to play before the first tap. That is not an error worth reporting.
        playing.catch(() => {});
      }
    },
    fadeOut(uri, owner) {
      const entry = entries.get(uri);
      if (!entry || entry.owner !== owner) {
        return;
      }

      cancelFade(entry);
      const { audio } = entry;
      const startingVolume = audio.volume;
      let step = 0;
      entry.fadeTimer = timers.setInterval(() => {
        step += 1;
        audio.volume = Math.max(0, startingVolume * (1 - step / FADE_STEPS));
        if (step >= FADE_STEPS) {
          cancelFade(entry);
          audio.pause();
          audio.currentTime = 0;
          entry.owner = undefined;
        }
      }, fadeOutMs / FADE_STEPS);
    },
    size: () => entries.size,
  };
}
