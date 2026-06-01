import { describe, expect, it } from 'vitest';

import {
  defaultSettingsSnapshot,
  normalizeSettingsSnapshot,
  parseSettingsSnapshot,
  serializeSettingsSnapshot,
} from '@/persistence/settingsSnapshot';

describe('settings snapshot persistence', () => {
  it('round-trips settings snapshots', () => {
    const snapshot = {
      soundEnabled: false,
      effectsEnabled: false,
      accessibleMode: true,
      textMode: 'hiragana' as const,
    };

    expect(parseSettingsSnapshot(serializeSettingsSnapshot(snapshot))).toEqual(snapshot);
  });

  it('falls back to defaults for missing or invalid fields', () => {
    expect(parseSettingsSnapshot(JSON.stringify({ textMode: 'kanji', accessibleMode: true }))).toEqual({
      ...defaultSettingsSnapshot,
      accessibleMode: true,
    });
  });

  it('turns off effects when sound is off', () => {
    expect(
      normalizeSettingsSnapshot({
        soundEnabled: false,
        effectsEnabled: true,
        accessibleMode: false,
        textMode: 'normal',
      }),
    ).toEqual({
      soundEnabled: false,
      effectsEnabled: false,
      accessibleMode: false,
      textMode: 'normal',
    });
  });
});
