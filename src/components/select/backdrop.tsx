// The sea behind the select screens: rising bubbles, sea creatures by depth, and the water getting darker.
//
// It is two layers with the buttons of the screen between them. The creatures' pictures are in the
// back layer, so they swim behind the buttons and never cover a number. The bubbles and the shade
// of the deep water are in the front layer.
//
// A press goes through both layers: a tap on a button must reach it even while a bubble or a
// creature is passing over it. A bubble pops and a creature darts away when plain water is tapped
// where they are (see `useWaterTaps`).
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';

import { CreatureArt, getCreatureHeight } from '@/components/creature-art';
import { useStaysPut } from '@/components/marumaru/use-stays-put';
import { DEPTH_BUBBLE_TICK_MS, DEPTH_CREATURE_REACTION_MS } from '@/components/select/constants';
import { clamp } from '@/components/select/map-layout';
import { styles } from '@/components/select/styles';
import type { DepthBubbleSpec, DepthFishSpec } from '@/components/select/types';
import { HAS_WATER_TAPS, useWaterTaps } from '@/components/use-water-taps';
import type { ValueStore } from '@/game/value-store';
import { a11yLabel } from '@/i18n/a11y-label';
import { usePrefersReducedMotion } from '@/layout/reduced-motion';

// How far outside its picture a creature still takes a tap.
const CREATURE_TAP_SLOP = 18;

export function DepthBackdrop({
  width,
  height,
  scrollDepthStore,
  onBubblePop,
  onCreaturePress,
}: {
  width: number;
  height: number;
  scrollDepthStore: ValueStore<number>;
  onBubblePop?: () => void;
  onCreaturePress?: () => void;
}) {
  const scrollDepth = useSyncExternalStore(scrollDepthStore.subscribe, scrollDepthStore.get, scrollDepthStore.get);
  const prefersReducedMotion = usePrefersReducedMotion();
  const [tick, setTick] = useState(() => Date.now());
  const [bubbleStarts, setBubbleStarts] = useState<Record<string, number>>({});
  const [creatureStarts, setCreatureStarts] = useState<Record<string, number>>({});
  // The rising bubbles and swimming creatures are decoration, so they are left out when less motion is asked for.
  const bubbles = useMemo(() => (prefersReducedMotion ? [] : getDepthBubbleSpecs(width)), [prefersReducedMotion, width]);
  const fish = useMemo(() => (prefersReducedMotion ? [] : getDepthFishSpecs()), [prefersReducedMotion]);
  const shadeOpacity = Math.min(0.44, Math.max(0, scrollDepth / 1500) * 0.44);
  // Both layers hold bubbles and creatures that are past the edge of the screen. If either were
  // scrolled to bring one into view, the pictures and their press targets would no longer line up.
  const behindRef = useRef<View>(null);
  const frontRef = useRef<View>(null);
  useStaysPut(behindRef);
  useStaysPut(frontRef);

  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    const interval = setInterval(() => setTick(Date.now()), DEPTH_BUBBLE_TICK_MS);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  const creatures = fish.flatMap((spec) => {
    const placement = getDepthCreaturePlacement(spec, width, height, tick, scrollDepth, creatureStarts[spec.id]);
    return placement ? [{ spec, placement }] : [];
  });
  const popBubble = (bubbleId: string) => {
    onBubblePop?.();
    setBubbleStarts((current) => ({ ...current, [bubbleId]: Date.now() }));
  };
  const startleCreature = (creatureId: string) => {
    onCreaturePress?.();
    setCreatureStarts((current) => ({ ...current, [creatureId]: Date.now() }));
  };
  useWaterTaps(frontRef, (x, y) => {
    // A creature is small and moving, so a tap near it counts. The one drawn last is the one on top.
    const creature = [...creatures].reverse().find(({ placement }) => {
      const { left, top, width: creatureWidth, height: creatureHeight } = placement.box;
      return x >= left - CREATURE_TAP_SLOP && x <= left + creatureWidth + CREATURE_TAP_SLOP && y >= top - CREATURE_TAP_SLOP && y <= top + creatureHeight + CREATURE_TAP_SLOP;
    });
    if (creature) {
      startleCreature(creature.spec.id);
      return;
    }
    const bubble = [...bubbles].reverse().find((spec) => {
      const place = getDepthBubblePlace(spec, bubbleStarts[spec.id] ?? 0, tick, scrollDepth, width, height);
      const radius = spec.size / 2;
      return Math.hypot(x - (place.x + radius), y - (place.y + radius)) <= radius;
    });
    if (bubble) {
      popBubble(bubble.id);
    }
  });

  return (
    <>
      <View ref={behindRef} pointerEvents="none" style={styles.depthBackdropBehind}>
        {creatures.map(({ spec, placement }) => (
          <View key={spec.id} testID={`depth-creature-art-${spec.id}`} style={[styles.depthFish, placement.box, { opacity: placement.opacity }]}>
            <CreatureArt kind={spec.kind} width={spec.size} />
          </View>
        ))}
      </View>
      <View ref={frontRef} pointerEvents={HAS_WATER_TAPS ? 'none' : 'box-none'} style={styles.depthBackdrop}>
        <View pointerEvents="none" style={[styles.softPatch, styles.softPatchLeft]} />
        <View pointerEvents="none" style={[styles.softPatch, styles.softPatchBottom]} />
        {bubbles.map((bubble) => {
          const place = getDepthBubblePlace(bubble, bubbleStarts[bubble.id] ?? 0, tick, scrollDepth, width, height);

          return (
            <Pressable
              key={bubble.id}
              accessibilityLabel={a11yLabel('decorative bubble')}
              accessibilityRole="button"
              focusable={false}
              tabIndex={-1}
              testID={`depth-background-bubble-${bubble.id}`}
              onPress={() => popBubble(bubble.id)}
              style={[
                styles.depthBackgroundBubble,
                {
                  left: place.x,
                  top: place.y,
                  width: bubble.size,
                  height: bubble.size,
                  borderRadius: bubble.size / 2,
                  opacity: place.opacity * 0.74,
                },
              ]}
            />
          );
        })}
        {creatures.map(({ spec, placement }) => (
          <Pressable
            key={spec.id}
            accessibilityLabel={a11yLabel(`sea creature ${spec.kind}`)}
            accessibilityRole="button"
            focusable={false}
            tabIndex={-1}
            hitSlop={CREATURE_TAP_SLOP}
            onPress={() => startleCreature(spec.id)}
            testID={`depth-fish-${spec.id}`}
            style={[styles.depthFish, placement.box]}
          />
        ))}
        <View pointerEvents="none" testID="depth-shade" style={[styles.depthShade, { opacity: shadeOpacity }]} />
      </View>
    </>
  );
}

