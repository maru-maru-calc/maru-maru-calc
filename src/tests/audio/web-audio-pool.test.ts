import { describe, expect, it } from 'vitest';

import { createWebAudioPool } from '@/audio/web-audio-pool';

function setup() {
  const made: Array<{ uri: string; volume: number; currentTime: number; preload: string; plays: number; pauses: number; play: () => Promise<void>; pause: () => void }> = [];
  const intervals: Array<{ callback: () => void; ms: number; cleared: boolean }> = [];
  const pool = createWebAudioPool(
    (uri) => {
      const audio = {
        uri,
        volume: 1,
        currentTime: 5,
        preload: '',
        plays: 0,
        pauses: 0,
        play() {
          audio.plays += 1;
          return Promise.resolve();
        },
        pause() {
          audio.pauses += 1;
        },
      };
      made.push(audio);
      return audio;
    },
    {
      setInterval(callback, ms) {
        const interval = { callback, ms, cleared: false };
        intervals.push(interval);
        return interval;
      },
      clearInterval(timer) {
        (timer as { cleared: boolean }).cleared = true;
      },
    },
    220,
  );
  /** Lets every running fade take `steps` steps. */
  const tick = (steps: number) => {
    for (let step = 0; step < steps; step += 1) {
      for (const interval of intervals) {
        if (!interval.cleared) {
          interval.callback();
        }
      }
    }
  };
  return { pool, made, intervals, tick };
}

describe('web audio pool', () => {
  it('loads a sound once, however many screens ask for it', () => {
    const { pool, made } = setup();
    pool.warm('pop.mp3', 0.4);
    pool.warm('pop.mp3', 0.4);
    pool.play('pop.mp3', 'first screen', 0.4);
    pool.play('pop.mp3', 'second screen', 0.4);

    expect(made).toHaveLength(1);
    expect(pool.size()).toBe(1);
    expect(made[0].preload).toBe('auto');
    expect(made[0].volume).toBe(0.4);
  });

  it('keeps different sounds apart', () => {
    const { pool, made } = setup();
    pool.warm('pop.mp3', 0.4);
    pool.warm('clear.mp3', 0.8);

    expect(made.map((audio) => audio.uri)).toEqual(['pop.mp3', 'clear.mp3']);
  });

  it('plays from the start at the asked volume', () => {
    const { pool, made } = setup();
    pool.play('pop.mp3', 'screen', 0.3);

    expect(made[0].plays).toBe(1);
    expect(made[0].currentTime).toBe(0);
    expect(made[0].volume).toBe(0.3);
  });

  it('fades out in steps, then stops and rewinds', () => {
    const { pool, made, intervals, tick } = setup();
    pool.play('clear.mp3', 'screen', 0.8);
    made[0].currentTime = 3;
    pool.fadeOut('clear.mp3', 'screen');

    expect(intervals[0].ms).toBeCloseTo(27.5, 5);
    tick(4);
    expect(made[0].volume).toBeCloseTo(0.4, 5);
    expect(made[0].pauses).toBe(0);
    tick(4);
    expect(made[0].volume).toBe(0);
    expect(made[0].pauses).toBe(1);
    expect(made[0].currentTime).toBe(0);
    expect(intervals[0].cleared).toBe(true);
  });

  it('does not let a closing screen cut off a sound another screen started', () => {
    const { pool, made, intervals, tick } = setup();
    pool.play('tap.mp3', 'stage list', 0.5);
    pool.play('tap.mp3', 'game', 0.5);
    pool.fadeOut('tap.mp3', 'stage list');
    tick(8);

    expect(intervals).toHaveLength(0);
    expect(made[0].pauses).toBe(0);
    expect(made[0].volume).toBe(0.5);
  });

  it('playing again cancels a fade that is under way', () => {
    const { pool, made, intervals, tick } = setup();
    pool.play('tap.mp3', 'stage list', 0.5);
    pool.fadeOut('tap.mp3', 'stage list');
    tick(3);
    pool.play('tap.mp3', 'game', 0.5);
    tick(8);

    expect(intervals[0].cleared).toBe(true);
    expect(made[0].volume).toBe(0.5);
    expect(made[0].pauses).toBe(0);
    expect(made[0].plays).toBe(2);
  });

  it('does nothing when asked to fade a sound that was never played, or already faded', () => {
    const { pool, made, intervals, tick } = setup();
    pool.warm('clear.mp3', 0.8);
    pool.fadeOut('clear.mp3', 'screen');
    pool.fadeOut('unknown.mp3', 'screen');
    expect(intervals).toHaveLength(0);

    pool.play('clear.mp3', 'screen', 0.8);
    pool.fadeOut('clear.mp3', 'screen');
    tick(8);
    pool.fadeOut('clear.mp3', 'screen');
    expect(intervals).toHaveLength(1);
    expect(made[0].pauses).toBe(1);
  });

  it('a second fade request while fading still ends silent and stopped once', () => {
    const { pool, made, tick } = setup();
    pool.play('clear.mp3', 'screen', 0.8);
    pool.fadeOut('clear.mp3', 'screen');
    tick(4);
    pool.fadeOut('clear.mp3', 'screen');
    tick(8);

    expect(made[0].volume).toBe(0);
    expect(made[0].pauses).toBe(1);
    expect(made[0].currentTime).toBe(0);
  });

  it('survives a play that the browser refuses', async () => {
    const pool = createWebAudioPool(() => ({ volume: 1, currentTime: 0, preload: '', play: () => Promise.reject(new Error('NotAllowedError')), pause() {} }));
    pool.play('pop.mp3', 'screen', 0.4);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(pool.size()).toBe(1);
  });
});
