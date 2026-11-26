// Short-lived effects on the field: merges, bursts, division animations, fireworks and the failed look.
import { StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { BeadView } from '@/components/marumaru/beads';
import {
  BUBBLE_BURST_ANIMATION_MS,
  BUBBLE_BURST_DROP_COUNT,
  BUBBLE_BURST_SHARD_COUNT,
  DIVISION_FAILED_ANIMATION_MS,
  FAILED_VEIL_FADE_IN_MS,
  FEEDBACK_TICK_MS,
  MERGE_POP_PARTICLE_COUNT,
  MULTIPLICATION_EXPANSION_HOLD_MS,
  RESULT_TICK_MS,
} from '@/components/marumaru/constants';
import { clamp, getEntityRadius } from '@/components/marumaru/field-layout';
import { styles } from '@/components/marumaru/styles';
import type {
  BubbleBurstAnimation,
  DivisionFailedAnimation,
  DivisionSplitAnimation,
  MergeAnimation,
  MultiplicationExpansionAnimation,
} from '@/components/marumaru/types';
import { getBeadKind } from '@/game/beads';
import { useFrameTick, useTick, useTickUntil } from '@/game/use-tick';

export function MergePulse({ animation }: { animation: MergeAnimation }) {
  const nextKind = getBeadKind(animation.nextValue);
  const particles = Array.from({ length: MERGE_POP_PARTICLE_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 10;
    const distance = nextKind.radius + 22 + (index % 2) * 8;
    const size = index % 3 === 0 ? 9 : 6;
    return {
      id: `merge-pop-${index}`,
      left: animation.center.x + Math.cos(angle) * distance - size / 2,
      top: animation.center.y + Math.sin(angle) * distance - size / 2,
      size,
      opacity: index % 2 === 0 ? 0.78 : 0.52,
    };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.mergeSettleGlow,
          {
            left: animation.center.x - nextKind.radius - 12,
            top: animation.center.y - nextKind.radius - 12,
            width: (nextKind.radius + 12) * 2,
            height: (nextKind.radius + 12) * 2,
            borderRadius: nextKind.radius + 12,
            borderColor: nextKind.rimColor,
          },
        ]}
      />
      <View
        style={[
          styles.mergePulse,
          {
            left: animation.center.x - nextKind.radius - 20,
            top: animation.center.y - nextKind.radius - 20,
            width: (nextKind.radius + 20) * 2,
            height: (nextKind.radius + 20) * 2,
            borderRadius: nextKind.radius + 20,
            borderColor: nextKind.rimColor,
            backgroundColor: nextKind.shineColor,
          },
          ]}
      />
      <View
        style={[
          styles.mergeSettleCore,
          {
            left: animation.center.x - nextKind.radius * 0.54,
            top: animation.center.y - nextKind.radius * 0.54,
            width: nextKind.radius * 1.08,
            height: nextKind.radius * 1.08,
            borderRadius: nextKind.radius,
            backgroundColor: nextKind.shineColor,
          },
        ]}
      />
      {particles.map((particle) => (
        <View
          key={particle.id}
          style={[
            styles.mergePopParticle,
            {
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              opacity: particle.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

/** How far the "try again" look has faded in: 0 when the stage has just failed, 1 once it is fully there. */
export function getFailedProgress(now: number, failedAt?: number) {
  return failedAt ? clamp((now - failedAt) / FAILED_VEIL_FADE_IN_MS, 0, 1) : 0;
}

/** A clock for the fade-in after a failed stage. It stops by itself when the fade is done. */
function useFailedProgress(failedAt?: number) {
  const tick = useTickUntil(RESULT_TICK_MS, (failedAt ?? 0) + FAILED_VEIL_FADE_IN_MS);
  return getFailedProgress(tick, failedAt);
}

export function FailedScreenVeil({ failedAt }: { failedAt?: number }) {
  const progress = useFailedProgress(failedAt);
  return <View pointerEvents="none" style={[styles.failedScreenVeil, { opacity: progress }]} />;
}

export function FailedWaterOverlay({ failedAt }: { failedAt?: number }) {
  const progress = useFailedProgress(failedAt);
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.failedWaterOverlay, { opacity: progress }]}>
      <View style={[styles.failedSiltCloud, styles.failedSiltCloudLeft]} />
      <View style={[styles.failedSiltCloud, styles.failedSiltCloudCenter]} />
      <View style={[styles.failedSiltCloud, styles.failedSiltCloudRight]} />
      <View style={[styles.failedDeflatedBubble, styles.failedDeflatedBubbleOne]} />
      <View style={[styles.failedDeflatedBubble, styles.failedDeflatedBubbleTwo]} />
      <View style={[styles.failedDeflatedBubble, styles.failedDeflatedBubbleThree]} />
    </View>
  );
}

export function MultiplicationExpansionOverlay({ animation }: { animation: MultiplicationExpansionAnimation }) {
  const age = useFrameTick() - animation.startedAt;
  const settleProgress = clamp(age / MULTIPLICATION_EXPANSION_HOLD_MS, 0, 1);
  const scale = 0.92 + settleProgress * 0.08;
  const opacity = clamp(age / 180, 0, 1) * (1 - clamp((age - MULTIPLICATION_EXPANSION_HOLD_MS + 220) / 220, 0, 0.18));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {animation.groups.map((group, index) => (
        <View
          key={`${animation.id}-${index}`}
          style={[
            styles.multiplicationExpansionBubble,
            {
              left: group.x,
              top: group.y,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <BeadView value={1} count={group.count} sign={group.sign} x={0} y={0} role="product" isPreview />
        </View>
      ))}
    </View>
  );
}

export function BubbleBurst({ animation }: { animation: BubbleBurstAnimation }) {
  const progress = clamp((useFrameTick() - animation.startedAt) / BUBBLE_BURST_ANIMATION_MS, 0, 1);
  const fade = 1 - progress;
  const ringRadius = animation.radius + 3 + progress * 8;
  const innerRingRadius = animation.radius * 0.58 + progress * 4;
  const isNegative = animation.sign < 0;
  const drops = Array.from({ length: BUBBLE_BURST_DROP_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / BUBBLE_BURST_DROP_COUNT;
    const distance = animation.radius + 7 + progress * (10 + (index % 3) * 3);
    const size = 4 + (index % 3);
    return {
      id: `drop-${index}`,
      left: animation.x + Math.cos(angle) * distance - size / 2,
      top: animation.y + Math.sin(angle) * distance - size / 2,
      size,
      opacity: fade * (index % 2 === 0 ? 0.58 : 0.34),
    };
  });
  const shards = Array.from({ length: BUBBLE_BURST_SHARD_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * (index + 0.35)) / BUBBLE_BURST_SHARD_COUNT;
    const distance = animation.radius * 0.72 + progress * 10;
    return {
      id: `shard-${index}`,
      left: animation.x + Math.cos(angle) * distance - 7,
      top: animation.y + Math.sin(angle) * distance - 2,
      rotate: `${angle + Math.PI / 2}rad`,
      opacity: fade * 0.42,
    };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.bubbleBurstRing,
          isNegative && styles.bubbleBurstRingNegative,
          {
            left: animation.x - ringRadius,
            top: animation.y - ringRadius,
            width: ringRadius * 2,
            height: ringRadius * 2,
            borderRadius: ringRadius,
            opacity: fade * 0.62,
          },
        ]}
      />
      <View
        style={[
          styles.bubbleBurstInnerRing,
          {
            left: animation.x - innerRingRadius,
            top: animation.y - innerRingRadius,
            width: innerRingRadius * 2,
            height: innerRingRadius * 2,
            borderRadius: innerRingRadius,
            opacity: fade * 0.42,
          },
        ]}
      />
      {drops.map((drop) => (
        <View
          key={drop.id}
          style={[
            styles.bubbleBurstDrop,
            isNegative && styles.bubbleBurstDropNegative,
            {
              left: drop.left,
              top: drop.top,
              width: drop.size,
              height: drop.size,
              borderRadius: drop.size / 2,
              opacity: drop.opacity,
            },
          ]}
        />
      ))}
      {shards.map((shard) => (
        <View
          key={shard.id}
          style={[
            styles.bubbleBurstShard,
            {
              left: shard.left,
              top: shard.top,
              opacity: shard.opacity,
              transform: [{ rotate: shard.rotate }],
            },
          ]}
        />
      ))}
    </View>
  );
}

export function DivisionSplitOverlay({ animation }: { animation: DivisionSplitAnimation }) {
  const radius = getEntityRadius(1, animation.quotient);
  const spread = Math.min(86, Math.max(42, radius * 1.15));
  const fadeProgress = clamp((animation.progress - 0.18) / 0.72, 0, 1);
  const parts = Array.from({ length: animation.divisor }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(animation.divisor, 1);
    const startX = animation.center.x + Math.cos(angle) * spread;
    const startY = animation.center.y + Math.sin(angle) * spread * 0.58;
    const isSurvivor = index === 0;
    const settleProgress = isSurvivor ? clamp(animation.progress / 0.72, 0, 1) : 0;
    const evaporateY = isSurvivor ? 0 : fadeProgress * 42;
    return {
      id: `${animation.id}-${index}`,
      x: startX + (animation.center.x - startX) * settleProgress,
      y: startY + (animation.center.y - startY) * settleProgress - evaporateY,
      opacity: isSurvivor ? 0.92 - fadeProgress * 0.18 : 0.78 * (1 - fadeProgress),
      scale: isSurvivor ? 1 - fadeProgress * 0.04 : 1 + fadeProgress * 0.12,
      isSurvivor,
    };
  });

  return (
    <View pointerEvents="none" testID="division-split-overlay" style={StyleSheet.absoluteFill}>
      {parts.map((part) => (
        <View
          key={part.id}
          testID={part.isSurvivor ? 'division-split-survivor' : 'division-split-discard'}
          style={[
            styles.divisionSplitPart,
            {
              left: part.x - radius,
              top: part.y - radius,
              width: radius * 2,
              height: radius * 2,
              opacity: part.opacity,
              transform: [{ scale: part.scale }],
              zIndex: part.isSurvivor ? 12 : 11,
            },
          ]}
        >
          <BeadView value={1} count={animation.quotient} sign={animation.sign} role="division" x={radius} y={radius} isPreview />
        </View>
      ))}
    </View>
  );
}

export function DivisionFailedOverlay({ animation }: { animation: DivisionFailedAnimation }) {
  const age = useTick(FEEDBACK_TICK_MS) - animation.startedAt;
  const progress = clamp(age / DIVISION_FAILED_ANIMATION_MS, 0, 1);
  const showProgress = clamp(progress / 0.34, 0, 1);
  const rejectProgress = clamp((progress - 0.46) / 0.42, 0, 1);
  const fade = 1 - clamp((progress - 0.72) / 0.28, 0, 1);
  const wobble = Math.sin(progress * Math.PI * 8) * (1 - rejectProgress) * 5;
  const ringRadius = 22;
  const spread = Math.min(82, Math.max(48, animation.divisor * 12));
  const quotient = Math.max(1, animation.quotient);
  const remainder = Math.max(1, animation.remainder);

  const slots = Array.from({ length: Math.min(animation.divisor, 8) }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(Math.min(animation.divisor, 8), 1);
    const targetX = animation.center.x + Math.cos(angle) * spread;
    const targetY = animation.center.y + Math.sin(angle) * spread * 0.58;
    return {
      id: `failed-slot-${index}`,
      x: animation.center.x + (targetX - animation.center.x) * showProgress + wobble,
      y: animation.center.y + (targetY - animation.center.y) * showProgress,
    };
  });

  const remainderX = animation.center.x + spread * 0.72 + rejectProgress * 22;
  const remainderY = animation.center.y + spread * 0.52 + rejectProgress * 8;

  return (
    <View pointerEvents="none" testID="division-failed-overlay" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      {slots.map((slot) => (
        <View
          key={slot.id}
          style={[
            styles.divisionFailedSlot,
            {
              left: slot.x - ringRadius,
              top: slot.y - ringRadius,
              width: ringRadius * 2,
              height: ringRadius * 2,
              borderRadius: ringRadius,
              transform: [{ scale: 0.86 + showProgress * 0.14 }],
            },
          ]}
        >
          {animation.quotient > 0 ? <BeadView value={1} count={quotient} sign={animation.sign} role="division" x={ringRadius} y={ringRadius} isPreview /> : null}
        </View>
      ))}
      <View
        style={[
          styles.divisionFailedRemainder,
          {
            left: remainderX - ringRadius,
            top: remainderY - ringRadius,
            width: ringRadius * 2,
            height: ringRadius * 2,
            borderRadius: ringRadius,
            transform: [{ scale: 1 + rejectProgress * 0.08 }],
          },
        ]}
      >
        <BeadView value={1} count={remainder} sign={animation.sign} x={ringRadius} y={ringRadius} isPreview />
      </View>
    </View>
  );
}

export function ClearBubbleFireworks({ fieldWidth, fieldHeight }: { fieldWidth: number; fieldHeight: number }) {
  const tick = useTick(RESULT_TICK_MS);
  const cycle = 2600;
  const baseTime = tick % cycle;
  const burstSpecs = [
    { x: fieldWidth * 0.5, y: fieldHeight * 0.42, delay: 0, count: 10, spread: 92 },
    { x: fieldWidth * 0.28, y: fieldHeight * 0.5, delay: 460, count: 8, spread: 72 },
    { x: fieldWidth * 0.72, y: fieldHeight * 0.46, delay: 920, count: 8, spread: 78 },
  ];
  const colors = [
    'rgba(14, 165, 233, 0.88)',
    'rgba(6, 182, 212, 0.84)',
    'rgba(34, 197, 94, 0.78)',
    'rgba(234, 179, 8, 0.76)',
    'rgba(236, 72, 153, 0.76)',
  ];
  const bubbles = burstSpecs.flatMap((burst, burstIndex) => {
    const age = (baseTime - burst.delay + cycle) % cycle;
    const progress = Math.min(age / 900, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const opacity = progress >= 1 ? 0 : Math.max(0, 1 - progress) * 1;

    return Array.from({ length: burst.count }, (_, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / burst.count;
      const ripple = 0.78 + (index % 5) * 0.08;
      const distance = burst.spread * ease * ripple;
      const size = 7 + (index % 4) * 3 + (1 - progress) * 3;
      const rise = progress * (18 + (index % 6) * 5);
      return {
        id: `clear-firework-${burstIndex}-${index}`,
        x: burst.x + Math.cos(angle) * distance - size / 2,
        y: burst.y + Math.sin(angle) * distance - rise - size / 2,
        size,
        opacity,
        color: colors[(burstIndex + index) % colors.length],
      };
    });
  });
  const starfish = burstSpecs.slice(0, 3).map((burst, index) => {
    const age = (baseTime - burst.delay - 160 + cycle) % cycle;
    const progress = Math.min(age / 1200, 1);
    const opacity = progress >= 1 ? 0 : Math.max(0, 1 - progress) * 0.78;
    const drift = 26 + index * 18;
    return {
      id: `clear-starfish-${index}`,
      x: burst.x + Math.cos(index * 2.1) * drift,
      y: burst.y + Math.sin(index * 1.7) * drift - progress * 34,
      rotate: -16 + index * 18,
      opacity,
    };
  });

  return (
    <View pointerEvents="none" style={styles.clearFireworkLayer}>
      {bubbles.map((bubble) => (
        <View
          key={bubble.id}
          style={[
            styles.clearFireworkBubble,
            {
              left: bubble.x,
              top: bubble.y,
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.size / 2,
              opacity: bubble.opacity,
              backgroundColor: bubble.color,
            },
          ]}
        />
      ))}
      {starfish.map((item) => (
        <RoundedStarfish
          key={item.id}
          size={22}
          style={[
            styles.clearFireworkStarfish,
            {
              left: item.x,
              top: item.y,
              opacity: item.opacity,
              transform: [{ rotate: `${item.rotate}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

/** The starfish that drifts up over a solved stage: five rounded arms around a pale middle. */
export function RoundedStarfish({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const armWidth = size * 0.34;
  const armHeight = size * 0.5;
  const center = size / 2;
  const armRadius = size * 0.23;
  const dotSize = size * 0.12;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = -90 + index * 72;
        const radians = (angle * Math.PI) / 180;
        return (
          <View
            key={index}
            style={[
              styles.roundedStarfishArm,
              {
                width: armWidth,
                height: armHeight,
                borderRadius: armWidth,
                left: center + Math.cos(radians) * armRadius - armWidth / 2,
                top: center + Math.sin(radians) * armRadius - armHeight / 2,
                transform: [{ rotate: `${angle + 90}deg` }],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.roundedStarfishCenter,
          {
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: size * 0.21,
            left: center - size * 0.21,
            top: center - size * 0.21,
          },
        ]}
      />
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.roundedStarfishDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              left: center + Math.cos((-72 + index * 72) * (Math.PI / 180)) * (size * 0.18) - dotSize / 2,
              top: center + Math.sin((-72 + index * 72) * (Math.PI / 180)) * (size * 0.18) - dotSize / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}