/** Where a rising bubble is at this moment: its top left corner, and how far it has faded in. */
function getDepthBubblePlace(bubble: DepthBubbleSpec, startAt: number, tick: number, scrollDepth: number, width: number, height: number) {
  const elapsedSeconds = Math.max(0, (tick - startAt - bubble.delay) / 1000);
  const travel = height + bubble.size * 5;
  const cycle = (elapsedSeconds * bubble.speed + scrollDepth * 0.58) % travel;
  const drift = Math.sin(elapsedSeconds * 0.58 + bubble.delay * 0.001) * bubble.drift;

  return {
    x: bubble.xRatio * width + drift - bubble.size / 2,
    y: height + bubble.size - cycle,
    opacity: elapsedSeconds < 0.24 ? elapsedSeconds / 0.24 : 1,
  };
}

/** Where a creature is at this moment, or nothing while it is too far above or below to be seen. */
function getDepthCreaturePlacement(spec: DepthFishSpec, width: number, height: number, tick: number, scrollDepth: number, reactedAt?: number) {
  const depthDistance = Math.abs(scrollDepth - spec.depth);
  if (depthDistance > 620 && spec.depth !== 0) {
    return null;
  }

  const elapsedSeconds = Math.max(0, (tick - spec.delay) / 1000);
  const travelX = width + spec.size * 5;
  const travelY = height + spec.size * 4;
  const cycleX = (elapsedSeconds * spec.speed) % travelX;
  const cycleY = (elapsedSeconds * (spec.speed * 0.42) + scrollDepth * 0.48) % travelY;
  const x = spec.direction > 0 ? cycleX - spec.size * 2 : width - cycleX + spec.size;
  const y = height + spec.size - cycleY + Math.sin(elapsedSeconds * 0.7 + spec.depth * 0.01) * 10;
  const depthOpacity = Math.max(0, 1 - depthDistance / 520);
  const baseOpacity = spec.depth === 0 ? 0.3 : 0.38;
  const reaction = getDepthCreatureReaction(spec, tick, reactedAt);

  return {
    opacity: Math.min(spec.kind === 'angler' ? 0.96 : 0.9, baseOpacity + depthOpacity * 0.6),
    // The picture and its press target share this, so the target stays on the creature while it darts away.
    box: {
      left: x,
      top: y,
      width: spec.size,
      height: getCreatureHeight(spec.kind, spec.size),
      transform: [
        { translateX: reaction.translateX },
        { translateY: reaction.translateY },
        { scaleX: (spec.direction > 0 ? -1 : 1) * reaction.flipScale },
        { scale: reaction.scale },
        { rotate: reaction.rotate },
      ],
    },
  };
}

