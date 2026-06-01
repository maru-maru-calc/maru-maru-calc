import { describe, expect, it } from 'vitest';

import { getClearBadges } from '@/domain/game/clearBadges';

describe('getClearBadges', () => {
  it('awards fewest move and no reset badges', () => {
    expect(getClearBadges({ moveCount: 1, minimumMoveCount: 1, resetCount: 0 })).toEqual([
      'fewestMoves',
      'noReset',
    ]);
  });

  it('does not award the fewest move badge when extra moves were used', () => {
    expect(getClearBadges({ moveCount: 3, minimumMoveCount: 2, resetCount: 1 })).toEqual([]);
  });
});
