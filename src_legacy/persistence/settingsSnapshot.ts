import { parseJsonObject } from '@/persistence/json';
import { TextMode } from '@/store/settingsStore';

export type SettingsSnapshot = {
  soundEnabled: boolean;
  effectsEnabled: boolean;
  accessibleMode: boolean;
  textMode: TextMode;
};

export const defaultSettingsSnapshot: SettingsSnapshot = {
  soundEnabled: true,
  effectsEnabled: true,
  accessibleMode: false,
  textMode: 'normal',
};

export function serializeSettingsSnapshot(snapshot: SettingsSnapshot) {
  return JSON.stringify(normalizeSettingsSnapshot(snapshot));
}

export function parseSettingsSnapshot(value: string): SettingsSnapshot | undefined {
  const snapshot = parseJsonObject(value);
  if (!snapshot) {
    return undefined;
  }

  return normalizeSettingsSnapshot({
    soundEnabled: typeof snapshot.soundEnabled === 'boolean' ? snapshot.soundEnabled : defaultSettingsSnapshot.soundEnabled,
    effectsEnabled:
      typeof snapshot.effectsEnabled === 'boolean' ? snapshot.effectsEnabled : defaultSettingsSnapshot.effectsEnabled,
    accessibleMode:
      typeof snapshot.accessibleMode === 'boolean' ? snapshot.accessibleMode : defaultSettingsSnapshot.accessibleMode,
    textMode:
      snapshot.textMode === 'normal' || snapshot.textMode === 'hiragana'
        ? snapshot.textMode
        : defaultSettingsSnapshot.textMode,
  });
}

export function normalizeSettingsSnapshot(snapshot: SettingsSnapshot): SettingsSnapshot {
  return {
    ...snapshot,
    effectsEnabled: snapshot.soundEnabled ? snapshot.effectsEnabled : false,
  };
}
