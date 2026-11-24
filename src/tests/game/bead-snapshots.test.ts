import { describe, expect, it } from 'vitest';

import { createBeadFrameStore, keepSameMaru, keepSettledSnapshots, SETTLED_TOLERANCE_PX, snapToPixel } from '@/game/bead-snapshots';
import type { BeadSnapshot } from '@/game/types';

function bead(overrides: Partial<BeadSnapshot> = {}): BeadSnapshot {
  return { id: 'bead-1', value: 1, count: 1, sign: 1, role: 'normal', x: 100, y: 200, ...overrides };
}

describe('settled maru snapshots', () => {
  it('keeps the previous list when nothing moved', () => {
    const previous = [bead(), bead({ id: 'bead-2', x: 140 })];
    const next = [bead(), bead({ id: 'bead-2', x: 140 })];

    expect(keepSettledSnapshots(previous, next)).toBe(previous);
  });

  it('keeps the previous list for jitter too small to see', () => {
    const previous = [bead()];
    const next = [bead({ x: 100 + SETTLED_TOLERANCE_PX / 2, y: 200 - SETTLED_TOLERANCE_PX / 2 })];

    expect(keepSettledSnapshots(previous, next)).toBe(previous);
  });

  it('takes the new list once a maru has visibly moved', () => {
    const previous = [bead()];
    const movedSideways = [bead({ x: 100.2 })];
    const movedDown = [bead({ y: 200.2 })];

    expect(keepSettledSnapshots(previous, movedSideways)).toBe(movedSideways);
    expect(keepSettledSnapshots(previous, movedDown)).toBe(movedDown);
  });

  it('draws slow drift once it adds up, because it compares with what was last drawn', () => {
    const drawn = [bead()];
    let current = drawn;
    let redraws = 0;
    for (let frame = 1; frame <= 10; frame += 1) {
      const next = [bead({ x: 100 + frame * 0.02 })];
      const kept = keepSettledSnapshots(current, next);
      if (kept !== current) {
        redraws += 1;
        current = kept;
      }
    }

    expect(redraws).toBe(3);
  });

  it('takes the new list when a maru is added, removed or replaced', () => {
    const previous = [bead(), bead({ id: 'bead-2' })];
    const removed = [bead()];
    const added = [bead(), bead({ id: 'bead-2' }), bead({ id: 'bead-3' })];
    const replaced = [bead(), bead({ id: 'bead-9' })];

    expect(keepSettledSnapshots(previous, removed)).toBe(removed);
    expect(keepSettledSnapshots(previous, added)).toBe(added);
    expect(keepSettledSnapshots(previous, replaced)).toBe(replaced);
  });

  it('takes the new list when a maru changes what it is without moving', () => {
    const previous = [bead()];
    for (const changed of [bead({ value: 10 }), bead({ count: 2 }), bead({ sign: -1 }), bead({ role: 'product' })]) {
      const next = [changed];
      expect(keepSettledSnapshots(previous, next)).toBe(next);
    }
  });

  it('treats two empty boards as the same', () => {
    const previous: BeadSnapshot[] = [];

    expect(keepSettledSnapshots(previous, [])).toBe(previous);
  });
});

describe('same maru, wherever they are', () => {
  it('keeps the previous list when the maru only moved', () => {
    const previous = [bead(), bead({ id: 'bead-2', x: 140 })];
    const next = [bead({ x: 10, y: 900 }), bead({ id: 'bead-2', x: -300 })];

    expect(keepSameMaru(previous, next)).toBe(previous);
  });

  it('takes the new list when a maru is added, removed, replaced or changed', () => {
    const previous = [bead(), bead({ id: 'bead-2' })];
    for (const next of [
      [bead()],
      [bead(), bead({ id: 'bead-2' }), bead({ id: 'bead-3' })],
      [bead(), bead({ id: 'bead-9' })],
      [bead(), bead({ id: 'bead-2', value: 10 })],
      [bead(), bead({ id: 'bead-2', count: 3 })],
      [bead(), bead({ id: 'bead-2', sign: -1 })],
      [bead(), bead({ id: 'bead-2', role: 'product' })],
    ]) {
      expect(keepSameMaru(previous, next)).toBe(next);
    }
  });
});

describe('maru frame store', () => {
  it('starts empty', () => {
    expect(createBeadFrameStore().getSnapshot()).toEqual([]);
  });

  it('tells listeners when a maru appears or visibly moves', () => {
    const store = createBeadFrameStore();
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    const first = [bead()];
    store.publish(first);
    expect(calls).toBe(1);
    expect(store.getSnapshot()).toBe(first);

    const moved = [bead({ x: 130 })];
    store.publish(moved);
    expect(calls).toBe(2);
    expect(store.getSnapshot()).toBe(moved);
  });

  it('stays quiet, and keeps the same list, while the board rests', () => {
    const store = createBeadFrameStore();
    const first = [bead()];
    store.publish(first);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    for (let frame = 0; frame < 60; frame += 1) {
      store.publish([bead({ x: 100 + (frame % 2) * 0.01 })]);
    }

    expect(calls).toBe(0);
    expect(store.getSnapshot()).toBe(first);
  });

  it('stops telling a listener that unsubscribed', () => {
    const store = createBeadFrameStore();
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });
    store.publish([bead()]);
    unsubscribe();
    store.publish([bead({ x: 300 })]);

    expect(calls).toBe(1);
  });

  it('lets a listener unsubscribe while listeners are being told', () => {
    const store = createBeadFrameStore();
    let secondCalls = 0;
    const unsubscribeFirst = store.subscribe(() => unsubscribeFirst());
    store.subscribe(() => {
      secondCalls += 1;
    });
    store.publish([bead()]);
    store.publish([bead({ x: 300 })]);

    expect(secondCalls).toBe(2);
  });
});

describe('snapping to screen pixels', () => {
  it('rounds to whole pixels on an ordinary screen', () => {
    expect(snapToPixel(100.4, 1)).toBe(100);
    expect(snapToPixel(100.6, 1)).toBe(101);
    expect(snapToPixel(-3.4, 1)).toBe(-3);
  });

  it('keeps the finer steps a sharper screen can show', () => {
    expect(snapToPixel(100.2, 2)).toBe(100);
    expect(snapToPixel(100.3, 2)).toBe(100.5);
    expect(snapToPixel(10.3, 3)).toBeCloseTo(10 + 1 / 3, 10);
  });

  it('falls back to whole pixels when the screen does not say how sharp it is', () => {
    expect(snapToPixel(100.6, 0)).toBe(101);
    expect(snapToPixel(100.6, Number.NaN)).toBe(101);
  });

  it('turns sub-pixel sway into frames with nothing to draw', () => {
    const store = createBeadFrameStore();
    let draws = 0;
    store.subscribe(() => {
      draws += 1;
    });
    // One slow sway of 2.5 px over 180 frames, like a group of resting maru.
    for (let frame = 0; frame < 180; frame += 1) {
      const x = 100 + Math.sin((frame / 180) * Math.PI * 2) * 1.25;
      store.publish([bead({ x: snapToPixel(x, 1), y: snapToPixel(200, 1) })]);
    }

    expect(draws).toBe(5);
  });
});
