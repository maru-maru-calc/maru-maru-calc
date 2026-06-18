import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBgmControl } from '@/audio/bgm-control';
import { SFX } from '@/audio/sfx';
import { useOneShotAudio } from '@/audio/use-one-shot-audio';
import { DentakuGame } from '@/components/DentakuGame';
import { MarumaruGame } from '@/components/MarumaruGame';
import { NavImageIcon } from '@/components/NavImageIcon';
import { DENTAKU_STAGES, DENTAKU_WORLDS, DentakuStage, DentakuWorldId } from '@/game/dentaku';
import { getStageIndexById, STAGE_ISLANDS, STAGES } from '@/game/stages';
import { Stage } from '@/game/types';

type AppScreen = 'launch' | 'mode' | 'world' | 'stage' | 'game' | 'dentakuWorld' | 'dentakuStage' | 'dentakuGame';
type StageStatus = 'done' | 'open' | 'locked';
type WorldId = Stage['islandId'];
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
  kind: 'fish' | 'clownfish' | 'blueTang' | 'puffer' | 'seahorse' | 'squid' | 'ray' | 'turtle' | 'tuna' | 'shark' | 'whale' | 'flatfish' | 'jelly' | 'angler';
};

const DEPTH_BUBBLE_TICK_MS = 90;
const DEPTH_CREATURE_REACTION_MS = 920;
const MAP_NODE_RADIUS = 40;
const MAP_BOTTOM_SPACE_AFTER_LAST_NODE = 244;
const PLAYFUL_FONT_FAMILY = 'Noto Sans Japanese';
const LATIN_FONT_FAMILY = 'Helvetica';
const TEXT_BASE_COLOR = '#12334A';
const TEXT_ACCENT_COLOR = '#0284C7';
const GRID = 8;
const RADIUS_SM = 8;
const RADIUS_LG = 16;
const RADIUS_PILL = 999;

