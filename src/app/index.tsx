import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { getStageIndexById, STAGE_ISLANDS, STAGES } from '@/game/stages';
import { Stage } from '@/game/types';

type AppScreen = 'launch' | 'world' | 'stage' | 'game';
type StageStatus = 'done' | 'open' | 'locked';
type DepthBubbleSpec = {
  id: string;
  xRatio: number;
  size: number;
  speed: number;
  delay: number;
  drift: number;
};
type DepthFishSpec = {
  id: string;
  depth: number;
  yRatio: number;
  size: number;
  speed: number;
  delay: number;
  direction: 1 | -1;
  tint: string;
};

const DEPTH_BUBBLE_TICK_MS = 90;

export default function IndexScreen() {
  const { width, height } = useWindowDimensions();
  const [screen, setScreen] = useState<AppScreen>('launch');
  const [selectedIslandId, setSelectedIslandId] = useState<Stage['islandId']>('addition');
  const [playingStageIndex, setPlayingStageIndex] = useState(0);
  const [completedStageIds, setCompletedStageIds] = useState<Set<string>>(() => new Set());

  const selectedIsland = STAGE_ISLANDS.find((island) => island.id === selectedIslandId) ?? STAGE_ISLANDS[0];
  const selectedStages = useMemo(() => STAGES.filter((stage) => stage.islandId === selectedIslandId), [selectedIslandId]);
  const mapWidth = Math.max(320, width);

  const startStage = (stage: Stage) => {
    setPlayingStageIndex(getStageIndexById(stage.id));
    setScreen('game');
  };

  if (screen === 'launch') {
    return <MarumaruGame mode="launch" onComplete={() => setScreen('world')} />;
  }

  if (screen === 'game') {
    return (
      <MarumaruGame
        initialStageIndex={playingStageIndex}
        onBack={() => setScreen('stage')}
        onStageClear={(stageId) => {
          setCompletedStageIds((current) => {
            const next = new Set(current);
            next.add(stageId);
            return next;
          });
        }}
      />
    );
  }

  if (screen === 'stage') {
    return (
      <StageSelect
        island={selectedIsland}
        stages={selectedStages}
        completedStageIds={completedStageIds}
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onBack={() => setScreen('world')}
        onStartStage={startStage}
      />
    );
  }

  return (
    <WorldSelect
      completedStageIds={completedStageIds}
      mapWidth={mapWidth}
      viewportWidth={width}
      viewportHeight={height}
      onSelectIsland={(islandId) => {
        setSelectedIslandId(islandId);
        setScreen('stage');
      }}
    />
  );
}

