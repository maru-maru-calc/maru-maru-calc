// Imported first by the YouTube entry, so the gate is in place before any of the game's code (or
// React's) takes hold of the browser's timers.
import { installPauseGate } from './pause-gate';
import type { PauseGate, TimerScope } from './pause-gate';

const scope = globalThis as unknown as TimerScope;

export const pauseGate: PauseGate =
  typeof scope.requestAnimationFrame === 'function' ? installPauseGate(scope) : { setPaused: () => {}, isPaused: () => false };
