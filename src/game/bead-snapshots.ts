import type { BeadSnapshot } from './types';

/** Movement smaller than this (in layout pixels) cannot be seen, so it is not worth drawing again. */
export const SETTLED_TOLERANCE_PX = 0.05;

/**
 * Returns `previous` itself when `next` shows the same maru in (visibly) the same places, and
 * `next` otherwise.
 *
 * The physics loop produces a fresh snapshot list on every animation frame. Handing back the same
 * list object as before lets whoever draws it skip the work. Positions are compared with what was
 * last drawn, not with the previous frame, so slow drift still gets drawn once it adds up to
 * something visible.
 */
export function keepSettledSnapshots(previous: BeadSnapshot[], next: BeadSnapshot[], tolerance = SETTLED_TOLERANCE_PX): BeadSnapshot[] {
  if (previous.length !== next.length) {
    return next;
  }

  for (let index = 0; index < next.length; index += 1) {
    const before = previous[index];
    const after = next[index];
    if (
      before.id !== after.id ||
      before.value !== after.value ||
      before.count !== after.count ||
      before.sign !== after.sign ||
      before.role !== after.role ||
      Math.abs(before.x - after.x) > tolerance ||
      Math.abs(before.y - after.y) > tolerance
    ) {
      return next;
    }
  }

  return previous;
}

/**
 * Rounds a layout position to the nearest pixel the screen can actually show (`pixelRatio` screen
 * pixels per layout pixel).
 *
 * A browser draws a box on whole screen pixels wherever its style says it is, so a maru that has
 * drifted by a fraction of a pixel looks exactly the same. Rounding first lets that frame be
 * recognised as "nothing to draw".
 */
export function snapToPixel(value: number, pixelRatio: number): number {
  const ratio = pixelRatio > 0 && Number.isFinite(pixelRatio) ? pixelRatio : 1;
  return Math.round(value * ratio) / ratio;
}

/**
 * Returns `previous` itself when `next` holds the same maru (same ids, values, counts, signs and
 * roles, in the same order), wherever they are, and `next` otherwise.
 *
 * The rules of the game (the total, whether a stage is solved) only look at which maru exist, so
 * code that follows the rules does not need to hear about every movement.
 */
export function keepSameMaru(previous: BeadSnapshot[], next: BeadSnapshot[]): BeadSnapshot[] {
  return keepSettledSnapshots(previous, next, Number.POSITIVE_INFINITY);
}

export type BeadFrameStore = {
  /** The maru as they were last drawn. The list object only changes when there is something new to draw. */
  getSnapshot: () => BeadSnapshot[];
  /** Calls `listener` whenever there is something new to draw. Returns a function that stops the calls. */
  subscribe: (listener: () => void) => () => void;
  /** Offers the latest positions. Listeners hear about it only if something visibly changed. */
  publish: (next: BeadSnapshot[]) => void;
};

/**
 * Holds where the maru are right now, outside React state.
 *
 * The physics loop publishes here on every animation frame and only the layer that draws the maru
 * listens, so a moving maru redraws that layer instead of the whole game screen.
 */
export function createBeadFrameStore(): BeadFrameStore {
  let snapshot: BeadSnapshot[] = [];
  const listeners = new Set<() => void>();

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish(next) {
      const kept = keepSettledSnapshots(snapshot, next);
      if (kept === snapshot) {
        return;
      }

      snapshot = kept;
      for (const listener of [...listeners]) {
        listener();
      }
    },
  };
}
