import { ReactNode, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { getMotionScale, getPositionSpringConfig, getScaleSpringConfig } from '@/animation/physics';
import { GroupMotionState, GroupPosition, MergeAnimation } from '@/domain/game/types';
import { AdditionReadinessState, NumberGroup, NumberObject } from '@/domain/math/types';
import { MergeOverlay } from '@/components/MergeOverlay';
import { FallingMarbleBurst } from '@/components/FallingMarbleBurst';
import { NumberGroupView } from '@/components/NumberGroupView';
import { getGroupBridgeLayout } from '@/rendering/groupBridge';

type BowlProps = {
  groups: NumberGroup[];
  objects: NumberObject[];
  selectedGroupIds: string[];
  hintedGroupIds?: string[];
  selectedReadinessState?: AdditionReadinessState;
  dropReadinessState?: AdditionReadinessState;
  dropBlocked?: boolean;
  groupPositions: Record<string, GroupPosition>;
  settledGroupId?: string;
  draggingGroupId?: string;
  dropTargetGroupId?: string;
  activeMerge?: MergeAnimation;
  landingPulseId?: number;
  landingBurstObjects?: NumberObject[];
  disabled?: boolean;
  accessibleMode?: boolean;
  onSelectGroup: (groupId: string) => void;
  onStartDragGroup: (groupId: string) => void;
  onMoveGroup: (groupId: string, position: GroupPosition) => void;
  onEndDragGroup: (groupId: string, position: GroupPosition) => void;
};

const GROUP_WIDTH = 154;
const GROUP_HEIGHT = 168;

export function Bowl({
  groups,
  objects,
  selectedGroupIds,
  hintedGroupIds = [],
  selectedReadinessState = 'none',
  dropReadinessState = 'none',
  dropBlocked = false,
  groupPositions,
  settledGroupId,
  draggingGroupId,
  dropTargetGroupId,
  activeMerge,
  landingPulseId,
  landingBurstObjects,
  disabled = false,
  accessibleMode,
  onSelectGroup,
  onStartDragGroup,
  onMoveGroup,
  onEndDragGroup,
}: BowlProps) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const bridgeLayout = useMemo(
    () => getGroupBridgeLayout(selectedGroupIds, groupPositions, layout),
    [groupPositions, layout, selectedGroupIds],
  );

  return (
    <View
      style={styles.bowl}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        setLayout({ width, height });
      }}
    >
      <View pointerEvents="none" style={styles.bowlShadow} />
      <View pointerEvents="none" style={styles.bowlBody} />
      <View pointerEvents="none" style={styles.bowlInner} />
      <View pointerEvents="none" style={styles.bowlHighlight} />
      <LandingRipple triggerId={landingPulseId} />
      <Text style={styles.label}>ボウル</Text>
      <View style={styles.groups}>
        {bridgeLayout ? (
          <View
            pointerEvents="none"
            style={[
              styles.bridge,
              selectedReadinessState === 'near' ? styles.nearBridge : null,
              selectedReadinessState === 'ready' ? styles.readyBridge : null,
              {
                left: bridgeLayout.left,
                top: bridgeLayout.top,
                width: bridgeLayout.width,
                transform: [{ rotate: `${bridgeLayout.angleDeg}deg` }],
              },
            ]}
          />
        ) : null}
        {groups.map((group) => {
          const selected = selectedGroupIds.includes(group.id);
          const hinted = hintedGroupIds.includes(group.id);
          const dropTarget = dropTargetGroupId === group.id;
          const motionState = getMotionState({
            selected,
            hinted,
            disabled,
            settled: settledGroupId === group.id,
            dragging: draggingGroupId === group.id,
            dropTarget,
            dropBlocked,
          });

          return (
            <AnimatedGroup
              key={group.id}
              groupId={group.id}
              position={groupPositions[group.id] ?? { x: 0.5, y: 0.55 }}
              layout={layout}
              motionState={motionState}
              landingPulseId={landingPulseId}
              dragEnabled={!disabled}
              onStartDragGroup={onStartDragGroup}
              onMoveGroup={onMoveGroup}
              onEndDragGroup={onEndDragGroup}
            >
              <NumberGroupView
                group={group}
                objects={objects.filter((object) => object.groupId === group.id)}
                selected={selected}
                hinted={hinted}
                readinessState={dropTarget && !dropBlocked ? dropReadinessState : selected ? selectedReadinessState : 'none'}
                disabled={disabled}
                motionState={motionState}
                accessibleMode={accessibleMode}
                onPress={() => onSelectGroup(group.id)}
              />
            </AnimatedGroup>
          );
        })}
      </View>
      <MergeOverlay merge={activeMerge} />
      <FallingMarbleBurst
        triggerId={landingPulseId}
        objects={landingBurstObjects ?? []}
        accessibleMode={accessibleMode}
        layout={layout}
      />
    </View>
  );
}

