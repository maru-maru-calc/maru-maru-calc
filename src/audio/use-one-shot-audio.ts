import { useCallback, useEffect, useRef } from 'react';
import { createAudioPlayer } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

const SFX_FADE_OUT_MS = 220;

type FadeTimer = ReturnType<typeof setInterval>;

function fadeOutWebAudio(audio: HTMLAudioElement, startingVolume: number, release: boolean) {
  const steps = 8;
  const intervalMs = SFX_FADE_OUT_MS / steps;
  let step = 0;
  const interval = setInterval(() => {
    step += 1;
    audio.volume = Math.max(0, startingVolume * (1 - step / steps));
    if (step >= steps) {
      clearInterval(interval);
      audio.pause();
      audio.currentTime = 0;
      if (release) {
        audio.src = '';
      }
    }
  }, intervalMs);
  return interval;
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
  const webAudioRef = useRef<HTMLAudioElement | null>(null);
  const fadeTimersRef = useRef<FadeTimer[]>([]);

  const clearFadeTimers = useCallback(() => {
    fadeTimersRef.current.forEach((timer) => clearInterval(timer));
    fadeTimersRef.current = [];
  }, []);

  const fadeOut = useCallback(
    (release = false) => {
      clearFadeTimers();

      const player = playerRef.current;
      if (player) {
        fadeTimersRef.current.push(fadeOutAudioPlayer(player, player.volume, release));
      }

      const webAudio = webAudioRef.current;
      if (webAudio) {
        fadeTimersRef.current.push(fadeOutWebAudio(webAudio, webAudio.volume, release));
      }
    },
    [clearFadeTimers],
  );

  useEffect(() => {
    let player: AudioPlayer | null = null;
    let webAudio: HTMLAudioElement | null = null;

    if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
      const asset = Asset.fromModule(source);
      webAudio = new Audio(asset.uri);
      webAudio.volume = volume;
      webAudio.preload = 'auto';
      webAudioRef.current = webAudio;
    } else {
      player = createAudioPlayer(source);
      player.volume = volume;
      playerRef.current = player;
    }

    return () => {
      fadeOut(true);
      playerRef.current = null;
      webAudioRef.current = null;
    };
  }, [fadeOut, source, volume]);

  const play = useCallback(() => {
    clearFadeTimers();

    const webAudio = webAudioRef.current;
    if (webAudio) {
      webAudio.volume = volume;
      webAudio.currentTime = 0;
      void webAudio.play().catch(() => {});
      return;
    }

    const player = playerRef.current;
    if (!player) {
      return;
    }

    player.volume = volume;
    void player.seekTo(0).finally(() => {
      player.play();
    });
  }, [clearFadeTimers, volume]);

  return { fadeOut, play };
}
