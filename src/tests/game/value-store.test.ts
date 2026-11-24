import { describe, expect, it } from 'vitest';

import { createValueStore } from '@/game/value-store';

describe('value store', () => {
  it('starts with the value it was given', () => {
    expect(createValueStore(12).get()).toBe(12);
  });

  it('keeps the new value and tells listeners', () => {
    const store = createValueStore(0);
    const seen: number[] = [];
    store.subscribe(() => seen.push(store.get()));

    store.set(40);
    store.set(85);

    expect(store.get()).toBe(85);
    expect(seen).toEqual([40, 85]);
  });

  it('stays quiet when the value did not change', () => {
    const store = createValueStore(7);
    let calls = 0;
    store.subscribe(() => {
      calls += 1;
    });

    store.set(7);
    store.set(7);

    expect(calls).toBe(0);
  });

  it('stops telling a listener that unsubscribed', () => {
    const store = createValueStore(0);
    let calls = 0;
    const unsubscribe = store.subscribe(() => {
      calls += 1;
    });

    store.set(1);
    unsubscribe();
    store.set(2);

    expect(calls).toBe(1);
    expect(store.get()).toBe(2);
  });

  it('lets a listener unsubscribe while listeners are being told', () => {
    const store = createValueStore(0);
    let secondCalls = 0;
    const unsubscribeFirst = store.subscribe(() => unsubscribeFirst());
    store.subscribe(() => {
      secondCalls += 1;
    });

    store.set(1);
    store.set(2);

    expect(secondCalls).toBe(2);
  });

  it('keeps separate stores apart', () => {
    const first = createValueStore(0);
    const second = createValueStore(0);
    first.set(5);

    expect(second.get()).toBe(0);
  });
});
