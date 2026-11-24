// The sea behind the select screens: rising bubbles, sea creatures by depth, and the water getting darker.
import { memo, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Pressable, View } from 'react-native';

import { DEPTH_BUBBLE_TICK_MS, DEPTH_CREATURE_REACTION_MS } from '@/components/select/constants';
import { clamp } from '@/components/select/map-layout';
import { styles } from '@/components/select/styles';
import type { DepthBubbleSpec, DepthFishSpec } from '@/components/select/types';
import type { ValueStore } from '@/game/value-store';
import { a11yLabel } from '@/i18n/a11y-label';
import { usePrefersReducedMotion } from '@/layout/reduced-motion';

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

  useEffect(() => {
    if (prefersReducedMotion) {
      return undefined;
    }

    const interval = setInterval(() => setTick(Date.now()), DEPTH_BUBBLE_TICK_MS);
    return () => clearInterval(interval);
  }, [prefersReducedMotion]);

  return (
    <View pointerEvents="box-none" style={styles.depthBackdrop}>
      <View pointerEvents="none" style={[styles.softPatch, styles.softPatchLeft]} />
      <View pointerEvents="none" style={[styles.softPatch, styles.softPatchBottom]} />
      {bubbles.map((bubble) => {
        const startAt = bubbleStarts[bubble.id] ?? 0;
        const elapsedSeconds = Math.max(0, (tick - startAt - bubble.delay) / 1000);
        const travel = height + bubble.size * 5;
        const cycle = (elapsedSeconds * bubble.speed + scrollDepth * 0.58) % travel;
        const y = height + bubble.size - cycle;
        const drift = Math.sin(elapsedSeconds * 0.58 + bubble.delay * 0.001) * bubble.drift;
        const x = bubble.xRatio * width + drift - bubble.size / 2;
        const opacity = elapsedSeconds < 0.24 ? elapsedSeconds / 0.24 : 1;

        return (
          <Pressable
            key={bubble.id}
            accessibilityLabel={a11yLabel('decorative bubble')}
            accessibilityRole="button"
            focusable={false}
            tabIndex={-1}
            testID={`depth-background-bubble-${bubble.id}`}
            onPress={() => {
              onBubblePop?.();
              setBubbleStarts((current) => ({ ...current, [bubble.id]: Date.now() }));
            }}
            style={[
              styles.depthBackgroundBubble,
              {
                left: x,
                top: y,
                width: bubble.size,
                height: bubble.size,
                borderRadius: bubble.size / 2,
                opacity: opacity * 0.74,
              },
            ]}
          />
        );
      })}
      {fish.map((spec) => {
        const depthDistance = Math.abs(scrollDepth - spec.depth);
        if (depthDistance > 620 && spec.depth !== 0) {
          return null;
        }
        return (
          <DepthCreature
            key={spec.id}
            spec={spec}
            width={width}
            height={height}
            tick={tick}
            scrollDepth={scrollDepth}
            reactedAt={creatureStarts[spec.id]}
            onPress={() => {
              onCreaturePress?.();
              setCreatureStarts((current) => ({ ...current, [spec.id]: Date.now() }));
            }}
          />
        );
      })}
      <View pointerEvents="none" testID="depth-shade" style={[styles.depthShade, { opacity: shadeOpacity }]} />
    </View>
  );
}

