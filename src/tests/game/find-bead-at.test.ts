import { describe, expect, it } from 'vitest';

import { findBeadAt, getBeadHitRadius } from '@/components/marumaru/field-layout';
import type { BeadSnapshot } from '@/game/types';

const maru = (id: string, x: number, y: number, value: BeadSnapshot['value'] = 1, count = 1): BeadSnapshot => ({ id, value, count, sign: 1, role: 'normal', x, y });

describe('which maru a press means', () => {
  it('is the maru the press is on, however the maru were drawn', () => {
    // Three ones lying side by side, touching: each one's ring of 44 reaches over both neighbours.
    const row = [maru('a', 100, 300), maru('b', 128, 300), maru('c', 156, 300)];
    for (const order of [row, [...row].reverse(), [row[1], row[2], row[0]]]) {
      expect(findBeadAt(order, 100, 300)?.id).toBe('a');
      expect(findBeadAt(order, 128, 300)?.id).toBe('b');
      expect(findBeadAt(order, 156, 300)?.id).toBe('c');
      // Anywhere on a maru, not only its middle.
      expect(findBeadAt(order, 139, 304)?.id).toBe('b');
      expect(findBeadAt(order, 145, 296)?.id).toBe('c');
    }
  });

  it('is the maru whose rim is nearest when the press is beside them', () => {
    const row = [maru('a', 100, 300), maru('b', 128, 300)];
    // Above the row, nearer to b.
    expect(findBeadAt(row, 124, 270)?.id).toBe('b');
    expect(findBeadAt(row, 104, 270)?.id).toBe('a');
    // A ten is bigger: a press between it and a one, nearer to the one's rim, means the one.
    const mixed = [maru('ten', 100, 300, 10), maru('one', 150, 300)];
    expect(findBeadAt(mixed, 130, 300)?.id).toBe('one');
    expect(findBeadAt(mixed, 124, 300)?.id).toBe('ten');
  });

  it('reaches as far as a maru could be pressed before, and no further', () => {
    const one = maru('a', 100, 300);
    expect(getBeadHitRadius(one)).toBe(44);
    expect(findBeadAt([one], 143, 300)?.id).toBe('a');
    expect(findBeadAt([one], 145, 300)).toBe(undefined);
    // A wrapped group of nine is 61 in radius: 12 past its rim.
    const group = maru('g', 300, 300, 1, 9);
    expect(getBeadHitRadius(group)).toBe(73);
    expect(findBeadAt([group], 372, 300)?.id).toBe('g');
    expect(findBeadAt([group], 374, 300)).toBe(undefined);
    expect(findBeadAt([], 0, 0)).toBe(undefined);
  });

  it('takes the one drawn in front where two lie over each other, then the nearer middle', () => {
    // A one lying on a ten: ones are drawn in front.
    const pile = [maru('one', 108, 300), maru('ten', 100, 300, 10)];
    expect(findBeadAt(pile, 104, 300)?.id).toBe('one');
    expect(findBeadAt([...pile].reverse(), 104, 300)?.id).toBe('one');
    // Two ones over each other: the nearer middle.
    const twins = [maru('a', 100, 300), maru('b', 110, 300)];
    expect(findBeadAt(twins, 103, 300)?.id).toBe('a');
    expect(findBeadAt(twins, 108, 300)?.id).toBe('b');
  });

  it('means the maru beside a wrapped group when the press is on that maru', () => {
    // A group of five (radius 49) with a loose one touching it.
    const beads = [maru('group', 200, 300, 1, 5), maru('loose', 263, 300)];
    expect(findBeadAt(beads, 263, 300)?.id).toBe('loose');
    expect(findBeadAt(beads, 252, 300)?.id).toBe('loose');
    expect(findBeadAt(beads, 240, 300)?.id).toBe('group');
  });
});
