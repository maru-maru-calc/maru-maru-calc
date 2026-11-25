// YouTube requires that after "pause" nothing runs at all: no game loop, no timers, no drawing.
// The board has dozens of timers and a physics loop of its own, so instead of teaching each of
// them to stop, this stands between the game and the browser's three ways of doing something
// later. While the gate is shut, a timeout or a frame that comes due is kept and runs when the
// gate opens again; an interval's ticks are skipped.
type Callback = (...args: unknown[]) => void;

export type TimerScope = {
  setTimeout: (callback: Callback, ms?: number, ...args: unknown[]) => unknown;
  clearTimeout: (id?: unknown) => void;
  setInterval: (callback: Callback, ms?: number, ...args: unknown[]) => unknown;
  requestAnimationFrame: (callback: (time: number) => void) => number;
  cancelAnimationFrame: (id: number) => void;
};

export type PauseGate = {
  setPaused: (isPaused: boolean) => void;
  isPaused: () => boolean;
};

/** Puts the gate into `scope` (the window). Must happen before the game's code is loaded. */
export function installPauseGate(scope: TimerScope): PauseGate {
  const original = {
    setTimeout: scope.setTimeout.bind(scope),
    clearTimeout: scope.clearTimeout.bind(scope),
    setInterval: scope.setInterval.bind(scope),
    requestAnimationFrame: scope.requestAnimationFrame.bind(scope),
    cancelAnimationFrame: scope.cancelAnimationFrame.bind(scope),
  };
  let paused = false;
  // Timeouts that came due while paused, by the id the caller holds.
  const heldTimeouts = new Map<unknown, () => void>();
  // Frames that came due while paused, by the id the caller holds; and where a held frame went when it was asked for again.
  const heldFrames = new Map<number, (time: number) => void>();
  const frameStandIns = new Map<number, number>();

  scope.setTimeout = (callback, ms, ...args) => {
    const id: unknown = original.setTimeout(() => {
      if (paused) {
        heldTimeouts.set(id, () => callback(...args));
      } else {
        callback(...args);
      }
    }, ms);
    return id;
  };
  scope.clearTimeout = (id) => {
    heldTimeouts.delete(id);
    original.clearTimeout(id);
  };
  scope.setInterval = (callback, ms, ...args) =>
    original.setInterval(() => {
      if (!paused) {
        callback(...args);
      }
    }, ms);

  const askForFrame = (id: number | undefined, callback: (time: number) => void) => {
    const askedId = original.requestAnimationFrame((time) => {
      const callerId = id ?? askedId;
      frameStandIns.delete(callerId);
      if (paused) {
        heldFrames.set(callerId, callback);
      } else {
        callback(time);
      }
    });
    if (id !== undefined) {
      frameStandIns.set(id, askedId);
    }
    return askedId;
  };
  scope.requestAnimationFrame = (callback) => askForFrame(undefined, callback);
  scope.cancelAnimationFrame = (id) => {
    heldFrames.delete(id);
    const standIn = frameStandIns.get(id);
    frameStandIns.delete(id);
    original.cancelAnimationFrame(standIn ?? id);
  };

  return {
    isPaused: () => paused,
    setPaused(isPaused) {
      if (paused === isPaused) {
        return;
      }
      paused = isPaused;
      if (paused) {
        return;
      }
      const timeouts = [...heldTimeouts.values()];
      heldTimeouts.clear();
      timeouts.forEach((run) => {
        try {
          run();
        } catch (error) {
          // One failing callback must not keep the others from running; it still gets reported.
          original.setTimeout(() => {
            throw error;
          }, 0);
        }
      });
      const frames = [...heldFrames.entries()];
      heldFrames.clear();
      frames.forEach(([id, callback]) => askForFrame(id, callback));
    },
  };
}
