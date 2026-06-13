import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useBgmControl } from '@/audio/bgm-control';
import { SFX } from '@/audio/sfx';
import { useOneShotAudio } from '@/audio/use-one-shot-audio';
import { MarumaruGame } from '@/components/MarumaruGame';
import { NavImageIcon } from '@/components/NavImageIcon';
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
  kind: 'fish' | 'clownfish' | 'blueTang' | 'puffer' | 'seahorse' | 'squid' | 'ray' | 'turtle' | 'tuna' | 'shark' | 'whale' | 'flatfish' | 'jelly' | 'angler';
};

const DEPTH_BUBBLE_TICK_MS = 90;
const DEPTH_CREATURE_REACTION_MS = 920;
const PLAYFUL_FONT_FAMILY = 'KiwiMaru';
const LATIN_FONT_FAMILY = 'Helvetica';
const GRID = 8;
const RADIUS_SM = 8;
const RADIUS_LG = 16;
const RADIUS_PILL = 999;

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
  const { isVocalEnabled, toggleVocal } = useBgmControl();
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const completedByIsland = (islandId: Stage['islandId']) => STAGES.filter((stage) => stage.islandId === islandId && completedStageIds.has(stage.id)).length;
  const layouts = getWorldNodeLayouts(mapWidth);

  return (
    <SafeAreaView style={styles.screen}>
      <View testID="world-select" style={styles.depthScene}>
        <DepthBackdrop width={viewportWidth} height={viewportHeight} scrollDepth={scrollDepth} onBubblePop={playBackgroundBubbleSfx} onCreaturePress={playActionSfx} />
        <ScrollView
          style={styles.worldScroll}
          contentContainerStyle={styles.worldScrollContent}
          showsVerticalScrollIndicator={false}
          onScroll={(event) => setScrollDepth(event.nativeEvent.contentOffset.y)}
          scrollEventThrottle={16}
        >
          <View style={styles.routeLayer}>
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
                onSelectIsland('addition');
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
                onSelectIsland('subtraction');
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
                onSelectIsland('multiplication');
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
                onSelectIsland('division');
              }}
            />
            <MixedWorldNode label="mixed-3" count={3} x={layouts[4].x} y={layouts[4].y} onPress={() => { playActionSfx(); onSelectIsland('mixed3'); }} />
            <MixedWorldNode label="mixed-3-free" count={3} x={layouts[5].x} y={layouts[5].y} free onPress={() => { playActionSfx(); onSelectIsland('mixed3Free'); }} />
            <MixedWorldNode label="mixed-4" count={4} x={layouts[6].x} y={layouts[6].y} onPress={() => { playActionSfx(); onSelectIsland('mixed4'); }} />
            <MixedWorldNode label="mixed-4-free" count={4} x={layouts[7].x} y={layouts[7].y} free onPress={() => { playActionSfx(); onSelectIsland('mixed4Free'); }} />
            <MixedWorldNode label="mixed-5" count={5} x={layouts[8].x} y={layouts[8].y} onPress={() => { playActionSfx(); onSelectIsland('mixed5'); }} />
            <MixedWorldNode label="mixed-5-free" count={5} x={layouts[9].x} y={layouts[9].y} free onPress={() => { playActionSfx(); onSelectIsland('mixed5Free'); }} />
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
          >
            <View pointerEvents="none" style={styles.depthBackgroundBubbleShine} />
          </Pressable>
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
  const mapHeight = Math.max(620, getStageMapHeight(stages.length));

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
            <SingingMermaid isVocalEnabled={isVocalEnabled} mapWidth={mapWidth} onPress={toggleVocal} />
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
    <View pointerEvents="none" style={styles.stageDoneStarfish}>
      <Text style={styles.stageDoneStarfishGlyph}>★</Text>
      <View style={styles.stageDoneStarfishCenter} />
      <View style={[styles.stageDoneStarfishDot, styles.stageDoneStarfishDotTop]} />
      <View style={[styles.stageDoneStarfishDot, styles.stageDoneStarfishDotRight]} />
      <View style={[styles.stageDoneStarfishDot, styles.stageDoneStarfishDotBottom]} />
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
  const bubbleCount = Math.max(5, Math.floor(length / 18));

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