function LandingRipple({ triggerId }: { triggerId?: number }) {
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (triggerId === undefined) {
      return;
    }

    scale.value = 0.7;
    opacity.value = 0.48;
    scale.value = withSpring(1.3, { damping: 10, stiffness: 140 });
    opacity.value = withSpring(0, { damping: 14, stiffness: 80 });
  }, [opacity, scale, triggerId]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (triggerId === undefined) {
    return null;
  }

  return (
    <Animated.View pointerEvents="none" style={[styles.ripple, animatedStyle]}>
      <View style={styles.rippleRing} />
    </Animated.View>
  );
}

function AnimatedGroup({
  groupId,
  position,
  layout,
  motionState,
  landingPulseId,
  dragEnabled,
  onStartDragGroup,
  onMoveGroup,
  onEndDragGroup,
  children,
}: {
  groupId: string;
  position: GroupPosition;
  layout: { width: number; height: number };
  motionState: GroupMotionState;
  landingPulseId?: number;
  dragEnabled: boolean;
  onStartDragGroup: (groupId: string) => void;
  onMoveGroup: (groupId: string, position: GroupPosition) => void;
  onEndDragGroup: (groupId: string, position: GroupPosition) => void;
  children: ReactNode;
}) {
  const hasLayout = layout.width > 0 && layout.height > 0;
  const target = {
    x: position.x * layout.width - GROUP_WIDTH / 2,
    y: position.y * layout.height - GROUP_HEIGHT / 2,
  };
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue(1);

  const panResponder = useMemo(
    () =>
      Gesture.Pan()
        .enabled(dragEnabled)
        .minDistance(5)
        .onBegin(() => {
          startX.value = translateX.value;
          startY.value = translateY.value;
          scale.value = withSpring(getMotionScale('dragging'), getScaleSpringConfig('dragging'));
          runOnJS(onStartDragGroup)(groupId);
        })
        .onUpdate((event) => {
          translateX.value = startX.value + event.translationX;
          translateY.value = startY.value + event.translationY;
          const nextX = (translateX.value + GROUP_WIDTH / 2) / Math.max(1, layout.width);
          const nextY = (translateY.value + GROUP_HEIGHT / 2) / Math.max(1, layout.height);
          runOnJS(onMoveGroup)(groupId, { x: nextX, y: nextY });
        })
        .onFinalize(() => {
          const nextX = (translateX.value + GROUP_WIDTH / 2) / Math.max(1, layout.width);
          const nextY = (translateY.value + GROUP_HEIGHT / 2) / Math.max(1, layout.height);
          scale.value = withSpring(getMotionScale(motionState), getScaleSpringConfig(motionState));
          runOnJS(onEndDragGroup)(groupId, { x: nextX, y: nextY });
        }),
    [
      dragEnabled,
      groupId,
      layout.height,
      layout.width,
      motionState,
      onEndDragGroup,
      onMoveGroup,
      onStartDragGroup,
      scale,
      startX,
      startY,
      translateX,
      translateY,
    ],
  );

  useEffect(() => {
    if (!hasLayout) {
      return;
    }

    const springConfig = getPositionSpringConfig(motionState);
    translateX.value = withSpring(target.x, springConfig);
    translateY.value = withSpring(target.y, springConfig);
  }, [hasLayout, motionState, target.x, target.y, translateX, translateY]);

  useEffect(() => {
    if (motionState !== 'settled') {
      scale.value = withSpring(getMotionScale(motionState), getScaleSpringConfig(motionState));
      return;
    }

    scale.value = withSpring(1.1, getScaleSpringConfig('settled'), () => {
      scale.value = withSpring(getMotionScale('idle'), getScaleSpringConfig('idle'));
    });
  }, [motionState, scale]);

  useEffect(() => {
    if (landingPulseId === undefined || motionState === 'dragging') {
      return;
    }

    scale.value = withSequence(
      withSpring(getMotionScale(motionState) + 0.03, { damping: 10, stiffness: 180 }),
      withSpring(getMotionScale(motionState), getScaleSpringConfig(motionState)),
    );
  }, [landingPulseId, motionState, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: hasLayout ? 1 : 0,
    transform: [{ translateX: translateX.value }, { translateY: translateY.value }, { scale: scale.value }],
  }));

  return (
    <GestureDetector gesture={panResponder}>
      <Animated.View style={[styles.animatedGroup, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
}

function getMotionState({
  selected,
  hinted,
  disabled,
  settled,
  dragging,
  dropTarget,
  dropBlocked,
}: {
  selected: boolean;
  hinted: boolean;
  disabled: boolean;
  settled: boolean;
  dragging: boolean;
  dropTarget: boolean;
  dropBlocked: boolean;
}): GroupMotionState {
  if (dragging) {
    return 'dragging';
  }

  if (dropTarget && dropBlocked) {
    return 'blockedDropTarget';
  }

  if (dropTarget) {
    return 'dropTarget';
  }

  if (settled) {
    return 'settled';
  }

  if (disabled && selected) {
    return 'merging';
  }

  if (selected) {
    return 'selected';
  }

  if (hinted) {
    return 'hinted';
  }

  return 'idle';
}

const styles = StyleSheet.create({
  bowl: {
    position: 'relative',
    minHeight: 280,
    borderRadius: 140,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 24,
    gap: 14,
    overflow: 'hidden',
    backgroundColor: '#efe5d1',
    borderColor: '#c9ad7b',
    borderWidth: 1,
    shadowColor: '#60451d',
    shadowOpacity: 0.14,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  bowlShadow: {
    position: 'absolute',
    left: 34,
    right: 34,
    bottom: 12,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(88, 62, 29, 0.12)',
  },
  bowlBody: {
    position: 'absolute',
    left: 10,
    right: 10,
    top: 20,
    bottom: 20,
    borderRadius: 999,
    backgroundColor: '#ead8b8',
    borderColor: '#c4a676',
    borderWidth: 2,
  },
  bowlInner: {
    position: 'absolute',
    left: 26,
    right: 26,
    top: 44,
    bottom: 34,
    borderRadius: 999,
    backgroundColor: '#f4ead8',
    borderColor: 'rgba(151, 113, 58, 0.24)',
    borderWidth: 1,
  },
  bowlHighlight: {
    position: 'absolute',
    left: 58,
    right: 58,
    top: 52,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.36)',
  },
  label: {
    color: '#7a6442',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
    zIndex: 2,
  },
  groups: {
    flex: 1,
    position: 'relative',
    zIndex: 2,
  },
  ripple: {
    position: 'absolute',
    left: '50%',
    top: '58%',
    width: 132,
    height: 52,
    marginLeft: -66,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  rippleRing: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderColor: 'rgba(37, 111, 93, 0.34)',
    borderWidth: 2,
    backgroundColor: 'rgba(236, 247, 241, 0.12)',
  },
  bridge: {
    position: 'absolute',
    height: 14,
    borderRadius: 999,
    backgroundColor: 'rgba(37, 111, 93, 0.2)',
    borderColor: 'rgba(37, 111, 93, 0.34)',
    borderWidth: 1,
    zIndex: 1,
  },
  nearBridge: {
    backgroundColor: 'rgba(177, 92, 0, 0.2)',
    borderColor: 'rgba(177, 92, 0, 0.34)',
  },
  readyBridge: {
    backgroundColor: 'rgba(37, 111, 93, 0.25)',
    borderColor: 'rgba(37, 111, 93, 0.44)',
  },
  animatedGroup: {
    position: 'absolute',
    width: GROUP_WIDTH,
    minHeight: GROUP_HEIGHT,
  },
});