function getDepthCreatureReaction(spec: DepthFishSpec, tick: number, reactedAt?: number) {
  if (!reactedAt) {
    return {
      flipScale: 1,
      isReacting: false,
      rotate: '0deg',
      scale: 1,
      translateX: 0,
      translateY: 0,
    };
  }

  const progress = clamp((tick - reactedAt) / DEPTH_CREATURE_REACTION_MS, 0, 1);
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const fadeBack = 1 - progress;
  const fleeDirection = spec.direction > 0 ? 1 : -1;
  const isPuff = spec.kind === 'puffer' || spec.kind === 'whale';
  const isDart = spec.kind === 'shark' || spec.kind === 'tuna' || spec.kind === 'clownfish' || spec.kind === 'blueTang';
  const isBob = spec.kind === 'seahorse' || spec.kind === 'squid' || spec.kind === 'jelly';
  const isDive = spec.kind === 'ray' || spec.kind === 'flatfish' || spec.kind === 'turtle' || spec.kind === 'angler';

  if (isPuff) {
    return {
      flipScale: 1,
      isReacting: progress < 1,
      rotate: `${Math.sin(progress * Math.PI * 4) * 4 * fadeBack}deg`,
      scale: 1 + Math.sin(progress * Math.PI) * 0.28,
      translateX: fleeDirection * easeOut * 10,
      translateY: -Math.sin(progress * Math.PI) * 6,
    };
  }

  if (isBob) {
    return {
      flipScale: 1,
      isReacting: progress < 1,
      rotate: `${Math.sin(progress * Math.PI * 5) * 8 * fadeBack}deg`,
      scale: 1 - Math.sin(progress * Math.PI) * 0.08,
      translateX: fleeDirection * Math.sin(progress * Math.PI) * 8,
      translateY: -Math.sin(progress * Math.PI) * 34,
    };
  }

  if (isDive) {
    return {
      flipScale: 1,
      isReacting: progress < 1,
      rotate: `${fleeDirection * Math.sin(progress * Math.PI) * -11}deg`,
      scale: 1 - Math.sin(progress * Math.PI) * 0.1,
      translateX: fleeDirection * easeOut * 20,
      translateY: easeOut * 42,
    };
  }

  return {
    flipScale: isDart && progress < 0.32 ? -1 : 1,
    isReacting: progress < 1,
    rotate: `${fleeDirection * Math.sin(progress * Math.PI) * 8 * fadeBack}deg`,
    scale: 1,
    translateX: fleeDirection * easeOut * 92,
    translateY: Math.sin(progress * Math.PI * 2) * 10 * fadeBack,
  };
}

function getDepthBubbleSpecs(width: number): DepthBubbleSpec[] {
  const wideOffset = width > 520 ? 0.04 : 0;
  return [
    { id: 'large-right', xRatio: 0.94 - wideOffset, size: 116, speed: 15, delay: 0, drift: 9 },
    { id: 'small-left', xRatio: 0.12 + wideOffset, size: 60, speed: 21, delay: 900, drift: 7 },
    { id: 'tiny-right', xRatio: 0.78, size: 30, speed: 18, delay: 1600, drift: 5 },
    { id: 'medium-right', xRatio: 0.84, size: 54, speed: 12, delay: 4100, drift: 8 },
    { id: 'soft-low-left', xRatio: 0.05 + wideOffset, size: 92, speed: 10, delay: 1700, drift: 7 },
    { id: 'soft-center-right', xRatio: 0.66, size: 36, speed: 14, delay: 6100, drift: 9 },
  ];
}

function getDepthFishSpecs(): DepthFishSpec[] {
  return [
    { id: 'shallow-clownfish', depth: 0, yRatio: 0.2, size: 46, speed: 8, delay: 0, direction: 1, kind: 'clownfish' },
    { id: 'shallow-blue-tang', depth: 160, yRatio: 0.38, size: 48, speed: 7, delay: 1800, direction: -1, kind: 'blueTang' },
    { id: 'shallow-puffer', depth: 300, yRatio: 0.24, size: 44, speed: 5, delay: 3200, direction: 1, kind: 'puffer' },
    { id: 'shallow-turtle', depth: 430, yRatio: 0.43, size: 56, speed: 4, delay: 4700, direction: -1, kind: 'turtle' },
    { id: 'middle-tuna', depth: 560, yRatio: 0.18, size: 60, speed: 10, delay: 3600, direction: 1, kind: 'tuna' },
    { id: 'middle-flatfish', depth: 700, yRatio: 0.4, size: 50, speed: 5, delay: 2200, direction: -1, kind: 'flatfish' },
    { id: 'middle-squid', depth: 840, yRatio: 0.5, size: 36, speed: 5, delay: 6200, direction: 1, kind: 'squid' },
    { id: 'middle-shark', depth: 980, yRatio: 0.25, size: 76, speed: 7, delay: 1200, direction: -1, kind: 'shark' },
    { id: 'deep-ray', depth: 1120, yRatio: 0.44, size: 70, speed: 4, delay: 7600, direction: 1, kind: 'ray' },
    { id: 'deep-seahorse', depth: 1260, yRatio: 0.24, size: 34, speed: 3, delay: 6900, direction: -1, kind: 'seahorse' },
    { id: 'deep-jelly', depth: 1400, yRatio: 0.5, size: 40, speed: 5, delay: 3400, direction: 1, kind: 'jelly' },
    { id: 'deep-whale', depth: 1540, yRatio: 0.28, size: 96, speed: 3, delay: 5200, direction: 1, kind: 'whale' },
    { id: 'deep-angler', depth: 1680, yRatio: 0.34, size: 60, speed: 4, delay: 3100, direction: -1, kind: 'angler' },
  ];
}