function WorldSelect({
  completedStageIds,
  mapWidth,
  viewportWidth,
  viewportHeight,
  onSelectIsland,
}: {
  completedStageIds: Set<string>;
  mapWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  onSelectIsland: (islandId: Stage['islandId']) => void;
}) {
  const [scrollDepth, setScrollDepth] = useState(0);
  const completedByIsland = (islandId: Stage['islandId']) => STAGES.filter((stage) => stage.islandId === islandId && completedStageIds.has(stage.id)).length;
  const layouts = getWorldNodeLayouts(mapWidth);

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="world-select" style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepth={scrollDepth} />
        <ScrollView
          style={styles.worldScroll}
          contentContainerStyle={styles.worldScrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => setScrollDepth(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={styles.routeLayer}>
            {layouts.slice(0, -1).map((layout, index) => (
              <RouteSegment key={`world-route-${index}`} from={layout} to={layouts[index + 1]} />
            ))}
            <WorldNode
              label="+"
              title="+"
              progress={completedByIsland('addition')}
              total={STAGES.filter((stage) => stage.islandId === 'addition').length}
              x={layouts[0].x}
              y={layouts[0].y}
              active
              onPress={() => onSelectIsland('addition')}
            />
            <WorldNode
              label="-"
              title="−"
              progress={completedByIsland('subtraction')}
              total={STAGES.filter((stage) => stage.islandId === 'subtraction').length}
              x={layouts[1].x}
              y={layouts[1].y}
              onPress={() => onSelectIsland('subtraction')}
            />
            <WorldNode
              label="×"
              title="×"
              progress={completedByIsland('multiplication')}
              total={STAGES.filter((stage) => stage.islandId === 'multiplication').length}
              x={layouts[2].x}
              y={layouts[2].y}
              onPress={() => onSelectIsland('multiplication')}
            />
            <WorldNode
              label="÷"
              title="÷"
              progress={completedByIsland('division')}
              total={STAGES.filter((stage) => stage.islandId === 'division').length}
              x={layouts[3].x}
              y={layouts[3].y}
              onPress={() => onSelectIsland('division')}
            />
            <MixedWorldNode label="mixed-3" count={3} x={layouts[4].x} y={layouts[4].y} onPress={() => onSelectIsland('mixed3')} />
            <MixedWorldNode label="mixed-4" count={4} x={layouts[5].x} y={layouts[5].y} onPress={() => onSelectIsland('mixed4')} />
            <MixedWorldNode label="mixed-5" count={5} x={layouts[6].x} y={layouts[6].y} onPress={() => onSelectIsland('mixed5')} />
            <MixedWorldNode label="mixed-3-free" count={3} x={layouts[7].x} y={layouts[7].y} free onPress={() => onSelectIsland('mixed3Free')} />
            <MixedWorldNode label="mixed-4-free" count={4} x={layouts[8].x} y={layouts[8].y} free onPress={() => onSelectIsland('mixed4Free')} />
            <MixedWorldNode label="mixed-5-free" count={5} x={layouts[9].x} y={layouts[9].y} free onPress={() => onSelectIsland('mixed5Free')} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function DepthBackdrop({ width, height, scrollDepth }: { width: number; height: number; scrollDepth: number }) {
  const [tick, setTick] = useState(() => Date.now());
  const bubbles = useMemo(() => getDepthBubbleSpecs(width), [width]);
  const fish = useMemo(() => getDepthFishSpecs(), []);
  const shadeOpacity = Math.min(0.44, Math.max(0, scrollDepth / 1500) * 0.44);

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), DEPTH_BUBBLE_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <View pointerEvents="none" style={styles.depthBackdrop}>
      <View style={[styles.softPatch, styles.softPatchLeft]} />
      <View style={[styles.softPatch, styles.softPatchBottom]} />
      {bubbles.map((bubble) => {
        const elapsedSeconds = Math.max(0, (tick - bubble.delay) / 1000);
        const travel = height + bubble.size * 3;
        const cycle = (elapsedSeconds * bubble.speed) % travel;
        const y = height + bubble.size - cycle - scrollDepth * 0.34;
        const drift = Math.sin(elapsedSeconds * 0.58 + bubble.delay * 0.001) * bubble.drift;
        const x = bubble.xRatio * width + drift - bubble.size / 2;
        const opacity = elapsedSeconds < 0.24 ? elapsedSeconds / 0.24 : 1;

        return (
          <View
            key={bubble.id}
            testID={`depth-background-bubble-${bubble.id}`}
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
          >
            <View style={styles.depthBackgroundBubbleShine} />
          </View>
        );
      })}
      {fish.map((spec) => (
        <DepthFish key={spec.id} spec={spec} width={width} height={height} tick={tick} scrollDepth={scrollDepth} />
      ))}
      <View testID="depth-shade" style={[styles.depthShade, { opacity: shadeOpacity }]} />
    </View>
  );
}

function DepthFish({
  spec,
  width,
  height,
  tick,
  scrollDepth,
}: {
  spec: DepthFishSpec;
  width: number;
  height: number;
  tick: number;
  scrollDepth: number;
}) {
  const elapsedSeconds = Math.max(0, (tick - spec.delay) / 1000);
  const travel = width + spec.size * 5;
  const cycle = (elapsedSeconds * spec.speed) % travel;
  const x = spec.direction > 0 ? cycle - spec.size * 2 : width - cycle + spec.size;
  const y = height * spec.yRatio + Math.sin(elapsedSeconds * 0.55 + spec.depth * 0.01) * 8;
  const depthDistance = Math.abs(scrollDepth - spec.depth);
  const depthOpacity = Math.max(0, 1 - depthDistance / 520);
  const baseOpacity = spec.depth === 0 ? 0.26 : 0.36;

  return (
    <View
      pointerEvents="none"
      testID={`depth-fish-${spec.id}`}
      style={[
        styles.depthFish,
        {
          left: x,
          top: y,
          width: spec.size,
          height: spec.size * 0.42,
          opacity: Math.min(0.46, baseOpacity + depthOpacity * 0.34),
          transform: [{ scaleX: spec.direction }],
        },
      ]}
    >
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
    </View>
  );
}

function WorldNode({
  label,
  title,
  progress,
  total,
  x,
  y,
  active = false,
  onPress,
}: {
  label: string;
  title: string;
  progress: number;
  total: number;
  x: number;
  y: number;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.worldNode,
        active && styles.worldNodeActive,
        {
          left: x - 45,
          top: y - 45,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.worldSymbol, active && styles.worldSymbolActive]}>{title}</Text>
      <Text style={[styles.worldProgress, active && styles.worldProgressActive]}>
        {progress}/{total}
      </Text>
    </Pressable>
  );
}

