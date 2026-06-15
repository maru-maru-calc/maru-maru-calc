import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import type { AudioPlayer } from 'expo-audio';
import { Stack, usePathname } from 'expo-router';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { BgmControlContext } from '@/audio/bgm-control';

const BGM_VOLUME = 0.28;
const BGM_SYNC_CHECK_MS = 250;
const BGM_END_TOLERANCE_SECONDS = 0.12;
const BGM_DRIFT_TOLERANCE_SECONDS = 0.045;
const BGM_WEB_SWITCH_RESYNC_MS = 90;
const bgmSource = require('../../assets/audio/bgm.mp3');
const vocalBgmSource = require('../../assets/audio/bgm-vocal.mp3');

export default function RootLayout() {
  const pathname = usePathname();
  const isBgmEnabledOnRoute = pathname === '/';
  const bgmPlayerRef = useRef<AudioPlayer | null>(null);
  const vocalBgmPlayerRef = useRef<AudioPlayer | null>(null);
  const webBgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const webVocalBgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const webSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasUserStartedBgmRef = useRef(false);
  const isAppActiveRef = useRef(true);
  const isVocalEnabledRef = useRef(false);
  const [isVocalEnabled, setIsVocalEnabled] = useState(false);

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

  const syncBgmPositionsToCurrentTrack = useCallback(() => {
    const shouldUseVocalAsAnchor = isVocalEnabledRef.current;

    if (webBgmAudioRef.current && webVocalBgmAudioRef.current) {
      syncWebBgmPositions(webBgmAudioRef.current, webVocalBgmAudioRef.current, shouldUseVocalAsAnchor);
      return;
    }

    if (bgmPlayerRef.current && vocalBgmPlayerRef.current) {
      void syncNativeBgmPositions(bgmPlayerRef.current, vocalBgmPlayerRef.current, shouldUseVocalAsAnchor);
    }
  }, []);

  const playSyncedBgmFromStart = useCallback(() => {
    applyBgmVolumes();
    if (webBgmAudioRef.current && webVocalBgmAudioRef.current) {
      const activeAudio = getActiveWebBgmAudio(webBgmAudioRef.current, webVocalBgmAudioRef.current, isVocalEnabledRef.current);
      const inactiveAudio = getInactiveWebBgmAudio(webBgmAudioRef.current, webVocalBgmAudioRef.current, isVocalEnabledRef.current);
      try {
        activeAudio.currentTime = 0;
        inactiveAudio.currentTime = 0;
      } catch {
        // Some browsers can reject seeking before metadata is ready. Playback still starts normally.
      }
      inactiveAudio.pause();
      void activeAudio.play().catch(() => {});
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
    syncBgmPositionsToCurrentTrack();
    applyBgmVolumes();
    if (webBgmAudioRef.current && webVocalBgmAudioRef.current) {
      const activeAudio = getActiveWebBgmAudio(webBgmAudioRef.current, webVocalBgmAudioRef.current, isVocalEnabledRef.current);
      const inactiveAudio = getInactiveWebBgmAudio(webBgmAudioRef.current, webVocalBgmAudioRef.current, isVocalEnabledRef.current);
      inactiveAudio.pause();
      void activeAudio.play().catch(() => {});
      return;
    }

    bgmPlayerRef.current?.play();
    vocalBgmPlayerRef.current?.play();
  }, [applyBgmVolumes, syncBgmPositionsToCurrentTrack]);

  const startBgmAfterUserAction = useCallback(() => {
    if (!isBgmEnabledOnRoute || hasUserStartedBgmRef.current || !isAppActiveRef.current) {
      return false;
    }

    hasUserStartedBgmRef.current = true;
    playSyncedBgmFromStart();
    return false;
  }, [isBgmEnabledOnRoute, playSyncedBgmFromStart]);

  const toggleVocal = useCallback(() => {
    const nextIsVocalEnabled = !isVocalEnabledRef.current;
    if (webBgmAudioRef.current && webVocalBgmAudioRef.current) {
      switchWebBgmTrack(
        webBgmAudioRef.current,
        webVocalBgmAudioRef.current,
        isVocalEnabledRef.current,
        nextIsVocalEnabled,
        hasUserStartedBgmRef.current && isAppActiveRef.current && isBgmEnabledOnRoute,
        webSwitchTimeoutRef,
      );
      isVocalEnabledRef.current = nextIsVocalEnabled;
      setIsVocalEnabled(nextIsVocalEnabled);
      return;
    }

    syncBgmPositionsToCurrentTrack();
    isVocalEnabledRef.current = nextIsVocalEnabled;
    setIsVocalEnabled(nextIsVocalEnabled);
    syncBgmPositionsToCurrentTrack();
    applyBgmVolumes();

    if (hasUserStartedBgmRef.current && isAppActiveRef.current) {
      resumeSyncedBgm();
    }
  }, [applyBgmVolumes, isBgmEnabledOnRoute, resumeSyncedBgm, syncBgmPositionsToCurrentTrack]);

  const pauseBgm = useCallback(() => {
    bgmPlayerRef.current?.pause();
    vocalBgmPlayerRef.current?.pause();
    webBgmAudioRef.current?.pause();
    webVocalBgmAudioRef.current?.pause();
  }, []);

  const bgmControlValue = useMemo(
    () => ({
      isVocalEnabled,
      pauseBgm,
      toggleVocal,
    }),
    [isVocalEnabled, pauseBgm, toggleVocal],
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
    if (isBgmEnabledOnRoute) {
      if (hasUserStartedBgmRef.current && isAppActiveRef.current) {
        resumeSyncedBgm();
      }
      return;
    }

    pauseBgm();
  }, [isBgmEnabledOnRoute, pauseBgm, resumeSyncedBgm]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return undefined;
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'marumaru:pause-bgm') {
        return;
      }

      pauseBgm();
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [pauseBgm]);

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
        if (!isBgmEnabledOnRoute) {
          return;
        }
        resumeSyncedBgm();
      }
    });

    const syncInterval = setInterval(() => {
      if (!isBgmEnabledOnRoute || !hasUserStartedBgmRef.current || !isAppActiveRef.current) {
        return;
      }

      if (webBgmAudioRef.current && webVocalBgmAudioRef.current) {
        const activeAudio = getActiveWebBgmAudio(webBgmAudioRef.current, webVocalBgmAudioRef.current, isVocalEnabledRef.current);
        if (isWebTrackEnded(activeAudio)) {
          playSyncedBgmFromStart();
          return;
        }
        return;
      }

      if (bgmPlayerRef.current && vocalBgmPlayerRef.current && areNativeTracksBothEnded(bgmPlayerRef.current, vocalBgmPlayerRef.current)) {
        playSyncedBgmFromStart();
        return;
      }
      syncBgmPositionsToCurrentTrack();
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

      if (webSwitchTimeoutRef.current) {
        clearTimeout(webSwitchTimeoutRef.current);
        webSwitchTimeoutRef.current = undefined;
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
  }, [isBgmEnabledOnRoute, pauseBgm, playSyncedBgmFromStart, resumeSyncedBgm, startBgmAfterUserAction]);

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

function getActiveWebBgmAudio(normalAudio: HTMLAudioElement, vocalAudio: HTMLAudioElement, isVocalEnabled: boolean) {
  return isVocalEnabled ? vocalAudio : normalAudio;
}

function getInactiveWebBgmAudio(normalAudio: HTMLAudioElement, vocalAudio: HTMLAudioElement, isVocalEnabled: boolean) {
  return isVocalEnabled ? normalAudio : vocalAudio;
}

function switchWebBgmTrack(
  normalAudio: HTMLAudioElement,
  vocalAudio: HTMLAudioElement,
  wasVocalEnabled: boolean,
  nextIsVocalEnabled: boolean,
  shouldPlay: boolean,
  timeoutRef: MutableRefObject<ReturnType<typeof setTimeout> | undefined>,
) {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
    timeoutRef.current = undefined;
  }

  const fromAudio = getActiveWebBgmAudio(normalAudio, vocalAudio, wasVocalEnabled);
  const toAudio = getActiveWebBgmAudio(normalAudio, vocalAudio, nextIsVocalEnabled);
  const targetTime = Number.isFinite(fromAudio.currentTime) ? fromAudio.currentTime : 0;
  const switchStartedAt = Date.now();

  normalAudio.volume = nextIsVocalEnabled ? 0 : BGM_VOLUME;
  vocalAudio.volume = nextIsVocalEnabled ? BGM_VOLUME : 0;

  if (!shouldPlay) {
    try {
      toAudio.currentTime = targetTime;
    } catch {
      // Browsers can reject seeks before metadata is ready. The next user start will seek again.
    }
    fromAudio.pause();
    return;
  }

  try {
    toAudio.currentTime = targetTime;
  } catch {
    // Browsers can reject seeks before metadata is ready. The delayed resync below will retry.
  }

  void toAudio
    .play()
    .then(() => {
      timeoutRef.current = setTimeout(() => {
        try {
          toAudio.currentTime = targetTime + (Date.now() - switchStartedAt) / 1000;
        } catch {
          // If Safari rejects this late seek, the initial seek still gives the best available sync.
        }
        fromAudio.pause();
        timeoutRef.current = undefined;
      }, BGM_WEB_SWITCH_RESYNC_MS);
    })
    .catch(() => {
      fromAudio.pause();
    });
}

