import { create } from 'zustand';

import { appStorage } from '@/persistence/appStorage';
import {
  defaultSettingsSnapshot,
  parseSettingsSnapshot,
  serializeSettingsSnapshot,
  SettingsSnapshot,
  normalizeSettingsSnapshot,
} from '@/persistence/settingsSnapshot';

const SETTINGS_STORAGE_KEY = 'settings';

export type TextMode = 'normal' | 'hiragana';

type SettingsState = {
  soundEnabled: boolean;
  effectsEnabled: boolean;
  accessibleMode: boolean;
  textMode: TextMode;
  setSoundEnabled: (soundEnabled: boolean) => void;
  setEffectsEnabled: (effectsEnabled: boolean) => void;
  setAccessibleMode: (accessibleMode: boolean) => void;
  setTextMode: (textMode: TextMode) => void;
};

function persistSettings(snapshot: SettingsSnapshot) {
  void appStorage.setItem(SETTINGS_STORAGE_KEY, serializeSettingsSnapshot(snapshot));
}

function getSettingsSnapshot(state: SettingsSnapshot): SettingsSnapshot {
  return normalizeSettingsSnapshot({
    soundEnabled: state.soundEnabled,
    effectsEnabled: state.effectsEnabled,
    accessibleMode: state.accessibleMode,
    textMode: state.textMode,
  });
}

export const useSettingsStore = create<SettingsState>()((set) => ({
  ...defaultSettingsSnapshot,
  setSoundEnabled: (soundEnabled) => {
    set((state) => {
      const snapshot = getSettingsSnapshot({ ...state, soundEnabled });
      persistSettings(snapshot);
      return snapshot;
    });
  },
  setEffectsEnabled: (effectsEnabled) => {
    set((state) => {
      const snapshot = getSettingsSnapshot({ ...state, effectsEnabled: state.soundEnabled && effectsEnabled });
      persistSettings(snapshot);
      return snapshot;
    });
  },
  setAccessibleMode: (accessibleMode) => {
    set((state) => {
      const snapshot = getSettingsSnapshot({ ...state, accessibleMode });
      persistSettings(snapshot);
      return snapshot;
    });
  },
  setTextMode: (textMode) => {
    set((state) => {
      const snapshot = getSettingsSnapshot({ ...state, textMode });
      persistSettings(snapshot);
      return snapshot;
    });
  },
}));

void appStorage.getItem(SETTINGS_STORAGE_KEY).then((value) => {
  if (!value) {
    return;
  }

  const snapshot = parseSettingsSnapshot(value);
  if (!snapshot) {
    return;
  }

  useSettingsStore.setState(snapshot);
});
