import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';

const SOUND_MUTED_STORAGE_KEY = 'marumaru-calc:sound-muted';

type Listener = () => void;

let isMuted = false;
let hasLoadedStoredValue = false;
const listeners = new Set<Listener>();

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

/** Whether all sound (BGM and effects) is switched off by the player. */
export function isSoundMuted() {
  return isMuted;
}

export function setSoundMuted(nextIsMuted: boolean) {
  // A choice made by the player always wins over a stored value that is still loading.
  hasLoadedStoredValue = true;
  if (isMuted !== nextIsMuted) {
    isMuted = nextIsMuted;
    notifyListeners();
  }

  try {
    void AsyncStorage.setItem(SOUND_MUTED_STORAGE_KEY, nextIsMuted ? '1' : '0').catch(() => {});
  } catch {
    // Storage can be unavailable; the setting then lasts only for this visit.
  }
}

export function subscribeToSoundMuted(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
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
        if (storedValue === '1' && !isMuted) {
          isMuted = true;
          notifyListeners();
        }
      })
      .catch(() => {});
  } catch {
    // Storage can be unavailable; sound simply stays on.
  }
}

export function useIsSoundMuted() {
  return useSyncExternalStore(subscribeToSoundMuted, isSoundMuted, isSoundMuted);
}