function SingingMermaid({ isVocalEnabled, mapWidth, onPress }: { isVocalEnabled: boolean; mapWidth: number; onPress: () => void }) {
  const left = Math.min(Math.max(16, mapWidth * 0.08), 46);

  return (
    <Pressable
      accessibilityLabel={isVocalEnabled ? 'turn off mermaid song' : 'turn on mermaid song'}
      accessibilityRole="switch"
      accessibilityState={{ checked: isVocalEnabled }}
      onPress={onPress}
      testID="singing-mermaid"
      style={({ pressed }) => [styles.singingMermaid, isVocalEnabled && styles.singingMermaidActive, { left }, pressed && styles.pressed]}
    >
      <View style={[styles.mermaidSongBubbleOne, isVocalEnabled && styles.mermaidSongBubbleActive]} />
      <View style={[styles.mermaidSongBubbleTwo, isVocalEnabled && styles.mermaidSongBubbleActive]} />
      <View style={[styles.mermaidSongBubbleThree, isVocalEnabled && styles.mermaidSongBubbleActiveStrong]} />
      {isVocalEnabled ? (
        <>
          <View style={[styles.mermaidSongPulse, styles.mermaidSongPulseOne]} />
          <View style={[styles.mermaidSongPulse, styles.mermaidSongPulseTwo]} />
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

function getStageMapHeight(stageCount: number) {
  return 180 + Math.max(0, stageCount - 1) * 118;
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
    zIndex: 2,
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
  depthBackgroundBubbleShine: {
    position: 'absolute',
    left: '22%',
    top: '18%',
    width: '26%',
    height: '26%',
    borderRadius: RADIUS_PILL,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
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
    zIndex: 1,
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
  singingMermaid: {
    position: 'absolute',
    bottom: 14,
    width: 176,
    height: 138,
    opacity: 0.76,
  },
  singingMermaidActive: {
    opacity: 0.92,
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
  mermaidRockHighlight: {
    position: 'absolute',
    left: 36,
    bottom: 27,
    width: 48,
    height: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(224, 247, 255, 0.18)',
    transform: [{ rotate: '-6deg' }],
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
  mermaidTailScaleOne: {
    position: 'absolute',
    left: 84,
    bottom: 45,
    width: 12,
    height: 7,
    borderRadius: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 253, 245, 0.42)',
    transform: [{ rotate: '17deg' }],
  },
  mermaidTailScaleTwo: {
    position: 'absolute',
    left: 100,
    bottom: 49,
    width: 12,
    height: 7,
    borderRadius: 7,
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 253, 245, 0.36)',
    transform: [{ rotate: '15deg' }],
  },
  mermaidTailScaleThree: {
    position: 'absolute',
    left: 111,
    bottom: 41,
    width: 11,
    height: 6,
    borderRadius: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(236, 253, 245, 0.34)',
    transform: [{ rotate: '13deg' }],
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
  mermaidTailFinSplit: {
    position: 'absolute',
    right: 33,
    bottom: 42,
    width: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(236, 253, 245, 0.3)',
    transform: [{ rotate: '15deg' }],
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
  mermaidShellLeft: {
    position: 'absolute',
    left: 70,
    bottom: 82,
    width: 13,
    height: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(216, 180, 254, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(250, 245, 255, 0.48)',
    transform: [{ rotate: '-14deg' }],
  },
  mermaidShellRight: {
    position: 'absolute',
    left: 84,
    bottom: 82,
    width: 13,
    height: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(216, 180, 254, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(250, 245, 255, 0.46)',
    transform: [{ rotate: '12deg' }],
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
  mermaidHandBack: {
    position: 'absolute',
    left: 49,
    bottom: 63,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(253, 224, 197, 0.58)',
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
  mermaidHandFront: {
    position: 'absolute',
    left: 115,
    bottom: 64,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(253, 224, 197, 0.6)',
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
  mermaidHairCurlBack: {
    position: 'absolute',
    left: 47,
    bottom: 72,
    width: 28,
    height: 36,
    borderRadius: 20,
    backgroundColor: 'rgba(220, 38, 38, 0.58)',
    transform: [{ rotate: '10deg' }],
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
  mermaidHairSideLock: {
    position: 'absolute',
    left: 53,
    bottom: 80,
    width: 18,
    height: 34,
    borderRadius: 16,
    backgroundColor: 'rgba(220, 38, 38, 0.62)',
    transform: [{ rotate: '-18deg' }],
  },
  mermaidBangOne: {
    position: 'absolute',
    left: 72,
    bottom: 108,
    width: 26,
    height: 11,
    borderRadius: 11,
    backgroundColor: 'rgba(254, 202, 202, 0.42)',
    transform: [{ rotate: '-12deg' }],
  },
  mermaidBangTwo: {
    position: 'absolute',
    left: 60,
    bottom: 96,
    width: 16,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(248, 113, 113, 0.7)',
    transform: [{ rotate: '28deg' }],
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
  mermaidEye: {
    position: 'absolute',
    left: 91,
    bottom: 103,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(7, 89, 133, 0.52)',
  },
  mermaidEyeShine: {
    position: 'absolute',
    left: 92,
    bottom: 106,
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
  },
  mermaidCheek: {
    position: 'absolute',
    left: 83,
    bottom: 96,
    width: 8,
    height: 5,
    borderRadius: 5,
    backgroundColor: 'rgba(244, 114, 182, 0.42)',
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
  worldNodeActive: {
    borderColor: '#0EA5E9',
    backgroundColor: '#FFFFFF',
  },
  mixedWorldNode: {
    gap: 0,
  },
  worldSymbol: {
    color: '#075985',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  worldSymbolActive: {
    color: '#0EA5E9',
  },
  worldProgress: {
    color: '#0284C7',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  worldProgressActive: {
    color: '#075985',
  },
  mixedWorldSymbols: {
    color: '#075985',
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
    color: '#FFFFFF',
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
    color: '#12334A',
    fontSize: 16,
    lineHeight: 18,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  backButton: {
    position: 'absolute',
    left: GRID * 3,
    top: GRID,
    zIndex: 3,
    width: 48,
    height: 48,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageScroll: {
    flex: 1,
    zIndex: 1,
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
  stageNumber: {
    color: '#0284C7',
    fontSize: 13,
    lineHeight: 16,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  stageTarget: {
    color: '#12334A',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  stageNumberLocked: {
    color: '#7DD3FC',
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
  stageDoneStarfishGlyph: {
    color: '#EAB308',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    fontFamily: PLAYFUL_FONT_FAMILY,
    textShadowColor: 'rgba(255, 255, 255, 0.82)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  stageDoneStarfishCenter: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 236, 153, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(202, 138, 4, 0.42)',
  },
  stageDoneStarfishDot: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: 'rgba(180, 120, 12, 0.38)',
  },
  stageDoneStarfishDotTop: {
    top: 6,
    left: 11,
  },
  stageDoneStarfishDotRight: {
    top: 11,
    right: 6,
  },
  stageDoneStarfishDotBottom: {
    bottom: 6,
    left: 9,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
