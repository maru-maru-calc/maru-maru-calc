export type ValueStore<T> = {
  /** The current value. */
  get: () => T;
  /** Replaces the value. Listeners hear about it only if it really changed. */
  set: (next: T) => void;
  /** Calls `listener` whenever the value changes. Returns a function that stops the calls. */
  subscribe: (listener: () => void) => () => void;
};

/**
 * Holds one value outside React state.
 *
 * Use it for something that changes many times a second (how far a list is scrolled, say) when
 * only a small part of the screen cares: that part subscribes, and the rest is not drawn again.
 */
export function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) {
        return;
      }

      value = next;
      for (const listener of [...listeners]) {
        listener();
      }
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
