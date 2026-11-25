import { useSyncExternalStore } from 'react';

// Whether sound is off, for as long as the page lives. Keeping the choice between visits is
// sound-settings.ts's business; a host that decides about sound itself (YouTube) uses only this.
type Listener = () => void;

let isMuted = false;
const listeners = new Set<Listener>();

/** Whether all sound (BGM and effects) is switched off. */
export function isSoundMuted() {
  return isMuted;
}

/** Switches sound off or on without keeping the choice for the next visit. */
export function setSoundMutedForNow(nextIsMuted: boolean) {
  if (isMuted !== nextIsMuted) {
    isMuted = nextIsMuted;
    listeners.forEach((listener) => listener());
  }
}

export function subscribeToSoundMuted(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useIsSoundMuted() {
  return useSyncExternalStore(subscribeToSoundMuted, isSoundMuted, isSoundMuted);
}
