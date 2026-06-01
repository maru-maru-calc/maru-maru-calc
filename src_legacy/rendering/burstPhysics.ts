import { NumberObject } from '@/domain/math/types';

export type BurstParticle = {
  id: string;
  value: NumberObject['value'];
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  angle: number;
  spin: number;
};

export type BowlBounds = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
};

const RESTITUTION = 0.42;
const WALL_BOUNCE = 0.4;
const FLOOR_FRICTION = 0.92;
const PARTICLE_MARGIN = 4;

export function resolveBowlCollision(particle: BurstParticle, bowl: BowlBounds) {
  const dx = particle.x - bowl.cx;
  const dy = particle.y - bowl.cy;
  const norm = (dx * dx) / (bowl.rx * bowl.rx) + (dy * dy) / (bowl.ry * bowl.ry);

  if (norm <= 1) {
    return;
  }

  const scale = 1 / Math.sqrt(norm);
  const x = bowl.cx + dx * scale;
  const y = bowl.cy + dy * scale;
  const normalX = (x - bowl.cx) / (bowl.rx * bowl.rx);
  const normalY = (y - bowl.cy) / (bowl.ry * bowl.ry);
  const normalLength = Math.sqrt(normalX * normalX + normalY * normalY) || 1;
  const nx = normalX / normalLength;
  const ny = normalY / normalLength;
  const dot = particle.vx * nx + particle.vy * ny;

  particle.x = x;
  particle.y = y;
  particle.vx -= (1 + WALL_BOUNCE) * dot * nx;
  particle.vy -= (1 + WALL_BOUNCE) * dot * ny;

  if (Math.abs(ny) > 0.84 && particle.vy > 0) {
    particle.vy *= -FLOOR_FRICTION;
    particle.vx *= FLOOR_FRICTION;
  }
}

export function resolveParticleCollision(left: BurstParticle, right: BurstParticle) {
  const dx = right.x - left.x;
  const dy = right.y - left.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const minDistance = (left.size + right.size) / 2 + PARTICLE_MARGIN;

  if (distance === 0 || distance >= minDistance) {
    return;
  }

  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;

  left.x -= (nx * overlap) / 2;
  left.y -= (ny * overlap) / 2;
  right.x += (nx * overlap) / 2;
  right.y += (ny * overlap) / 2;

  const relativeVelocity = (right.vx - left.vx) * nx + (right.vy - left.vy) * ny;
  if (relativeVelocity > 0) {
    return;
  }

  const impulse = (-(1 + RESTITUTION) * relativeVelocity) / 2;
  left.vx -= impulse * nx;
  left.vy -= impulse * ny;
  right.vx += impulse * nx;
  right.vy += impulse * ny;
}