function DepthCreature({
  spec,
  width,
  height,
  tick,
  scrollDepth,
  reactedAt,
  onPress,
}: {
  spec: DepthFishSpec;
  width: number;
  height: number;
  tick: number;
  scrollDepth: number;
  reactedAt?: number;
  onPress: () => void;
}) {
  const elapsedSeconds = Math.max(0, (tick - spec.delay) / 1000);
  const travelX = width + spec.size * 5;
  const travelY = height + spec.size * 4;
  const cycleX = (elapsedSeconds * spec.speed) % travelX;
  const cycleY = (elapsedSeconds * (spec.speed * 0.42) + scrollDepth * 0.48) % travelY;
  const x = spec.direction > 0 ? cycleX - spec.size * 2 : width - cycleX + spec.size;
  const y = height + spec.size - cycleY + Math.sin(elapsedSeconds * 0.7 + spec.depth * 0.01) * 10;
  const depthDistance = Math.abs(scrollDepth - spec.depth);
  const depthOpacity = Math.max(0, 1 - depthDistance / 520);
  const baseOpacity = spec.depth === 0 ? 0.26 : 0.36;
  const isAngler = spec.kind === 'angler';
  const isJelly = spec.kind === 'jelly';
  const isWhale = spec.kind === 'whale';
  const isFlatfish = spec.kind === 'flatfish';
  const isTall = spec.kind === 'seahorse' || spec.kind === 'squid' || spec.kind === 'turtle';
  const creatureHeight = isJelly ? spec.size * 0.9 : isWhale ? spec.size * 0.54 : isFlatfish ? spec.size * 0.62 : isTall ? spec.size * 0.86 : spec.size * 0.42;
  const reaction = getDepthCreatureReaction(spec, tick, reactedAt);

  return (
    <Pressable
      accessibilityLabel={a11yLabel(`sea creature ${spec.kind}`)}
      accessibilityRole="button"
      focusable={false}
      tabIndex={-1}
      hitSlop={18}
      onPress={onPress}
      testID={`depth-fish-${spec.id}`}
      style={[
        styles.depthFish,
        reaction.isReacting && styles.depthFishReacting,
        {
          left: x,
          top: y,
          width: spec.size,
          height: creatureHeight,
          opacity: Math.min(isAngler ? 0.9 : 0.76, baseOpacity + depthOpacity * 0.56),
          transform: [
            { translateX: reaction.translateX },
            { translateY: reaction.translateY },
            { scaleX: (spec.direction > 0 ? -1 : 1) * reaction.flipScale },
            { scale: reaction.scale },
            { rotate: reaction.rotate },
          ],
        },
      ]}
    >
      <DepthCreatureArt spec={spec} />
    </Pressable>
  );
}

