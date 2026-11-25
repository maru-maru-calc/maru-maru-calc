import { describe, expect, it } from 'vitest';

import { installPauseGate } from '@/youtube/pause-gate';
import type { TimerScope } from '@/youtube/pause-gate';

/** A browser's timers, run by hand: `fire` lets everything that is due happen once. */
function createFakeScope() {
  let nextId = 1;
  const timeouts = new Map<number, () => void>();
  const intervals = new Map<number, () => void>();
  const frames = new Map<number, (time: number) => void>();
  const scope: TimerScope = {
    setTimeout: (callback, _ms, ...args) => {
      const id = nextId++;
      timeouts.set(id, () => callback(...args));
      return id;
    },
    clearTimeout: (id) => void timeouts.delete(id as number),
    setInterval: (callback, _ms, ...args) => {
      const id = nextId++;
      intervals.set(id, () => callback(...args));
      return id;
    },
    requestAnimationFrame: (callback) => {
      const id = nextId++;
      frames.set(id, callback);
      return id;
    },
    cancelAnimationFrame: (id) => void frames.delete(id),
  };
  const fire = () => {
    const dueTimeouts = [...timeouts.values()];
    timeouts.clear();
    dueTimeouts.forEach((run) => run());
    intervals.forEach((run) => run());
    const dueFrames = [...frames.values()];
    frames.clear();
    dueFrames.forEach((run) => run(0));
  };
  return { scope, fire };
}

describe('the pause gate', () => {
  it('lets everything through while the game is not on hold', () => {
    const { scope, fire } = createFakeScope();
    installPauseGate(scope);
    const ran: string[] = [];

    scope.setTimeout((word) => ran.push(`timeout ${word}`), 10, 'a');
    scope.setInterval(() => ran.push('interval'), 10);
    scope.requestAnimationFrame(() => ran.push('frame'));
    fire();

    expect(ran).toEqual(['timeout a', 'interval', 'frame']);
  });

  it('on hold nothing runs; afterwards what came due runs once and the interval goes on', () => {
    const { scope, fire } = createFakeScope();
    const gate = installPauseGate(scope);
    const ran: string[] = [];
    scope.setTimeout(() => ran.push('timeout'), 10);
    scope.setInterval(() => ran.push('interval'), 10);
    scope.requestAnimationFrame(() => ran.push('frame'));

    gate.setPaused(true);
    fire();
    fire();
    expect(ran).toEqual([]);
    expect(gate.isPaused()).toBe(true);

    gate.setPaused(false);
    expect(ran).toEqual(['timeout']);
    fire();
    expect(ran).toEqual(['timeout', 'interval', 'frame']);
    fire();
    expect(ran).toEqual(['timeout', 'interval', 'frame', 'interval']);
  });

  it('a game loop that asks for its next frame from inside a frame picks up where it stopped', () => {
    const { scope, fire } = createFakeScope();
    const gate = installPauseGate(scope);
    let steps = 0;
    const loop = () => {
      steps += 1;
      scope.requestAnimationFrame(loop);
    };
    scope.requestAnimationFrame(loop);

    fire();
    fire();
    expect(steps).toBe(2);
    gate.setPaused(true);
    fire();
    fire();
    fire();
    expect(steps).toBe(2);
    gate.setPaused(false);
    fire();
    fire();
    expect(steps).toBe(4);
  });

  it('what is cancelled while on hold stays cancelled', () => {
    const { scope, fire } = createFakeScope();
    const gate = installPauseGate(scope);
    const ran: string[] = [];
    const timeout = scope.setTimeout(() => ran.push('timeout'), 10);
    const frame = scope.requestAnimationFrame(() => ran.push('frame'));
    const laterFrame = scope.requestAnimationFrame(() => ran.push('later frame'));

    gate.setPaused(true);
    fire();
    scope.clearTimeout(timeout);
    scope.cancelAnimationFrame(frame);
    gate.setPaused(false);
    // Asked for again on resume, and cancelled before it comes.
    scope.cancelAnimationFrame(laterFrame);
    fire();

    expect(ran).toEqual([]);
  });

  it('a callback that fails on resume does not keep the others from running', () => {
    const { scope, fire } = createFakeScope();
    const gate = installPauseGate(scope);
    const ran: string[] = [];
    scope.setTimeout(() => {
      throw new Error('broken');
    }, 10);
    scope.setTimeout(() => ran.push('second'), 10);

    gate.setPaused(true);
    fire();
    gate.setPaused(false);

    expect(ran).toEqual(['second']);
    // The failure is still reported, on its own turn.
    let reported = '';
    try {
      fire();
    } catch (error) {
      reported = String(error);
    }
    expect(reported.includes('broken')).toBe(true);
  });
});
