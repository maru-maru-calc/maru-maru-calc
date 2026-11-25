// The puzzle game as YouTube runs it: no router, no learning app, and YouTube's SDK in charge of
// saving, pausing and sound. Built with `npm run export:youtube` (metro.config.js makes this the app's entry).
import { pauseGate } from './install-pause-gate';
// (The line above must stay first: see install-pause-gate.ts.)
import { registerRootComponent } from 'expo';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { setSoundMutedForNow } from '@/audio/sound-muted-state';
import { stopAllWebAudio } from '@/audio/use-one-shot-audio';
import { puzzleScreenStyle } from '@/components/puzzle/parts';
import { PuzzleGame } from '@/components/puzzle/puzzle-game';
import { setA11yLocale } from '@/i18n/a11y-label';

import { createYouTubeHost } from './youtube-host';
import { getYtGameSdk } from './ytgame-sdk';

// How long the first screen waits to hear the player's language before going on in English.
const LANGUAGE_WAIT_MS = 1000;

const sdk = getYtGameSdk();
const host = createYouTubeHost(sdk, {
  setMuted(isMuted) {
    setSoundMutedForNow(isMuted);
    if (isMuted) {
      stopAllWebAudio();
    }
  },
  setPaused(isPaused) {
    if (isPaused) {
      stopAllWebAudio();
    }
    // The page's own style sheet stops taps and CSS animations for this class (scripts/build-youtube.js).
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('is-paused', isPaused);
    }
    pauseGate.setPaused(isPaused);
  },
});

// The names for screen readers are the game's only words. YouTube says which language the player
// uses; the browser's own setting is not to be consulted.
setA11yLocale('en');

function YouTubePuzzleApp() {
  const [isLanguageKnown, setIsLanguageKnown] = useState(sdk === undefined);

  useEffect(() => {
    host.noteFirstFrame();
    if (!sdk) {
      return undefined;
    }
    let isCurrent = true;
    const goOn = () => {
      if (isCurrent) {
        setIsLanguageKnown(true);
      }
    };
    const timeout = setTimeout(goOn, LANGUAGE_WAIT_MS);
    sdk.system
      .getLanguage()
      .then((language) => {
        if (typeof language === 'string' && language.toLowerCase().startsWith('ja')) {
          setA11yLocale('ja');
        }
      })
      .catch(() => {})
      .then(goOn);
    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, []);

  return <SafeAreaProvider>{isLanguageKnown ? <PuzzleGame host={host} /> : <View style={puzzleScreenStyle} />}</SafeAreaProvider>;
}

registerRootComponent(YouTubePuzzleApp);
