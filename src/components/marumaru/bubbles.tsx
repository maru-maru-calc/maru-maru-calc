// The bubbles: the ones waiting to be popped and the decorative ones drifting over the game.
import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, View } from 'react-native';

import { BeadView, BubbleNumberBadge } from '@/components/marumaru/beads';
import { useBoardScale } from '@/components/marumaru/board-viewport';
import { BACKGROUND_BUBBLE_TICK_MS, TAP_DRIFT_TO_BURST_THRESHOLD } from '@/components/marumaru/constants';
import {
  getEntityRadius,
  getMultiplierBubbleParts,
  getMultiplierClusterRadius,
  getSimpleBubbleStackPositions,
} from '@/components/marumaru/field-layout';
import { styles } from '@/components/marumaru/styles';
import type { BackgroundBubbleSpec, PendingBubble } from '@/components/marumaru/types';
import { HAS_WATER_TAPS, useWaterTaps } from '@/components/use-water-taps';
import { BeadSign } from '@/game/types';
import { useTick } from '@/game/use-tick';
import { a11yLabel } from '@/i18n/a11y-label';

export const NO_BACKGROUND_BUBBLES: BackgroundBubbleSpec[] = [];

/**
 * The decorative bubbles that drift up over the board.
 *
 * They are drawn in front of everything, but a press goes through them: a tap on an operator or on
 * a number bubble must reach it even while a decorative bubble is passing over it. A bubble pops
 * when plain water is tapped where it is (see `useWaterTaps`).
 */
