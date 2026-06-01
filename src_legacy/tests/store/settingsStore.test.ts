import { beforeEach, describe, expect, it } from 'vitest';

import { defaultSettingsSnapshot } from '@/persistence/settingsSnapshot';
import { useSettingsStore } from '@/store/settingsStore';

describe('settingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState(defaultSettingsSnapshot);
  });

  it('turns effects off when sound is disabled', () => {
    useSettingsStore.getState().setSoundEnabled(false);

    expect(useSettingsStore.getState()).toMatchObject({
      soundEnabled: false,
      effectsEnabled: false,
    });
  });

  it('does not enable effects while sound is disabled', () => {
    useSettingsStore.getState().setSoundEnabled(false);
    useSettingsStore.getState().setEffectsEnabled(true);

    expect(useSettingsStore.getState()).toMatchObject({
      soundEnabled: false,
      effectsEnabled: false,
    });
  });
});
