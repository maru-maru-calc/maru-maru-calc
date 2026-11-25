// The bubbles: the ones waiting to be popped and the decorative ones drifting behind the game.
import { useMemo, useRef } from 'react';
import { PanResponder, Pressable, View } from 'react-native';

import { BeadView, BubbleNumberBadge } from '@/components/marumaru/beads';
import { useBoardScale } from '@/components/marumaru/board-viewport';
import { BACKGROUND_BUBBLE_TICK_MS } from '@/components/marumaru/constants';
import {
  getEntityRadius,
  getMultiplierBubbleParts,
  getMultiplierClusterRadius,
  getSimpleBubbleStackPositions,
} from '@/components/marumaru/field-layout';
import { styles } from '@/components/marumaru/styles';
import type { BackgroundBubbleSpec, PendingBubble } from '@/components/marumaru/types';
import { BeadSign } from '@/game/types';
import { useTick } from '@/game/use-tick';
import { a11yLabel } from '@/i18n/a11y-label';

export const NO_BACKGROUND_BUBBLES: BackgroundBubbleSpec[] = [];

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
  return (
    <View pointerEvents="box-none" style={styles.backgroundBubbleLayer}>
      {bubbles.map((bubble) => {
        const startAt = bubbleStarts[bubble.id] ?? 0;
        const elapsedSeconds = Math.max(0, (tick - startAt - bubble.delay) / 1000);
        const travel = fieldHeight + bubble.size * 3;
        const cycle = (elapsedSeconds * bubble.speed) % travel;
        const y = fieldHeight + bubble.size - cycle;
        const drift = Math.sin(elapsedSeconds * 0.62 + bubble.delay * 0.001) * bubble.drift;
        const x = bubble.xRatio * fieldWidth + drift - bubble.size / 2;
        const opacity = elapsedSeconds < 0.24 ? elapsedSeconds / 0.24 : 1;

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
                left: x,
                top: y,
                width: bubble.size,
                height: bubble.size,
                borderRadius: bubble.size / 2,
                opacity: opacity * 0.78,
              },
            ]}
          />
        );
      })}
    </View>
  );
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
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startPositionRef.current = { x: bubble.x, y: bubble.y };
        },
        onPanResponderMove: (_event, gesture) => {
          onMove(bubble.id, startPositionRef.current.x + gesture.dx / boardScale, startPositionRef.current.y + gesture.dy / boardScale);
        },
        onPanResponderRelease: () => {
          onBurst(bubble);
        },
      }),
    [boardScale, bubble, onBurst, onMove],
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