export function BackgroundBubbleLayer({
  bubbles,
  fieldWidth,
  fieldHeight,
  bubbleStarts,
  onPop,
}: {
  bubbles: BackgroundBubbleSpec[];
  fieldWidth: number;
  fieldHeight: number;
  bubbleStarts: Record<string, number>;
  onPop: (bubbleId: string) => void;
}) {
  // The drift is drawn from this layer's own clock, so it never redraws the game around it.
  const tick = useTick(BACKGROUND_BUBBLE_TICK_MS, bubbles.length > 0);
  const layerRef = useRef<View>(null);
  useWaterTaps(layerRef, (x, y) => {
    // The one drawn last is the one on top.
    const tapped = [...bubbles].reverse().find((bubble) => {
      const place = getBackgroundBubblePlace(bubble, bubbleStarts[bubble.id] ?? 0, tick, fieldWidth, fieldHeight);
      const radius = bubble.size / 2;
      return Math.hypot(x - (place.x + radius), y - (place.y + radius)) <= radius;
    });
    if (tapped) {
      onPop(tapped.id);
    }
  });

  return (
    <View ref={layerRef} pointerEvents={HAS_WATER_TAPS ? 'none' : 'box-none'} style={styles.backgroundBubbleLayer}>
      {bubbles.map((bubble) => {
        const place = getBackgroundBubblePlace(bubble, bubbleStarts[bubble.id] ?? 0, tick, fieldWidth, fieldHeight);

        return (
          <Pressable
            key={bubble.id}
            accessibilityLabel={a11yLabel('decorative bubble')}
            accessibilityRole="button"
            focusable={false}
            tabIndex={-1}
            testID={`background-bubble-${bubble.id}`}
            onPress={() => onPop(bubble.id)}
            style={({ pressed }) => [
              styles.backgroundBubble,
              pressed && styles.backgroundBubblePressed,
              {
                left: place.x,
                top: place.y,
                width: bubble.size,
                height: bubble.size,
                borderRadius: bubble.size / 2,
                opacity: place.opacity * 0.78,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

/** Where a decorative bubble is at this moment: its top left corner, and how far it has faded in. */
function getBackgroundBubblePlace(bubble: BackgroundBubbleSpec, startAt: number, tick: number, fieldWidth: number, fieldHeight: number) {
  const elapsedSeconds = Math.max(0, (tick - startAt - bubble.delay) / 1000);
  const travel = fieldHeight + bubble.size * 3;
  const cycle = (elapsedSeconds * bubble.speed) % travel;
  const drift = Math.sin(elapsedSeconds * 0.62 + bubble.delay * 0.001) * bubble.drift;

  return {
    x: bubble.xRatio * fieldWidth + drift - bubble.size / 2,
    y: fieldHeight + bubble.size - cycle,
    opacity: elapsedSeconds < 0.24 ? elapsedSeconds / 0.24 : 1,
  };
}

export function DraggableBubbleView({
  bubble,
  sign,
  isMultiplier,
  isDivider,
  isHinting,
  onBurst,
  onMove,
}: {
  bubble: PendingBubble;
  sign: BeadSign;
  isMultiplier: boolean;
  isDivider: boolean;
  isHinting: boolean;
  onBurst: (bubble: PendingBubble) => void;
  onMove: (bubbleId: string, x: number, y: number) => void;
}) {
  const startPositionRef = useRef({ x: bubble.x, y: bubble.y });
  const boardScale = useBoardScale();
  const isOperatorBubble = isMultiplier || isDivider;
  const radius = isOperatorBubble ? getMultiplierClusterRadius(bubble.count) : getEntityRadius(1, bubble.count);
  // The handlers are made once per bubble and read whatever is current through this ref. They
  // used to be made again whenever the bubble moved, which threw away how far the finger had
  // travelled: a bubble that was carried stayed within a step of where it had been.
  const latestRef = useRef({ bubble, boardScale, onBurst, onMove });
  latestRef.current = { bubble, boardScale, onBurst, onMove };
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const { bubble: pressed } = latestRef.current;
          startPositionRef.current = { x: pressed.x, y: pressed.y };
        },
        onPanResponderMove: (_event, gesture) => {
          const latest = latestRef.current;
          // The finger's travel is in screen points; the board may be shown shrunk or enlarged.
          latest.onMove(latest.bubble.id, startPositionRef.current.x + gesture.dx / latest.boardScale, startPositionRef.current.y + gesture.dy / latest.boardScale);
        },
        onPanResponderRelease: () => {
          latestRef.current.onBurst(latestRef.current.bubble);
        },
        // The press is the bubble's until the finger is lifted: a page that scrolls a little under
        // it (a phone's address bar sliding away does that) is no reason to give it up.
        onPanResponderTerminationRequest: () => false,
        // A press can still be cut off from outside: the phone takes the touch for a gesture of
        // its own, or the page loses the screen. If the finger had not gone anywhere, it was a
        // press on this bubble all the same, and the bubble bursts. (It used to stay, with nothing
        // to show that the press had been lost.) A bubble that was being carried is left where it is.
        onPanResponderTerminate: (_event, gesture) => {
          if (Math.hypot(gesture.dx, gesture.dy) <= TAP_DRIFT_TO_BURST_THRESHOLD) {
            latestRef.current.onBurst(latestRef.current.bubble);
          }
        },
      }),
    [],
  );

  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={a11yLabel(`${isDivider ? 'divide' : isMultiplier ? 'multiply' : 'bubble'}-${bubble.count}`)}
      testID={`pending-bubble-${bubble.count}-${bubble.id}`}
      hitSlop={16}
      style={[
        styles.pendingBubbleButton,
        isOperatorBubble && styles.multiplierBubbleButton,
        {
          left: bubble.x - radius,
          top: bubble.y - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          transform: getPendingBubbleTransform(isOperatorBubble, isHinting),
        },
      ]}
      {...panResponder.panHandlers}
    >
      {isHinting ? <View pointerEvents="none" testID="pending-bubble-hint" style={styles.pendingBubbleHintRing} /> : null}
      {isOperatorBubble ? (
        <OperatorBubbleCluster count={bubble.count} sign={sign} radius={radius} operator={isDivider ? '÷' : '×'} />
      ) : (
        <BeadView value={1} count={bubble.count} sign={sign} x={radius} y={radius} isPreview />
      )}
    </View>
  );
}

function getPendingBubbleTransform(isOperatorBubble: boolean, isHinting: boolean) {
  const scale = isHinting ? 1.035 : 1;
  if (isOperatorBubble) {
    return [{ rotate: '-10deg' }, { scaleY: 0.92 }, { scale }];
  }
  return [{ scale }];
}

function OperatorBubbleCluster({ count, sign, radius, operator }: { count: number; sign: BeadSign; radius: number; operator: '×' | '÷' }) {
  const bubbles = getMultiplierBubbleParts(count);
  return (
    <View pointerEvents="none" style={styles.multiplierCluster}>
      {getSimpleBubbleStackPositions(bubbles, radius, operator).map(({ bubble, x, y, tilt }, index) => (
        <MiniWrappedBubble
          key={`multiplier-${index}`}
          sign={sign}
          left={x}
          top={y}
          radius={bubble.radius}
          tilt={tilt}
          state={operator === '÷' && index > 0 ? 'ghost' : operator === '÷' ? 'survivor' : 'solid'}
        />
      ))}
      <BubbleNumberBadge count={count} sign={sign} prefix={operator} />
    </View>
  );
}

function MiniWrappedBubble({
  sign,
  left,
  top,
  radius,
  tilt,
  state = 'solid',
}: {
  sign: BeadSign;
  left: number;
  top: number;
  radius: number;
  tilt: number;
  state?: 'solid' | 'survivor' | 'ghost';
}) {
  const isNegative = sign < 0;
  const isGhost = state === 'ghost';

  return (
    <View
      style={[
        styles.multiplierMiniBubble,
        state === 'survivor' && styles.divisionSurvivorMiniBubble,
        isGhost && styles.divisionGhostMiniBubble,
        isNegative && styles.multiplierMiniBubbleNegative,
        {
          left,
          top,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          transform: [{ rotate: `${tilt}deg` }],
        },
      ]}
    >
      <View style={[styles.miniBubbleInnerGlow, isGhost && styles.divisionGhostInnerGlow]} />
      {!isGhost ? <View style={styles.miniBubbleShine} /> : null}
      {!isGhost ? <View style={styles.miniBubbleLowerShine} /> : null}
    </View>
  );
}