function syncWebBgmPositions(normalAudio: HTMLAudioElement, vocalAudio: HTMLAudioElement, useVocalAsAnchor: boolean) {
  const anchor = useVocalAsAnchor ? vocalAudio : normalAudio;
  const follower = useVocalAsAnchor ? normalAudio : vocalAudio;

  if (!Number.isFinite(anchor.currentTime) || !Number.isFinite(follower.currentTime)) {
    return;
  }
  if (isWebTrackEnded(anchor)) {
    return;
  }

  const drift = Math.abs(anchor.currentTime - follower.currentTime);
  if (drift <= BGM_DRIFT_TOLERANCE_SECONDS) {
    return;
  }

  try {
    follower.currentTime = anchor.currentTime;
  } catch {
    // Browsers can reject seeks before metadata is available. The next sync tick will retry.
  }
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

async function syncNativeBgmPositions(normalPlayer: AudioPlayer, vocalPlayer: AudioPlayer, useVocalAsAnchor: boolean) {
  const anchor = useVocalAsAnchor ? vocalPlayer : normalPlayer;
  const follower = useVocalAsAnchor ? normalPlayer : vocalPlayer;

  if (!Number.isFinite(anchor.currentTime) || !Number.isFinite(follower.currentTime)) {
    return;
  }
  if (isNativeTrackEnded(anchor)) {
    return;
  }

  const drift = Math.abs(anchor.currentTime - follower.currentTime);
  if (drift <= BGM_DRIFT_TOLERANCE_SECONDS) {
    return;
  }

  await follower.seekTo(anchor.currentTime);
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
