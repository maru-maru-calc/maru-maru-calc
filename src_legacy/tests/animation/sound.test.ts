import { describe, expect, it } from 'vitest';

import { createSoundEffectEvent, getSoundCue } from '@/animation/sound';

describe('createSoundEffectEvent', () => {
  it('keeps the requested sound id and resolves whether it is enabled', () => {
    expect(createSoundEffectEvent('merge', { soundEnabled: true, effectsEnabled: true })).toEqual({
      id: 'merge',
      enabled: true,
      cue: getSoundCue('merge'),
    });
    expect(createSoundEffectEvent('merge', { soundEnabled: true, effectsEnabled: false })).toEqual({
      id: 'merge',
      enabled: false,
      cue: getSoundCue('merge'),
    });
  });

  it('provides distinct cue settings per sound effect', () => {
    expect(getSoundCue('select').durationMs).toBeLessThan(getSoundCue('clear').durationMs);
    expect(getSoundCue('invalid').frequencyHz).toBeLessThan(getSoundCue('carry').frequencyHz);
  });
});
