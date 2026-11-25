import { describe, expect, it } from 'vitest';

import { createEmptyProgress, parseStoredProgress, serializeProgress } from '@/storage/progress-codec';

describe('stored progress', () => {
  it('round-trips cleared stages and the intro flag', () => {
    const progress = {
      marumaru: ['addition-1', 'addition-10-twos'],
      dentaku: ['dentaku-kuku-dan-3'],
      longForm: ['long-form-addition-2'],
      kukuWeak: ['7x8', '6x7'],
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
      kukuWeak: [],
      hasSeenIntro: false,
    });
  });

  it('reads progress saved before times-table misses were remembered', () => {
    const raw = JSON.stringify({ version: 1, marumaru: ['addition-1'], dentaku: ['dentaku-kuku-dan-3'], longForm: [], hasSeenIntro: true });

    expect(parseStoredProgress(raw)).toEqual({
      marumaru: ['addition-1'],
      dentaku: ['dentaku-kuku-dan-3'],
      longForm: [],
      kukuWeak: [],
      hasSeenIntro: true,
    });
  });

  it('turns five cleared one-question stages of the calculator mode into today\'s stage of five questions', () => {
    const oldStages = ['dentaku-addition-1', 'dentaku-addition-2', 'dentaku-addition-3', 'dentaku-addition-4', 'dentaku-addition-5', 'dentaku-addition-6'];
    const parsed = parseStoredProgress(JSON.stringify({ version: 1, dentaku: oldStages, hasSeenIntro: true }));

    expect(parsed.dentaku).toEqual([...oldStages, 'dentaku-addition-set-1']);
    // Saved and read again, nothing more is added.
    expect(parseStoredProgress(serializeProgress(parsed)).dentaku).toEqual(parsed.dentaku);
  });

  it('keeps only real times-table facts among the remembered misses', () => {
    const raw = JSON.stringify({ kukuWeak: ['7x8', '7x8', '12x3', 'addition-1', 56, null, '9x9'] });

    expect(parseStoredProgress(raw).kukuWeak).toEqual(['7x8', '9x9']);
    expect(JSON.parse(serializeProgress({ ...createEmptyProgress(), kukuWeak: ['7x8', 'x', '7x8'] })).kukuWeak).toEqual(['7x8']);
  });
});
