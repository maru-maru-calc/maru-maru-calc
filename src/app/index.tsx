import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MarumaruGame } from '@/components/MarumaruGame';
import { getStageIndexById, STAGE_ISLANDS, STAGES } from '@/game/stages';
import { Stage } from '@/game/types';

type StageStatus = 'done' | 'next' | 'waiting';

export default function IndexScreen() {
  const { width } = useWindowDimensions();
  const [selectedIslandId, setSelectedIslandId] = useState<Stage['islandId']>('addition');
  const [playingStageIndex, setPlayingStageIndex] = useState<number | undefined>(undefined);
  const [completedStageIds, setCompletedStageIds] = useState<Set<string>>(() => new Set());

  const selectedIsland = STAGE_ISLANDS.find((island) => island.id === selectedIslandId) ?? STAGE_ISLANDS[0];
  const mapWidth = Math.max(300, width - 32);
  const selectedStages = useMemo(() => STAGES.filter((stage) => stage.islandId === selectedIslandId), [selectedIslandId]);
  const nextStage = useMemo(() => selectedStages.find((stage) => !completedStageIds.has(stage.id)) ?? selectedStages[0], [completedStageIds, selectedStages]);
  const stagesBySet = useMemo(() => {
    return selectedIsland.stageSetTitles.map((setTitle) => ({
      setTitle,
      stages: selectedStages.filter((stage) => stage.setTitle === setTitle),
    }));
  }, [selectedIsland.stageSetTitles, selectedStages]);
  const completedCount = selectedStages.filter((stage) => completedStageIds.has(stage.id)).length;

  const startStage = (stage: Stage) => {
    setPlayingStageIndex(getStageIndexById(stage.id));
  };

  if (playingStageIndex !== undefined) {
    return (
      <MarumaruGame
        initialStageIndex={playingStageIndex}
        onBack={() => setPlayingStageIndex(undefined)}
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

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.brandDot} />
            <View style={[styles.brandDot, styles.brandDotSmall]} />
            <View style={[styles.brandDot, styles.brandDotTiny]} />
          </View>
          <Text style={styles.appTitle}>まるまるでんたく</Text>
          <Text style={styles.appSubtitle}>まるをまとめるたびにでよう</Text>
        </View>

        {nextStage ? (
          <Pressable
            accessibilityRole="button"
            testID={`recommended-stage-${nextStage.id}`}
            onPress={() => startStage(nextStage)}
            style={({ pressed }) => [styles.nextStageCard, pressed && styles.pressed]}
          >
            <View style={styles.nextStageTextGroup}>
              <Text style={styles.nextStageEyebrow}>まずはここから</Text>
              <Text style={styles.nextStageTitle}>{getStageObjective(nextStage)}</Text>
              <Text style={styles.nextStageMeta}>
                {nextStage.setTitle} / ステージ {getIslandStageNumber(nextStage, selectedStages)}
              </Text>
            </View>
            <View style={styles.nextStageBubble}>
              <Text style={styles.nextStageTarget}>{nextStage.target}</Text>
              <Text style={styles.nextStageTargetLabel}>にまとめる</Text>
            </View>
          </Pressable>
        ) : null}

        <View style={styles.islandTabs}>
          {STAGE_ISLANDS.map((island) => {
            const isSelected = island.id === selectedIslandId;
            const islandStages = STAGES.filter((stage) => stage.islandId === island.id);
            const islandDoneCount = islandStages.filter((stage) => completedStageIds.has(stage.id)).length;
            return (
              <Pressable
                key={island.id}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                testID={`island-${island.id}`}
                onPress={() => setSelectedIslandId(island.id)}
                style={({ pressed }) => [styles.islandTab, isSelected && styles.selectedIslandTab, pressed && styles.pressed]}
              >
                <View style={[styles.islandMark, isSelected && styles.selectedIslandMark]}>
                  <Text style={[styles.islandMarkText, isSelected && styles.selectedIslandMarkText]}>{island.title.slice(0, 1)}</Text>
                </View>
                <View style={styles.islandTextGroup}>
                  <Text style={[styles.islandTitle, isSelected && styles.selectedIslandTitle]} numberOfLines={1} adjustsFontSizeToFit>
                    {island.title}
                  </Text>
                  <Text style={[styles.islandProgress, isSelected && styles.selectedIslandProgress]}>
                    {islandDoneCount}/{islandStages.length} できた
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.stageArea}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>{selectedIsland.title}</Text>
              <Text style={styles.sectionSubtitle}>{selectedIsland.description}</Text>
            </View>
            <View style={styles.progressBubble}>
              <Text style={styles.progressValue}>
                {completedCount}/{selectedStages.length}
              </Text>
              <Text style={styles.progressLabel}>できた</Text>
            </View>
          </View>

          {stagesBySet.map(({ setTitle, stages }) => (
            <WorldMapSet
              key={setTitle}
              setTitle={setTitle}
              stages={stages}
              islandStages={selectedStages}
              nextStageId={nextStage?.id}
              completedStageIds={completedStageIds}
              mapWidth={mapWidth}
              onStartStage={startStage}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function WorldMapSet({
  setTitle,
  stages,
  islandStages,
  nextStageId,
  completedStageIds,
  mapWidth,
  onStartStage,
}: {
  setTitle: string;
  stages: Stage[];
  islandStages: Stage[];
  nextStageId?: string;
  completedStageIds: Set<string>;
  mapWidth: number;
  onStartStage: (stage: Stage) => void;
}) {
  const layouts = stages.map((_stage, index) => getMapNodeLayout(index, mapWidth));
  const mapHeight = getMapHeight(stages.length);

  return (
    <View style={styles.worldSet}>
      <Text style={styles.stageSetTitle}>{getFriendlySetTitle(setTitle)}</Text>
      <View style={[styles.worldMap, { height: mapHeight }]}>
        <MapDecorations />
        {layouts.slice(0, -1).map((layout, index) => (
          <RouteSegment key={`route-${stages[index].id}`} from={layout} to={layouts[index + 1]} />
        ))}
        {stages.map((stage, index) => {
          const status: StageStatus = completedStageIds.has(stage.id) ? 'done' : stage.id === nextStageId ? 'next' : 'waiting';
          return (
            <StageMapNode
              key={stage.id}
              stage={stage}
              stageNumber={getIslandStageNumber(stage, islandStages)}
              layout={layouts[index]}
              status={status}
              onPress={() => onStartStage(stage)}
            />
          );
        })}
      </View>
    </View>
  );
}

function RouteSegment({ from, to }: { from: MapNodeLayout; to: MapNodeLayout }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.routeSegment,
        {
          left: (from.x + to.x) / 2 - length / 2,
          top: (from.y + to.y) / 2 - 4,
          width: length,
          transform: [{ rotate: `${angle}rad` }],
        },
      ]}
    />
  );
}

function MapDecorations() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.mapBubbleMark, styles.mapBubbleMarkLarge]} />
      <View style={[styles.mapBubbleMark, styles.mapBubbleMarkSmall]} />
      <View style={[styles.mapBubbleMark, styles.mapBubbleMarkTiny]} />
      <View style={[styles.mapIslandPatch, styles.mapIslandPatchLeft]} />
      <View style={[styles.mapIslandPatch, styles.mapIslandPatchRight]} />
    </View>
  );
}

function StageMapNode({
  stage,
  stageNumber,
  layout,
  status,
  onPress,
}: {
  stage: Stage;
  stageNumber: number;
  layout: MapNodeLayout;
  status: StageStatus;
  onPress: () => void;
}) {
  const isNext = status === 'next';
  const isDone = status === 'done';

  return (
    <Pressable
      accessibilityRole="button"
      testID={`stage-${stage.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stageNode,
        {
          left: layout.x - 36,
          top: layout.y - 36,
        },
        isNext && styles.nextStageNode,
        isDone && styles.doneStageNode,
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.stageBubble, isNext && styles.nextStageNodeBubble, isDone && styles.doneStageNodeBubble]}>
        <Text style={[styles.stageNumber, isNext && styles.nextStageNumber, isDone && styles.doneStageNumber]}>{stageNumber}</Text>
      </View>
      <View style={[styles.mapStatusBadge, isNext && styles.nextStatusPill, isDone && styles.doneStatusPill]}>
        <Text style={[styles.mapStatusText, isNext && styles.nextStatusText, isDone && styles.doneStatusText]}>{getStatusLabel(status)}</Text>
      </View>
      {isNext ? <Text style={styles.nextFlag}>つぎ</Text> : null}
    </Pressable>
  );
}

type MapNodeLayout = {
  x: number;
  y: number;
};

function getMapNodeLayout(index: number, mapWidth: number): MapNodeLayout {
  const row = Math.floor(index / 3);
  const column = index % 3;
  const columnOrder = row % 2 === 0 ? column : 2 - column;
  const xPositions = [58, mapWidth / 2, mapWidth - 58];
  const waveOffset = row % 2 === 0 ? 0 : 18;
  return {
    x: xPositions[columnOrder],
    y: 58 + row * 108 + waveOffset,
  };
}

function getMapHeight(stageCount: number) {
  const rows = Math.max(1, Math.ceil(stageCount / 3));
  return 116 + (rows - 1) * 108;
}

function getIslandStageNumber(stage: Stage, islandStages: Stage[]) {
  return Math.max(1, islandStages.findIndex((candidate) => candidate.id === stage.id) + 1);
}

function getStageObjective(stage: Stage) {
  const firstCount = stage.bubbleCounts[0] ?? 0;
  if (stage.islandId === 'subtraction' && firstCount > stage.target) {
    return `ひいて ${stage.target} にしよう`;
  }
  return `${stage.target}にまとめよう`;
}

function getStatusLabel(status: StageStatus) {
  if (status === 'done') {
    return 'できた';
  }
  if (status === 'next') {
    return 'つぎ';
  }
  return 'まだ';
}

function getFriendlySetTitle(setTitle: string) {
  if (setTitle === '10のとう') {
    return '10にまとめるみち';
  }
  if (setTitle === '20のおか') {
    return '20にまとめるうみべ';
  }
  if (setTitle === 'おおきなかずのひろば') {
    return 'おおきくまとめるすいそう';
  }
  if (setTitle === '10にもどすみち') {
    return 'ひいてまとめるすいろ';
  }
  return setTitle;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EAFBFF',
  },
  content: {
    padding: 16,
    paddingBottom: 36,
    gap: 16,
  },
  header: {
    paddingTop: 8,
    paddingBottom: 2,
    justifyContent: 'center',
  },
  brandRow: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    marginBottom: 6,
  },
  brandDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: '#0284C7',
    backgroundColor: '#38BDF8',
    shadowColor: '#0284C7',
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  brandDotSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderColor: '#0EA5E9',
    backgroundColor: '#7DD3FC',
  },
  brandDotTiny: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderColor: '#38BDF8',
    backgroundColor: '#BAE6FD',
  },
  appTitle: {
    color: '#12334A',
    fontSize: 34,
    fontWeight: '900',
  },
  appSubtitle: {
    marginTop: 4,
    color: '#0284C7',
    fontSize: 15,
    fontWeight: '800',
  },
  nextStageCard: {
    minHeight: 128,
    padding: 16,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: '#38BDF8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
    shadowColor: '#0284C7',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  nextStageTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  nextStageEyebrow: {
    color: '#0284C7',
    fontSize: 14,
    fontWeight: '900',
  },
  nextStageTitle: {
    marginTop: 5,
    color: '#12334A',
    fontSize: 29,
    fontWeight: '900',
    lineHeight: 34,
  },
  nextStageMeta: {
    marginTop: 6,
    color: '#075985',
    fontSize: 13,
    fontWeight: '800',
  },
  nextStageBubble: {
    width: 94,
    height: 94,
    borderRadius: 47,
    borderWidth: 4,
    borderColor: '#7DD3FC',
    backgroundColor: '#E0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextStageTarget: {
    color: '#075985',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 36,
  },
  nextStageTargetLabel: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '900',
  },
  islandTabs: {
    flexDirection: 'row',
    gap: 9,
  },
  islandTab: {
    flex: 1,
    minHeight: 74,
    padding: 10,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#BAE6FD',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    shadowColor: '#0284C7',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  selectedIslandTab: {
    borderColor: '#0284C7',
    backgroundColor: '#0EA5E9',
  },
  islandMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 3,
    borderColor: '#BAE6FD',
    backgroundColor: '#E0F7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedIslandMark: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  islandMarkText: {
    color: '#075985',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 28,
  },
  selectedIslandMarkText: {
    color: '#0284C7',
  },
  islandTextGroup: {
    flex: 1,
    minWidth: 0,
  },
  islandTitle: {
    color: '#12334A',
    fontSize: 18,
    fontWeight: '900',
  },
  selectedIslandTitle: {
    color: '#FFFFFF',
  },
  islandProgress: {
    marginTop: 3,
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '900',
  },
  selectedIslandProgress: {
    color: '#EAFBFF',
  },
  stageArea: {
    gap: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sectionTitle: {
    color: '#12334A',
    fontSize: 25,
    fontWeight: '900',
  },
  sectionSubtitle: {
    marginTop: 3,
    color: '#0284C7',
    fontSize: 13,
    fontWeight: '800',
  },
  progressBubble: {
    minWidth: 72,
    height: 58,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#BAE6FD',
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressValue: {
    color: '#075985',
    fontSize: 17,
    fontWeight: '900',
    lineHeight: 20,
  },
  progressLabel: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '900',
  },
  worldSet: {
    gap: 10,
  },
  stageSetTitle: {
    color: '#075985',
    fontSize: 20,
    fontWeight: '900',
  },
  worldMap: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#BAE6FD',
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  stageNode: {
    position: 'absolute',
    width: 72,
    height: 86,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 8,
  },
  nextStageNode: {
    zIndex: 12,
  },
  doneStageNode: {
    zIndex: 10,
  },
  stageBubble: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 3,
    borderColor: '#7DD3FC',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.12,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  nextStageNodeBubble: {
    borderColor: '#0284C7',
    backgroundColor: '#38BDF8',
  },
  doneStageNodeBubble: {
    borderColor: '#24AFA3',
    backgroundColor: '#8DEBD8',
  },
  stageNumber: {
    color: '#075985',
    fontSize: 22,
    fontWeight: '900',
    lineHeight: 26,
  },
  nextStageNumber: {
    color: '#FFFFFF',
  },
  doneStageNumber: {
    color: '#075985',
  },
  mapStatusBadge: {
    minWidth: 44,
    marginTop: -4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#BAE6FD',
    backgroundColor: '#E0F7FF',
  },
  nextStatusPill: {
    backgroundColor: '#0EA5E9',
  },
  doneStatusPill: {
    backgroundColor: '#8DEBD8',
  },
  mapStatusText: {
    color: '#075985',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
  },
  nextStatusText: {
    color: '#FFFFFF',
  },
  doneStatusText: {
    color: '#075985',
  },
  nextFlag: {
    position: 'absolute',
    top: -18,
    minWidth: 46,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#0EA5E9',
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
  },
  routeSegment: {
    position: 'absolute',
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.48)',
    zIndex: 2,
  },
  mapBubbleMark: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.68)',
    backgroundColor: 'rgba(224, 247, 255, 0.45)',
  },
  mapBubbleMarkLarge: {
    right: -18,
    top: 18,
    width: 82,
    height: 82,
    borderRadius: 41,
  },
  mapBubbleMarkSmall: {
    left: 18,
    bottom: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  mapBubbleMarkTiny: {
    right: 96,
    bottom: 30,
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  mapIslandPatch: {
    position: 'absolute',
    width: 128,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(141, 235, 216, 0.22)',
  },
  mapIslandPatchLeft: {
    left: 18,
    top: 88,
    transform: [{ rotate: '-12deg' }],
  },
  mapIslandPatchRight: {
    right: 22,
    bottom: 76,
    transform: [{ rotate: '9deg' }],
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
});
