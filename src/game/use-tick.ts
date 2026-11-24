import { useEffect, useState } from 'react';

/**
 * Gives the current time and draws the calling component again every `intervalMs` while `enabled`.
 *
 * Call it in the small component that animates, not in a screen: only the caller is drawn again,
 * and while `enabled` is false no timer runs at all.
 */
export function useTick(intervalMs: number, enabled = true): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    setTick(Date.now());
    const interval = setInterval(() => setTick(Date.now()), intervalMs);
    return () => clearInterval(interval);
  }, [enabled, intervalMs]);

  return tick;
}

/** Like `useTick`, but once per animation frame. For short effects that have to look smooth. */
export function useFrameTick(enabled = true): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    let frame = requestAnimationFrame(function step() {
      setTick(Date.now());
      frame = requestAnimationFrame(step);
    });
    return () => cancelAnimationFrame(frame);
  }, [enabled]);

  return tick;
}

/**
 * Like `useTick`, but stops by itself: it runs until the clock reaches `until`, gives one last
 * time at or after `until`, and then goes quiet. For a transition with a known end.
 */
export function useTickUntil(intervalMs: number, until: number): number {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (Date.now() >= until) {
      setTick((current) => (current >= until ? current : Date.now()));
      return undefined;
    }

    setTick(Date.now());
    const interval = setInterval(() => {
      const now = Date.now();
      setTick(now);
      if (now >= until) {
        clearInterval(interval);
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, until]);

  return tick;
}
