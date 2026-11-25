import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSoundMuted, setSoundMutedForNow, subscribeToSoundMuted, useIsSoundMuted } from './sound-muted-state';

export { isSoundMuted, subscribeToSoundMuted, useIsSoundMuted };

const SOUND_MUTED_STORAGE_KEY = 'marumaru-calc:sound-muted';

let hasLoadedStoredValue = false;

/** The player's own choice: applied now and kept for the next visit. */
export function setSoundMuted(nextIsMuted: boolean) {
  // A choice made by the player always wins over a stored value that is still loading.
  hasLoadedStoredValue = true;
  setSoundMutedForNow(nextIsMuted);

  try {
    void AsyncStorage.setItem(SOUND_MUTED_STORAGE_KEY, nextIsMuted ? '1' : '0').catch(() => {});
  } catch {
    // Storage can be unavailable; the setting then lasts only for this visit.
  }
}

/** Reads the saved mute setting once. Safe to call repeatedly. */
export function loadStoredSoundMuted() {
  if (hasLoadedStoredValue) {
    return;
  }

  try {
    void AsyncStorage.getItem(SOUND_MUTED_STORAGE_KEY)
      .then((storedValue) => {
        if (hasLoadedStoredValue) {
          return;
        }
        hasLoadedStoredValue = true;
        if (storedValue === '1') {
          setSoundMutedForNow(true);
        }
      })
      .catch(() => {});
  } catch {
    // Storage can be unavailable; sound simply stays on.
  }
}
