// Choosing a world, for the maru mode and for the practice modes.
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBgmControl } from '@/audio/bgm-control';
import { SFX } from '@/audio/sfx';
import { useOneShotAudio } from '@/audio/use-one-shot-audio';
import { NavImageIcon } from '@/components/NavImageIcon';
import { DepthBackdrop } from '@/components/select/backdrop';
import { getDentakuWorldNodeLayouts, getSelectionMapHeight, getWorldNodeLayouts } from '@/components/select/map-layout';
import { BubbleRoute, SingingMermaid, SoundToggleButton } from '@/components/select/map-parts';
import { styles } from '@/components/select/styles';
import type { WorldId } from '@/components/select/types';
import { DENTAKU_STAGES, DENTAKU_WORLDS, DentakuStage, DentakuWorldId } from '@/game/dentaku';
import { STAGES } from '@/game/stages';
import { Stage } from '@/game/types';
import { createValueStore } from '@/game/value-store';
import { a11yLabel } from '@/i18n/a11y-label';

export function DentakuWorldSelect({
  completedStageIds,
  stagesForProgress = DENTAKU_STAGES,
  worlds = DENTAKU_WORLDS,
  mapWidth,
  viewportWidth,
  viewportHeight,
  onBack,
  onSelectWorld,
}: {
  completedStageIds: Set<string>;
  stagesForProgress?: DentakuStage[];
  worlds?: typeof DENTAKU_WORLDS;
  mapWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  onBack: () => void;
  onSelectWorld: (worldId: DentakuWorldId) => void;
}) {
  // How far the list is scrolled only matters to the backdrop, so scrolling does not redraw this screen.
  const [scrollDepthStore] = useState(() => createValueStore(0));
  const { isVocalEnabled, toggleVocal } = useBgmControl();
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const layouts = getDentakuWorldNodeLayouts(mapWidth).slice(0, worlds.length);
  const routeLayerHeight = getSelectionMapHeight(layouts);

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="dentaku-world-select" style={styles.depthScene}>
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
          style={styles.worldScroll}
          contentContainerStyle={[styles.dentakuWorldScrollContent, { minHeight: routeLayerHeight }]}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => scrollDepthStore.set(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.dentakuWorldRouteLayer, { minHeight: routeLayerHeight }]}>
            {layouts.slice(0, -1).map((layout, index) => (
              <BubbleRoute key={`dentaku-world-route-${index}`} from={layout} to={layouts[index + 1]} />
            ))}
            {worlds.map((world, index) => (
              <DentakuWorldNode
                key={world.id}
                worldId={world.id}
                label={world.label}
                isDone={stagesForProgress.some((stage) => stage.worldId === world.id && completedStageIds.has(stage.id))}
                x={layouts[index].x}
                y={layouts[index].y}
                onPress={() => {
                  playActionSfx();
                  onSelectWorld(world.id);
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

export function WorldSelect({
  completedStageIds,
  mapWidth,
  viewportWidth,
  viewportHeight,
  onBack,
  onSelectWorld,
}: {
  completedStageIds: Set<string>;
  mapWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  onBack: () => void;
  onSelectWorld: (worldId: WorldId) => void;
}) {
  // How far the list is scrolled only matters to the backdrop, so scrolling does not redraw this screen.
  const [scrollDepthStore] = useState(() => createValueStore(0));
  const { isVocalEnabled, toggleVocal } = useBgmControl();
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const completedByIsland = (islandId: Stage['islandId']) => STAGES.filter((stage) => stage.islandId === islandId && completedStageIds.has(stage.id)).length;
  const layouts = getWorldNodeLayouts(mapWidth);
  const routeLayerHeight = getSelectionMapHeight(layouts);

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="world-select" style={styles.depthScene}>
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
          style={styles.worldScroll}
          contentContainerStyle={[styles.worldScrollContent, { minHeight: routeLayerHeight }]}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => scrollDepthStore.set(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.routeLayer, { minHeight: routeLayerHeight }]}>
            {layouts.slice(0, -1).map((layout, index) => (
              <BubbleRoute key={`world-route-${index}`} from={layout} to={layouts[index + 1]} />
            ))}
            <WorldNode
              label="+"
              title="+"
              progress={completedByIsland('addition')}
              total={STAGES.filter((stage) => stage.islandId === 'addition').length}
              x={layouts[0].x}
              y={layouts[0].y}
              onPress={() => {
                playActionSfx();
                onSelectWorld('addition');
              }}
            />
            <WorldNode
              label="-"
              title="−"
              progress={completedByIsland('subtraction')}
              total={STAGES.filter((stage) => stage.islandId === 'subtraction').length}
              x={layouts[1].x}
              y={layouts[1].y}
              onPress={() => {
                playActionSfx();
                onSelectWorld('subtraction');
              }}
            />
            <WorldNode
              label="×"
              title="×"
              progress={completedByIsland('multiplication')}
              total={STAGES.filter((stage) => stage.islandId === 'multiplication').length}
              x={layouts[2].x}
              y={layouts[2].y}
              onPress={() => {
                playActionSfx();
                onSelectWorld('multiplication');
              }}
            />
            <WorldNode
              label="÷"
              title="÷"
              progress={completedByIsland('division')}
              total={STAGES.filter((stage) => stage.islandId === 'division').length}
              x={layouts[3].x}
              y={layouts[3].y}
              onPress={() => {
                playActionSfx();
                onSelectWorld('division');
              }}
            />
            <SingingMermaid isVocalEnabled={isVocalEnabled} mapWidth={mapWidth} onPress={toggleVocal} />
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
      accessibilityLabel={a11yLabel(label)}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bubbleNode,
        styles.worldNode,
        active && styles.worldNodeActive,
        {
          left: x - 45,
          top: y - 45,
        },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.nodeBubbleInnerGlow} />
      <View pointerEvents="none" style={styles.nodeBubbleShine} />
      <Text style={[styles.worldSymbol, active && styles.worldSymbolActive]}>{title}</Text>
      <Text style={[styles.worldProgress, active && styles.worldProgressActive]}>
        {progress}/{total}
      </Text>
    </Pressable>
  );
}

function DentakuWorldNode({
  worldId,
  label,
  isDone,
  x,
  y,
  onPress,
}: {
  worldId: DentakuWorldId;
  label: string;
  isDone: boolean;
  x: number;
  y: number;
  onPress: () => void;
}) {
  const displayLabel = label === '9×9' ? '9 × 9' : label;
  const mixedCount = worldId === 'mixed2' ? 2 : worldId === 'mixed3' ? 3 : worldId === 'mixed4' ? 4 : undefined;

  return (
    <Pressable
      accessibilityLabel={a11yLabel(label)}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bubbleNode,
        styles.dentakuWorldNode,
        isDone && styles.stageNodeDone,
        {
          left: x - 40,
          top: y - 40,
        },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.nodeBubbleInnerGlow} />
      <View pointerEvents="none" style={styles.nodeBubbleShine} />
      {mixedCount ? (
        <>
          <Text style={styles.mixedWorldSymbols}>+ −</Text>
          <Text style={styles.mixedWorldSymbols}>× ÷</Text>
          <View style={styles.mixedCountBadge}>
            <Text style={styles.mixedCountText}>{mixedCount}</Text>
          </View>
        </>
      ) : (
        <Text style={styles.dentakuWorldSymbol}>{displayLabel}</Text>
      )}
    </Pressable>
  );
}
