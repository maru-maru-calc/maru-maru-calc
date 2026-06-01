export type ClearBadge = 'fewestMoves' | 'noReset';

export function getClearBadges({
  moveCount,
  resetCount,
  minimumMoveCount,
}: {
  moveCount: number;
  resetCount: number;
  minimumMoveCount?: number;
}): ClearBadge[] {
  const badges: ClearBadge[] = [];

  if (minimumMoveCount !== undefined && moveCount <= minimumMoveCount) {
    badges.push('fewestMoves');
  }

  if (resetCount === 0) {
    badges.push('noReset');
  }

  return badges;
}
