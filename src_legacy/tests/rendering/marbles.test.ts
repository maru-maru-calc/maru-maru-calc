import { describe, expect, it } from 'vitest';

import { getMarbleRenderSpec } from '@/rendering/marbles';

describe('marble render specs', () => {
  it('keeps the fixed fallback sizes for tests and non-window callers', () => {
    expect(getMarbleRenderSpec(1).size).toBe(32);
    expect(getMarbleRenderSpec(10).size).toBe(44);
    expect(getMarbleRenderSpec(100).size).toBe(56);
  });

  it('scales sizes from screen width while preserving digit order', () => {
    const one = getMarbleRenderSpec(1, 390);
    const ten = getMarbleRenderSpec(10, 390);
    const hundred = getMarbleRenderSpec(100, 390);

    expect(one.size).toBeLessThan(ten.size);
    expect(ten.size).toBeLessThan(hundred.size);
    expect(one.color).toBe('#2f80d8');
  });

  it('clamps very small and very large screens to usable radii', () => {
    expect(getMarbleRenderSpec(1, 200).radius).toBe(16);
    expect(getMarbleRenderSpec(1, 900).radius).toBe(22);
  });

  it('supports compact scale for secondary UI surfaces', () => {
    expect(getMarbleRenderSpec(10, 390, 0.7).size).toBeLessThan(getMarbleRenderSpec(10, 390).size);
  });
});
