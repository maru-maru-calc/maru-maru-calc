import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import type { AudioPlayer } from 'expo-audio';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { BgmControlContext } from '@/audio/bgm-control';

const BGM_VOLUME = 0.28;
const BGM_SYNC_CHECK_MS = 250;
const BGM_END_TOLERANCE_SECONDS = 0.12;
const bgmSource = require('../../assets/audio/bgm.mp3');
const vocalBgmSource = require('../../assets/audio/bgm-vocal.mp3');

export default function RootLayout() {
  const bgmPlayerRef = useRef<AudioPlayer | null>(null);
  const vocalBgmPlayerRef = useRef<AudioPlayer | null>(null);
  const webBgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const webVocalBgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const hasUserStartedBgmRef = useRef(false);
  const isAppActiveRef = useRef(true);
  const isVocalEnabledRef = useRef(false);
  const [isVocalEnabled, setIsVocalEnabled] = useState(false);
  const [fontsLoaded] = useFonts({
    KiwiMaru: require('../../assets/fonts/KiwiMaru-Regular.ttf'),
  });

  const applyBgmVolumes = useCallback(() => {
    const normalVolume = isVocalEnabledRef.current ? 0 : BGM_VOLUME;
    const vocalVolume = isVocalEnabledRef.current ? BGM_VOLUME : 0;

    if (webBgmAudioRef.current) {
      webBgmAudioRef.current.volume = normalVolume;
    }
    if (webVocalBgmAudioRef.current) {
      webVocalBgmAudioRef.current.volume = vocalVolume;
    }
    if (bgmPlayerRef.current) {
      bgmPlayerRef.current.volume = normalVolume;
    }
    if (vocalBgmPlayerRef.current) {
      vocalBgmPlayerRef.current.volume = vocalVolume;
    }
  }, []);

  const playSyncedBgmFromStart = useCallback(() => {
    applyBgmVolumes();
    if (webBgmAudioRef.current && webVocalBgmAudioRef.current) {
      try {
        webBgmAudioRef.current.currentTime = 0;
        webVocalBgmAudioRef.current.currentTime = 0;
      } catch {
        // Some browsers can reject seeking before metadata is ready. Playback still starts normally.
      }
      void Promise.all([webBgmAudioRef.current.play(), webVocalBgmAudioRef.current.play()]).catch(() => {});
      return;
    }

    if (!bgmPlayerRef.current || !vocalBgmPlayerRef.current) {
      return;
    }

    const bgmPlayer = bgmPlayerRef.current;
    const vocalPlayer = vocalBgmPlayerRef.current;
    void Promise.all([bgmPlayer.seekTo(0), vocalPlayer.seekTo(0)]).finally(() => {
      applyBgmVolumes();
      bgmPlayer.play();
      vocalPlayer.play();
    });
  }, [applyBgmVolumes]);

  const resumeSyncedBgm = useCallback(() => {
    applyBgmVolumes();
    bgmPlayerRef.current?.play();
    vocalBgmPlayerRef.current?.play();
    void webBgmAudioRef.current?.play().catch(() => {});
    void webVocalBgmAudioRef.current?.play().catch(() => {});
  }, [applyBgmVolumes]);

  const startBgmAfterUserAction = useCallback(() => {
    if (hasUserStartedBgmRef.current || !isAppActiveRef.current) {
      return false;
    }

    hasUserStartedBgmRef.current = true;
    playSyncedBgmFromStart();
    return false;
  }, [playSyncedBgmFromStart]);

  const toggleVocal = useCallback(() => {
    const nextIsVocalEnabled = !isVocalEnabledRef.current;
    isVocalEnabledRef.current = nextIsVocalEnabled;
    setIsVocalEnabled(nextIsVocalEnabled);
    applyBgmVolumes();

    if (hasUserStartedBgmRef.current && isAppActiveRef.current) {
      resumeSyncedBgm();
    }
  }, [applyBgmVolumes, resumeSyncedBgm]);

  const bgmControlValue = useMemo(
    () => ({
      isVocalEnabled,
      toggleVocal,
    }),
    [isVocalEnabled, toggleVocal],
  );

  useEffect(() => {
    if (typeof document === 'undefined') {
      return undefined;
    }

    const style = document.createElement('style');
    style.textContent = `
      *, *::before, *::after {
        -webkit-touch-callout: none;
        -webkit-tap-highlight-color: transparent;
        -webkit-user-select: none;
        user-select: none;
      }
    `;
    document.head.appendChild(style);

    return () => {
      style.remove();
    };
  }, []);

  useEffect(() => {
    let player: AudioPlayer | null = null;
    let vocalPlayer: AudioPlayer | null = null;
    let webAudio: HTMLAudioElement | null = null;
    let webVocalAudio: HTMLAudioElement | null = null;

    if (Platform.OS === 'web' && typeof Audio !== 'undefined') {
      const bgmAsset = Asset.fromModule(bgmSource);
      const vocalBgmAsset = Asset.fromModule(vocalBgmSource);
      webAudio = new Audio(bgmAsset.uri);
      webAudio.loop = false;
      webAudio.volume = BGM_VOLUME;
      webAudio.preload = 'auto';
      webBgmAudioRef.current = webAudio;
      webVocalAudio = new Audio(vocalBgmAsset.uri);
      webVocalAudio.loop = false;
      webVocalAudio.volume = 0;
      webVocalAudio.preload = 'auto';
      webVocalBgmAudioRef.current = webVocalAudio;
    } else {
      void setAudioModeAsync({
        playsInSilentMode: false,
        interruptionMode: 'mixWithOthers',
        allowsRecording: false,
        shouldPlayInBackground: false,
        shouldRouteThroughEarpiece: false,
      });

      player = createAudioPlayer(bgmSource);
      player.loop = false;
      player.volume = BGM_VOLUME;
      bgmPlayerRef.current = player;

      vocalPlayer = createAudioPlayer(vocalBgmSource);
      vocalPlayer.loop = false;
      vocalPlayer.volume = 0;
      vocalBgmPlayerRef.current = vocalPlayer;
    }

    const startBgmFromWebInput = () => {
      startBgmAfterUserAction();
    };

    const appStateSubscription = AppState.addEventListener('change', (nextState) => {
      isAppActiveRef.current = nextState === 'active';
      if (!bgmPlayerRef.current) {
        if (!webBgmAudioRef.current) {
          return;
        }
      }

      if (!isAppActiveRef.current) {
        bgmPlayerRef.current?.pause();
        vocalBgmPlayerRef.current?.pause();
        webBgmAudioRef.current?.pause();
        webVocalBgmAudioRef.current?.pause();
        return;
      }

      if (hasUserStartedBgmRef.current) {
        resumeSyncedBgm();
      }
    });

    const syncInterval = setInterval(() => {
      if (!hasUserStartedBgmRef.current || !isAppActiveRef.current) {
        return;
      }

      if (webBgmAudioRef.current && webVocalBgmAudioRef.current) {
        if (areWebTracksBothEnded(webBgmAudioRef.current, webVocalBgmAudioRef.current)) {
          playSyncedBgmFromStart();
        }
        return;
      }

      if (bgmPlayerRef.current && vocalBgmPlayerRef.current && areNativeTracksBothEnded(bgmPlayerRef.current, vocalBgmPlayerRef.current)) {
        playSyncedBgmFromStart();
      }
    }, BGM_SYNC_CHECK_MS);

    if (typeof document !== 'undefined') {
      document.addEventListener('pointerdown', startBgmFromWebInput, { passive: true });
      document.addEventListener('keydown', startBgmFromWebInput);
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('pointerdown', startBgmFromWebInput);
        document.removeEventListener('keydown', startBgmFromWebInput);
      }

      appStateSubscription.remove();
      clearInterval(syncInterval);
      player?.pause();
      player?.release();
      vocalPlayer?.pause();
      vocalPlayer?.release();
      webAudio?.pause();
      if (webAudio) {
        webAudio.src = '';
      }
      webVocalAudio?.pause();
      if (webVocalAudio) {
        webVocalAudio.src = '';
      }
      bgmPlayerRef.current = null;
      vocalBgmPlayerRef.current = null;
      webBgmAudioRef.current = null;
      webVocalBgmAudioRef.current = null;
    };
  }, [playSyncedBgmFromStart, resumeSyncedBgm, startBgmAfterUserAction]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <BgmControlContext.Provider value={bgmControlValue}>
      <View onStartShouldSetResponderCapture={startBgmAfterUserAction} style={styles.appRoot}>
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </View>
    </BgmControlContext.Provider>
  );
}

function areWebTracksBothEnded(left: HTMLAudioElement, right: HTMLAudioElement) {
  return isWebTrackEnded(left) && isWebTrackEnded(right);
}

function isWebTrackEnded(audio: HTMLAudioElement) {
  if (audio.ended) {
    return true;
  }
  if (!Number.isFinite(audio.duration) || audio.duration <= 0) {
    return false;
  }
  return audio.currentTime >= audio.duration - BGM_END_TOLERANCE_SECONDS;
}

function areNativeTracksBothEnded(left: AudioPlayer, right: AudioPlayer) {
  return isNativeTrackEnded(left) && isNativeTrackEnded(right);
}

function isNativeTrackEnded(player: AudioPlayer) {
  if (!Number.isFinite(player.duration) || player.duration <= 0) {
    return false;
  }
  return player.currentTime >= player.duration - BGM_END_TOLERANCE_SECONDS;
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
});
