// The maru themselves, the layer that draws them, and the tray they sit in.
import { memo, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { PanResponder, Text, View } from 'react-native';

import { useBoardScale } from '@/components/marumaru/board-viewport';
import { TAP_DRIFT_TO_BURST_THRESHOLD } from '@/components/marumaru/constants';
import {
  getBasinFrameSegments,
  getBeadLayerOpacity,
  findBeadAt,
  getBeadHitRadius,
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
  // Which maru a press means is asked at the moment of the press, of the maru as they are then.
  const shownRef = useRef({ beads: displayBeads, hiddenBeadId });
  shownRef.current = { beads: displayBeads, hiddenBeadId };
  const findBeadAtPoint = useCallback((x: number, y: number) => {
    const shown = shownRef.current;
    return findBeadAt(shown.beads.filter((bead) => bead.id !== shown.hiddenBeadId), x, y);
  }, []);

  return (
    <>
      {displayBeads.map((bead) =>
        hiddenBeadId === bead.id ? null : (
          <DraggableBeadView
            key={bead.id}
            bead={bead}
            findBeadAt={findBeadAtPoint}
            onMove={onMove}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            isDragging={draggingBeadId === bead.id}
            isAlmostMerge={almostMergeBeadIds.has(bead.id)}
            onTap={onUnwrap}
          />
        ),
      )}
    </>
  );
});

type DraggableBeadViewProps = {
  bead: BeadSnapshot;
  /** The maru a press at this point of the field means: this one, or a neighbour the press is nearer to. */
  findBeadAt: (x: number, y: number) => BeadSnapshot | undefined;
  onMove: (beadId: string, x: number, y: number) => void;
  onDragStart: (beadId: string) => void;
  onDragEnd: (beadId: string) => void;
  isDragging: boolean;
  isAlmostMerge: boolean;
  /** A press let go without a drag, on a maru that can be opened. */
  onTap: (beadId: string) => void;
};

const DraggableBeadView = memo(function DraggableBeadView(props: DraggableBeadViewProps) {
  const { bead, isDragging, isAlmostMerge } = props;
  // The gesture handlers are made once per maru and read whatever is current through this ref.
  // They used to be rebuilt every time the maru moved, which threw away how far the finger had
  // travelled: a held maru stayed where it was instead of following the finger.
  const latestRef = useRef(props);
  latestRef.current = props;
  const boardScaleRef = useRef(1);
  boardScaleRef.current = useBoardScale();
  const startPositionRef = useRef({ x: bead.x, y: bead.y });
  const hasDraggedRef = useRef(false);
  // The maru this press took hold of: this one, or the neighbour the press was nearer to.
  const heldRef = useRef<BeadSnapshot | undefined>(undefined);
  const hitSize = getBeadHitRadius(bead) * 2;
  const beadOffset = hitSize / 2;
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => {
          const latest = latestRef.current;
          // Where in the field the press is. It is given from the corner of this maru's own
          // ring, in screen points; the board may be shown shrunk or enlarged.
          const { locationX, locationY } = event.nativeEvent;
          const reach = getBeadHitRadius(latest.bead);
          const meant =
            Number.isFinite(locationX) && Number.isFinite(locationY)
              ? latest.findBeadAt(latest.bead.x - reach + locationX / boardScaleRef.current, latest.bead.y - reach + locationY / boardScaleRef.current)
              : undefined;
          const held = meant ?? latest.bead;
          startPositionRef.current = { x: held.x, y: held.y };
          hasDraggedRef.current = false;
          heldRef.current = held;
          latest.onDragStart(held.id);
        },
        onPanResponderMove: (_event, gesture) => {
          if (Math.hypot(gesture.dx, gesture.dy) > TAP_DRIFT_TO_BURST_THRESHOLD) {
            hasDraggedRef.current = true;
          }
          const held = heldRef.current;
          if (!held) {
            return;
          }
          // The finger's travel is in screen points; the board may be shown shrunk.
          latestRef.current.onMove(held.id, startPositionRef.current.x + gesture.dx / boardScaleRef.current, startPositionRef.current.y + gesture.dy / boardScaleRef.current);
        },
        onPanResponderRelease: () => {
          const held = heldRef.current;
          if (!held) {
            return;
          }
          heldRef.current = undefined;
          latestRef.current.onDragEnd(held.id);
          if (!hasDraggedRef.current && held.id !== 'expression-wrap-preview' && canBurstBead(held)) {
            latestRef.current.onTap(held.id);
          }
        },
        onPanResponderTerminate: () => {
          const held = heldRef.current;
          if (held) {
            heldRef.current = undefined;
            latestRef.current.onDragEnd(held.id);
          }
        },
      }),
    [],
  );

  // The maru that took the press can disappear while the press lasts (it merges, say). Let go
  // then, so the game does not go on thinking something is being dragged.
  useEffect(
    () => () => {
      const held = heldRef.current;
      if (held) {
        heldRef.current = undefined;
        latestRef.current.onDragEnd(held.id);
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
    previous.findBeadAt === next.findBeadAt &&
    previous.onMove === next.onMove &&
    previous.onDragStart === next.onDragStart &&
    previous.onDragEnd === next.onDragEnd &&
    previous.onTap === next.onTap
  );
}
