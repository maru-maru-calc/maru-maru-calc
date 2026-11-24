import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Asset } from 'expo-asset';
import type { AudioPlayer } from 'expo-audio';
import { Stack, usePathname } from 'expo-router';
import { AppState, Platform, StyleSheet, View } from 'react-native';

import { BgmControlContext } from '@/audio/bgm-control';
import { isSoundMuted, loadStoredSoundMuted, setSoundMuted, useIsSoundMuted } from '@/audio/sound-settings';

const BGM_VOLUME = 0.28;
const BGM_SYNC_CHECK_MS = 250;
const BGM_END_TOLERANCE_SECONDS = 0.12;
const BGM_DRIFT_TOLERANCE_SECONDS = 0.045;
const BGM_WEB_SWITCH_RESYNC_MS = 90;
const WEB_SITE_URL = 'https://maru-maru-calc.github.io/maru-maru-calc/';
const WEB_BASE_PATH = '/maru-maru-calc';
const WEB_ASSET_BASE_URL = 'https://maru-maru-calc.github.io/maru-maru-calc';
const WEB_SITE_TITLE = 'まるまる電卓 | すうじをさわる計算あそび';
const WEB_SITE_DESCRIPTION = 'まるをさわって、動かして。足し算から割り算まで、数を見た目で感じる子ども向け計算あそび。';
const WEB_SITE_KEYWORDS = 'まるまる電卓,算数,計算,知育アプリ,子ども向け,足し算,引き算,掛け算,割り算';
const WEB_OGP_IMAGE_URL = `${WEB_ASSET_BASE_URL}/ogp.png`;
const bgmSource = require('../../assets/audio/bgm.mp3');
const vocalBgmSource = require('../../assets/audio/bgm-vocal.mp3');

