// The maru themselves, the layer that draws them, and the tray they sit in.
import { memo, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { MIN_TOUCH_TARGET_SIZE, TAP_DRIFT_TO_BURST_THRESHOLD } from '@/components/marumaru/constants';
import {
  getBasinFrameSegments,
  getBeadLayerOpacity,
  getBeadLayerZIndex,
  getContainedBeadParts,
  getContainedBeadPositions,
  getEntityRadius,
  getSignedPalette,
  getTranslucentBeadColor,
} from '@/components/marumaru/field-layout';
import { canBurstBead, findAlmostMergeBeadIds } from '@/components/marumaru/field-physics';
import { styles } from '@/components/marumaru/styles';
import type { BeadFrameStore } from '@/game/bead-snapshots';
import { getBeadKind } from '@/game/beads';
import { getDisplayBeadsForPendingPriorityExpression } from '@/game/expression';
import { BeadRole, BeadSign, BeadSnapshot, PlaceValue } from '@/game/types';
import { a11yLabel } from '@/i18n/a11y-label';

// Its look depends only on what the maru is, so a maru that merely moves is not drawn again inside.
export const BeadView = memo(function BeadView({
  value,
  count,
  sign,
  role = 'normal',
  x,
  y,
  isPreview = false,
  isFocused = false,
  isAlmostMerge = false,
}: {
  value: PlaceValue;
  count: number;
  sign: BeadSign;
  role?: BeadRole;
  x: number;
  y: number;
  isPreview?: boolean;
  isFocused?: boolean;
  isAlmostMerge?: boolean;
}) {
  const kind = getBeadKind(value);
  const palette = getSignedPalette(kind, sign);
  const radius = getEntityRadius(value, count);
  const isGroupBubble = value === 1 && count > 1;
  const containedBeads = isGroupBubble ? getContainedBeadParts(count) : [];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.bead,
        isFocused && styles.focusedBead,
        isAlmostMerge && styles.almostMergeBead,
        isGroupBubble && styles.groupBubble,
        role === 'product' && styles.productBubble,
        role === 'multiplicand' && styles.multiplicandBubble,
        role === 'division' && styles.divisionBubble,
        {
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor: isGroupBubble ? (sign < 0 ? 'rgba(75, 91, 119, 0.3)' : 'rgba(215, 246, 255, 0.36)') : getTranslucentBeadColor(value, palette.color),
          borderColor: isGroupBubble ? (sign < 0 ? '#51627D' : '#8ED8EF') : palette.rimColor,
          left: x - radius,
          top: y - radius,
          opacity: isPreview ? 0.86 : getBeadLayerOpacity(value),
        },
      ]}
    >
      {isGroupBubble ? (
        <>
          <View style={styles.bubbleInnerGlow} />
          <View style={styles.bubbleShine} />
          <View style={styles.bubbleSmallShine} />
          {getContainedBeadPositions(containedBeads, radius).map(({ bead, x: beadX, y: beadY }, index) => {
            const beadKind = getBeadKind(bead.value);
            const beadPalette = getSignedPalette(beadKind, sign);
            return (
            <View
              key={`${count}-${index}`}
              style={[
                styles.containedBead,
                {
                  left: beadX,
                  top: beadY,
                  width: bead.radius * 2,
                  height: bead.radius * 2,
                  borderRadius: bead.radius,
                  backgroundColor: getTranslucentBeadColor(bead.value, beadPalette.color),
                  borderColor: beadPalette.rimColor,
                },
              ]}
            >
            </View>
            );
          })}
          {count > 1 ? <BubbleNumberBadge count={count} sign={sign} /> : null}
        </>
      ) : (
        <>
          <View style={styles.beadInnerGlass} />
          <View
            style={[
              styles.beadShine,
              {
                width: Math.max(8, kind.radius * 0.58),
                height: Math.max(8, kind.radius * 0.58),
                borderRadius: kind.radius,
                backgroundColor: palette.shineColor,
              },
            ]}
          />
        </>
      )}
    </View>
  );
});

export function BubbleNumberBadge({ count, sign = 1, prefix = '' }: { count: number; sign?: BeadSign; prefix?: string }) {
  const signPrefix = sign < 0 ? '-' : '';
  return (
    <View style={styles.bubbleNumberBadge}>
      <Text style={styles.bubbleNumberBadgeText}>
        {prefix}
        {signPrefix}
        {count}
      </Text>
    </View>
  );
}

/** The tray the maru sit in. It only depends on the size of the field, so it is drawn once. */
export const BasinFrame = memo(function BasinFrame({ segments }: { segments: ReturnType<typeof getBasinFrameSegments> }) {
  return (
    <>
      {segments.map((segment) => (
        <View
          key={`${segment.id}-tray`}
          pointerEvents="none"
          style={[
            styles.basinTraySegment,
            {
              left: segment.x,
              top: segment.y + 3,
              width: segment.length + 4,
              transform: [{ rotate: `${segment.angle}rad` }],
            },
          ]}
        />
      ))}
      {segments.map((segment) => (
        <View
          key={segment.id}
          pointerEvents="none"
          style={[
            styles.basinFrameSegment,
            {
              left: segment.x,
              top: segment.y,
              width: segment.length + 3,
              transform: [{ rotate: `${segment.angle}rad` }],
            },
          ]}
        />
      ))}
      {segments.map((segment) => (
        <View
          key={`${segment.id}-shine`}
          pointerEvents="none"
          style={[
            styles.basinFrameHighlightSegment,
            {
              left: segment.x + 1,
              top: segment.y - 2,
              width: segment.length,
              transform: [{ rotate: `${segment.angle}rad` }],
            },
          ]}
        />
      ))}
    </>
  );
});

