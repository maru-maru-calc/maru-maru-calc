// Choosing a stage, for the maru mode and for the practice modes.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBgmControl } from '@/audio/bgm-control';
import { SFX } from '@/audio/sfx';
import { useOneShotAudio } from '@/audio/use-one-shot-audio';
import { NavImageIcon } from '@/components/NavImageIcon';
import { DepthBackdrop } from '@/components/select/backdrop';
import { getSelectionMapHeight, getStageNodeLayout } from '@/components/select/map-layout';
import { BubbleRoute, RoundedStarfish, SingingMermaid, SoundToggleButton } from '@/components/select/map-parts';
import { styles } from '@/components/select/styles';
import type { MapNodeLayout, StageStatus } from '@/components/select/types';
import { DentakuStage } from '@/game/dentaku';
import { STAGE_ISLANDS } from '@/game/stages';
import { Stage } from '@/game/types';
import { createValueStore } from '@/game/value-store';
import { a11yLabel } from '@/i18n/a11y-label';

export function StageSelect({
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
  // How far the list is scrolled only matters to the backdrop, so scrolling does not redraw this screen.
  const [scrollDepthStore] = useState(() => createValueStore(0));
  const { isVocalEnabled, toggleVocal } = useBgmControl();
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const completedStageCountInIsland = stages.filter((stage) => completedStageIds.has(stage.id)).length;
  const openStageCount = Math.min(stages.length, Math.max(3, completedStageCountInIsland + 2));
  const layouts = stages.map((_stage, index) => getStageNodeLayout(index, mapWidth));
  const mapHeight = Math.max(620, getSelectionMapHeight(layouts));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepthStore={scrollDepthStore} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <SoundToggleButton />
        <Pressable
          accessibilityLabel={a11yLabel('Back')}
          accessibilityRole="button"
          onPress={() => {
            playActionSfx();
            onBack();
          }}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <NavImageIcon kind="back" size={29} />
        </Pressable>
        <ScrollView
          style={styles.stageScroll}
          contentContainerStyle={[styles.stageScrollContent, { height: mapHeight }]}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => scrollDepthStore.set(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.stageMap, { height: mapHeight }]}>
            {layouts.slice(0, -1).map((layout, index) => (
              <BubbleRoute key={`route-${stages[index].id}`} from={layout} to={layouts[index + 1]} />
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
                  onPress={() => {
                    playActionSfx();
                    onStartStage(stage);
                  }}
                />
              );
            })}
            <SingingMermaid isVocalEnabled={isVocalEnabled} mapWidth={mapWidth} onPress={toggleVocal} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

export function DentakuStageSelect({
  stages,
  completedStageIds,
  mapWidth,
  viewportWidth,
  viewportHeight,
  onBack,
  onStartStage,
}: {
  stages: DentakuStage[];
  completedStageIds: Set<string>;
  mapWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  onBack: () => void;
  onStartStage: (stage: DentakuStage) => void;
}) {
  // How far the list is scrolled only matters to the backdrop, so scrolling does not redraw this screen.
  const [scrollDepthStore] = useState(() => createValueStore(0));
  const { isVocalEnabled, toggleVocal } = useBgmControl();
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const layouts = stages.map((_stage, index) => getStageNodeLayout(index, mapWidth));
  const mapHeight = Math.max(620, getSelectionMapHeight(layouts));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepthStore={scrollDepthStore} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <SoundToggleButton />
        <Pressable
          accessibilityLabel={a11yLabel('Back')}
          accessibilityRole="button"
          onPress={() => {
            playActionSfx();
            onBack();
          }}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <NavImageIcon kind="back" size={29} />
        </Pressable>
        <ScrollView
          style={styles.stageScroll}
          contentContainerStyle={[styles.stageScrollContent, { height: mapHeight }]}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => scrollDepthStore.set(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.stageMap, { height: mapHeight }]}>
            {layouts.slice(0, -1).map((layout, index) => (
              <BubbleRoute key={`dentaku-route-${stages[index].id}`} from={layout} to={layouts[index + 1]} />
            ))}
            {stages.map((stage, index) => (
              <DentakuStageNode
                key={stage.id}
                stage={stage}
                layout={layouts[index]}
                isDone={completedStageIds.has(stage.id)}
                onPress={() => {
                  playActionSfx();
                  onStartStage(stage);
                }}
              />
            ))}
            <SingingMermaid isVocalEnabled={isVocalEnabled} mapWidth={mapWidth} onPress={toggleVocal} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function DentakuStageNode({
  stage,
  layout,
  isDone,
  onPress,
}: {
  stage: DentakuStage;
  layout: MapNodeLayout;
  isDone: boolean;
  onPress: () => void;
}) {
  const stageLabel = stage.label;

  return (
    <Pressable
      accessibilityLabel={a11yLabel(stage.title)}
      accessibilityRole="button"
      testID={`kuku-stage-${stage.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bubbleNode,
        styles.stageNode,
        styles.kukuStageNode,
        {
          left: layout.x - 40,
          top: layout.y - 40,
        },
        isDone && styles.stageNodeDone,
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.nodeBubbleInnerGlow} />
      <View pointerEvents="none" style={styles.nodeBubbleShine} />
      <Text style={styles.kukuStageMainLabel}>{stageLabel}</Text>
      {isDone ? <StageDoneStarfish /> : null}
    </Pressable>
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
      accessibilityLabel={a11yLabel(`stage ${number}: make ${stage.target}`)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isLocked }}
      disabled={isLocked}
      testID={`stage-${stage.id}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.bubbleNode,
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
      <View pointerEvents="none" style={styles.nodeBubbleInnerGlow} />
      <View pointerEvents="none" style={styles.nodeBubbleShine} />
      {isLocked ? <View pointerEvents="none" style={styles.stageLockedMembrane} /> : null}
      <Text style={[styles.stageNumber, isLocked && styles.stageNumberLocked]}>#{number}</Text>
      <Text style={[styles.stageTarget, isLocked && styles.stageNumberLocked]}>{stage.target}</Text>
      {isDone ? <StageDoneStarfish /> : null}
    </Pressable>
  );
}

function StageDoneStarfish() {
  return (
    <View pointerEvents="none" style={styles.stageDoneStarfish} testID="stage-done-starfish">
      <RoundedStarfish size={24} />
    </View>
  );
}