export default function IndexScreen() {
  const { width, height } = useWindowDimensions();
  const [screen, setScreen] = useState<AppScreen>('launch');
  const [selectedWorldId, setSelectedWorldId] = useState<WorldId>('addition');
  const [selectedDentakuWorldId, setSelectedDentakuWorldId] = useState<DentakuWorldId>('kuku');
  const [playingStageIndex, setPlayingStageIndex] = useState(0);
  const [playingDentakuStage, setPlayingDentakuStage] = useState<DentakuStage>(DENTAKU_STAGES[0]);
  const [completedStageIds, setCompletedStageIds] = useState<Set<string>>(() => new Set());
  const [completedDentakuStageIds, setCompletedDentakuStageIds] = useState<Set<string>>(() => new Set());

  const selectedIslandId = selectedWorldId;
  const selectedIsland = STAGE_ISLANDS.find((island) => island.id === selectedIslandId) ?? STAGE_ISLANDS[0];
  const selectedStages = useMemo(() => STAGES.filter((stage) => stage.islandId === selectedIslandId), [selectedIslandId]);
  const selectedDentakuStages = useMemo(() => DENTAKU_STAGES.filter((stage) => stage.worldId === selectedDentakuWorldId), [selectedDentakuWorldId]);
  const mapWidth = Math.max(320, width);

  const startStage = (stage: Stage) => {
    setPlayingStageIndex(getStageIndexById(stage.id));
    setScreen('game');
  };

  const startDentakuStage = (stage: DentakuStage) => {
    setPlayingDentakuStage(stage);
    setScreen('dentakuGame');
  };
  const startNextDentakuStage = () => {
    const currentIndex = selectedDentakuStages.findIndex((stage) => stage.id === playingDentakuStage.id);
    const nextStage = selectedDentakuStages[currentIndex + 1];
    if (nextStage) {
      setPlayingDentakuStage(nextStage);
      return;
    }
    setScreen('dentakuStage');
  };
  if (screen === 'launch') {
    return <MarumaruGame mode="launch" onComplete={() => setScreen('mode')} />;
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

  if (screen === 'dentakuGame') {
    return (
      <DentakuGame
        stage={playingDentakuStage}
        onBack={() => setScreen('dentakuStage')}
        onNextStage={startNextDentakuStage}
        onStageClear={(stageId) => {
          setCompletedDentakuStageIds((current) => {
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

  if (screen === 'dentakuStage') {
    return (
      <DentakuStageSelect
        stages={selectedDentakuStages}
        completedStageIds={completedDentakuStageIds}
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onBack={() => setScreen('dentakuWorld')}
        onStartStage={startDentakuStage}
      />
    );
  }

  if (screen === 'dentakuWorld') {
    return (
      <DentakuWorldSelect
        completedStageIds={completedDentakuStageIds}
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onBack={() => setScreen('mode')}
        onSelectWorld={(worldId) => {
          setSelectedDentakuWorldId(worldId);
          setScreen('dentakuStage');
        }}
      />
    );
  }

  if (screen === 'mode') {
    return (
      <ModeSelect
        mapWidth={mapWidth}
        viewportWidth={width}
        viewportHeight={height}
        onSelectMarumaru={() => setScreen('world')}
        onSelectDentaku={() => setScreen('dentakuWorld')}
      />
    );
  }

  return (
    <WorldSelect
      completedStageIds={completedStageIds}
      mapWidth={mapWidth}
      viewportWidth={width}
      viewportHeight={height}
      onBack={() => setScreen('mode')}
      onSelectWorld={(worldId) => {
        setSelectedWorldId(worldId);
        setScreen('stage');
      }}
    />
  );
}

function ModeSelect({
  mapWidth,
  viewportWidth,
  viewportHeight,
  onSelectMarumaru,
  onSelectDentaku,
}: {
  mapWidth: number;
  viewportWidth: number;
  viewportHeight: number;
  onSelectMarumaru: () => void;
  onSelectDentaku: () => void;
}) {
  const [scrollDepth, setScrollDepth] = useState(0);
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const centerX = mapWidth / 2;
  const modeNodeOffset = Math.min(82, Math.max(58, mapWidth * 0.21));
  const marumaruY = 176;
  const dentakuY = 344;

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="mode-select" style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepth={scrollDepth} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <ScrollView
          style={styles.worldScroll}
          contentContainerStyle={styles.modeScrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => setScrollDepth(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={styles.modeRouteLayer}>
            <BubbleRoute from={{ x: centerX - modeNodeOffset, y: marumaruY }} to={{ x: centerX + modeNodeOffset, y: dentakuY }} />
            <ModeDiver variant="boy" style={[styles.modeDiverBoy, { left: Math.max(18, centerX - 178) }]} />
            <ModeDiver variant="girl" style={[styles.modeDiverGirl, { left: Math.min(mapWidth - 136, centerX + 38) }]} />
            <ModeNode
              label="marumaru mode"
              kind="marumaru"
              x={centerX - modeNodeOffset}
              y={marumaruY}
              onPress={() => {
                playActionSfx();
                onSelectMarumaru();
              }}
            />
            <ModeNode
              label="dentaku mode"
              kind="dentaku"
              x={centerX + modeNodeOffset}
              y={dentakuY}
              onPress={() => {
                playActionSfx();
                onSelectDentaku();
              }}
            />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function ModeDiver({ variant, style }: { variant: 'boy' | 'girl'; style: StyleProp<ViewStyle> }) {
  const isGirl = variant === 'girl';

  return (
    <View pointerEvents="none" style={[styles.modeDiver, style, isGirl && styles.modeDiverGirlFlip]}>
      <View style={styles.modeDiverTrailBubbleLarge} />
      <View style={styles.modeDiverTrailBubbleSmall} />
      <View style={[styles.modeDiverArm, styles.modeDiverArmFront]} />
      <View style={[styles.modeDiverArm, styles.modeDiverArmBack]} />
      <View style={styles.modeDiverBody}>
        <View style={styles.modeDiverTank} />
        <View style={styles.modeDiverSuitBand} />
      </View>
      <View style={[styles.modeDiverLeg, styles.modeDiverLegTop]}>
        <View style={styles.modeDiverFin} />
      </View>
      <View style={[styles.modeDiverLeg, styles.modeDiverLegBottom]}>
        <View style={styles.modeDiverFin} />
      </View>
      <View style={styles.modeDiverHead}>
        {isGirl ? <View style={styles.modeDiverPonytail} /> : null}
        <View style={styles.modeDiverHair} />
        <View style={styles.modeDiverMask}>
          <View style={styles.modeDiverMaskGlass} />
        </View>
      </View>
    </View>
  );
}

function ModeNode({
  label,
  kind,
  x,
  y,
  onPress,
}: {
  label: string;
  kind: 'marumaru' | 'dentaku';
  x: number;
  y: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.bubbleNode,
        styles.modeNode,
        {
          left: x - 82,
          top: y - 82,
        },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.nodeBubbleInnerGlow} />
      <View pointerEvents="none" style={styles.nodeBubbleShine} />
      {kind === 'marumaru' ? <ModeMarumaruTitle /> : <ModeDentakuTitle />}
    </Pressable>
  );
}

function ModeMarumaruTitle() {
  return (
    <View pointerEvents="none" style={styles.modeTitleLine}>
      <View style={[styles.modeTitleBead, styles.modeTitleBeadBlue]}>
        <View style={styles.modeTitleBeadHighlight} />
      </View>
      <View style={[styles.modeTitleBead, styles.modeTitleBeadGold]}>
        <View style={styles.modeTitleBeadHighlight} />
      </View>
      <Text style={styles.modeNodeText}> = 10</Text>
    </View>
  );
}

function ModeDentakuTitle() {
  return (
    <Text pointerEvents="none" style={styles.modeNodeText}>
      4 + 6 = <Text style={styles.modeNodeUnknown}>?</Text>
    </Text>
  );
}

function DentakuWorldSelect({
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
  onSelectWorld: (worldId: DentakuWorldId) => void;
}) {
  const [scrollDepth, setScrollDepth] = useState(0);
  const { isVocalEnabled, toggleVocal } = useBgmControl();
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const layouts = getDentakuWorldNodeLayouts(mapWidth);
  const routeLayerHeight = getSelectionMapHeight(layouts);

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="dentaku-world-select" style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepth={scrollDepth} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <Pressable
          accessibilityLabel="Back"
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
          onScroll={(event) => setScrollDepth(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={[styles.dentakuWorldRouteLayer, { minHeight: routeLayerHeight }]}>
            {layouts.slice(0, -1).map((layout, index) => (
              <BubbleRoute key={`dentaku-world-route-${index}`} from={layout} to={layouts[index + 1]} />
            ))}
            {DENTAKU_WORLDS.map((world, index) => (
              <DentakuWorldNode
                key={world.id}
                worldId={world.id}
                label={world.label}
                isDone={DENTAKU_STAGES.some((stage) => stage.worldId === world.id && completedStageIds.has(stage.id))}
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

function WorldSelect({
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
  const [scrollDepth, setScrollDepth] = useState(0);
  const { isVocalEnabled, toggleVocal } = useBgmControl();
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const completedByIsland = (islandId: Stage['islandId']) => STAGES.filter((stage) => stage.islandId === islandId && completedStageIds.has(stage.id)).length;
  const layouts = getWorldNodeLayouts(mapWidth);
  const routeLayerHeight = getSelectionMapHeight(layouts);

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="world-select" style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepth={scrollDepth} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <Pressable
          accessibilityLabel="Back"
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
          onScroll={(event) => setScrollDepth(event.nativeEvent.contentOffset.y)}
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
            <MixedWorldNode label="mixed-3" count={3} x={layouts[4].x} y={layouts[4].y} onPress={() => { playActionSfx(); onSelectWorld('mixed3'); }} />
            <MixedWorldNode label="mixed-3-free" count={3} x={layouts[5].x} y={layouts[5].y} free onPress={() => { playActionSfx(); onSelectWorld('mixed3Free'); }} />
            <MixedWorldNode label="mixed-4" count={4} x={layouts[6].x} y={layouts[6].y} onPress={() => { playActionSfx(); onSelectWorld('mixed4'); }} />
            <MixedWorldNode label="mixed-4-free" count={4} x={layouts[7].x} y={layouts[7].y} free onPress={() => { playActionSfx(); onSelectWorld('mixed4Free'); }} />
            <MixedWorldNode label="mixed-5" count={5} x={layouts[8].x} y={layouts[8].y} onPress={() => { playActionSfx(); onSelectWorld('mixed5'); }} />
            <MixedWorldNode label="mixed-5-free" count={5} x={layouts[9].x} y={layouts[9].y} free onPress={() => { playActionSfx(); onSelectWorld('mixed5Free'); }} />
            <SingingMermaid isVocalEnabled={isVocalEnabled} mapWidth={mapWidth} onPress={toggleVocal} />
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function DepthBackdrop({
  width,
  height,
  scrollDepth,
  onBubblePop,
  onCreaturePress,
}: {
  width: number;
  height: number;
  scrollDepth: number;
  onBubblePop?: () => void;
  onCreaturePress?: () => void;
}) {
  const [tick, setTick] = useState(() => Date.now());
  const [bubbleStarts, setBubbleStarts] = useState<Record<string, number>>({});
  const [creatureStarts, setCreatureStarts] = useState<Record<string, number>>({});
  const bubbles = useMemo(() => getDepthBubbleSpecs(width), [width]);
  const fish = useMemo(() => getDepthFishSpecs(), []);
  const shadeOpacity = Math.min(0.44, Math.max(0, scrollDepth / 1500) * 0.44);

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), DEPTH_BUBBLE_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return (
    <View pointerEvents="box-none" style={styles.depthBackdrop}>
      <View pointerEvents="none" style={[styles.softPatch, styles.softPatchLeft]} />
      <View pointerEvents="none" style={[styles.softPatch, styles.softPatchBottom]} />
      {bubbles.map((bubble) => {
        const startAt = bubbleStarts[bubble.id] ?? 0;
        const elapsedSeconds = Math.max(0, (tick - startAt - bubble.delay) / 1000);
        const travel = height + bubble.size * 5;
        const cycle = (elapsedSeconds * bubble.speed + scrollDepth * 0.58) % travel;
        const y = height + bubble.size - cycle;
        const drift = Math.sin(elapsedSeconds * 0.58 + bubble.delay * 0.001) * bubble.drift;
        const x = bubble.xRatio * width + drift - bubble.size / 2;
        const opacity = elapsedSeconds < 0.24 ? elapsedSeconds / 0.24 : 1;

        return (
          <Pressable
            key={bubble.id}
            accessibilityLabel="decorative bubble"
            accessibilityRole="button"
            testID={`depth-background-bubble-${bubble.id}`}
            onPress={() => {
              onBubblePop?.();
              setBubbleStarts((current) => ({ ...current, [bubble.id]: Date.now() }));
            }}
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
          />
        );
      })}
      {fish.map((spec) => {
        const depthDistance = Math.abs(scrollDepth - spec.depth);
        if (depthDistance > 620 && spec.depth !== 0) {
          return null;
        }
        return (
          <DepthCreature
            key={spec.id}
            spec={spec}
            width={width}
            height={height}
            tick={tick}
            scrollDepth={scrollDepth}
            reactedAt={creatureStarts[spec.id]}
            onPress={() => {
              onCreaturePress?.();
              setCreatureStarts((current) => ({ ...current, [spec.id]: Date.now() }));
            }}
          />
        );
      })}
      <View pointerEvents="none" testID="depth-shade" style={[styles.depthShade, { opacity: shadeOpacity }]} />
    </View>
  );
}

function DepthCreature({
  spec,
  width,
  height,
  tick,
  scrollDepth,
  reactedAt,
  onPress,
}: {
  spec: DepthFishSpec;
  width: number;
  height: number;
  tick: number;
  scrollDepth: number;
  reactedAt?: number;
  onPress: () => void;
}) {
  const elapsedSeconds = Math.max(0, (tick - spec.delay) / 1000);
  const travelX = width + spec.size * 5;
  const travelY = height + spec.size * 4;
  const cycleX = (elapsedSeconds * spec.speed) % travelX;
  const cycleY = (elapsedSeconds * (spec.speed * 0.42) + scrollDepth * 0.48) % travelY;
  const x = spec.direction > 0 ? cycleX - spec.size * 2 : width - cycleX + spec.size;
  const y = height + spec.size - cycleY + Math.sin(elapsedSeconds * 0.7 + spec.depth * 0.01) * 10;
  const depthDistance = Math.abs(scrollDepth - spec.depth);
  const depthOpacity = Math.max(0, 1 - depthDistance / 520);
  const baseOpacity = spec.depth === 0 ? 0.26 : 0.36;
  const isAngler = spec.kind === 'angler';
  const isJelly = spec.kind === 'jelly';
  const isWhale = spec.kind === 'whale';
  const isFlatfish = spec.kind === 'flatfish';
  const isTall = spec.kind === 'seahorse' || spec.kind === 'squid' || spec.kind === 'turtle';
  const creatureHeight = isJelly ? spec.size * 0.9 : isWhale ? spec.size * 0.54 : isFlatfish ? spec.size * 0.62 : isTall ? spec.size * 0.86 : spec.size * 0.42;
  const reaction = getDepthCreatureReaction(spec, tick, reactedAt);

  return (
    <Pressable
      accessibilityLabel={`sea creature ${spec.kind}`}
      accessibilityRole="button"
      hitSlop={18}
      onPress={onPress}
      testID={`depth-fish-${spec.id}`}
      style={[
        styles.depthFish,
        reaction.isReacting && styles.depthFishReacting,
        {
          left: x,
          top: y,
          width: spec.size,
          height: creatureHeight,
          opacity: Math.min(isAngler ? 0.9 : 0.76, baseOpacity + depthOpacity * 0.56),
          transform: [
            { translateX: reaction.translateX },
            { translateY: reaction.translateY },
            { scaleX: (spec.direction > 0 ? -1 : 1) * reaction.flipScale },
            { scale: reaction.scale },
            { rotate: reaction.rotate },
          ],
        },
      ]}
    >
      {isAngler ? <View style={[styles.anglerGlow, { width: spec.size * 1.45, height: spec.size * 1.45, borderRadius: spec.size, right: -spec.size * 0.9, top: -spec.size * 0.52 }]} /> : null}
      {isJelly ? (
        <>
          <View style={[styles.jellyBell, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={[styles.jellyTentacle, { left: '30%', height: spec.size * 0.44, backgroundColor: spec.tint }]} />
          <View style={[styles.jellyTentacle, { left: '50%', height: spec.size * 0.54, backgroundColor: spec.tint }]} />
          <View style={[styles.jellyTentacle, { left: '70%', height: spec.size * 0.4, backgroundColor: spec.tint }]} />
        </>
      ) : spec.kind === 'shark' ? (
        <>
          <View style={[styles.sharkBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={styles.creatureEye} />
          <View style={[styles.sharkNose, { borderLeftColor: spec.tint, borderTopWidth: spec.size * 0.11, borderBottomWidth: spec.size * 0.11, borderLeftWidth: spec.size * 0.18 }]} />
          <View style={[styles.sharkTail, { borderTopWidth: spec.size * 0.18, borderBottomWidth: spec.size * 0.18, borderRightWidth: spec.size * 0.22, borderRightColor: spec.tint }]} />
          <View style={[styles.sharkFin, { borderLeftWidth: spec.size * 0.16, borderRightWidth: spec.size * 0.16, borderBottomWidth: spec.size * 0.28, borderBottomColor: spec.tint }]} />
          <View style={[styles.sharkGill, { backgroundColor: 'rgba(224, 247, 255, 0.48)' }]} />
        </>
      ) : spec.kind === 'whale' ? (
        <>
          <View style={[styles.whaleBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={styles.whaleBelly} />
          <View style={[styles.whaleTailTop, { borderTopWidth: spec.size * 0.16, borderBottomWidth: spec.size * 0.08, borderRightWidth: spec.size * 0.24, borderRightColor: spec.tint }]} />
          <View style={[styles.whaleTailBottom, { borderTopWidth: spec.size * 0.08, borderBottomWidth: spec.size * 0.16, borderRightWidth: spec.size * 0.24, borderRightColor: spec.tint }]} />
          <View style={styles.whaleEye} />
        </>
      ) : spec.kind === 'flatfish' ? (
        <>
          <View style={[styles.flatfishBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={[styles.flatfishTail, { borderTopWidth: spec.size * 0.14, borderBottomWidth: spec.size * 0.14, borderRightWidth: spec.size * 0.18, borderRightColor: spec.tint }]} />
          <View style={styles.flatfishEyeOne} />
          <View style={styles.flatfishEyeTwo} />
          <View style={styles.flatfishSpotOne} />
          <View style={styles.flatfishSpotTwo} />
        </>
      ) : spec.kind === 'clownfish' ? (
        <>
          <View style={styles.clownfishBody} />
          <View style={[styles.clownfishStripe, { left: '20%' }]} />
          <View style={[styles.clownfishStripe, { left: '49%' }]} />
          <View style={styles.clownfishTail} />
          <View style={styles.clownfishFin} />
          <View style={styles.creatureEye} />
        </>
      ) : spec.kind === 'blueTang' ? (
        <>
          <View style={styles.blueTangBody} />
          <View style={styles.blueTangBlackMark} />
          <View style={styles.blueTangTail} />
          <View style={styles.blueTangFin} />
          <View style={styles.creatureEye} />
        </>
      ) : spec.kind === 'puffer' ? (
        <>
          <View style={styles.pufferBody} />
          <View style={styles.pufferMouth} />
          <View style={styles.pufferTail} />
          <View style={styles.pufferSpotOne} />
          <View style={styles.pufferSpotTwo} />
          <View style={styles.creatureEye} />
        </>
      ) : spec.kind === 'seahorse' ? (
        <>
          <View style={styles.seahorseBody} />
          <View style={styles.seahorseHead} />
          <View style={styles.seahorseSnout} />
          <View style={styles.seahorseTail} />
          <View style={styles.seahorseFin} />
          <View style={styles.seahorseEye} />
        </>
      ) : spec.kind === 'squid' ? (
        <>
          <View style={styles.squidHead} />
          <View style={styles.squidFinLeft} />
          <View style={styles.squidFinRight} />
          <View style={[styles.squidTentacle, { left: '27%' }]} />
          <View style={[styles.squidTentacle, { left: '43%' }]} />
          <View style={[styles.squidTentacle, { left: '59%' }]} />
          <View style={styles.squidEyeLeft} />
          <View style={styles.squidEyeRight} />
        </>
      ) : spec.kind === 'ray' ? (
        <>
          <View style={styles.rayBody} />
          <View style={styles.rayWingLeft} />
          <View style={styles.rayWingRight} />
          <View style={styles.rayTail} />
          <View style={styles.rayEyeLeft} />
          <View style={styles.rayEyeRight} />
        </>
      ) : spec.kind === 'turtle' ? (
        <>
          <View style={styles.turtleShell} />
          <View style={styles.turtleShellPattern} />
          <View style={styles.turtleHead} />
          <View style={styles.turtleFlipperFront} />
          <View style={styles.turtleFlipperBack} />
          <View style={styles.creatureEye} />
        </>
      ) : spec.kind === 'tuna' ? (
        <>
          <View style={[styles.tunaBody, { backgroundColor: spec.tint, borderRadius: spec.size }]} />
          <View style={styles.tunaLine} />
          <View style={[styles.tunaTail, { borderTopWidth: spec.size * 0.18, borderBottomWidth: spec.size * 0.18, borderRightWidth: spec.size * 0.24, borderRightColor: spec.tint }]} />
          <View style={[styles.tunaFin, { borderLeftWidth: spec.size * 0.12, borderRightWidth: spec.size * 0.12, borderBottomWidth: spec.size * 0.18, borderBottomColor: spec.tint }]} />
          <View style={styles.creatureEye} />
        </>
      ) : (
        <>
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
          {isAngler ? <View style={[styles.anglerLight, { right: -spec.size * 0.46, top: -spec.size * 0.06 }]} /> : null}
        </>
      )}
    </Pressable>
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
        styles.bubbleNode,
        styles.worldNode,
        styles.mixedWorldNode,
        {
          left: x - 45,
          top: y - 45,
        },
        pressed && styles.pressed,
      ]}
    >
      <View pointerEvents="none" style={styles.nodeBubbleInnerGlow} />
      <View pointerEvents="none" style={styles.nodeBubbleShine} />
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
      accessibilityLabel={label}
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
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepth={scrollDepth} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <Pressable
          accessibilityLabel="Back"
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
          onScroll={(event) => setScrollDepth(event.nativeEvent.contentOffset.y)}
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

function DentakuStageSelect({
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
  const [scrollDepth, setScrollDepth] = useState(0);
  const { isVocalEnabled, toggleVocal } = useBgmControl();
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const layouts = stages.map((_stage, index) => getStageNodeLayout(index, mapWidth));
  const mapHeight = Math.max(620, getSelectionMapHeight(layouts));

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepth={scrollDepth} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <Pressable
          accessibilityLabel="Back"
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
          onScroll={(event) => setScrollDepth(event.nativeEvent.contentOffset.y)}
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
      accessibilityLabel={stage.title}
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

function RoundedStarfish({ size, style }: { size: number; style?: StyleProp<ViewStyle> }) {
  const armWidth = size * 0.34;
  const armHeight = size * 0.5;
  const center = size / 2;
  const armRadius = size * 0.23;
  const dotSize = size * 0.12;

  return (
    <View style={[{ width: size, height: size }, style]}>
      {[0, 1, 2, 3, 4].map((index) => {
        const angle = -90 + index * 72;
        const radians = (angle * Math.PI) / 180;
        return (
          <View
            key={index}
            style={[
              styles.roundedStarfishArm,
              {
                width: armWidth,
                height: armHeight,
                borderRadius: armWidth,
                left: center + Math.cos(radians) * armRadius - armWidth / 2,
                top: center + Math.sin(radians) * armRadius - armHeight / 2,
                transform: [{ rotate: `${angle + 90}deg` }],
              },
            ]}
          />
        );
      })}
      <View
        style={[
          styles.roundedStarfishCenter,
          {
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: size * 0.21,
            left: center - size * 0.21,
            top: center - size * 0.21,
          },
        ]}
      />
      {[0, 1, 2].map((index) => (
        <View
          key={index}
          style={[
            styles.roundedStarfishDot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              left: center + Math.cos((-72 + index * 72) * (Math.PI / 180)) * (size * 0.18) - dotSize / 2,
              top: center + Math.sin((-72 + index * 72) * (Math.PI / 180)) * (size * 0.18) - dotSize / 2,
            },
          ]}
        />
      ))}
    </View>
  );
}

type MapNodeLayout = {
  x: number;
  y: number;
};

function BubbleRoute({ from, to }: { from: MapNodeLayout; to: MapNodeLayout }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx);
  const bubbleCount = Math.max(3, Math.floor(length / 38));

  return (
    <>
      {Array.from({ length: bubbleCount }).map((_, index) => {
        const progress = (index + 1) / (bubbleCount + 1);
        const wave = Math.sin(progress * Math.PI * 2 + angle) * 9;
        const x = from.x + dx * progress + Math.cos(angle + Math.PI / 2) * wave;
        const y = from.y + dy * progress + Math.sin(angle + Math.PI / 2) * wave;
        const size = 8 + (index % 3) * 3;
        return (
          <View
            key={`route-bubble-${index}`}
            pointerEvents="none"
            style={[
              styles.routeBubble,
              { left: x - size / 2, top: y - size / 2, width: size, height: size, borderRadius: size / 2 },
            ]}
          />
        );
      })}
    </>
  );
}

function SingingMermaid({
  isVocalEnabled,
  mapWidth,
  onPress,
  style,
}: {
  isVocalEnabled: boolean;
  mapWidth: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const left = Math.min(Math.max(16, mapWidth * 0.08), 46);

  return (
    <Pressable
      accessibilityLabel={isVocalEnabled ? 'turn off mermaid song' : 'turn on mermaid song'}
      accessibilityRole="switch"
      accessibilityState={{ checked: isVocalEnabled }}
      onPress={onPress}
      testID="singing-mermaid"
      style={({ pressed }) => [styles.singingMermaid, { left }, style, pressed && styles.pressed]}
    >
      <View style={styles.mermaidSongBubbleOne} />
      <View style={styles.mermaidSongBubbleTwo} />
      <View style={styles.mermaidSongBubbleThree} />
      {isVocalEnabled ? (
        <>
          <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteOne]}>
            ♪
          </Text>
          <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteTwo]}>
            ♫
          </Text>
          <Text pointerEvents="none" style={[styles.mermaidMusicNote, styles.mermaidMusicNoteThree]}>
            ♪
          </Text>
        </>
      ) : null}
      <View style={styles.mermaidRockBack} />
      <View style={styles.mermaidRockLeft} />
      <View style={styles.mermaidRockRight} />
      <View style={styles.mermaidTailFin} />
      <View style={styles.mermaidTail} />
      <View style={styles.mermaidBody} />
      <View style={styles.mermaidArmBack} />
      <View style={styles.mermaidArmFront} />
      <View style={styles.mermaidHairBack} />
      <View style={styles.mermaidLongHair} />
      <View style={styles.mermaidHead} />
      <View style={styles.mermaidHairFront} />
      <View style={styles.mermaidEye} />
      <View style={styles.mermaidMouth} />
      <View style={styles.mermaidHairShine} />
    </Pressable>
  );
}

function getDepthCreatureReaction(spec: DepthFishSpec, tick: number, reactedAt?: number) {
  if (!reactedAt) {
    return {
      flipScale: 1,
      isReacting: false,
      rotate: '0deg',
      scale: 1,
      translateX: 0,
      translateY: 0,
    };
  }

  const progress = clamp((tick - reactedAt) / DEPTH_CREATURE_REACTION_MS, 0, 1);
  const easeOut = 1 - Math.pow(1 - progress, 3);
  const fadeBack = 1 - progress;
  const fleeDirection = spec.direction > 0 ? 1 : -1;
  const isPuff = spec.kind === 'puffer' || spec.kind === 'whale';
  const isDart = spec.kind === 'shark' || spec.kind === 'tuna' || spec.kind === 'clownfish' || spec.kind === 'blueTang' || spec.kind === 'fish';
  const isBob = spec.kind === 'seahorse' || spec.kind === 'squid' || spec.kind === 'jelly';
  const isDive = spec.kind === 'ray' || spec.kind === 'flatfish' || spec.kind === 'turtle' || spec.kind === 'angler';

  if (isPuff) {
    return {
      flipScale: 1,
      isReacting: progress < 1,
      rotate: `${Math.sin(progress * Math.PI * 4) * 4 * fadeBack}deg`,
      scale: 1 + Math.sin(progress * Math.PI) * 0.28,
      translateX: fleeDirection * easeOut * 10,
      translateY: -Math.sin(progress * Math.PI) * 6,
    };
  }

  if (isBob) {
    return {
      flipScale: 1,
      isReacting: progress < 1,
      rotate: `${Math.sin(progress * Math.PI * 5) * 8 * fadeBack}deg`,
      scale: 1 - Math.sin(progress * Math.PI) * 0.08,
      translateX: fleeDirection * Math.sin(progress * Math.PI) * 8,
      translateY: -Math.sin(progress * Math.PI) * 34,
    };
  }

  if (isDive) {
    return {
      flipScale: 1,
      isReacting: progress < 1,
      rotate: `${fleeDirection * Math.sin(progress * Math.PI) * -11}deg`,
      scale: 1 - Math.sin(progress * Math.PI) * 0.1,
      translateX: fleeDirection * easeOut * 20,
      translateY: easeOut * 42,
    };
  }

  return {
    flipScale: isDart && progress < 0.32 ? -1 : 1,
    isReacting: progress < 1,
    rotate: `${fleeDirection * Math.sin(progress * Math.PI) * 8 * fadeBack}deg`,
    scale: 1,
    translateX: fleeDirection * easeOut * 92,
    translateY: Math.sin(progress * Math.PI * 2) * 10 * fadeBack,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getStageNodeLayout(index: number, mapWidth: number): MapNodeLayout {
  const centerX = mapWidth / 2;
  const spiral = index * 0.82 - Math.PI / 2;
  const radius = Math.min(112, 26 + index * 9, mapWidth * 0.31);
  return {
    x: centerX + Math.cos(spiral) * radius,
    y: 96 + index * 104,
  };
}

function getSelectionMapHeight(layouts: MapNodeLayout[]) {
  const lastNodeBottom = layouts.reduce((max, layout) => Math.max(max, layout.y + MAP_NODE_RADIUS), 0);
  return lastNodeBottom + MAP_BOTTOM_SPACE_AFTER_LAST_NODE;
}

function getWorldNodeLayouts(mapWidth: number): MapNodeLayout[] {
  const centerX = mapWidth / 2;
  return Array.from({ length: 10 }, (_, index) => {
    const spiral = index * 0.9 - Math.PI / 2;
    const radius = Math.min(118, 24 + index * 16, mapWidth * 0.32);
    return {
      x: centerX + Math.cos(spiral) * radius,
      y: 104 + index * 132,
    };
  });
}

function getDentakuWorldNodeLayouts(mapWidth: number): MapNodeLayout[] {
  const centerX = mapWidth / 2;
  return Array.from({ length: DENTAKU_WORLDS.length }, (_, index) => {
    const spiral = index * 0.92 - Math.PI / 2;
    const radius = Math.min(112, 24 + index * 15, mapWidth * 0.31);
    return {
      x: centerX + Math.cos(spiral) * radius,
      y: 104 + index * 132,
    };
  });
}

function getDepthBubbleSpecs(width: number): DepthBubbleSpec[] {
  const wideOffset = width > 520 ? 0.04 : 0;
  return [
    { id: 'large-right', xRatio: 0.94 - wideOffset, size: 116, speed: 15, delay: 0, drift: 9 },
    { id: 'small-left', xRatio: 0.12 + wideOffset, size: 60, speed: 21, delay: 900, drift: 7 },
    { id: 'tiny-right', xRatio: 0.78, size: 30, speed: 18, delay: 1600, drift: 5 },
    { id: 'medium-right', xRatio: 0.84, size: 54, speed: 12, delay: 4100, drift: 8 },
    { id: 'soft-low-left', xRatio: 0.05 + wideOffset, size: 92, speed: 10, delay: 1700, drift: 7 },
    { id: 'soft-center-right', xRatio: 0.66, size: 36, speed: 14, delay: 6100, drift: 9 },
  ];
}

function getDepthFishSpecs(): DepthFishSpec[] {
  return [
    { id: 'shallow-clownfish', depth: 0, yRatio: 0.2, size: 42, speed: 8, delay: 0, direction: 1, tint: 'rgba(251, 146, 60, 0.58)', kind: 'clownfish' },
    { id: 'shallow-blue-tang', depth: 160, yRatio: 0.38, size: 46, speed: 7, delay: 1800, direction: -1, tint: 'rgba(96, 165, 250, 0.56)', kind: 'blueTang' },
    { id: 'shallow-puffer', depth: 300, yRatio: 0.24, size: 42, speed: 5, delay: 3200, direction: 1, tint: 'rgba(250, 204, 21, 0.56)', kind: 'puffer' },
    { id: 'shallow-turtle', depth: 430, yRatio: 0.43, size: 50, speed: 4, delay: 4700, direction: -1, tint: 'rgba(74, 222, 128, 0.5)', kind: 'turtle' },
    { id: 'middle-tuna', depth: 560, yRatio: 0.18, size: 50, speed: 10, delay: 3600, direction: 1, tint: 'rgba(56, 189, 248, 0.5)', kind: 'tuna' },
    { id: 'middle-flatfish', depth: 700, yRatio: 0.4, size: 42, speed: 5, delay: 2200, direction: -1, tint: 'rgba(94, 234, 212, 0.45)', kind: 'flatfish' },
    { id: 'middle-squid', depth: 840, yRatio: 0.5, size: 44, speed: 5, delay: 6200, direction: 1, tint: 'rgba(244, 114, 182, 0.48)', kind: 'squid' },
    { id: 'middle-shark', depth: 980, yRatio: 0.25, size: 62, speed: 7, delay: 1200, direction: -1, tint: 'rgba(125, 211, 252, 0.5)', kind: 'shark' },
    { id: 'deep-ray', depth: 1120, yRatio: 0.44, size: 60, speed: 4, delay: 7600, direction: 1, tint: 'rgba(196, 181, 253, 0.42)', kind: 'ray' },
    { id: 'deep-seahorse', depth: 1260, yRatio: 0.24, size: 42, speed: 3, delay: 6900, direction: -1, tint: 'rgba(253, 186, 116, 0.52)', kind: 'seahorse' },
    { id: 'deep-jelly', depth: 1400, yRatio: 0.5, size: 46, speed: 5, delay: 3400, direction: 1, tint: 'rgba(103, 232, 249, 0.42)', kind: 'jelly' },
    { id: 'deep-whale', depth: 1540, yRatio: 0.28, size: 82, speed: 3, delay: 5200, direction: 1, tint: 'rgba(125, 211, 252, 0.44)', kind: 'whale' },
    { id: 'deep-angler', depth: 1680, yRatio: 0.34, size: 54, speed: 4, delay: 3100, direction: -1, tint: 'rgba(94, 234, 212, 0.46)', kind: 'angler' },
  ];
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#C6E8F4',
    fontFamily: PLAYFUL_FONT_FAMILY,
  },
  depthScene: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#C6E8F4',
    position: 'relative',
  },
  depthBackdrop: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    zIndex: 4,
    elevation: 4,
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
    zIndex: 2,
  },
  depthShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#082F49',
  },
  depthFish: {
    position: 'absolute',
    zIndex: 3,
  },
  depthFishReacting: {
    zIndex: 4,
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
  creatureEye: {
    position: 'absolute',
    left: '17%',
    top: '31%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  clownfishBody: {
    position: 'absolute',
    left: '4%',
    top: '15%',
    width: '72%',
    height: '70%',
    borderRadius: RADIUS_PILL,
    backgroundColor: 'rgba(251, 146, 60, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.38)',
    transform: [{ scaleY: 0.78 }],
  },
  clownfishStripe: {
    position: 'absolute',
    top: '16%',
    width: '12%',
    height: '68%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.62)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.18)',
  },
  clownfishTail: {
    position: 'absolute',
    right: '1%',
    top: '20%',
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 13,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(251, 146, 60, 0.56)',
  },
  clownfishFin: {
    position: 'absolute',
    left: '42%',
    bottom: '-2%',
    width: 10,
    height: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(253, 186, 116, 0.5)',
    transform: [{ rotate: '-18deg' }],
  },
  blueTangBody: {
    position: 'absolute',
    left: '3%',
    top: '13%',
    width: '72%',
    height: '72%',
    borderRadius: 999,
    backgroundColor: 'rgba(96, 165, 250, 0.54)',
    transform: [{ scaleY: 0.78 }],
  },
  blueTangBlackMark: {
    position: 'absolute',
    left: '24%',
    top: '25%',
    width: '44%',
    height: '28%',
    borderRadius: 999,
    backgroundColor: 'rgba(15, 23, 42, 0.26)',
    transform: [{ rotate: '-9deg' }],
  },
  blueTangTail: {
    position: 'absolute',
    right: '1%',
    top: '19%',
    width: 0,
    height: 0,
    borderTopWidth: 9,
    borderBottomWidth: 9,
    borderRightWidth: 15,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(253, 224, 71, 0.58)',
  },
  blueTangFin: {
    position: 'absolute',
    left: '39%',
    bottom: '-3%',
    width: 12,
    height: 7,
    borderRadius: 8,
    backgroundColor: 'rgba(147, 197, 253, 0.42)',
    transform: [{ rotate: '-14deg' }],
  },
  pufferBody: {
    position: 'absolute',
    left: '8%',
    top: '3%',
    width: '68%',
    height: '94%',
    borderRadius: 999,
    backgroundColor: 'rgba(253, 224, 71, 0.56)',
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.34)',
  },
  pufferMouth: {
    position: 'absolute',
    left: '13%',
    top: '44%',
    width: 6,
    height: 4,
    borderRadius: 3,
    backgroundColor: 'rgba(120, 53, 15, 0.28)',
  },
  pufferTail: {
    position: 'absolute',
    right: '3%',
    top: '28%',
    width: 0,
    height: 0,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderRightWidth: 12,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRightColor: 'rgba(250, 204, 21, 0.54)',
  },
  pufferSpotOne: {
    position: 'absolute',
    left: '38%',
    top: '25%',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(120, 113, 108, 0.28)',
  },
  pufferSpotTwo: {
    position: 'absolute',
    left: '51%',
    top: '56%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(120, 113, 108, 0.24)',
  },
  seahorseBody: {
    position: 'absolute',
    left: '28%',
    top: '26%',
    width: '36%',
    height: '52%',
    borderRadius: 999,
    backgroundColor: 'rgba(253, 186, 116, 0.5)',
    transform: [{ rotate: '14deg' }],
  },
  seahorseHead: {
    position: 'absolute',
    left: '19%',
    top: '9%',
    width: '42%',
    height: '33%',
    borderRadius: 999,
    backgroundColor: 'rgba(253, 186, 116, 0.54)',
  },
  seahorseSnout: {
    position: 'absolute',
    left: '5%',
    top: '21%',
    width: '24%',
    height: '9%',
    borderRadius: 999,
    backgroundColor: 'rgba(253, 186, 116, 0.54)',
  },
  seahorseTail: {
    position: 'absolute',
    left: '44%',
    bottom: '1%',
    width: '30%',
    height: '28%',
    borderRadius: 999,
    borderWidth: 4,
    borderLeftColor: 'rgba(253, 186, 116, 0.5)',
    borderBottomColor: 'rgba(253, 186, 116, 0.5)',
    borderRightColor: 'transparent',
    borderTopColor: 'transparent',
  },
  seahorseFin: {
    position: 'absolute',
    right: '21%',
    top: '43%',
    width: 9,
    height: 11,
    borderRadius: 8,
    backgroundColor: 'rgba(254, 215, 170, 0.42)',
  },
  seahorseEye: {
    position: 'absolute',
    left: '28%',
    top: '16%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  squidHead: {
    position: 'absolute',
    left: '24%',
    top: '3%',
    width: '52%',
    height: '50%',
    borderRadius: 999,
    backgroundColor: 'rgba(244, 114, 182, 0.46)',
    transform: [{ scaleY: 1.16 }],
  },
  squidFinLeft: {
    position: 'absolute',
    left: '17%',
    top: '17%',
    width: 10,
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 207, 232, 0.36)',
    transform: [{ rotate: '26deg' }],
  },
  squidFinRight: {
    position: 'absolute',
    right: '17%',
    top: '17%',
    width: 10,
    height: 16,
    borderRadius: 10,
    backgroundColor: 'rgba(251, 207, 232, 0.36)',
    transform: [{ rotate: '-26deg' }],
  },
  squidTentacle: {
    position: 'absolute',
    top: '54%',
    width: 4,
    height: '36%',
    borderRadius: 4,
    backgroundColor: 'rgba(244, 114, 182, 0.42)',
  },
  squidEyeLeft: {
    position: 'absolute',
    left: '39%',
    top: '30%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  squidEyeRight: {
    position: 'absolute',
    left: '55%',
    top: '30%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  rayBody: {
    position: 'absolute',
    left: '18%',
    top: '20%',
    width: '64%',
    height: '48%',
    borderRadius: 999,
    backgroundColor: 'rgba(196, 181, 253, 0.38)',
    transform: [{ scaleY: 0.72 }],
  },
  rayWingLeft: {
    position: 'absolute',
    left: '1%',
    top: '25%',
    width: '42%',
    height: '36%',
    borderRadius: 999,
    backgroundColor: 'rgba(221, 214, 254, 0.32)',
    transform: [{ rotate: '-12deg' }],
  },
  rayWingRight: {
    position: 'absolute',
    right: '1%',
    top: '25%',
    width: '42%',
    height: '36%',
    borderRadius: 999,
    backgroundColor: 'rgba(221, 214, 254, 0.32)',
    transform: [{ rotate: '12deg' }],
  },
  rayTail: {
    position: 'absolute',
    left: '48%',
    top: '63%',
    width: 3,
    height: '36%',
    borderRadius: 3,
    backgroundColor: 'rgba(196, 181, 253, 0.36)',
  },
  rayEyeLeft: {
    position: 'absolute',
    left: '39%',
    top: '33%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  rayEyeRight: {
    position: 'absolute',
    left: '55%',
    top: '33%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
  },
  turtleShell: {
    position: 'absolute',
    left: '21%',
    top: '22%',
    width: '52%',
    height: '45%',
    borderRadius: 999,
    backgroundColor: 'rgba(74, 222, 128, 0.48)',
    borderWidth: 2,
    borderColor: 'rgba(21, 128, 61, 0.24)',
  },
  turtleShellPattern: {
    position: 'absolute',
    left: '36%',
    top: '28%',
    width: '22%',
    height: '30%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(220, 252, 231, 0.52)',
  },
  turtleHead: {
    position: 'absolute',
    left: '5%',
    top: '31%',
    width: '22%',
    height: '22%',
    borderRadius: 999,
    backgroundColor: 'rgba(134, 239, 172, 0.44)',
  },
  turtleFlipperFront: {
    position: 'absolute',
    left: '28%',
    top: '7%',
    width: 13,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(187, 247, 208, 0.34)',
    transform: [{ rotate: '-20deg' }],
  },
  turtleFlipperBack: {
    position: 'absolute',
    left: '57%',
    bottom: '16%',
    width: 13,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(187, 247, 208, 0.34)',
    transform: [{ rotate: '22deg' }],
  },
  tunaBody: {
    position: 'absolute',
    left: 0,
    top: '18%',
    width: '78%',
    height: '58%',
    transform: [{ scaleY: 0.82 }],
  },
  tunaTail: {
    position: 'absolute',
    right: '-2%',
    top: '14%',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  tunaFin: {
    position: 'absolute',
    left: '42%',
    top: '-10%',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  tunaLine: {
    position: 'absolute',
    left: '18%',
    right: '20%',
    top: '47%',
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(224, 247, 255, 0.48)',
  },
  sharkBody: {
    position: 'absolute',
    left: '4%',
    top: '18%',
    width: '72%',
    height: '58%',
    transform: [{ scaleY: 0.72 }],
  },
  sharkNose: {
    position: 'absolute',
    left: '-4%',
    top: '31%',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  sharkTail: {
    position: 'absolute',
    right: '-3%',
    top: '13%',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  sharkFin: {
    position: 'absolute',
    left: '36%',
    top: '-16%',
    width: 0,
    height: 0,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  sharkGill: {
    position: 'absolute',
    left: '25%',
    top: '33%',
    width: 2,
    height: 11,
    borderRadius: 2,
    transform: [{ rotate: '12deg' }],
  },
  whaleBody: {
    position: 'absolute',
    left: 0,
    top: '10%',
    width: '78%',
    height: '74%',
  },
  whaleBelly: {
    position: 'absolute',
    left: '13%',
    right: '24%',
    bottom: '13%',
    height: '20%',
    borderRadius: 999,
    backgroundColor: 'rgba(224, 247, 255, 0.22)',
  },
  whaleTailTop: {
    position: 'absolute',
    right: '-2%',
    top: '20%',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-18deg' }],
  },
  whaleTailBottom: {
    position: 'absolute',
    right: '-2%',
    bottom: '16%',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '18deg' }],
  },
  whaleEye: {
    position: 'absolute',
    left: '17%',
    top: '34%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  flatfishBody: {
    position: 'absolute',
    left: '6%',
    top: 0,
    width: '72%',
    height: '100%',
    transform: [{ scaleY: 0.78 }],
  },
  flatfishTail: {
    position: 'absolute',
    right: '2%',
    top: '27%',
    width: 0,
    height: 0,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  flatfishEyeOne: {
    position: 'absolute',
    left: '28%',
    top: '28%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  flatfishEyeTwo: {
    position: 'absolute',
    left: '39%',
    top: '24%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  flatfishSpotOne: {
    position: 'absolute',
    left: '26%',
    top: '56%',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(224, 247, 255, 0.26)',
  },
  flatfishSpotTwo: {
    position: 'absolute',
    left: '52%',
    top: '38%',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(224, 247, 255, 0.24)',
  },
  jellyBell: {
    position: 'absolute',
    left: '10%',
    top: 0,
    width: '80%',
    height: '48%',
    borderWidth: 2,
    borderColor: 'rgba(224, 247, 255, 0.42)',
  },
  jellyTentacle: {
    position: 'absolute',
    top: '42%',
    width: 3,
    borderRadius: 3,
    opacity: 0.62,
  },
  anglerGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(250, 204, 21, 0.2)',
    shadowColor: '#FDE68A',
    shadowOpacity: 0.52,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
  },
  anglerLight: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FDE68A',
    shadowColor: '#FDE68A',
    shadowOpacity: 0.86,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
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
    zIndex: 2,
    elevation: 2,
  },
  worldScrollContent: {
    minHeight: 1580,
    paddingTop: GRID * 10,
    paddingBottom: GRID * 12,
  },
  routeLayer: {
    position: 'relative',
    minHeight: 1580,
  },
  modeScrollContent: {
    minHeight: 620,
    paddingTop: 0,
    paddingBottom: 0,
  },
  modeRouteLayer: {
    position: 'relative',
    minHeight: 620,
  },
  modeDiver: {
    position: 'absolute',
    top: 262,
    width: 124,
    height: 86,
    opacity: 0.82,
    transform: [{ rotate: '-12deg' }],
    zIndex: 7,
  },
  modeDiverGirlFlip: {
    transform: [{ scaleX: -1 }, { rotate: '10deg' }],
  },
  modeDiverBoy: {
    top: 326,
  },
  modeDiverGirl: {
    top: 86,
  },
  modeDiverBody: {
    position: 'absolute',
    left: 43,
    top: 30,
    width: 42,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(71, 85, 105, 0.74)',
    borderWidth: 2,
    borderColor: 'rgba(224, 247, 255, 0.58)',
  },
  modeDiverTank: {
    position: 'absolute',
    left: 7,
    top: -9,
    width: 28,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(226, 232, 240, 0.72)',
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.24)',
  },
  modeDiverSuitBand: {
    position: 'absolute',
    right: 7,
    top: 2,
    width: 7,
    height: 20,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.54)',
  },
  modeDiverHead: {
    position: 'absolute',
    left: 20,
    top: 28,
    width: 27,
    height: 24,
    borderRadius: 999,
    backgroundColor: 'rgba(253, 224, 197, 0.78)',
  },
  modeDiverHair: {
    position: 'absolute',
    left: -2,
    top: -3,
    width: 22,
    height: 12,
    borderRadius: 999,
    backgroundColor: 'rgba(120, 53, 15, 0.66)',
    transform: [{ rotate: '-18deg' }],
  },
  modeDiverPonytail: {
    position: 'absolute',
    left: -13,
    top: -5,
    width: 22,
    height: 15,
    borderRadius: 999,
    backgroundColor: 'rgba(120, 53, 15, 0.58)',
    transform: [{ rotate: '-28deg' }],
  },
  modeDiverMask: {
    position: 'absolute',
    left: -1,
    top: 7,
    width: 23,
    height: 13,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(244, 114, 182, 0.72)',
    backgroundColor: 'rgba(224, 247, 255, 0.42)',
  },
  modeDiverMaskGlass: {
    position: 'absolute',
    left: 5,
    top: 3,
    width: 9,
    height: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  modeDiverArm: {
    position: 'absolute',
    width: 28,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(253, 224, 197, 0.7)',
  },
  modeDiverArmFront: {
    left: 3,
    top: 52,
    transform: [{ rotate: '-28deg' }],
  },
  modeDiverArmBack: {
    left: 49,
    top: 56,
    transform: [{ rotate: '24deg' }],
  },
  modeDiverLeg: {
    position: 'absolute',
    width: 34,
    height: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(30, 41, 59, 0.68)',
  },
  modeDiverLegTop: {
    left: 80,
    top: 31,
    transform: [{ rotate: '-28deg' }],
  },
  modeDiverLegBottom: {
    left: 78,
    top: 53,
    transform: [{ rotate: '18deg' }],
  },
  modeDiverFin: {
    position: 'absolute',
    right: -16,
    top: -5,
    width: 20,
    height: 17,
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderLeftWidth: 18,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(250, 204, 21, 0.78)',
  },
  modeDiverTrailBubbleLarge: {
    position: 'absolute',
    left: 4,
    top: 12,
    width: 9,
    height: 9,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.78)',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  modeDiverTrailBubbleSmall: {
    position: 'absolute',
    left: 18,
    top: 2,
    width: 6,
    height: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
  },
  dentakuWorldScrollContent: {
    minHeight: 1050,
    paddingTop: GRID * 10,
    paddingBottom: GRID * 12,
  },
  dentakuWorldRouteLayer: {
    position: 'relative',
    minHeight: 1050,
  },
  dentakuWorldMermaid: {
    left: 0,
    top: 458,
    bottom: 'auto',
    opacity: 0.68,
    transform: [{ scale: 0.78 }],
  },
  dentakuStageMermaid: {
    left: 0,
    top: 458,
    bottom: 'auto',
    opacity: 0.62,
    transform: [{ scale: 0.72 }],
  },
  singingMermaid: {
    position: 'absolute',
    bottom: 14,
    width: 176,
    height: 138,
    opacity: 0.76,
  },
  singingMermaidActive: {
    opacity: 1,
    shadowColor: '#FDE68A',
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  mermaidSongBubbleOne: {
    position: 'absolute',
    right: 30,
    top: 14,
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.56)',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  mermaidSongBubbleTwo: {
    position: 'absolute',
    right: 14,
    top: 34,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.44)',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  mermaidSongBubbleThree: {
    position: 'absolute',
    right: 50,
    top: 4,
    width: 9,
    height: 9,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.4)',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
  },
  mermaidSongBubbleActive: {
    borderColor: 'rgba(56, 189, 248, 0.78)',
    backgroundColor: 'rgba(224, 247, 255, 0.5)',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.34,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
  },
  mermaidSongBubbleActiveStrong: {
    borderColor: 'rgba(45, 212, 191, 0.82)',
    backgroundColor: 'rgba(204, 251, 241, 0.52)',
    shadowColor: '#2DD4BF',
    shadowOpacity: 0.36,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  mermaidSongPulse: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.36)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  mermaidSongPulseOne: {
    right: 22,
    top: 6,
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  mermaidSongPulseTwo: {
    right: 2,
    top: 26,
    width: 25,
    height: 25,
    borderRadius: 13,
  },
  mermaidMusicNote: {
    position: 'absolute',
    zIndex: 3,
    color: TEXT_ACCENT_COLOR,
    fontFamily: LATIN_FONT_FAMILY,
    fontWeight: '900',
    textShadowColor: 'rgba(255, 255, 255, 0.82)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  mermaidMusicNoteOne: {
    right: 36,
    top: -2,
    fontSize: 18,
    lineHeight: 20,
    transform: [{ rotate: '-10deg' }],
  },
  mermaidMusicNoteTwo: {
    right: 11,
    top: 13,
    fontSize: 20,
    lineHeight: 22,
    color: TEXT_ACCENT_COLOR,
    transform: [{ rotate: '8deg' }],
  },
  mermaidMusicNoteThree: {
    right: 55,
    top: 24,
    fontSize: 15,
    lineHeight: 18,
    color: TEXT_ACCENT_COLOR,
    opacity: 0.9,
    transform: [{ rotate: '-18deg' }],
  },
  mermaidRockBack: {
    position: 'absolute',
    left: 18,
    bottom: 2,
    width: 138,
    height: 38,
    borderRadius: 24,
    backgroundColor: 'rgba(56, 189, 248, 0.22)',
    borderWidth: 2,
    borderColor: 'rgba(224, 247, 255, 0.28)',
  },
  mermaidRockBackActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.3)',
    borderColor: 'rgba(224, 247, 255, 0.4)',
  },
  mermaidRockLeft: {
    position: 'absolute',
    left: 8,
    bottom: 4,
    width: 76,
    height: 34,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 165, 233, 0.24)',
    transform: [{ rotate: '-7deg' }],
  },
  mermaidRockLeftActive: {
    backgroundColor: 'rgba(14, 165, 233, 0.32)',
  },
  mermaidRockRight: {
    position: 'absolute',
    right: 8,
    bottom: 0,
    width: 78,
    height: 42,
    borderRadius: 26,
    backgroundColor: 'rgba(6, 182, 212, 0.2)',
    transform: [{ rotate: '8deg' }],
  },
  mermaidRockRightActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.3)',
  },
  mermaidTail: {
    position: 'absolute',
    left: 70,
    bottom: 35,
    width: 58,
    height: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(45, 212, 191, 0.48)',
    borderWidth: 2,
    borderColor: 'rgba(153, 246, 228, 0.5)',
    transform: [{ rotate: '15deg' }, { scaleY: 0.72 }],
  },
  mermaidTailActive: {
    backgroundColor: 'rgba(45, 212, 191, 0.68)',
    borderColor: 'rgba(153, 246, 228, 0.72)',
  },
  mermaidTailFin: {
    position: 'absolute',
    right: 23,
    bottom: 42,
    width: 0,
    height: 0,
    borderTopWidth: 13,
    borderBottomWidth: 13,
    borderLeftWidth: 24,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'rgba(45, 212, 191, 0.46)',
    transform: [{ rotate: '14deg' }],
  },
  mermaidTailFinActive: {
    borderLeftColor: 'rgba(45, 212, 191, 0.66)',
  },
  mermaidBody: {
    position: 'absolute',
    left: 67,
    bottom: 58,
    width: 30,
    height: 38,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 114, 182, 0.44)',
    borderWidth: 2,
    borderColor: 'rgba(251, 207, 232, 0.4)',
    transform: [{ rotate: '-5deg' }],
  },
  mermaidBodyActive: {
    backgroundColor: 'rgba(244, 114, 182, 0.58)',
    borderColor: 'rgba(251, 207, 232, 0.62)',
  },
  mermaidArmBack: {
    position: 'absolute',
    left: 54,
    bottom: 58,
    width: 28,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(253, 224, 197, 0.54)',
    transform: [{ rotate: '22deg' }],
  },
  mermaidArmFront: {
    position: 'absolute',
    left: 88,
    bottom: 61,
    width: 31,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(253, 224, 197, 0.58)',
    transform: [{ rotate: '-18deg' }],
  },
  mermaidSkinActive: {
    backgroundColor: 'rgba(253, 224, 197, 0.72)',
  },
  mermaidHairBack: {
    position: 'absolute',
    left: 54,
    bottom: 80,
    width: 52,
    height: 47,
    borderRadius: 28,
    backgroundColor: 'rgba(250, 204, 21, 0.58)',
    transform: [{ rotate: '-8deg' }],
  },
  mermaidHairActive: {
    backgroundColor: 'rgba(250, 204, 21, 0.76)',
  },
  mermaidLongHair: {
    position: 'absolute',
    left: 52,
    bottom: 61,
    width: 29,
    height: 60,
    borderRadius: 22,
    backgroundColor: 'rgba(234, 179, 8, 0.48)',
    transform: [{ rotate: '10deg' }],
  },
  mermaidLongHairActive: {
    backgroundColor: 'rgba(234, 179, 8, 0.66)',
  },
  mermaidHead: {
    position: 'absolute',
    left: 68,
    bottom: 87,
    width: 31,
    height: 31,
    borderRadius: 16,
    backgroundColor: 'rgba(253, 224, 197, 0.66)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.42)',
  },
  mermaidHeadActive: {
    backgroundColor: 'rgba(253, 224, 197, 0.8)',
    borderColor: 'rgba(255, 255, 255, 0.62)',
  },
  mermaidHairFront: {
    position: 'absolute',
    left: 56,
    bottom: 89,
    width: 34,
    height: 26,
    borderRadius: 18,
    backgroundColor: 'rgba(253, 224, 71, 0.62)',
    transform: [{ rotate: '-20deg' }],
  },
  mermaidHairFrontActive: {
    backgroundColor: 'rgba(253, 224, 71, 0.82)',
  },
  mermaidHairShine: {
    position: 'absolute',
    left: 62,
    bottom: 105,
    width: 14,
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(254, 240, 138, 0.42)',
    transform: [{ rotate: '-22deg' }],
  },
  mermaidHairShineActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  mermaidEye: {
    position: 'absolute',
    left: 91,
    bottom: 103,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(7, 89, 133, 0.52)',
  },
  mermaidMouth: {
    position: 'absolute',
    left: 94,
    bottom: 95,
    width: 9,
    height: 5,
    borderRadius: 6,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(236, 72, 153, 0.5)',
  },
  mermaidMouthActive: {
    width: 10,
    height: 6,
    borderBottomColor: 'rgba(236, 72, 153, 0.76)',
  },
  routeBubble: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.32)',
  },
  bubbleNode: {
    borderColor: 'rgba(56, 189, 248, 0.46)',
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    shadowColor: '#0284C7',
    shadowOpacity: 0.16,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },
  nodeBubbleInnerGlow: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: 8,
    bottom: 8,
    borderRadius: RADIUS_PILL,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.58)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  nodeBubbleShine: {
    position: 'absolute',
    left: 15,
    top: 12,
    width: 28,
    height: 16,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    transform: [{ rotate: '-26deg' }],
  },
  worldNode: {
    position: 'absolute',
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
  },
  modeNode: {
    position: 'absolute',
    width: 164,
    height: 164,
    borderRadius: 82,
    borderWidth: 3,
    borderColor: 'rgba(56, 189, 248, 0.55)',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    zIndex: 5,
  },
  modeNodeText: {
    color: TEXT_BASE_COLOR,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
    textAlign: 'center',
  },
  modeNodeUnknown: {
    color: 'rgba(71, 85, 105, 0.42)',
  },
  modeTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateX: -2 }],
  },
  modeTitleBead: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    marginRight: 3,
    shadowColor: '#0284C7',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  modeTitleBeadBlue: {
    borderColor: 'rgba(20, 184, 166, 0.74)',
    backgroundColor: 'rgba(153, 246, 228, 0.62)',
  },
  modeTitleBeadGold: {
    borderColor: 'rgba(202, 138, 4, 0.58)',
    backgroundColor: 'rgba(254, 240, 138, 0.58)',
  },
  modeTitleBeadHighlight: {
    position: 'absolute',
    left: 4,
    top: 3,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.74)',
  },
  worldNodeActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#FFFFFF',
  },
  mixedWorldNode: {
    gap: 0,
  },
  dentakuWorldNode: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
    borderColor: 'rgba(56, 189, 248, 0.46)',
    elevation: 4,
  },
  worldSymbol: {
    color: TEXT_BASE_COLOR,
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  worldSymbolActive: {
    color: TEXT_ACCENT_COLOR,
  },
  worldProgress: {
    color: TEXT_ACCENT_COLOR,
    fontSize: 11,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  worldProgressActive: {
    color: TEXT_BASE_COLOR,
  },
  mixedWorldSymbols: {
    color: TEXT_BASE_COLOR,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  dentakuWorldSymbol: {
    color: TEXT_BASE_COLOR,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  mixedCountBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    minWidth: 32,
    height: 32,
    borderRadius: RADIUS_PILL,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mixedCountText: {
    color: TEXT_BASE_COLOR,
    fontSize: 14,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  freeBadge: {
    position: 'absolute',
    left: -4,
    bottom: -4,
    minWidth: 32,
    height: 32,
    borderRadius: RADIUS_PILL,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  freeBadgeText: {
    color: TEXT_BASE_COLOR,
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  backButton: {
    position: 'absolute',
    left: GRID * 3,
    top: 37,
    zIndex: 5,
    width: 48,
    height: 48,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageScroll: {
    flex: 1,
    zIndex: 2,
    elevation: 2,
  },
  stageScrollContent: {
    paddingTop: GRID * 10,
    paddingBottom: GRID * 12,
  },
  stageMap: {
    position: 'relative',
  },
  stageNode: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  stageNodeLocked: {
    opacity: 0.48,
    borderColor: 'rgba(186, 230, 253, 0.8)',
  },
  stageLockedMembrane: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 6,
    bottom: 6,
    borderRadius: RADIUS_PILL,
    borderWidth: 3,
    borderColor: 'rgba(224, 247, 255, 0.7)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  stageNodeDone: {
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
  },
  kukuStageNode: {
    backgroundColor: 'rgba(255, 255, 255, 0.42)',
  },
  stageNumber: {
    color: TEXT_ACCENT_COLOR,
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  stageTarget: {
    color: TEXT_BASE_COLOR,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  kukuStageMainLabel: {
    color: TEXT_BASE_COLOR,
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  stageNumberLocked: {
    color: TEXT_ACCENT_COLOR,
  },
  stageDoneStarfish: {
    position: 'absolute',
    right: -4,
    top: -7,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.86,
  },
  roundedStarfishArm: {
    position: 'absolute',
    backgroundColor: '#EAB308',
    borderWidth: 1,
    borderColor: 'rgba(202, 138, 4, 0.28)',
    shadowColor: '#CA8A04',
    shadowOpacity: 0.18,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  roundedStarfishCenter: {
    position: 'absolute',
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: 'rgba(202, 138, 4, 0.34)',
  },
  roundedStarfishDot: {
    position: 'absolute',
    backgroundColor: 'rgba(180, 120, 12, 0.38)',
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
