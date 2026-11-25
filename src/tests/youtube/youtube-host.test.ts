import { describe, expect, it } from 'vitest';

import { loadPuzzleProgress, savePuzzleProgress } from '@/storage/puzzle-progress';
import { createEmptyPuzzleProgress } from '@/storage/puzzle-progress-codec';
import { createYouTubeHost } from '@/youtube/youtube-host';
import { getYtGameSdk } from '@/youtube/ytgame-sdk';
import type { YtGameSdk } from '@/youtube/ytgame-sdk';

/** A stand-in for YouTube's SDK that writes down every call, in order. */
function createFakeSdk(options: { stored?: string; loadFails?: boolean; audio?: boolean } = {}) {
  const calls: string[] = [];
  const listeners = { pause: [] as Array<() => void>, resume: [] as Array<() => void>, audio: [] as Array<(isOn: boolean) => void> };
  let stored = options.stored ?? '';
  const pendingSaves: Array<() => void> = [];
  const sdk: YtGameSdk = {
    IN_PLAYABLES_ENV: true,
    game: {
      firstFrameReady: () => void calls.push('firstFrameReady'),
      gameReady: () => void calls.push('gameReady'),
      loadData: () => {
        calls.push('loadData');
        return options.loadFails ? Promise.reject(new Error('unavailable')) : Promise.resolve(stored);
      },
      saveData: (data) => {
        calls.push(`saveData:${data}`);
        return new Promise<void>((resolve) => {
          pendingSaves.push(() => {
            stored = data;
            resolve();
          });
        });
      },
    },
    system: {
      onPause: (callback) => (listeners.pause.push(callback), () => {}),
      onResume: (callback) => (listeners.resume.push(callback), () => {}),
      isAudioEnabled: () => options.audio ?? true,
      onAudioEnabledChange: (callback) => (listeners.audio.push(callback), () => {}),
      getLanguage: () => Promise.resolve('en'),
    },
    engagement: {
      sendScore: (score) => {
        calls.push(`sendScore:${score.value}`);
        return Promise.resolve();
      },
    },
  };
  return { sdk, calls, listeners, finishSave: () => pendingSaves.shift()?.(), stored: () => stored };
}

function createEffects() {
  const log: string[] = [];
  return { log, setMuted: (isMuted: boolean) => void log.push(`muted:${isMuted}`), setPaused: (isPaused: boolean) => void log.push(`paused:${isPaused}`) };
}

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('the puzzle game inside YouTube', () => {
  it('uses the SDK only where YouTube says the game is running inside it', () => {
    const { sdk } = createFakeSdk();
    expect(getYtGameSdk({ ytgame: sdk })).toBe(sdk);
    expect(getYtGameSdk({ ytgame: { ...sdk, IN_PLAYABLES_ENV: false } })).toBeUndefined();
    expect(getYtGameSdk({})).toBeUndefined();
  });

  it('reports the first frame before "ready", each once, whatever order the game calls them in', () => {
    const fake = createFakeSdk();
    const host = createYouTubeHost(fake.sdk, createEffects());

    host.noteReady();
    host.noteFirstFrame();
    host.noteReady();

    expect(fake.calls).toEqual(['firstFrameReady', 'gameReady']);
  });

  it('never saves before a load has succeeded', async () => {
    const fake = createFakeSdk({ stored: '{"version":1,"solved":["a"],"startVisits":2,"quickScores":[7]}' });
    const host = createYouTubeHost(fake.sdk, createEffects());

    await host.saveSlot.write('too early');
    expect(fake.calls).toEqual([]);

    const progress = await loadPuzzleProgress(host.saveSlot, host.loadTimeoutMs);
    expect(progress.solved).toEqual(['a']);
    expect(progress.quickScores).toEqual([7]);

    savePuzzleProgress({ ...progress, solved: ['a', 'b'] }, host.saveSlot);
    await tick();
    expect(fake.calls).toEqual(['loadData', 'saveData:{"version":1,"solved":["a","b"],"startVisits":2,"quickScores":[7]}']);
  });

  it('after a failed load starts empty and saves nothing, so what YouTube holds is not wiped', async () => {
    const fake = createFakeSdk({ stored: 'precious', loadFails: true });
    const host = createYouTubeHost(fake.sdk, createEffects());

    expect(await loadPuzzleProgress(host.saveSlot, host.loadTimeoutMs)).toEqual(createEmptyPuzzleProgress());
    savePuzzleProgress(createEmptyPuzzleProgress(), host.saveSlot);
    await tick();

    expect(fake.calls).toEqual(['loadData']);
    expect(fake.stored()).toBe('precious');
  });

  it('a player with nothing saved yet starts empty and can save', async () => {
    const fake = createFakeSdk();
    const host = createYouTubeHost(fake.sdk, createEffects());

    expect(await loadPuzzleProgress(host.saveSlot, host.loadTimeoutMs)).toEqual(createEmptyPuzzleProgress());
    await Promise.race([host.saveSlot.write('first'), tick()]);
    expect(fake.calls).toEqual(['loadData', 'saveData:first']);
  });

  it('saves one after another, so an older save cannot land on top of a newer one', async () => {
    const fake = createFakeSdk();
    const host = createYouTubeHost(fake.sdk, createEffects());
    await host.saveSlot.read();

    void host.saveSlot.write('one');
    void host.saveSlot.write('two');
    await tick();
    expect(fake.calls).toEqual(['loadData', 'saveData:one']);

    fake.finishSave();
    await tick();
    expect(fake.calls).toEqual(['loadData', 'saveData:one', 'saveData:two']);
  });

  it('follows YouTube\'s sound switch from the start and whenever it changes', () => {
    const fake = createFakeSdk({ audio: false });
    const effects = createEffects();
    createYouTubeHost(fake.sdk, effects);
    expect(effects.log).toEqual(['muted:true']);

    fake.listeners.audio.forEach((listener) => listener(true));
    fake.listeners.audio.forEach((listener) => listener(false));
    expect(effects.log).toEqual(['muted:true', 'muted:false', 'muted:true']);
  });

  it('stops on pause and goes on only on resume, and tells whoever listens', () => {
    const fake = createFakeSdk();
    const effects = createEffects();
    const host = createYouTubeHost(fake.sdk, effects);
    const heard: boolean[] = [];
    const stop = host.onPauseChange((isPaused) => heard.push(isPaused));

    fake.listeners.pause.forEach((listener) => listener());
    fake.listeners.resume.forEach((listener) => listener());
    stop();
    fake.listeners.pause.forEach((listener) => listener());

    expect(effects.log).toEqual(['muted:false', 'paused:true', 'paused:false', 'paused:true']);
    expect(heard).toEqual([true, false]);
  });

  it('sends a new best one-minute count as the score', () => {
    const fake = createFakeSdk();
    const host = createYouTubeHost(fake.sdk, createEffects());

    host.noteBestQuickScore(12);
    host.noteBestQuickScore(-1);
    host.noteBestQuickScore(2.5);

    expect(fake.calls).toEqual(['sendScore:12']);
  });

  it('outside YouTube does nothing and saves nowhere', async () => {
    const effects = createEffects();
    const host = createYouTubeHost(undefined, effects);

    host.noteFirstFrame();
    host.noteReady();
    host.noteBestQuickScore(3);
    expect(await loadPuzzleProgress(host.saveSlot, host.loadTimeoutMs)).toEqual(createEmptyPuzzleProgress());
    await host.saveSlot.write('x');
    expect(effects.log).toEqual([]);
  });
});
