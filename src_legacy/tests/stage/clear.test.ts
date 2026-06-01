import { describe, expect, it } from 'vitest';

import { createNumberGroup } from '@/domain/math/groups';
import { isStageClear } from '@/domain/stage/clear';

describe('isStageClear', () => {
  it('clears only when one remaining group equals the target', () => {
    const result = createNumberGroup(31, 'result').group;

    expect(isStageClear([result], 31)).toBe(true);
  });

  it('does not clear when the target value is present with leftover groups', () => {
    const result = createNumberGroup(31, 'result').group;
    const leftover = createNumberGroup(1, 'leftover').group;

    expect(isStageClear([result, leftover], 31)).toBe(false);
  });

  it('does not clear when the only remaining group has a different value', () => {
    const result = createNumberGroup(30, 'result').group;

    expect(isStageClear([result], 31)).toBe(false);
  });
});
