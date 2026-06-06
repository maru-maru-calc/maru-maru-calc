import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { getStageIndexById, STAGE_ISLANDS, STAGES } from '@/game/stages';
import { Stage } from '@/game/types';

type AppScreen = 'launch' | 'world' | 'stage' | 'game';
type StageStatus = 'done' | 'open' | 'locked';

export default function IndexScreen() {
  const { width } = useWindowDimensions();
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
        onBack={() => setScreen('world')}
        onStartStage={startStage}
      />
    );
  }

  return (
    <WorldSelect
      completedStageIds={completedStageIds}
      mapWidth={mapWidth}
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
  onSelectIsland,
}: {
  completedStageIds: Set<string>;
  mapWidth: number;
  onSelectIsland: (islandId: Stage['islandId']) => void;
}) {
  const completedByIsland = (islandId: Stage['islandId']) => STAGES.filter((stage) => stage.islandId === islandId && completedStageIds.has(stage.id)).length;
  const layouts = getWorldNodeLayouts(mapWidth);

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="world-select" style={styles.depthScene}>
        <View pointerEvents="none" style={styles.depthBackdrop}>
          <View style={[styles.bigBubble, styles.bigBubbleTop]} />
          <View style={[styles.bigBubble, styles.bigBubbleRight]} />
          <View style={[styles.softPatch, styles.softPatchLeft]} />
          <View style={[styles.softPatch, styles.softPatchBottom]} />
        </View>
        <ScrollView
          style={styles.worldScroll}
          contentContainerStyle={styles.worldScrollContent}
          showsVerticalScrollIndicator={false}
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
  onBack,
  onStartStage,
}: {
  island: (typeof STAGE_ISLANDS)[number];
  stages: Stage[];
  completedStageIds: Set<string>;
  mapWidth: number;
  onBack: () => void;
  onStartStage: (stage: Stage) => void;
}) {
  const openStageCount = Math.min(stages.length, Math.max(3, completedStageIds.size + 2));
  const layouts = stages.map((_stage, index) => getStageNodeLayout(index, mapWidth));
  const mapHeight = Math.max(620, getStageMapHeight(stages.length));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.depthScene}>
        <View pointerEvents="none" style={styles.depthBackdrop}>
          <View style={[styles.bigBubble, styles.bigBubbleTop]} />
          <View style={[styles.bigBubble, styles.bigBubbleRight]} />
          <View style={[styles.softPatch, styles.softPatchBottom]} />
        </View>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <ScrollView
          style={styles.stageScroll}
          contentContainerStyle={[styles.stageScrollContent, { height: mapHeight }]}
          showsVerticalScrollIndicator={false}
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
  },
  depthBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  bigBubble: {
    position: 'absolute',
    borderWidth: 5,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  bigBubbleTop: {
    width: 156,
    height: 156,
    borderRadius: 78,
    top: -72,
    right: -44,
  },
  bigBubbleRight: {
    width: 164,
    height: 164,
    borderRadius: 82,
    top: 292,
    right: -92,
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
