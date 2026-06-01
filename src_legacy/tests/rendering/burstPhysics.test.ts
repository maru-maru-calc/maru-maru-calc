import { describe, expect, it } from 'vitest';

import { resolveBowlCollision, resolveParticleCollision } from '@/rendering/burstPhysics';

describe('burstPhysics', () => {
  it('reflects a particle back inside the bowl', () => {
    const particle = {
      id: 'a',
      value: 1 as const,
      x: 340,
      y: 320,
      vx: 120,
      vy: 220,
      size: 28,
      angle: 0,
      spin: 0,
    };

    resolveBowlCollision(particle, { cx: 160, cy: 180, rx: 120, ry: 90 });

    expect(particle.x).toBeLessThan(340);
    expect(particle.y).toBeLessThanOrEqual(320);
    expect(particle.vx).toBeLessThan(120);
  });

  it('separates overlapping particles', () => {
    const left = {
      id: 'a',
      value: 1 as const,
      x: 100,
      y: 100,
      vx: 0,
      vy: 0,
      size: 32,
      angle: 0,
      spin: 0,
    };
    const right = {
      id: 'b',
      value: 1 as const,
      x: 112,
      y: 100,
      vx: -40,
      vy: 0,
      size: 32,
      angle: 0,
      spin: 0,
    };

    resolveParticleCollision(left, right);

    expect(right.x).toBeGreaterThan(112);
    expect(left.x).toBeLessThan(100);
    expect(right.vx).toBeGreaterThan(-40);
  });
});
