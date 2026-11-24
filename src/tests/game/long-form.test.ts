import { describe, expect, it } from 'vitest';

import { matchesLongFormStepAnswer } from '@/game/long-form';

describe('long-form step answers', () => {
  it('accepts the whole column sum', () => {
    expect(matchesLongFormStepAnswer('14', 14, true)).toBe(true);
    expect(matchesLongFormStepAnswer('7', 7, true)).toBe(true);
    expect(matchesLongFormStepAnswer('0', 0, false)).toBe(true);
  });

  it('accepts only the written digit when the column carries', () => {
    expect(matchesLongFormStepAnswer('4', 14, true)).toBe(true);
    expect(matchesLongFormStepAnswer('0', 10, true)).toBe(true);
    expect(matchesLongFormStepAnswer('3', 23, true)).toBe(true);
  });

  it('still rejects a wrong digit', () => {
    expect(matchesLongFormStepAnswer('5', 14, true)).toBe(false);
    expect(matchesLongFormStepAnswer('1', 14, true)).toBe(false);
    expect(matchesLongFormStepAnswer('24', 14, true)).toBe(false);
    expect(matchesLongFormStepAnswer('04', 14, true)).toBe(false);
  });

  it('needs the whole number on steps that are not a carrying column', () => {
    expect(matchesLongFormStepAnswer('6', 56, false)).toBe(false);
    expect(matchesLongFormStepAnswer('56', 56, false)).toBe(true);
    expect(matchesLongFormStepAnswer('2', 12, false)).toBe(false);
  });

  it('rejects empty or non-numeric input', () => {
    expect(matchesLongFormStepAnswer('', 0, true)).toBe(false);
    expect(matchesLongFormStepAnswer('a', 4, true)).toBe(false);
  });
});
