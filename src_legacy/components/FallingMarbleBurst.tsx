import { MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { NumberObjectView } from '@/components/NumberObjectView';
import { NumberObject } from '@/domain/math/types';
import { getMarbleRenderSpec } from '@/rendering/marbles';
import {
  BurstParticle,
  BowlBounds,
  resolveBowlCollision,
  resolveParticleCollision,
} from '@/rendering/burstPhysics';

type FallingMarbleBurstProps = {
  triggerId?: number;
  objects: NumberObject[];
  accessibleMode?: boolean;
  layout: { width: number; height: number };
};

const GRAVITY = 1850;
const AIR_DRAG = 0.996;
const SETTLE_SPEED = 14;
const SETTLE_FRAMES = 12;

export function FallingMarbleBurst({ triggerId, objects, accessibleMode, layout }: FallingMarbleBurstProps) {
  const particlesRef = useRef<BurstParticle[]>([]);
  const rafRef = useRef<number | undefined>(undefined);
  const settleFramesRef = useRef(0);
  const lastTriggerRef = useRef<number | undefined>(undefined);
  const [burstToken, setBurstToken] = useState(0);
  const [renderVersion, setRenderVersion] = useState(0);

  const ready = layout.width > 0 && layout.height > 0 && objects.length > 0;

  const initialParticles = useMemo(() => {
    if (!ready) {
      return [];
    }

    const centerX = layout.width / 2;
    const startY = layout.height * 0.16;

    return objects.map((object, index) => {
      const spec = getMarbleRenderSpec(object.value, layout.width, 0.72);
      const bias = stableUnit(object.id, index);
      const drift = stableUnit(object.id, index + 31);
      const spread = (bias - 0.5) * layout.width * 0.16;

      return {
        id: object.id,
        value: object.value,
        x: centerX + spread,
        y: startY + index * 1.5,
        vx: (drift - 0.5) * 160,
        vy: 10 + bias * 60,
        size: spec.size,
        angle: drift * 0.6,
        spin: (bias - 0.5) * 2.2,
      };
    });
  }, [layout.height, layout.width, objects, ready]);

  useEffect(() => {
    if (triggerId === undefined || !ready) {
      stopAnimation(rafRef);
      particlesRef.current = [];
      lastTriggerRef.current = triggerId;
      setRenderVersion((value) => value + 1);
      return;
    }

    if (lastTriggerRef.current === triggerId) {
      return;
    }

    lastTriggerRef.current = triggerId;
    settleFramesRef.current = 0;
    particlesRef.current = initialParticles;
    setBurstToken((value) => value + 1);
    setRenderVersion((value) => value + 1);
  }, [initialParticles, ready, triggerId]);

  useEffect(() => {
    if (triggerId === undefined || !ready || particlesRef.current.length === 0) {
      stopAnimation(rafRef);
      return;
    }

    let previousAt = performance.now();
    const bowl = createBowlBounds(layout);

    const tick = (now: number) => {
      const dt = Math.min((now - previousAt) / 1000, 0.032);
      previousAt = now;

      const nextParticles = particlesRef.current.map((particle) => ({ ...particle }));

      for (const particle of nextParticles) {
        particle.vy += GRAVITY * dt;
        particle.vx *= AIR_DRAG;
        particle.vy *= AIR_DRAG;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.angle += particle.spin * dt;
        resolveBowlCollision(particle, bowl);
      }

      for (let i = 0; i < nextParticles.length; i += 1) {
        for (let j = i + 1; j < nextParticles.length; j += 1) {
          resolveParticleCollision(nextParticles[i], nextParticles[j]);
        }
      }

      let active = false;
      for (const particle of nextParticles) {
        if (Math.abs(particle.vx) > SETTLE_SPEED || Math.abs(particle.vy) > SETTLE_SPEED) {
          active = true;
          break;
        }
      }

      particlesRef.current = nextParticles;
      setRenderVersion((value) => value + 1);

      if (active) {
        settleFramesRef.current = 0;
      } else {
        settleFramesRef.current += 1;
      }

      if (settleFramesRef.current >= SETTLE_FRAMES) {
        particlesRef.current = [];
        setRenderVersion((value) => value + 1);
        stopAnimation(rafRef);
        return;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => stopAnimation(rafRef);
  }, [burstToken, layout, ready, triggerId]);

  if (triggerId === undefined || !ready || particlesRef.current.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      {particlesRef.current.map((particle) => (
        <View
          key={particle.id}
          style={[
            styles.particle,
            {
              left: particle.x - particle.size / 2,
              top: particle.y - particle.size / 2,
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              transform: [{ rotate: `${particle.angle}rad` }],
              zIndex: Math.round(particle.y),
            },
          ]}
        >
          <NumberObjectView value={particle.value} accessibleMode={accessibleMode} sizeOverride={particle.size} />
        </View>
      ))}
      <View style={styles.bump} accessibilityElementsHidden>
        {renderVersion}
      </View>
    </View>
  );
}

function stopAnimation(rafRef: MutableRefObject<number | undefined>) {
  if (rafRef.current !== undefined) {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = undefined;
  }
}

function createBowlBounds(layout: { width: number; height: number }): BowlBounds {
  return {
    cx: layout.width / 2,
    cy: layout.height * 0.62,
    rx: layout.width * 0.38,
    ry: layout.height * 0.34,
  };
}

function stableUnit(id: string, salt: number) {
  const hash = `${id}:${salt}`.split('').reduce((value, character) => {
    return (value * 31 + character.charCodeAt(0)) % 997;
  }, 17);

  return hash / 996;
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 42,
  },
  particle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bump: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
