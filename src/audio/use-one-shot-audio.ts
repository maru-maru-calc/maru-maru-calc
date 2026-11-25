import { useCallback, useEffect, useMemo, useRef } from 'react';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import { isSoundMuted } from './sound-muted-state';
import { createWebAudioPool } from './web-audio-pool';
import type { WebAudioPool } from './web-audio-pool';

const SFX_FADE_OUT_MS = 220;

type FadeTimer = ReturnType<typeof setInterval>;

// On the web every screen shares one audio element per sound file, so a sound is loaded once for
// the whole visit instead of again each time a screen opens.
let webAudioPool: WebAudioPool | undefined;

function getWebAudioPool() {
  if (Platform.OS !== 'web' || typeof Audio === 'undefined') {
    return undefined;
  }

  webAudioPool ??= createWebAudioPool((uri) => new Audio(uri), undefined, SFX_FADE_OUT_MS);
  return webAudioPool;
}

/** Web only: cuts off every sound effect that is playing (the host has put the game on hold, or switched sound off). */
export function stopAllWebAudio() {
  webAudioPool?.stopAll();
}

function fadeOutAudioPlayer(player: AudioPlayer, startingVolume: number, release: boolean) {
  const steps = 8;
  const intervalMs = SFX_FADE_OUT_MS / steps;
  let step = 0;
  const interval = setInterval(() => {
    step += 1;
    player.volume = Math.max(0, startingVolume * (1 - step / steps));
    if (step >= steps) {
      clearInterval(interval);
      player.pause();
      if (release) {
        player.release();
      } else {
        void player.seekTo(0);
      }
    }
  }, intervalMs);
  return interval;
}

export function useOneShotAudio(source: number, volume: number) {
  const playerRef = useRef<AudioPlayer | null>(null);
  const fadeTimersRef = useRef<FadeTimer[]>([]);
  // Web only: the address of the sound, and a token that says which screen played it last.
  const webUri = useMemo(() => (getWebAudioPool() ? Asset.fromModule(source).uri : undefined), [source]);
  const ownerRef = useRef({});

  const clearFadeTimers = useCallback(() => {
    fadeTimersRef.current.forEach((timer) => clearInterval(timer));
    fadeTimersRef.current = [];
  }, []);

  const fadeOut = useCallback(
    (release = false) => {
      if (webUri !== undefined) {
        // The shared element stays loaded; it only goes quiet, and only if this screen played it last.
        getWebAudioPool()?.fadeOut(webUri, ownerRef.current);
        return;
      }

      clearFadeTimers();

      const player = playerRef.current;
      if (player) {
        fadeTimersRef.current.push(fadeOutAudioPlayer(player, player.volume, release));
      }
    },
    [clearFadeTimers, webUri],
  );

  useEffect(() => {
    if (webUri !== undefined) {
      getWebAudioPool()?.warm(webUri, volume);
    } else {
      const player = createAudioPlayer(source);
      player.volume = volume;
      playerRef.current = player;
    }

    return () => {
      fadeOut(true);
      playerRef.current = null;
    };
  }, [fadeOut, source, volume, webUri]);

  const play = useCallback(() => {
    if (isSoundMuted()) {
      return;
    }

    if (webUri !== undefined) {
      getWebAudioPool()?.play(webUri, ownerRef.current, volume);
      return;
    }

    clearFadeTimers();

    const player = playerRef.current;
    if (!player) {
      return;
    }

    player.volume = volume;
    void player.seekTo(0).finally(() => {
      player.play();
    });
  }, [clearFadeTimers, volume, webUri]);

  return { fadeOut, play };
}