/** The drawing of one sea creature. It only depends on which creature it is, so it is not redrawn as the creature swims. */
const DepthCreatureArt = memo(function DepthCreatureArt({ spec }: { spec: DepthFishSpec }) {
  const isAngler = spec.kind === 'angler';
  const isJelly = spec.kind === 'jelly';

  return (
    <>
      {isAngler ? <View style={[styles.anglerGlow, { width: spec.size * 1.45, height: spec.size * 1.45, borderRadius: spec.size, right: -spec.size * 0.9, top: -spec.size * 0.52 }]} /> : null}
      {isJelly ? (
        <>
          <View style={[styles.jellyBell, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={[styles.jellyTentacle, { left: '30%', height: spec.size * 0.44, backgroundColor: spec.tint }]} />
          <View style={[styles.jellyTentacle, { left: '50%', height: spec.size * 0.54, backgroundColor: spec.tint }]} />
          <View style={[styles.jellyTentacle, { left: '70%', height: spec.size * 0.4, backgroundColor: spec.tint }]} />
        </>
      ) : spec.kind === 'shark' ? (
        <>
          <View style={[styles.sharkBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={styles.creatureEye} />
          <View style={[styles.sharkNose, { borderLeftColor: spec.tint, borderTopWidth: spec.size * 0.11, borderBottomWidth: spec.size * 0.11, borderLeftWidth: spec.size * 0.18 }]} />
          <View style={[styles.sharkTail, { borderTopWidth: spec.size * 0.18, borderBottomWidth: spec.size * 0.18, borderRightWidth: spec.size * 0.22, borderRightColor: spec.tint }]} />
          <View style={[styles.sharkFin, { borderLeftWidth: spec.size * 0.16, borderRightWidth: spec.size * 0.16, borderBottomWidth: spec.size * 0.28, borderBottomColor: spec.tint }]} />
          <View style={[styles.sharkGill, { backgroundColor: 'rgba(224, 247, 255, 0.48)' }]} />
        </>
      ) : spec.kind === 'whale' ? (
        <>
          <View style={[styles.whaleBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={styles.whaleBelly} />
          <View style={[styles.whaleTailTop, { borderTopWidth: spec.size * 0.16, borderBottomWidth: spec.size * 0.08, borderRightWidth: spec.size * 0.24, borderRightColor: spec.tint }]} />
          <View style={[styles.whaleTailBottom, { borderTopWidth: spec.size * 0.08, borderBottomWidth: spec.size * 0.16, borderRightWidth: spec.size * 0.24, borderRightColor: spec.tint }]} />
          <View style={styles.whaleEye} />
        </>
      ) : spec.kind === 'flatfish' ? (
        <>
          <View style={[styles.flatfishBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={[styles.flatfishTail, { borderTopWidth: spec.size * 0.14, borderBottomWidth: spec.size * 0.14, borderRightWidth: spec.size * 0.18, borderRightColor: spec.tint }]} />
          <View style={styles.flatfishEyeOne} />
          <View style={styles.flatfishEyeTwo} />
          <View style={styles.flatfishSpotOne} />
          <View style={styles.flatfishSpotTwo} />
        </>
      ) : spec.kind === 'clownfish' ? (
        <>
          <View style={styles.clownfishBody} />
          <View style={[styles.clownfishStripe, { left: '20%' }]} />
          <View style={[styles.clownfishStripe, { left: '49%' }]} />
          <View style={styles.clownfishTail} />
          <View style={styles.clownfishFin} />
          <View style={styles.creatureEye} />
        </>
      ) : spec.kind === 'blueTang' ? (
        <>
          <View style={styles.blueTangBody} />
          <View style={styles.blueTangBlackMark} />
          <View style={styles.blueTangTail} />
          <View style={styles.blueTangFin} />
          <View style={styles.creatureEye} />
        </>
      ) : spec.kind === 'puffer' ? (
        <>
          <View style={styles.pufferBody} />
          <View style={styles.pufferMouth} />
          <View style={styles.pufferTail} />
          <View style={styles.pufferSpotOne} />
          <View style={styles.pufferSpotTwo} />
          <View style={styles.creatureEye} />
        </>
      ) : spec.kind === 'seahorse' ? (
        <>
          <View style={styles.seahorseBody} />
          <View style={styles.seahorseHead} />
          <View style={styles.seahorseSnout} />
          <View style={styles.seahorseTail} />
          <View style={styles.seahorseFin} />
          <View style={styles.seahorseEye} />
        </>
      ) : spec.kind === 'squid' ? (
        <>
          <View style={styles.squidHead} />
          <View style={styles.squidFinLeft} />
          <View style={styles.squidFinRight} />
          <View style={[styles.squidTentacle, { left: '27%' }]} />
          <View style={[styles.squidTentacle, { left: '43%' }]} />
          <View style={[styles.squidTentacle, { left: '59%' }]} />
          <View style={styles.squidEyeLeft} />
          <View style={styles.squidEyeRight} />
        </>
      ) : spec.kind === 'ray' ? (
        <>
          <View style={styles.rayBody} />
          <View style={styles.rayWingLeft} />
          <View style={styles.rayWingRight} />
          <View style={styles.rayTail} />
          <View style={styles.rayEyeLeft} />
          <View style={styles.rayEyeRight} />
        </>
      ) : spec.kind === 'turtle' ? (
        <>
          <View style={styles.turtleShell} />
          <View style={styles.turtleShellPattern} />
          <View style={styles.turtleHead} />
          <View style={styles.turtleFlipperFront} />
          <View style={styles.turtleFlipperBack} />
          <View style={styles.creatureEye} />
        </>
      ) : spec.kind === 'tuna' ? (
        <>
          <View style={[styles.tunaBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={styles.tunaLine} />
          <View style={[styles.tunaTail, { borderTopWidth: spec.size * 0.18, borderBottomWidth: spec.size * 0.18, borderRightWidth: spec.size * 0.24, borderRightColor: spec.tint }]} />
          <View style={[styles.tunaFin, { borderLeftWidth: spec.size * 0.12, borderRightWidth: spec.size * 0.12, borderBottomWidth: spec.size * 0.18, borderBottomColor: spec.tint }]} />
          <View style={styles.creatureEye} />
        </>
      ) : (
        <>
          <View style={[styles.depthFishBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View
            style={[
              styles.depthFishTail,
              {
                borderTopWidth: spec.size * 0.17,
                borderBottomWidth: spec.size * 0.17,
                borderRightWidth: spec.size * 0.24,
                borderRightColor: spec.tint,
                right: -spec.size * 0.08,
              },
            ]}
          />
          {isAngler ? <View style={[styles.anglerLight, { right: -spec.size * 0.46, top: -spec.size * 0.06 }]} /> : null}
        </>
      )}
    </>
  );
});

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
  const isDart = spec.kind === 'shark' || spec.kind === 'tuna' || spec.kind === 'clownfish' || spec.kind === 'blueTang' || spec.kind === 'fish';
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
    { id: 'shallow-clownfish', depth: 0, yRatio: 0.2, size: 42, speed: 8, delay: 0, direction: 1, tint: 'rgba(251, 146, 60, 0.58)', kind: 'clownfish' },
    { id: 'shallow-blue-tang', depth: 160, yRatio: 0.38, size: 46, speed: 7, delay: 1800, direction: -1, tint: 'rgba(96, 165, 250, 0.56)', kind: 'blueTang' },
    { id: 'shallow-puffer', depth: 300, yRatio: 0.24, size: 42, speed: 5, delay: 3200, direction: 1, tint: 'rgba(250, 204, 21, 0.56)', kind: 'puffer' },
    { id: 'shallow-turtle', depth: 430, yRatio: 0.43, size: 50, speed: 4, delay: 4700, direction: -1, tint: 'rgba(74, 222, 128, 0.5)', kind: 'turtle' },
    { id: 'middle-tuna', depth: 560, yRatio: 0.18, size: 50, speed: 10, delay: 3600, direction: 1, tint: 'rgba(56, 189, 248, 0.5)', kind: 'tuna' },
    { id: 'middle-flatfish', depth: 700, yRatio: 0.4, size: 42, speed: 5, delay: 2200, direction: -1, tint: 'rgba(94, 234, 212, 0.45)', kind: 'flatfish' },
    { id: 'middle-squid', depth: 840, yRatio: 0.5, size: 44, speed: 5, delay: 6200, direction: 1, tint: 'rgba(244, 114, 182, 0.48)', kind: 'squid' },
    { id: 'middle-shark', depth: 980, yRatio: 0.25, size: 62, speed: 7, delay: 1200, direction: -1, tint: 'rgba(125, 211, 252, 0.5)', kind: 'shark' },
    { id: 'deep-ray', depth: 1120, yRatio: 0.44, size: 60, speed: 4, delay: 7600, direction: 1, tint: 'rgba(196, 181, 253, 0.42)', kind: 'ray' },
    { id: 'deep-seahorse', depth: 1260, yRatio: 0.24, size: 42, speed: 3, delay: 6900, direction: -1, tint: 'rgba(253, 186, 116, 0.52)', kind: 'seahorse' },
    { id: 'deep-jelly', depth: 1400, yRatio: 0.5, size: 46, speed: 5, delay: 3400, direction: 1, tint: 'rgba(103, 232, 249, 0.42)', kind: 'jelly' },
    { id: 'deep-whale', depth: 1540, yRatio: 0.28, size: 82, speed: 3, delay: 5200, direction: 1, tint: 'rgba(125, 211, 252, 0.44)', kind: 'whale' },
    { id: 'deep-angler', depth: 1680, yRatio: 0.34, size: 54, speed: 4, delay: 3100, direction: -1, tint: 'rgba(94, 234, 212, 0.46)', kind: 'angler' },
  ];
}