export default function RootLayout() {
  const pathname = usePathname();
  const isBgmEnabledOnRoute = pathname === '/game';
  const bgmPlayerRef = useRef<AudioPlayer | null>(null);
  const vocalBgmPlayerRef = useRef<AudioPlayer | null>(null);
  const webBgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const webVocalBgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const webSwitchTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hasUserStartedBgmRef = useRef(false);
  const isBgmSwitchingRef = useRef(false);
  const isAppActiveRef = useRef(true);
  const isVocalEnabledRef = useRef(false);
  const [isVocalEnabled, setIsVocalEnabled] = useState(false);
  const isMuted = useIsSoundMuted();

  useEffect(() => {
    loadStoredSoundMuted();
  }, []);

  useEffect(() => {
    // The service worker (scripts/service-worker.js) only exists in an exported build.
    if (Platform.OS !== 'web' || __DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    const register = () => {
      navigator.serviceWorker.register(`${WEB_BASE_PATH}/sw.js`, { scope: `${WEB_BASE_PATH}/` }).catch(() => {
        // Without it the app still works; it just cannot open offline.
      });
    };

    // After load, so storing the app for offline use never competes with showing the page.
    if (document.readyState === 'complete') {
      register();
      return undefined;
    }

    window.addEventListener('load', register, { once: true });
    return () => {
      window.removeEventListener('load', register);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') {
      return;
    }

    syncWebMetadata();
  }, [pathname]);

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
    if (isSoundMuted()) {
      return;
    }

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
    if (isSoundMuted()) {
      return;
    }

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
    if (!isBgmEnabledOnRoute || hasUserStartedBgmRef.current || !isAppActiveRef.current || isSoundMuted()) {
      return false;
    }

    hasUserStartedBgmRef.current = true;
    // The vocal track is only needed once the mermaid is found, so it starts loading after the first play.
    if (webVocalBgmAudioRef.current && webVocalBgmAudioRef.current.preload !== 'auto') {
      webVocalBgmAudioRef.current.preload = 'auto';
      webVocalBgmAudioRef.current.load();
    }
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
        hasUserStartedBgmRef.current && isAppActiveRef.current && isBgmEnabledOnRoute && !isSoundMuted(),
        webSwitchTimeoutRef,
      );
      isVocalEnabledRef.current = nextIsVocalEnabled;
      setIsVocalEnabled(nextIsVocalEnabled);
      return;
    }

    if (bgmPlayerRef.current && vocalBgmPlayerRef.current) {
      isBgmSwitchingRef.current = true;
      void switchNativeBgmTrack(
        bgmPlayerRef.current,
        vocalBgmPlayerRef.current,
        isVocalEnabledRef.current,
        nextIsVocalEnabled,
        hasUserStartedBgmRef.current && isAppActiveRef.current && isBgmEnabledOnRoute && !isSoundMuted(),
      ).finally(() => {
        isBgmSwitchingRef.current = false;
      });
      isVocalEnabledRef.current = nextIsVocalEnabled;
      setIsVocalEnabled(nextIsVocalEnabled);
      return;
    }

    isVocalEnabledRef.current = nextIsVocalEnabled;
    setIsVocalEnabled(nextIsVocalEnabled);
    applyBgmVolumes();
  }, [applyBgmVolumes, isBgmEnabledOnRoute]);

  const pauseBgm = useCallback(() => {
    bgmPlayerRef.current?.pause();
    vocalBgmPlayerRef.current?.pause();
    webBgmAudioRef.current?.pause();
    webVocalBgmAudioRef.current?.pause();
  }, []);

  const toggleMute = useCallback(() => {
    const nextIsMuted = !isSoundMuted();
    setSoundMuted(nextIsMuted);

    if (nextIsMuted) {
      pauseBgm();
      return;
    }

    if (!isBgmEnabledOnRoute || !isAppActiveRef.current) {
      return;
    }

    if (hasUserStartedBgmRef.current) {
      resumeSyncedBgm();
      return;
    }

    // Switching sound back on is itself a user action, so the BGM may start right here.
    startBgmAfterUserAction();
  }, [isBgmEnabledOnRoute, pauseBgm, resumeSyncedBgm, startBgmAfterUserAction]);

  useEffect(() => {
    // Covers a saved "sound off" setting that finishes loading after the BGM has already started.
    if (isMuted) {
      pauseBgm();
    }
  }, [isMuted, pauseBgm]);

  const bgmControlValue = useMemo(
    () => ({
      isVocalEnabled,
      isMuted,
      pauseBgm,
      toggleVocal,
      toggleMute,
    }),
    [isMuted, isVocalEnabled, pauseBgm, toggleMute, toggleVocal],
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
      // The BGM files are large, so they are only requested on the route that plays them.
      if (isBgmEnabledOnRoute) {
        const bgmAsset = Asset.fromModule(bgmSource);
        const vocalBgmAsset = Asset.fromModule(vocalBgmSource);
        webAudio = new Audio(bgmAsset.uri);
        webAudio.loop = false;
        webAudio.volume = BGM_VOLUME;
        webAudio.preload = 'auto';
        webBgmAudioRef.current = webAudio;
        webVocalAudio = new Audio();
        webVocalAudio.preload = 'none';
        webVocalAudio.src = vocalBgmAsset.uri;
        webVocalAudio.loop = false;
        webVocalAudio.volume = 0;
        webVocalBgmAudioRef.current = webVocalAudio;
      }
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
      if (!isBgmEnabledOnRoute || !hasUserStartedBgmRef.current || !isAppActiveRef.current || isBgmSwitchingRef.current || isSoundMuted()) {
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
  const applyTargetVolumes = () => {
    normalAudio.volume = nextIsVocalEnabled ? 0 : BGM_VOLUME;
    vocalAudio.volume = nextIsVocalEnabled ? BGM_VOLUME : 0;
  };
  const seekToSwitchTime = () => {
    try {
      toAudio.currentTime = targetTime + (shouldPlay ? (Date.now() - switchStartedAt) / 1000 : 0);
    } catch {
      // Browsers can reject seeks before metadata is available. Later media events retry the sync.
    }
  };

  toAudio.addEventListener('loadedmetadata', seekToSwitchTime, { once: true });
  toAudio.addEventListener('canplay', seekToSwitchTime, { once: true });

  if (!shouldPlay) {
    seekToSwitchTime();
    applyTargetVolumes();
    fromAudio.pause();
    return;
  }

  seekToSwitchTime();
  fromAudio.pause();

  void toAudio
    .play()
    .then(() => {
      timeoutRef.current = setTimeout(() => {
        seekToSwitchTime();
        applyTargetVolumes();
        fromAudio.pause();
        timeoutRef.current = undefined;
      }, BGM_WEB_SWITCH_RESYNC_MS);
    })
    .catch(() => {
      applyTargetVolumes();
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

async function switchNativeBgmTrack(
  normalPlayer: AudioPlayer,
  vocalPlayer: AudioPlayer,
  wasVocalEnabled: boolean,
  nextIsVocalEnabled: boolean,
  shouldPlay: boolean,
) {
  const fromPlayer = getActiveNativeBgmPlayer(normalPlayer, vocalPlayer, wasVocalEnabled);
  const toPlayer = getActiveNativeBgmPlayer(normalPlayer, vocalPlayer, nextIsVocalEnabled);
  const targetTime = Number.isFinite(fromPlayer.currentTime) ? fromPlayer.currentTime : 0;
  const applyTargetVolumes = () => {
    normalPlayer.volume = nextIsVocalEnabled ? 0 : BGM_VOLUME;
    vocalPlayer.volume = nextIsVocalEnabled ? BGM_VOLUME : 0;
  };

  if (!isNativeTrackEnded(fromPlayer)) {
    try {
      await toPlayer.seekTo(targetTime);
    } catch {
      // Native audio can reject a seek while a source is still preparing. The sync interval will retry.
    }
  }

  if (shouldPlay) {
    normalPlayer.play();
    vocalPlayer.play();
  }

  applyTargetVolumes();
}

function getActiveNativeBgmPlayer(normalPlayer: AudioPlayer, vocalPlayer: AudioPlayer, isVocalEnabled: boolean) {
  return isVocalEnabled ? vocalPlayer : normalPlayer;
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

function syncWebMetadata() {
  document.documentElement.lang = 'ja';
  document.title = WEB_SITE_TITLE;

  setMetaTag('name', 'description', WEB_SITE_DESCRIPTION);
  setMetaTag('name', 'keywords', WEB_SITE_KEYWORDS);
  setMetaTag('name', 'robots', 'index,follow');
  setMetaTag('name', 'theme-color', '#C6E8F4');
  setMetaTag('name', 'apple-mobile-web-app-title', 'まるまる電卓');
  setLinkTag('canonical', WEB_SITE_URL);
  setLinkTag('icon', '/maru-maru-calc/favicon.png', 'image/png');
  setLinkTag('apple-touch-icon', '/maru-maru-calc/apple-touch-icon.png');

  setMetaTag('property', 'og:type', 'website');
  setMetaTag('property', 'og:locale', 'ja_JP');
  setMetaTag('property', 'og:site_name', 'まるまる電卓');
  setMetaTag('property', 'og:title', WEB_SITE_TITLE);
  setMetaTag('property', 'og:description', WEB_SITE_DESCRIPTION);
  setMetaTag('property', 'og:url', WEB_SITE_URL);
  setMetaTag('property', 'og:image', WEB_OGP_IMAGE_URL);
  setMetaTag('property', 'og:image:width', '1200');
  setMetaTag('property', 'og:image:height', '630');
  setMetaTag('property', 'og:image:alt', 'まるまる電卓の水色の画面と、まるで数を感じる計算あそび');

  setMetaTag('name', 'twitter:card', 'summary_large_image');
  setMetaTag('name', 'twitter:title', WEB_SITE_TITLE);
  setMetaTag('name', 'twitter:description', WEB_SITE_DESCRIPTION);
  setMetaTag('name', 'twitter:image', WEB_OGP_IMAGE_URL);
}

function setMetaTag(attributeName: 'name' | 'property', attributeValue: string, content: string) {
  let element = document.head.querySelector(`meta[${attributeName}="${attributeValue}"]`);

  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }

  element.setAttribute('content', content);
}

function setLinkTag(rel: string, href: string, type?: string) {
  let element = document.head.querySelector(`link[rel="${rel}"]`);

  if (!element) {
    element = document.createElement('link');
    element.setAttribute('rel', rel);
    document.head.appendChild(element);
  }

  element.setAttribute('href', href);

  if (type) {
    element.setAttribute('type', type);
  }
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
  },
});