/**
 * Draws the maru. It is the only part of the game that listens to where the maru are, so a maru
 * that moves redraws this layer and nothing else.
 */
export const BeadLayer = memo(function BeadLayer({
  store,
  expressionTokens,
  hiddenBeadId,
  draggingBeadId,
  onMove,
  onDragStart,
  onDragEnd,
  onUnwrap,
}: {
  store: BeadFrameStore;
  expressionTokens: string[];
  hiddenBeadId?: string;
  draggingBeadId?: string;
  onMove: (beadId: string, x: number, y: number) => void;
  onDragStart: (beadId: string) => void;
  onDragEnd: (beadId: string) => void;
  onUnwrap: (beadId: string) => void;
}) {
  const beads = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const displayBeads = useMemo(() => getDisplayBeadsForPendingPriorityExpression(beads, expressionTokens), [beads, expressionTokens]);
  const almostMergeBeadIds = useMemo(() => findAlmostMergeBeadIds(displayBeads), [displayBeads]);

  return (
    <>
      {displayBeads.map((bead) =>
        hiddenBeadId === bead.id ? null : (
          <DraggableBeadView
            key={bead.id}
            bead={bead}
            onMove={onMove}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingBeadId === bead.id}
            isAlmostMerge={almostMergeBeadIds.has(bead.id)}
            onTap={bead.id !== 'expression-wrap-preview' && canBurstBead(bead) ? onUnwrap : undefined}
          />
        ),
      )}
    </>
  );
});

type DraggableBeadViewProps = {
  bead: BeadSnapshot;
  onMove: (beadId: string, x: number, y: number) => void;
  onDragStart: (beadId: string) => void;
  onDragEnd: (beadId: string) => void;
  isDragging: boolean;
  isAlmostMerge: boolean;
  onTap?: (beadId: string) => void;
};

const DraggableBeadView = memo(function DraggableBeadView(props: DraggableBeadViewProps) {
  const { bead, isDragging, isAlmostMerge } = props;
  // The gesture handlers are made once per maru and read whatever is current through this ref.
  // They used to be rebuilt every time the maru moved, which threw away how far the finger had
  // travelled: a held maru stayed where it was instead of following the finger.
  const latestRef = useRef(props);
  latestRef.current = props;
  const startPositionRef = useRef({ x: bead.x, y: bead.y });
  const hasDraggedRef = useRef(false);
  const isHeldRef = useRef(false);
  const radius = getEntityRadius(bead.value, bead.count);
  const hitSize = Math.max(radius * 2 + 24, MIN_TOUCH_TARGET_SIZE);
  const beadOffset = hitSize / 2;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          const latest = latestRef.current;
          startPositionRef.current = { x: latest.bead.x, y: latest.bead.y };
          hasDraggedRef.current = false;
          isHeldRef.current = true;
          latest.onDragStart(latest.bead.id);
        },
        onPanResponderMove: (_event, gesture) => {
          if (Math.hypot(gesture.dx, gesture.dy) > TAP_DRIFT_TO_BURST_THRESHOLD) {
            hasDraggedRef.current = true;
          }
          const latest = latestRef.current;
          latest.onMove(latest.bead.id, startPositionRef.current.x + gesture.dx, startPositionRef.current.y + gesture.dy);
        },
        onPanResponderRelease: () => {
          const latest = latestRef.current;
          isHeldRef.current = false;
          latest.onDragEnd(latest.bead.id);
          if (!hasDraggedRef.current) {
            latest.onTap?.(latest.bead.id);
          }
        },
        onPanResponderTerminate: () => {
          const latest = latestRef.current;
          isHeldRef.current = false;
          latest.onDragEnd(latest.bead.id);
        },
      }),
    [],
  );

  // A maru can disappear while it is held (it merges, say). Let go of it then, so the game does
  // not go on thinking something is being dragged.
  useEffect(
    () => () => {
      if (isHeldRef.current) {
        isHeldRef.current = false;
        latestRef.current.onDragEnd(latestRef.current.bead.id);
      }
    },
    [],
  );

  return (
    <View
      accessibilityLabel={a11yLabel(`bead-${bead.role}-${bead.count}`)}
      testID={`bead-${bead.role}-${bead.count}-${bead.id}`}
      style={[
        styles.draggableBeadHitArea,
        {
          left: bead.x - hitSize / 2,
          top: bead.y - hitSize / 2,
          width: hitSize,
          height: hitSize,
          borderRadius: hitSize / 2,
          zIndex: isDragging ? 40 : getBeadLayerZIndex(bead.value),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <BeadView
        value={bead.value}
        count={bead.count}
        sign={bead.sign}
        role={bead.role}
        x={beadOffset}
        y={beadOffset}
        isFocused={isDragging}
        isAlmostMerge={isAlmostMerge}
      />
    </View>
  );
}, areDraggableBeadPropsEqual);

/** A maru that did not move, change or get picked up does not need to be drawn again. */
function areDraggableBeadPropsEqual(previous: DraggableBeadViewProps, next: DraggableBeadViewProps) {
  return (
    previous.bead.id === next.bead.id &&
    previous.bead.x === next.bead.x &&
    previous.bead.y === next.bead.y &&
    previous.bead.value === next.bead.value &&
    previous.bead.count === next.bead.count &&
    previous.bead.sign === next.bead.sign &&
    previous.bead.role === next.bead.role &&
    previous.isDragging === next.isDragging &&
    previous.isAlmostMerge === next.isAlmostMerge &&
    previous.onMove === next.onMove &&
    previous.onDragStart === next.onDragStart &&
    previous.onDragEnd === next.onDragEnd &&
    previous.onTap === next.onTap
  );
}