function MixedWorldNode({
  label,
  count,
  x,
  y,
  free = false,
  onPress,
}: {
  label: string;
  count: 3 | 4 | 5;
  x: number;
  y: number;
  free?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.worldNode,
        styles.mixedWorldNode,
        free && styles.freeMixedWorldNode,
        {
          left: x - 45,
          top: y - 45,
        },
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.mixedWorldSymbols}>+ −</Text>
      <Text style={styles.mixedWorldSymbols}>× ÷</Text>
      <View style={styles.mixedCountBadge}>
        <Text style={styles.mixedCountText}>{count}</Text>
      </View>
      {free ? (
        <View style={styles.freeBadge}>
          <Text style={styles.freeBadgeText}>∞</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function StageSelect({
  island,
  stages,
  completedStageIds,
  mapWidth,
  viewportWidth,
  viewportHeight,
  onBack,
  onStartStage,
}: {
  island: (typeof STAGE_ISLANDS)[number];
  stages: Stage[];
  completedStageIds: Set<string>;
  mapWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  onBack: () => void;
  onStartStage: (stage: Stage) => void;
}) {
  const [scrollDepth, setScrollDepth] = useState(0);
  const openStageCount = Math.min(stages.length, Math.max(3, completedStageIds.size + 2));
  const layouts = stages.map((_stage, index) => getStageNodeLayout(index, mapWidth));
  const mapHeight = Math.max(620, getStageMapHeight(stages.length));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepth={scrollDepth} />
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <ScrollView
          style={styles.stageScroll}
          contentContainerStyle={[styles.stageScrollContent, { height: mapHeight }]}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => setScrollDepth(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.stageMap, { height: mapHeight }]}>
            {layouts.slice(0, -1).map((layout, index) => (
              <RouteSegment key={`route-${stages[index].id}`} from={layout} to={layouts[index + 1]} />
            ))}
            {stages.map((stage, index) => {
              const status: StageStatus = completedStageIds.has(stage.id) ? 'done' : index < openStageCount ? 'open' : 'locked';
              return (
                <StageNode
                  key={stage.id}
                  stage={stage}
                  number={index + 1}
                  layout={layouts[index]}
                  status={status}
                  onPress={() => onStartStage(stage)}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function StageNode({
  stage,
  number,
  layout,
  status,
  onPress,
}: {
  stage: Stage;
  number: number;
  layout: MapNodeLayout;
  status: StageStatus;
  onPress: () => void;
}) {
  const isLocked = status === 'locked';
  const isDone = status === 'done';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isLocked }}
      disabled={isLocked}
      testID={`stage-${stage.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stageNode,
        {
          left: layout.x - 40,
          top: layout.y - 40,
        },
        isLocked && styles.stageNodeLocked,
        isDone && styles.stageNodeDone,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.stageNumber, isLocked && styles.stageNumberLocked]}>#{number}</Text>
      <Text style={[styles.stageTarget, isLocked && styles.stageNumberLocked]}>{stage.target}</Text>
      {isDone ? <Text style={styles.stageDoneStar}>★</Text> : null}
    </Pressable>
  );
}

type MapNodeLayout = {
  x: number;
  y: number;
};

function RouteSegment({ from, to }: { from: MapNodeLayout; to: MapNodeLayout }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.stageRoute,
        {
          left: (from.x + to.x) / 2 - length / 2,
          top: (from.y + to.y) / 2 - 3,
          width: length,
          transform: [{ rotate: `${angle}rad` }],
        },
      ]}
    />
  );
}

function getStageNodeLayout(index: number, mapWidth: number): MapNodeLayout {
  const centerX = mapWidth / 2;
  const swing = Math.min(92, mapWidth * 0.24);
  const side = index % 2 === 0 ? -1 : 1;
  return {
    x: centerX + side * swing * (index === 0 ? 0 : 1),
    y: 96 + index * 118,
  };
}

function getWorldNodeLayouts(mapWidth: number): MapNodeLayout[] {
  const centerX = mapWidth / 2;
  const swing = Math.min(84, mapWidth * 0.22);
  const xs = [
    centerX,
    centerX + swing * 0.72,
    centerX - swing,
    centerX + swing * 0.9,
    centerX - swing * 0.78,
    centerX + swing * 0.86,
    centerX - swing * 0.86,
    centerX + swing * 0.78,
    centerX - swing * 0.72,
    centerX + swing * 0.72,
  ];

  return xs.map((x, index) => ({
    x,
    y: 104 + index * 130,
  }));
}

function getDepthBubbleSpecs(width: number): DepthBubbleSpec[] {
  const wideOffset = width > 520 ? 0.04 : 0;
  return [
    { id: 'large-right', xRatio: 0.94 - wideOffset, size: 116, speed: 15, delay: 0, drift: 9 },
    { id: 'small-left', xRatio: 0.12 + wideOffset, size: 60, speed: 21, delay: 900, drift: 7 },
    { id: 'tiny-right', xRatio: 0.78, size: 30, speed: 18, delay: 1600, drift: 5 },
    { id: 'medium-left', xRatio: 0.22, size: 42, speed: 13, delay: 2400, drift: 10 },
    { id: 'tiny-center', xRatio: 0.52, size: 18, speed: 24, delay: 3200, drift: 4 },
    { id: 'medium-right', xRatio: 0.84, size: 54, speed: 12, delay: 4100, drift: 8 },
    { id: 'soft-low-left', xRatio: 0.05 + wideOffset, size: 92, speed: 10, delay: 1700, drift: 7 },
    { id: 'soft-top-left', xRatio: 0.28, size: 26, speed: 17, delay: 5200, drift: 6 },
    { id: 'soft-center-right', xRatio: 0.66, size: 36, speed: 14, delay: 6100, drift: 9 },
    { id: 'tiny-far-left', xRatio: 0.02 + wideOffset, size: 22, speed: 20, delay: 6800, drift: 5 },
    { id: 'wide-center', xRatio: 0.44, size: 72, speed: 11, delay: 7600, drift: 11 },
    { id: 'tiny-far-right', xRatio: 0.98 - wideOffset, size: 24, speed: 19, delay: 8300, drift: 5 },
  ];
}

function getDepthFishSpecs(): DepthFishSpec[] {
  return [
    { id: 'shallow-small', depth: 0, yRatio: 0.22, size: 34, speed: 8, delay: 0, direction: 1, tint: 'rgba(14, 165, 233, 0.52)' },
    { id: 'shallow-pair', depth: 260, yRatio: 0.38, size: 24, speed: 6, delay: 2200, direction: -1, tint: 'rgba(2, 132, 199, 0.48)' },
    { id: 'middle-blue', depth: 620, yRatio: 0.28, size: 44, speed: 7, delay: 1200, direction: -1, tint: 'rgba(3, 105, 161, 0.48)' },
    { id: 'middle-small', depth: 840, yRatio: 0.52, size: 28, speed: 5, delay: 4300, direction: 1, tint: 'rgba(7, 89, 133, 0.46)' },
    { id: 'deep-slow', depth: 1180, yRatio: 0.34, size: 52, speed: 4, delay: 3100, direction: 1, tint: 'rgba(12, 74, 110, 0.44)' },
  ];
}

function getStageMapHeight(stageCount: number) {
  return 180 + Math.max(0, stageCount - 1) * 118;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EAFBFF',
  },
  depthScene: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#EAFBFF',
    position: 'relative',
  },
  depthBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  depthBackgroundBubble: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  depthBackgroundBubbleShine: {
    position: 'absolute',
    left: '22%',
    top: '18%',
    width: '26%',
    height: '26%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
  depthShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#082F49',
  },
  depthFish: {
    position: 'absolute',
  },
  depthFishBody: {
    position: 'absolute',
    left: 0,
    top: '16%',
    width: '76%',
    height: '68%',
  },
  depthFishTail: {
    position: 'absolute',
    top: '16%',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  softPatch: {
    position: 'absolute',
    backgroundColor: 'rgba(187, 247, 208, 0.22)',
  },
  softPatchLeft: {
    width: 138,
    height: 138,
    borderRadius: 69,
    left: -72,
    bottom: 128,
  },
  softPatchBottom: {
    width: 260,
    height: 260,
    borderRadius: 130,
    right: -110,
    bottom: -70,
  },
  worldScroll: {
    flex: 1,
    zIndex: 1,
  },
  worldScrollContent: {
    minHeight: 1460,
    paddingTop: 76,
    paddingBottom: 90,
  },
  routeLayer: {
    position: 'relative',
    minHeight: 1460,
  },
  worldNode: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    borderColor: 'rgba(125, 211, 252, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.13,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 5,
  },
  worldNodeActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#FFFFFF',
  },
  mixedWorldNode: {
    gap: 0,
  },
  freeMixedWorldNode: {
    borderColor: '#FACC15',
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
  },
  worldSymbol: {
    color: '#075985',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
  },
  worldSymbolActive: {
    color: '#0EA5E9',
  },
  worldProgress: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '900',
  },
  worldProgressActive: {
    color: '#075985',
  },
  mixedWorldSymbols: {
    color: '#075985',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  mixedCountBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixedCountText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  freeBadge: {
    position: 'absolute',
    left: -2,
    bottom: -2,
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBadgeText: {
    color: '#12334A',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
  },
  backButton: {
    position: 'absolute',
    left: 22,
    top: 42,
    zIndex: 3,
    width: 42,
    height: 42,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: '#BAE6FD',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#075985',
    fontSize: 34,
    lineHeight: 36,
    fontWeight: '900',
  },
  stageScroll: {
    flex: 1,
    zIndex: 1,
  },
  stageScrollContent: {
    paddingTop: 76,
    paddingBottom: 90,
  },
  stageMap: {
    position: 'relative',
  },
  stageRoute: {
    position: 'absolute',
    height: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(125, 211, 252, 0.42)',
  },
  stageNode: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 5,
    borderColor: '#7DD3FC',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  stageNodeLocked: {
    opacity: 0.48,
    borderColor: 'rgba(186, 230, 253, 0.8)',
  },
  stageNodeDone: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  stageNumber: {
    color: '#0284C7',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
  },
  stageTarget: {
    color: '#12334A',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
  },
  stageNumberLocked: {
    color: '#7DD3FC',
  },
  stageDoneStar: {
    position: 'absolute',
    right: -4,
    top: -7,
    color: '#FACC15',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.95)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
