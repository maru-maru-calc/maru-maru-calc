import { describe, expect, it } from 'vitest';

import {
  canPlaySoundEffect,
  getSoundEffectForMergeResult,
  getSoundEffectForMessage,
} from '@/domain/game/audio';

describe('game audio mapping', () => {
  it('gates sound effects by sound and effects settings', () => {
    expect(canPlaySoundEffect({ soundEnabled: true, effectsEnabled: true })).toBe(true);
    expect(canPlaySoundEffect({ soundEnabled: false, effectsEnabled: true })).toBe(false);
    expect(canPlaySoundEffect({ soundEnabled: true, effectsEnabled: false })).toBe(false);
  });

  it('maps game messages to sound effects', () => {
    expect(getSoundEffectForMessage('readyToAdd')).toBe('select');
    expect(getSoundEffectForMessage('outOfRange')).toBe('invalid');
    expect(getSoundEffectForMessage('targetMade')).toBe('clear');
    expect(getSoundEffectForMessage('selectionCleared')).toBeUndefined();
  });

  it('maps merge results to clear, carry, or merge effects', () => {
    expect(getSoundEffectForMergeResult('clear', [])).toBe('clear');
    expect(
      getSoundEffectForMergeResult('selecting', [
        {
          id: 'carry',
          fromDigit: 1,
          toDigit: 10,
          beforeCount: 10,
          carryCount: 1,
          remainderCount: 0,
          resultValue: 10,
        },
      ]),
    ).toBe('carry');
    expect(getSoundEffectForMergeResult('selecting', [])).toBe('merge');
  });
});
