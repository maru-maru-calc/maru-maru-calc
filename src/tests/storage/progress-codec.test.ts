import { describe, expect, it } from 'vitest';

import { createEmptyProgress, parseStoredProgress, serializeProgress } from '@/storage/progress-codec';

describe('stored progress', () => {
  it('round-trips cleared stages and the intro flag', () => {
    const progress = {
      marumaru: ['addition-1', 'addition-10-twos'],
      dentaku: ['dentaku-kuku-dan-3'],
      longForm: ['long-form-addition-2'],
      hasSeenIntro: true,
    };

    expect(parseStoredProgress(serializeProgress(progress))).toEqual(progress);
  });

  it('starts empty when nothing is stored', () => {
    expect(parseStoredProgress(null)).toEqual(createEmptyProgress());
    expect(parseStoredProgress(undefined)).toEqual(createEmptyProgress());
    expect(parseStoredProgress('')).toEqual(createEmptyProgress());
  });

  it('starts empty when the stored value is broken', () => {
    expect(parseStoredProgress('{not json')).toEqual(createEmptyProgress());
    expect(parseStoredProgress('"text"')).toEqual(createEmptyProgress());
    expect(parseStoredProgress('null')).toEqual(createEmptyProgress());
  });

  it('drops entries that are not stage ids and removes duplicates', () => {
    const raw = JSON.stringify({
      marumaru: ['addition-1', 'addition-1', 5, null],
      dentaku: 'dentaku-kuku-dan-1',
      hasSeenIntro: 'yes',
    });

    expect(parseStoredProgress(raw)).toEqual({
      marumaru: ['addition-1'],
      dentaku: [],
      longForm: [],
      hasSeenIntro: false,
    });
  });
});
