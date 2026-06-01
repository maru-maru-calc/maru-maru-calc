import { describe, expect, it } from 'vitest';

import { findMergeCluster, getTotalValue, hasMergeableCount } from '@/game/merge';
import { BeadSnapshot } from '@/game/types';

describe('merge detection', () => {
  it('finds ten nearby beads with the same place value', () => {
    const beads: BeadSnapshot[] = Array.from({ length: 10 }, (_, index) => ({
      id: `one-${index}`,
      value: 1,
      count: 1,
      sign: 1,
      role: 'normal',
      x: 100 + (index % 5) * 12,
      y: 120 + Math.floor(index / 5) * 12,
    }));

    const cluster = findMergeCluster(beads, 80);

    expect(cluster?.value).toBe(1);
    expect(cluster?.sign).toBe(1);
    expect(cluster?.beadIds).toHaveLength(10);
    expect(cluster?.center.x).toBeGreaterThan(100);
  });

  it('finds ten connected beads even when they are spread in a line', () => {
    const beads: BeadSnapshot[] = Array.from({ length: 10 }, (_, index) => ({
      id: `one-${index}`,
      value: 1,
      count: 1,
      sign: 1,
      role: 'normal',
      x: 80 + index * 30,
      y: 140,
    }));

    const cluster = findMergeCluster(beads, 36);

    expect(cluster?.value).toBe(1);
    expect(cluster?.beadIds).toHaveLength(10);
  });

  it('does not merge mixed place values', () => {
    const beads: BeadSnapshot[] = [
      ...Array.from({ length: 9 }, (_, index) => ({
        id: `one-${index}`,
        value: 1 as const,
        count: 1,
        sign: 1 as const,
        role: 'normal' as const,
        x: 100 + index,
        y: 100,
      })),
      { id: 'ten-1', value: 10, count: 1, sign: 1, role: 'normal', x: 102, y: 102 },
    ];

    expect(findMergeCluster(beads, 80)).toBeUndefined();
  });

  it('merges number groups when their counts add up to ten', () => {
    const beads: BeadSnapshot[] = [
      { id: 'six', value: 1, count: 6, sign: 1, role: 'normal', x: 100, y: 120 },
      { id: 'four', value: 1, count: 4, sign: 1, role: 'normal', x: 148, y: 120 },
    ];

    const cluster = findMergeCluster(beads, 60);

    expect(cluster?.value).toBe(1);
    expect(cluster?.beadIds).toEqual(['six', 'four']);
  });

  it('detects unmerged counts even when they are not close enough yet', () => {
    const beads: BeadSnapshot[] = [
      { id: 'loose-7', value: 1, count: 7, sign: 1, role: 'normal', x: 40, y: 120 },
      { id: 'loose-3', value: 1, count: 3, sign: 1, role: 'normal', x: 260, y: 120 },
    ];

    expect(findMergeCluster(beads, 60)).toBeUndefined();
    expect(hasMergeableCount(beads)).toBe(true);
  });

  it('keeps the represented total separate from the body count', () => {
    expect(getTotalValue([{ value: 1, count: 6 }, { value: 1, count: 4 }, { value: 10 }])).toBe(20);
  });

  it('merges negative beads into a higher negative place value', () => {
    const beads: BeadSnapshot[] = Array.from({ length: 10 }, (_, index) => ({
      id: `minus-${index}`,
      value: 1,
      count: 1,
      sign: -1,
      role: 'normal',
      x: 100 + index,
      y: 100,
    }));

    const cluster = findMergeCluster(beads, 80);

    expect(cluster?.value).toBe(1);
    expect(cluster?.sign).toBe(-1);
    expect(cluster?.beadIds).toHaveLength(10);
    expect(hasMergeableCount(beads)).toBe(true);
    expect(getTotalValue(beads)).toBe(-10);
  });
});
