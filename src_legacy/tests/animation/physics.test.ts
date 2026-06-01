import { describe, expect, it } from 'vitest';

import { getMotionScale, getPositionSpringConfig, getScaleSpringConfig } from '@/animation/physics';

describe('physics motion presets', () => {
  it('makes dragging slightly larger than selected and idle states', () => {
    expect(getMotionScale('idle')).toBe(1);
    expect(getMotionScale('selected')).toBe(1.03);
    expect(getMotionScale('hinted')).toBe(1.04);
    expect(getMotionScale('dropTarget')).toBe(1.05);
    expect(getMotionScale('blockedDropTarget')).toBe(1.03);
    expect(getMotionScale('dragging')).toBe(1.06);
  });

  it('uses heavier settling for merge motion than idle motion', () => {
    const idle = getPositionSpringConfig('idle');
    const merging = getPositionSpringConfig('merging');

    expect(merging.mass).toBeGreaterThan(idle.mass ?? 1);
    expect(merging.stiffness).toBeGreaterThan(idle.stiffness);
  });

  it('keeps the settled bounce spring distinct from normal scale changes', () => {
    expect(getScaleSpringConfig('settled').damping).toBeLessThan(getScaleSpringConfig('idle').damping);
  });
});
