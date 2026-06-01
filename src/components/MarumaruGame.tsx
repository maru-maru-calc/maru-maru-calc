import * as Matter from 'matter-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBeadKind, getNextPlaceValue } from '@/game/beads';
import { findMergeCluster, getTotalValue, hasMergeableCount } from '@/game/merge';
import { getStage, STAGES } from '@/game/stages';
import { BeadRole, BeadSign, BeadSnapshot, PlaceValue } from '@/game/types';

type BeadEntity = {
  id: string;
  value: PlaceValue;
  count: number;
  sign: BeadSign;
  role: BeadRole;
  body: Matter.Body;
};

type PendingBubble = {
  id: string;
  count: number;
  x: number;
  y: number;
};

type MergeAnimation = {
  id: string;
  value: PlaceValue;
  sign: BeadSign;
  beadIds: string[];
  center: {
    x: number;
    y: number;
  };
  startedAt: number;
  nextValue: PlaceValue;
};

type AnnihilationAnimation = {
  id: string;
  beadIds: string[];
  center: {
    x: number;
    y: number;
  };
  startedAt: number;
};

type OperatorSymbol = '+' | '-' | '×' | '÷';
type OperatorButtonSymbol = OperatorSymbol | '=';
type MultiplierBubblePart = {
  value: PlaceValue;
  radius: number;
};
type ContainedBeadPart = {
  value: PlaceValue;
  radius: number;
};

const FIELD_MARGIN = 18;
const FIELD_GAP = 10;
const OPERATOR_RAIL_WIDTH = 56;
const HEADER_HEIGHT = 148;
const FOOTER_HEIGHT = 112;
const PREVIEW_Y = 38;
const ATTRACTION_RADIUS = 220;
const ATTRACTION_FORCE = 0.00014;
const BASIN_BODY_THICKNESS = 12;
const BASIN_FRAME_THICKNESS = 3;
const GROUP_DROP_COUNTS = [6, 4, 7, 3, 8, 2, 5, 5];
const BUBBLE_ROW_Y = 56;
const MERGE_ANIMATION_MS = 520;
const ANNIHILATION_ANIMATION_MS = 180;
const OPERATORS: OperatorButtonSymbol[] = ['+', '-', '×', '÷', '='];
const MULTIPLIER_BUBBLE_X_STEP = 0.34;
const MULTIPLIER_BUBBLE_Y_STEP = 0.28;

export function MarumaruGame() {
  const { width, height } = useWindowDimensions();
  const fieldWidth = Math.max(240, width - FIELD_MARGIN * 2 - FIELD_GAP - OPERATOR_RAIL_WIDTH);
  const fieldHeight = Math.max(360, height - HEADER_HEIGHT - FOOTER_HEIGHT);
  const [stageIndex, setStageIndex] = useState(0);
  const stage = getStage(stageIndex);
  const [selectedOperator, setSelectedOperator] = useState<OperatorSymbol>('+');
  const [expressionTokens, setExpressionTokens] = useState<string[]>([]);
  const expressionTotalRef = useRef(0);
  const [pendingBubbles, setPendingBubbles] = useState<PendingBubble[]>([]);
  const [beads, setBeads] = useState<BeadSnapshot[]>([]);
  const [mergeAnimation, setMergeAnimation] = useState<MergeAnimation | undefined>(undefined);
  const [annihilationAnimation, setAnnihilationAnimation] = useState<AnnihilationAnimation | undefined>(undefined);
  const [message, setMessage] = useState('あわをさわると まるがでるよ');
  const [isClear, setIsClear] = useState(false);
  const engineRef = useRef<Matter.Engine | null>(null);
  const entitiesRef = useRef<BeadEntity[]>([]);
  const draggingBeadIdRef = useRef<string | undefined>(undefined);
  const idRef = useRef(0);
  const lastMergeAtRef = useRef(0);

  const total = useMemo(() => getTotalValue(beads), [beads]);
  const basinFrameSegments = useMemo(() => getBasinFrameSegments(fieldWidth, fieldHeight), [fieldHeight, fieldWidth]);

  const resetStage = useCallback(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.08 } });
    const wallThickness = 80;
    const floor = Matter.Bodies.rectangle(fieldWidth / 2, fieldHeight + wallThickness / 2, fieldWidth, wallThickness, {
      isStatic: true,
    });
    const basinSegments = createBasinBodies(fieldWidth, fieldHeight);
    const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, fieldHeight / 2, wallThickness, fieldHeight * 2, {
      isStatic: true,
    });
    const rightWall = Matter.Bodies.rectangle(fieldWidth + wallThickness / 2, fieldHeight / 2, wallThickness, fieldHeight * 2, {
      isStatic: true,
    });

    Matter.Composite.add(engine.world, [floor, ...basinSegments, leftWall, rightWall]);
    engineRef.current = engine;
    entitiesRef.current = [];
    setBeads([]);
    setPendingBubbles(createPendingBubbles(fieldWidth, stage.target));
    setExpressionTokens([]);
    expressionTotalRef.current = 0;
    setSelectedOperator('+');
    setMergeAnimation(undefined);
    setAnnihilationAnimation(undefined);
    setMessage('あわをさわると まるがでるよ');
    setIsClear(false);
  }, [fieldHeight, fieldWidth, stage.target]);

  useEffect(() => {
    resetStage();
  }, [resetStage]);

  useEffect(() => {
    if (!isClear && isStageClear(stage.target, beads, pendingBubbles, mergeAnimation)) {
      setIsClear(true);
      setMessage('できた!');
    }
  }, [beads, isClear, mergeAnimation, pendingBubbles, stage.target]);

  const addBead = useCallback(
    (
      value: PlaceValue,
      count: number,
      sign: BeadSign,
      x: number,
      y = PREVIEW_Y,
      settled = false,
      velocity?: Matter.Vector,
      role: BeadRole = 'normal',
    ) => {
    const engine = engineRef.current;
    if (!engine) {
      return;
    }

    const radius = getEntityRadius(value, count);
    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: 0.08,
      friction: 0.22,
      frictionStatic: 0.02,
      frictionAir: 0.004,
      density: 0.0028,
      label: `bead-${value}`,
    });
    if (settled) {
      Matter.Body.setVelocity(body, { x: 0, y: -2.2 });
    }
    if (velocity) {
      Matter.Body.setVelocity(body, velocity);
    }
    const entity = {
      id: `bead-${idRef.current++}`,
      value,
      count,
      sign,
      role,
      body,
    };
    entitiesRef.current = [...entitiesRef.current, entity];
    Matter.Composite.add(engine.world, body);
    },
    [],
  );

  const wrapMultiplicandForMultiplication = useCallback(() => {
    const engine = engineRef.current;
    const hasWrappedMultiplicand = entitiesRef.current.some((entity) => entity.role === 'multiplicand');
    const candidates = entitiesRef.current.filter((entity) => entity.sign > 0 && entity.role === 'normal');
    if (hasWrappedMultiplicand) {
      return;
    }
    if (!engine || candidates.length === 0) {
      return;
    }

    const totalCount = candidates.reduce((sum, entity) => sum + getEntityUnitCount(entity), 0);
    const center = getEntityCenter(candidates);
    Matter.Composite.remove(
      engine.world,
      candidates.map((entity) => entity.body),
    );
    entitiesRef.current = entitiesRef.current.filter((entity) => !candidates.some((candidate) => candidate.id === entity.id));
    addBead(1, totalCount, 1, center.x, center.y, false, undefined, 'multiplicand');
    setBeads(toSnapshots(entitiesRef.current));
  }, [addBead]);

  const multiplyWrappedGroup = useCallback(
    (bubble: PendingBubble) => {
      const engine = engineRef.current;
      const multiplicand = entitiesRef.current.find((entity) => entity.role === 'multiplicand' && entity.value === 1 && entity.sign > 0);
      if (!engine || !multiplicand) {
        return;
      }

      setPendingBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
      Matter.Composite.remove(engine.world, multiplicand.body);
      entitiesRef.current = entitiesRef.current.filter((entity) => entity.id !== multiplicand.id);

      for (let index = 0; index < bubble.count; index += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / bubble.count;
        const x = bubble.x + Math.cos(angle) * 26;
        const y = bubble.y + Math.sin(angle) * 18;
        addBead(1, multiplicand.count, 1, x, y, false, { x: Math.cos(angle) * 1.8, y: 2 + Math.sin(angle) }, 'product');
      }

      expressionTotalRef.current = multiplicand.count * bubble.count;
      setExpressionTokens([String(multiplicand.count), '×', String(bubble.count), '=', String(expressionTotalRef.current)]);
      setMessage(`${multiplicand.count}のまとまりが ${bubble.count}こ`);
      setBeads(toSnapshots(entitiesRef.current));
    },
    [addBead],
  );

  const unwrapProductGroups = useCallback(() => {
    const engine = engineRef.current;
    const productGroups = entitiesRef.current.filter((entity) => entity.role === 'product' && entity.value === 1 && entity.sign > 0);
    if (!engine || productGroups.length === 0) {
      return false;
    }

    const totalCount = productGroups.reduce((sum, entity) => sum + entity.count, 0);
    const center = getEntityCenter(productGroups);
    Matter.Composite.remove(
      engine.world,
      productGroups.map((entity) => entity.body),
    );
    entitiesRef.current = entitiesRef.current.filter((entity) => !productGroups.some((product) => product.id === entity.id));

    for (let index = 0; index < totalCount; index += 1) {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(totalCount, 1);
      const ring = 18 + Math.floor(index / 10) * 10;
      addBead(1, 1, 1, center.x + Math.cos(angle) * ring, center.y + Math.sin(angle) * ring, false, {
        x: Math.cos(angle) * 2,
        y: Math.sin(angle) * 1.2,
      });
    }

    const evaluatedTokens = evaluateExpressionOnEquals(expressionTokens);
    setExpressionTokens(evaluatedTokens);
    setMessage(`${totalCount}この まるになったよ`);
    setBeads(toSnapshots(entitiesRef.current));
    return true;
  }, [addBead, expressionTokens]);

  const unwrapProductGroup = useCallback(
    (productGroupId: string) => {
      const engine = engineRef.current;
      const productGroup = entitiesRef.current.find((entity) => entity.id === productGroupId && entity.role === 'product');
      if (!engine || !productGroup) {
        return false;
      }

      Matter.Composite.remove(engine.world, productGroup.body);
      entitiesRef.current = entitiesRef.current.filter((entity) => entity.id !== productGroup.id);

      for (let index = 0; index < productGroup.count; index += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / productGroup.count;
        const offset = 16 + Math.floor(index / 10) * 8;
        addBead(1, 1, productGroup.sign, productGroup.body.position.x + Math.cos(angle) * offset, productGroup.body.position.y + Math.sin(angle) * offset, false, {
          x: Math.cos(angle) * 1.9,
          y: Math.sin(angle) * 1.1,
        });
      }

      setMessage(`${productGroup.count}この まるに われたよ`);
      setBeads(toSnapshots(entitiesRef.current));
      return true;
    },
    [addBead],
  );

  const burstBubble = useCallback(
    (bubble: PendingBubble) => {
      if (isClear) {
        return;
      }

      if (selectedOperator === '×') {
        multiplyWrappedGroup(bubble);
        return;
      }

      const sign: BeadSign = selectedOperator === '-' ? -1 : 1;
      setPendingBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
      expressionTotalRef.current += bubble.count * sign;
      setExpressionTokens((current) => addNumberToExpression(current, bubble.count, selectedOperator, expressionTotalRef.current));
      for (let index = 0; index < bubble.count; index += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / bubble.count;
        const offsetRadius = bubble.count <= 4 ? 14 : 22;
        const x = bubble.x + Math.cos(angle) * offsetRadius;
        const y = bubble.y + Math.sin(angle) * offsetRadius;
        addBead(1, 1, sign, x, y, false, {
          x: Math.cos(angle) * 1.8,
          y: 1.5 + Math.sin(angle) * 0.8,
        });
      }
      setMessage(`${bubble.count}この まるがでたよ`);
    },
    [addBead, isClear, multiplyWrappedGroup, selectedOperator],
  );

  const selectOperator = useCallback(
    (operator: OperatorButtonSymbol) => {
      if (operator === '=') {
        if (unwrapProductGroups()) {
          return;
        }

        setExpressionTokens((current) => evaluateExpressionOnEquals(current));
        return;
      }

      if (operator === selectedOperator) {
        return;
      }

      setSelectedOperator(operator);
      if (operator === '×') {
        wrapMultiplicandForMultiplication();
      }
      setExpressionTokens((current) => replaceTrailingOperator(current, operator));
    },
    [selectedOperator, unwrapProductGroups, wrapMultiplicandForMultiplication],
  );

  const moveBead = useCallback(
    (beadId: string, x: number, y: number) => {
      const entity = entitiesRef.current.find((candidate) => candidate.id === beadId);
      if (!entity) {
        return;
      }

      const radius = getEntityRadius(entity.value, entity.count);
      Matter.Body.setPosition(entity.body, {
        x: clamp(x, radius, fieldWidth - radius),
        y: clamp(y, radius, fieldHeight - radius),
      });
      Matter.Body.setVelocity(entity.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(entity.body, 0);
      setBeads(toSnapshots(entitiesRef.current));
    },
    [fieldHeight, fieldWidth],
  );

  const updateMergeAnimation = useCallback(
    (now: number) => {
      if (!mergeAnimation) {
        return;
      }

      const progress = clamp((now - mergeAnimation.startedAt) / MERGE_ANIMATION_MS, 0, 1);
      const mergingIds = new Set(mergeAnimation.beadIds);
      for (const entity of entitiesRef.current) {
        if (!mergingIds.has(entity.id)) {
          continue;
        }

        const dx = mergeAnimation.center.x - entity.body.position.x;
        const dy = mergeAnimation.center.y - entity.body.position.y;
        const pull = 0.16 + progress * 0.52;
        Matter.Body.setVelocity(entity.body, {
          x: dx * pull,
          y: dy * pull,
        });
        Matter.Body.setAngularVelocity(entity.body, 0);
      }

      if (progress < 1) {
        return;
      }

      const engine = engineRef.current;
      if (!engine) {
        return;
      }

      const mergingEntities = entitiesRef.current.filter((entity) => mergingIds.has(entity.id));
      Matter.Composite.remove(
        engine.world,
        mergingEntities.map((entity) => entity.body),
      );
      entitiesRef.current = entitiesRef.current.filter((entity) => !mergingIds.has(entity.id));
      addBead(mergeAnimation.nextValue, 1, mergeAnimation.sign, mergeAnimation.center.x, Math.max(58, mergeAnimation.center.y - 8), true);
      setMergeAnimation(undefined);
      lastMergeAtRef.current = now;
      setMessage(getMergeMessage(mergeAnimation.value, mergeAnimation.nextValue));
    },
    [addBead, mergeAnimation],
  );

  const updateAnnihilationAnimation = useCallback(
    (now: number) => {
      if (!annihilationAnimation) {
        return;
      }

      const progress = clamp((now - annihilationAnimation.startedAt) / ANNIHILATION_ANIMATION_MS, 0, 1);
      const annihilatingIds = new Set(annihilationAnimation.beadIds);
      for (const entity of entitiesRef.current) {
        if (!annihilatingIds.has(entity.id)) {
          continue;
        }

        const dx = annihilationAnimation.center.x - entity.body.position.x;
        const dy = annihilationAnimation.center.y - entity.body.position.y;
        const pull = 0.58 + progress * 1.15;
        Matter.Body.setVelocity(entity.body, {
          x: dx * pull,
          y: dy * pull,
        });
        Matter.Body.setAngularVelocity(entity.body, 0);
      }

      if (progress < 1) {
        return;
      }

      const engine = engineRef.current;
      if (!engine) {
        return;
      }

      const annihilatingEntities = entitiesRef.current.filter((entity) => annihilatingIds.has(entity.id));
      Matter.Composite.remove(
        engine.world,
        annihilatingEntities.map((entity) => entity.body),
      );
      entitiesRef.current = entitiesRef.current.filter((entity) => !annihilatingIds.has(entity.id));
      setAnnihilationAnimation(undefined);
      setMessage('');
    },
    [annihilationAnimation],
  );

  const startDragBead = useCallback((beadId: string) => {
    draggingBeadIdRef.current = beadId;
  }, []);

  const endDragBead = useCallback((beadId: string) => {
    if (draggingBeadIdRef.current === beadId) {
      draggingBeadIdRef.current = undefined;
    }
  }, []);

  const moveBubble = useCallback(
    (bubbleId: string, x: number, y: number) => {
      setPendingBubbles((current) =>
        current.map((bubble) => {
          if (bubble.id !== bubbleId) {
            return bubble;
          }

          const radius = getEntityRadius(1, bubble.count);
          return {
            ...bubble,
            x: clamp(x, radius, fieldWidth - radius),
            y: clamp(y, radius, Math.max(radius, fieldHeight * 0.36)),
          };
        }),
      );
    },
    [fieldHeight, fieldWidth],
  );

  const splitHigherBead = useCallback(
    (higherBeadId: string, lowerValue: PlaceValue) => {
      const engine = engineRef.current;
      const higherEntity = entitiesRef.current.find((entity) => entity.id === higherBeadId);
      if (!engine || !higherEntity) {
        return;
      }

      Matter.Composite.remove(engine.world, higherEntity.body);
      entitiesRef.current = entitiesRef.current.filter((entity) => entity.id !== higherBeadId);

      for (let index = 0; index < 10; index += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 10;
        const x = higherEntity.body.position.x + Math.cos(angle) * 20;
        const y = higherEntity.body.position.y + Math.sin(angle) * 20;
        addBead(lowerValue, 1, higherEntity.sign, x, y, false, {
          x: Math.cos(angle) * 2.2,
          y: Math.sin(angle) * 1.2,
        });
      }
    },
    [addBead],
  );

  const settleMergeIfReady = useCallback(
    (now: number) => {
      if (now - lastMergeAtRef.current < 420) {
        return;
      }

      const cluster = findMergeCluster(toSnapshots(entitiesRef.current));
      if (!cluster) {
        return;
      }

      const nextPlaceValue = getNextPlaceValue(cluster.value);
      const engine = engineRef.current;
      if (!engine || !nextPlaceValue) {
        return;
      }

      setMergeAnimation({
        id: `merge-${now}`,
        value: cluster.value,
        sign: cluster.sign,
        beadIds: cluster.beadIds,
        center: cluster.center,
        startedAt: now,
        nextValue: nextPlaceValue,
      });
      setMessage('ぎゅっと まとまるよ');
    },
    [],
  );

  useEffect(() => {
    let frame = 0;
    let lastTime = Date.now();

    const tick = () => {
      const engine = engineRef.current;
      if (!engine) {
        frame = requestAnimationFrame(tick);
        return;
      }

      const now = Date.now();
      const delta = Math.min(32, now - lastTime);
      lastTime = now;
      applySameValueAttraction(entitiesRef.current, draggingBeadIdRef.current);
      updateAnnihilationAnimation(now);
      updateMergeAnimation(now);
      Matter.Engine.update(engine, delta);
      keepBodiesInsideField(fieldWidth, entitiesRef.current);
      if (!mergeAnimation && !annihilationAnimation) {
        const productCollision = findProductBubbleCollision(toSnapshots(entitiesRef.current));
        if (productCollision) {
          unwrapProductGroup(productCollision.productGroupId);
        }
        const decomposition = productCollision ? undefined : findDecompositionPair(toSnapshots(entitiesRef.current));
        if (decomposition) {
          splitHigherBead(decomposition.higherBeadId, decomposition.lowerValue);
          setMessage('大きなまるが こまかくなったよ');
        }
        const pair = decomposition || productCollision ? undefined : findAnnihilationPair(toSnapshots(entitiesRef.current));
        if (pair) {
          setAnnihilationAnimation({
            id: `annihilation-${now}`,
            beadIds: pair.beadIds,
            center: pair.center,
            startedAt: now,
          });
          setMessage('');
        } else {
          settleMergeIfReady(now);
        }
      }
      setBeads(toSnapshots(entitiesRef.current));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    annihilationAnimation,
    fieldWidth,
    mergeAnimation,
    settleMergeIfReady,
    splitHigherBead,
    unwrapProductGroup,
    updateAnnihilationAnimation,
    updateMergeAnimation,
  ]);

  const goNextStage = () => {
    setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View>
          <Text style={styles.stageLabel}>ステージ {stageIndex + 1}</Text>
          <Text style={styles.title}>{stage.title}</Text>
        </View>
        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>いま</Text>
          <Text style={styles.totalValue}>{total}</Text>
        </View>
      </View>

      <View style={styles.playArea}>
        <View style={[styles.field, { width: fieldWidth, height: fieldHeight }]}>
          {basinFrameSegments.map((segment) => (
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
          {pendingBubbles.map((bubble) => (
            <DraggableBubbleView
              key={bubble.id}
              bubble={bubble}
              sign={selectedOperator === '-' ? -1 : 1}
              isMultiplier={selectedOperator === '×'}
              onBurst={burstBubble}
              onMove={moveBubble}
            />
          ))}
          {beads.map((bead) => (
            <DraggableBeadView
              key={bead.id}
              bead={bead}
              onMove={moveBead}
              onDragStart={startDragBead}
              onDragEnd={endDragBead}
              onTap={bead.role === 'product' ? unwrapProductGroups : undefined}
            />
          ))}
          {mergeAnimation ? <MergePulse animation={mergeAnimation} /> : null}
          {message ? (
            <View style={styles.messagePill}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          ) : null}
          {isClear ? (
            <View style={styles.clearPanel}>
              <Text style={styles.clearTitle}>できた!</Text>
              <Text style={styles.clearText}>{stage.target} になったよ</Text>
              <View style={styles.clearActions}>
                <GameButton label="もう一回" onPress={resetStage} variant="secondary" />
                <GameButton label="つぎへ" onPress={goNextStage} />
              </View>
            </View>
          ) : null}
        </View>
        <OperatorRail selectedOperator={selectedOperator} onSelect={selectOperator} />
      </View>

      <View style={styles.footer}>
        <ExpressionDisplay tokens={expressionTokens} />
        <GameButton label="リトライ" onPress={resetStage} variant="secondary" />
      </View>
    </SafeAreaView>
  );
}

function BeadView({
  value,
  count,
  sign,
  role = 'normal',
  x,
  y,
  isPreview = false,
}: {
  value: PlaceValue;
  count: number;
  sign: BeadSign;
  role?: BeadRole;
  x: number;
  y: number;
  isPreview?: boolean;
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
        isGroupBubble && styles.groupBubble,
        role === 'product' && styles.productBubble,
        role === 'multiplicand' && styles.multiplicandBubble,
        {
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor: isGroupBubble ? (sign < 0 ? 'rgba(80, 92, 112, 0.32)' : 'rgba(215, 246, 255, 0.36)') : palette.color,
          borderColor: isGroupBubble ? (sign < 0 ? '#5E6B87' : '#8ED8EF') : palette.rimColor,
          left: x - radius,
          top: y - radius,
          opacity: isPreview ? 0.86 : 1,
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
                  backgroundColor: beadPalette.color,
                  borderColor: beadPalette.rimColor,
                },
              ]}
            >
              <View
                style={[
                  styles.containedBeadShine,
                  {
                    width: Math.max(8, bead.radius * 0.42),
                    height: Math.max(8, bead.radius * 0.42),
                    borderRadius: bead.radius,
                    backgroundColor: beadPalette.shineColor,
                  },
                ]}
              />
            </View>
            );
          })}
        </>
      ) : (
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
      )}
    </View>
  );
}

function MergePulse({ animation }: { animation: MergeAnimation }) {
  const nextKind = getBeadKind(animation.nextValue);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.mergePulse,
        {
          left: animation.center.x - nextKind.radius - 18,
          top: animation.center.y - nextKind.radius - 18,
          width: (nextKind.radius + 18) * 2,
          height: (nextKind.radius + 18) * 2,
          borderRadius: nextKind.radius + 18,
          borderColor: nextKind.rimColor,
          backgroundColor: nextKind.shineColor,
        },
      ]}
    />
  );
}

function OperatorRail({
  selectedOperator,
  onSelect,
}: {
  selectedOperator: OperatorSymbol;
  onSelect: (operator: OperatorButtonSymbol) => void;
}) {
  return (
    <View style={styles.operatorRail}>
      {OPERATORS.map((operator) => {
        const isSelected = operator !== '=' && operator === selectedOperator;
        return (
          <Pressable
            key={operator}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(operator)}
            style={({ pressed }) => [
              styles.operatorButton,
              isSelected && styles.selectedOperatorButton,
              pressed && styles.pressedButton,
            ]}
          >
            <Text style={[styles.operatorButtonText, isSelected && styles.selectedOperatorButtonText]}>{operator}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function ExpressionDisplay({ tokens }: { tokens: string[] }) {
  return (
    <View style={styles.expressionBox}>
      <Text style={[styles.expressionText, tokens.length === 0 && styles.expressionPlaceholder]} numberOfLines={1} adjustsFontSizeToFit>
        {tokens.length > 0 ? tokens.join(' ') : 'しき'}
      </Text>
    </View>
  );
}

function DraggableBubbleView({
  bubble,
  sign,
  isMultiplier,
  onBurst,
  onMove,
}: {
  bubble: PendingBubble;
  sign: BeadSign;
  isMultiplier: boolean;
  onBurst: (bubble: PendingBubble) => void;
  onMove: (bubbleId: string, x: number, y: number) => void;
}) {
  const startPositionRef = useRef({ x: bubble.x, y: bubble.y });
  const hasDraggedRef = useRef(false);
  const radius = isMultiplier ? getMultiplierClusterRadius(bubble.count) : getEntityRadius(1, bubble.count);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startPositionRef.current = { x: bubble.x, y: bubble.y };
          hasDraggedRef.current = false;
        },
        onPanResponderMove: (_event, gesture) => {
          if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6) {
            hasDraggedRef.current = true;
          }
          onMove(bubble.id, startPositionRef.current.x + gesture.dx, startPositionRef.current.y + gesture.dy);
        },
        onPanResponderRelease: () => {
          if (!hasDraggedRef.current) {
            onBurst(bubble);
          }
        },
        onPanResponderTerminate: () => {
          hasDraggedRef.current = false;
        },
      }),
    [bubble, onBurst, onMove],
  );

  return (
    <View
      accessibilityRole="button"
      style={[
        styles.pendingBubbleButton,
        isMultiplier && styles.multiplierBubbleButton,
        {
          left: bubble.x - radius,
          top: bubble.y - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
        },
      ]}
      {...panResponder.panHandlers}
    >
      {isMultiplier ? (
        <MultiplierBubbleCluster count={bubble.count} sign={sign} radius={radius} />
      ) : (
        <BeadView value={1} count={bubble.count} sign={sign} x={radius} y={radius} isPreview />
      )}
    </View>
  );
}

function MultiplierBubbleCluster({ count, sign, radius }: { count: number; sign: BeadSign; radius: number }) {
  const bubbles = getMultiplierBubbleParts(count);
  return (
    <View pointerEvents="none" style={styles.multiplierCluster}>
      {getSimpleBubbleStackPositions(bubbles, radius).map(({ bubble, x, y, tilt }, index) => (
        <MiniWrappedBubble
          key={`multiplier-${index}`}
          sign={sign}
          left={x}
          top={y}
          radius={bubble.radius}
          tilt={tilt}
        />
      ))}
    </View>
  );
}

function MiniWrappedBubble({
  sign,
  left,
  top,
  radius,
  tilt,
}: {
  sign: BeadSign;
  left: number;
  top: number;
  radius: number;
  tilt: number;
}) {
  const isNegative = sign < 0;

  return (
    <View
      style={[
        styles.multiplierMiniBubble,
        isNegative && styles.multiplierMiniBubbleNegative,
        {
          left,
          top,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          transform: [{ rotate: `${tilt}deg` }],
        },
      ]}
    >
      <View style={styles.miniBubbleInnerGlow} />
      <View style={styles.miniBubbleShine} />
      <View style={styles.miniBubbleLowerShine} />
    </View>
  );
}

function DraggableBeadView({
  bead,
  onMove,
  onDragStart,
  onDragEnd,
  onTap,
}: {
  bead: BeadSnapshot;
  onMove: (beadId: string, x: number, y: number) => void;
  onDragStart: (beadId: string) => void;
  onDragEnd: (beadId: string) => void;
  onTap?: () => void;
}) {
  const startPositionRef = useRef({ x: bead.x, y: bead.y });
  const hasDraggedRef = useRef(false);
  const radius = getEntityRadius(bead.value, bead.count);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startPositionRef.current = { x: bead.x, y: bead.y };
          hasDraggedRef.current = false;
          onDragStart(bead.id);
        },
        onPanResponderMove: (_event, gesture) => {
          if (Math.abs(gesture.dx) + Math.abs(gesture.dy) > 6) {
            hasDraggedRef.current = true;
          }
          onMove(bead.id, startPositionRef.current.x + gesture.dx, startPositionRef.current.y + gesture.dy);
        },
        onPanResponderRelease: () => {
          onDragEnd(bead.id);
          if (!hasDraggedRef.current) {
            onTap?.();
          }
        },
        onPanResponderTerminate: () => {
          onDragEnd(bead.id);
        },
      }),
    [bead.id, bead.x, bead.y, onDragEnd, onDragStart, onMove, onTap],
  );

  return (
    <View
      style={[
        styles.draggableBeadHitArea,
        {
          left: bead.x - radius - 8,
          top: bead.y - radius - 8,
          width: radius * 2 + 16,
          height: radius * 2 + 16,
          borderRadius: radius + 8,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <BeadView value={bead.value} count={bead.count} sign={bead.sign} role={bead.role} x={radius + 8} y={radius + 8} />
    </View>
  );
}

function GameButton({ label, onPress, variant = 'primary' }: { label: string; onPress: () => void; variant?: 'primary' | 'secondary' }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondaryButton, pressed && styles.pressedButton]}
    >
      <Text style={[styles.buttonText, variant === 'secondary' && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

function toSnapshots(entities: BeadEntity[]): BeadSnapshot[] {
  return entities.map((entity) => ({
    id: entity.id,
    value: entity.value,
    count: entity.count,
    sign: entity.sign,
    role: entity.role,
    x: entity.body.position.x,
    y: entity.body.position.y,
  }));
}

function getEntityCenter(entities: BeadEntity[]) {
  const total = entities.reduce(
    (center, entity) => ({
      x: center.x + entity.body.position.x,
      y: center.y + entity.body.position.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / entities.length,
    y: total.y / entities.length,
  };
}

function findDecompositionPair(beads: BeadSnapshot[]) {
  for (const higher of beads) {
    for (const lower of beads) {
      if (higher.id === lower.id || higher.sign === lower.sign || lower.count !== 1) {
        continue;
      }

      if (getNextPlaceValue(lower.value) !== higher.value) {
        continue;
      }

      const distance = getPointDistance(higher, lower);
      const threshold = getEntityRadius(higher.value, higher.count) + getEntityRadius(lower.value, lower.count) + 8;
      if (distance <= threshold) {
        return {
          higherBeadId: higher.id,
          lowerValue: lower.value,
        };
      }
    }
  }

  return undefined;
}

function findProductBubbleCollision(beads: BeadSnapshot[]) {
  const productGroups = beads.filter((bead) => bead.role === 'product');

  for (const productGroup of productGroups) {
    for (const collider of beads) {
      if (collider.id === productGroup.id) {
        continue;
      }

      const distance = getPointDistance(productGroup, collider);
      const threshold = getEntityRadius(productGroup.value, productGroup.count) + getEntityRadius(collider.value, collider.count) + 4;
      if (distance <= threshold) {
        return {
          productGroupId: productGroup.id,
        };
      }
    }
  }

  return undefined;
}

function findAnnihilationPair(beads: BeadSnapshot[]) {
  const positives = beads.filter((bead) => bead.sign > 0);
  const negatives = beads.filter((bead) => bead.sign < 0);

  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive.value !== negative.value || positive.count !== negative.count) {
        continue;
      }

      const distance = getPointDistance(positive, negative);
      const threshold = getEntityRadius(positive.value, positive.count) * 2.35;
      if (distance <= threshold) {
        return {
          beadIds: [positive.id, negative.id],
          center: {
            x: (positive.x + negative.x) / 2,
            y: (positive.y + negative.y) / 2,
          },
        };
      }
    }
  }

  return undefined;
}

function keepBodiesInsideField(fieldWidth: number, entities: BeadEntity[]) {
  for (const entity of entities) {
    const radius = getEntityRadius(entity.value, entity.count);
    if (entity.body.position.x < radius) {
      Matter.Body.setPosition(entity.body, { x: radius, y: entity.body.position.y });
    }
    if (entity.body.position.x > fieldWidth - radius) {
      Matter.Body.setPosition(entity.body, { x: fieldWidth - radius, y: entity.body.position.y });
    }
  }
}

function getSignedPalette(kind: ReturnType<typeof getBeadKind>, sign: BeadSign) {
  if (sign > 0) {
    return kind;
  }

  return {
    color: '#4B5B77',
    rimColor: '#26344D',
    shineColor: '#AFC5E8',
  };
}

function getPointDistance(left: Pick<BeadSnapshot, 'x' | 'y'>, right: Pick<BeadSnapshot, 'x' | 'y'>) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function isStageClear(
  target: number,
  beads: BeadSnapshot[],
  pendingBubbles: PendingBubble[],
  mergeAnimation: MergeAnimation | undefined,
) {
  if (pendingBubbles.length > 0 || mergeAnimation || beads.some((bead) => bead.role === 'product') || hasMergeableCount(beads)) {
    return false;
  }

  if (target === 10 || target === 100 || target === 1000) {
    return beads.some((bead) => bead.value === target);
  }

  return getTotalValue(beads) >= target;
}

function getEntityRadius(value: PlaceValue, count: number) {
  if (value === 1 && count > 1) {
    return 34 + Math.min(count, 10) * 3;
  }

  return getBeadKind(value).radius;
}

function getEntityUnitCount(entity: Pick<BeadEntity, 'value' | 'count'>) {
  return entity.value * entity.count;
}

function getMultiplierClusterRadius(count: number) {
  const bubbles = getMultiplierBubbleParts(count);
  const rows = getMultiplierBubbleRows(bubbles);
  const widestRow = rows.reduce((max, row) => Math.max(max, getOverlappedRowWidth(row)), 0);
  const tallestBubble = bubbles.reduce((max, bubble) => Math.max(max, bubble.radius * 2), 0);
  const contentHeight = rows.length === 1 ? tallestBubble : tallestBubble * (1 + MULTIPLIER_BUBBLE_Y_STEP);
  return Math.max(34, Math.min(86, Math.max(widestRow / 2 + 8, contentHeight / 2 + 8)));
}

function createPendingBubbles(fieldWidth: number, target: number): PendingBubble[] {
  const counts = getInitialBubbleCounts(target);
  const gap = fieldWidth / (counts.length + 1);

  return counts.map((count, index) => ({
    id: `bubble-${index}-${count}`,
    count,
    x: gap * (index + 1),
    y: BUBBLE_ROW_Y,
  }));
}

function getInitialBubbleCounts(target: number) {
  if (target === 10) {
    return [6, 4];
  }
  if (target === 20) {
    return [6, 4, 7, 3];
  }

  return GROUP_DROP_COUNTS;
}

function getGroupDotPositions(count: number, radius: number, dotSize: number) {
  const center = radius - dotSize / 2;
  if (count === 1) {
    return [{ x: center, y: center }];
  }

  const innerRadius = Math.max(0, radius - dotSize / 2 - 7);
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const ringRadius = count <= 4 ? innerRadius * 0.58 : innerRadius * 0.86;
    return {
      x: center + Math.cos(angle) * ringRadius,
      y: center + Math.sin(angle) * ringRadius,
    };
  });
}

function getContainedBeadParts(count: number): ContainedBeadPart[] {
  const parts: ContainedBeadPart[] = [];
  const placeValues: PlaceValue[] = [1000, 100, 10, 1];
  let remaining = count;

  for (const value of placeValues) {
    const copies = Math.floor(remaining / value);
    remaining %= value;
    const radius = getBeadKind(value).radius;
    for (let index = 0; index < copies; index += 1) {
      parts.push({ value, radius });
    }
  }

  return parts.length > 0 ? parts : [{ value: 1, radius: getBeadKind(1).radius }];
}

function getContainedBeadPositions(beads: ContainedBeadPart[], bubbleRadius: number) {
  if (beads.length === 0) {
    return [];
  }
  if (beads.length === 1) {
    const bead = beads[0];
    return [{ bead, x: bubbleRadius - bead.radius, y: bubbleRadius - bead.radius }];
  }

  const center = bubbleRadius;
  const largestRadius = beads.reduce((max, bead) => Math.max(max, bead.radius), 0);
  const orbitRadius = Math.max(8, bubbleRadius - largestRadius - 15);

  return beads.map((bead, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / beads.length;
    const rowOffset = beads.length <= 4 ? 0.78 : index % 2 === 0 ? 0.92 : 0.58;
    return {
      bead,
      x: center + Math.cos(angle) * orbitRadius * rowOffset - bead.radius,
      y: center + Math.sin(angle) * orbitRadius * rowOffset - bead.radius,
    };
  });
}

function getMultiplierBubbleParts(count: number): MultiplierBubblePart[] {
  const parts: MultiplierBubblePart[] = [];
  const placeValues: PlaceValue[] = [1000, 100, 10, 1];
  let remaining = count;

  for (const value of placeValues) {
    const copies = Math.floor(remaining / value);
    remaining %= value;
    const beadRadius = getBeadKind(value).radius;
    const bubbleRadius = beadRadius + 14;
    for (let index = 0; index < copies; index += 1) {
      parts.push({ value, radius: bubbleRadius });
    }
  }

  return parts.length > 0 ? parts : [{ value: 1, radius: getBeadKind(1).radius + 14 }];
}

function getSimpleBubbleStackPositions(bubbles: MultiplierBubblePart[], radius: number) {
  if (bubbles.length === 1) {
    const bubble = bubbles[0];
    return [{ bubble, x: radius - bubble.radius, y: radius - bubble.radius, tilt: 0 }];
  }

  const rows = getMultiplierBubbleRows(bubbles);
  const rowLayouts = rows.map((row, rowIndex) => {
    const width = getOverlappedRowWidth(row);
    const tallest = row.reduce((max, bubble) => Math.max(max, bubble.radius * 2), 0);
    return { row, rowIndex, width, tallest };
  });
  const contentHeight = rowLayouts.reduce(
    (sum, row, index) => sum + row.tallest * (index === 0 ? 1 : MULTIPLIER_BUBBLE_Y_STEP),
    0,
  );
  let y = radius - contentHeight / 2;

  return rowLayouts.flatMap((layout) => {
    let x = radius - layout.width / 2;
    const rowY = y;
    y += layout.tallest * MULTIPLIER_BUBBLE_Y_STEP;
    return layout.row.map((bubble, index) => {
      const position = {
        bubble,
        x,
        y: rowY + layout.tallest / 2 - bubble.radius,
        tilt: (index - (layout.row.length - 1) / 2) * 3 + (layout.rowIndex === 0 ? -2 : 2),
      };
      x += bubble.radius * MULTIPLIER_BUBBLE_X_STEP;
      return position;
    });
  });
}

function getMultiplierBubbleRows(bubbles: MultiplierBubblePart[]) {
  const rowCount = bubbles.length <= 4 ? 1 : 2;
  const rows = Array.from({ length: rowCount }, () => [] as MultiplierBubblePart[]);
  bubbles.forEach((bubble, index) => {
    rows[index % rowCount].push(bubble);
  });
  return rows;
}

function getOverlappedRowWidth(row: MultiplierBubblePart[]) {
  return row.reduce((sum, bubble, index) => {
    if (index === 0) {
      return bubble.radius * 2;
    }
    return sum + bubble.radius * MULTIPLIER_BUBBLE_X_STEP;
  }, 0);
}

function applySameValueAttraction(entities: BeadEntity[], draggingBeadId?: string) {
  for (let leftIndex = 0; leftIndex < entities.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entities.length; rightIndex += 1) {
      const left = entities[leftIndex];
      const right = entities[rightIndex];
      if (left.id === draggingBeadId || right.id === draggingBeadId) {
        continue;
      }
      if (left.sign !== right.sign || left.value !== right.value || !getNextPlaceValue(left.value)) {
        continue;
      }

      const dx = right.body.position.x - left.body.position.x;
      const dy = right.body.position.y - left.body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 1 || distance > ATTRACTION_RADIUS) {
        continue;
      }

      const leftSpeed = Math.sqrt(left.body.velocity.x * left.body.velocity.x + left.body.velocity.y * left.body.velocity.y);
      const rightSpeed = Math.sqrt(right.body.velocity.x * right.body.velocity.x + right.body.velocity.y * right.body.velocity.y);
      const velocityFactor = clamp(1 - (leftSpeed + rightSpeed) / 18, 0.35, 1);
      const closeness = 1 - distance / ATTRACTION_RADIUS;
      const strength = ATTRACTION_FORCE * closeness * closeness * velocityFactor;
      const force = {
        x: (dx / distance) * strength,
        y: (dy / distance) * strength,
      };

      Matter.Body.applyForce(left.body, left.body.position, force);
      Matter.Body.applyForce(right.body, right.body.position, {
        x: -force.x,
        y: -force.y,
      });
    }
  }
}

function createBasinBodies(fieldWidth: number, fieldHeight: number) {
  return getBasinFrameSegments(fieldWidth, fieldHeight).map((segment) =>
    Matter.Bodies.rectangle(segment.centerX, segment.centerY, segment.length + 8, BASIN_BODY_THICKNESS, {
      isStatic: true,
      angle: segment.angle,
      friction: 0.14,
      frictionStatic: 0.01,
      restitution: 0.02,
    }),
  );
}

function getBasinFrameSegments(fieldWidth: number, fieldHeight: number) {
  const points = getBasinPoints(fieldWidth, fieldHeight);

  return points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const centerX = point.x + dx / 2;
    const centerY = point.y + dy / 2;
    const topSurfaceOffsetX = Math.sin(angle) * (BASIN_BODY_THICKNESS / 2);
    const topSurfaceOffsetY = -Math.cos(angle) * (BASIN_BODY_THICKNESS / 2);
    const visualCenterX = centerX + topSurfaceOffsetX;
    const visualCenterY = centerY + topSurfaceOffsetY;

    return {
      id: `basin-${index}`,
      x: visualCenterX - length / 2,
      y: visualCenterY - BASIN_FRAME_THICKNESS / 2,
      centerX,
      centerY,
      length,
      angle,
    };
  });
}

function getBasinPoints(fieldWidth: number, fieldHeight: number) {
  const curve = getBasinCurveMetrics(fieldWidth, fieldHeight);
  const pointCount = 97;

  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const x = curve.inset + (fieldWidth - curve.inset * 2) * progress;
    const distanceFromCenter = Math.abs(progress - 0.5) * 2;
    const y = curve.bottomY - curve.depth * Math.pow(distanceFromCenter, 0.92);

    return { x, y };
  });
}

function getBasinCurveMetrics(fieldWidth: number, fieldHeight: number) {
  const bottomY = fieldHeight - 12 - BASIN_BODY_THICKNESS / 2;
  const depth = Math.min(292, fieldHeight * 0.58);
  return {
    width: fieldWidth,
    centerX: fieldWidth / 2,
    bottomY,
    depth,
    sideY: bottomY - depth,
    inset: 4,
  };
}

function getMergeMessage(from: PlaceValue, to: PlaceValue) {
  if (from === 1) {
    return `1のまる 10こで ${to}`;
  }
  return `${from}のまる 10こで ${to}`;
}

function addNumberToExpression(tokens: string[], value: number, selectedOperator: OperatorSymbol, totalValue: number) {
  const expressionTokens = stripExpressionResult(tokens);
  const nextTokens = [...expressionTokens];

  if (nextTokens.length === 0) {
    return [String(value), selectedOperator];
  } else if (isOperatorToken(nextTokens[nextTokens.length - 1])) {
    nextTokens.push(String(value));
  } else {
    nextTokens.push(selectedOperator, String(value));
  }

  return completeExpression(nextTokens, totalValue);
}

function replaceTrailingOperator(tokens: string[], operator: OperatorSymbol) {
  if (tokens.length === 0) {
    return tokens;
  }

  if (operator === '×' || operator === '÷') {
    return appendPriorityOperator(tokens, operator);
  }

  const nextTokens = stripExpressionResult(tokens);
  if (isOperatorToken(nextTokens[nextTokens.length - 1])) {
    nextTokens[nextTokens.length - 1] = operator;
    return nextTokens;
  }

  return [...nextTokens, operator];
}

function appendPriorityOperator(tokens: string[], operator: OperatorSymbol) {
  const nextTokens = [...tokens];
  if (isOperatorToken(nextTokens[nextTokens.length - 1])) {
    nextTokens[nextTokens.length - 1] = operator;
    return nextTokens;
  }

  const equalsIndex = nextTokens.indexOf('=');
  const expressionTokens = equalsIndex >= 0 ? nextTokens.slice(0, equalsIndex) : nextTokens;
  if (expressionTokens.length === 0) {
    return tokens;
  }

  const normalizedExpressionTokens =
    expressionTokens.length === 1 ? (unwrapParenthesizedToken(expressionTokens[0]) ?? expressionTokens) : expressionTokens;

  return [`(${normalizedExpressionTokens.join(' ')})`, operator];
}

function completeExpression(tokens: string[], result: number) {
  if (tokens.length === 0 || tokens.includes('=')) {
    return tokens;
  }

  if (isOperatorToken(tokens[tokens.length - 1])) {
    return tokens;
  }

  return [...tokens, '=', String(result)];
}

function evaluateExpressionOnEquals(tokens: string[]) {
  const expressionTokens = stripExpressionResult(tokens);
  const normalizedTokens = unwrapPendingPriorityExpression(expressionTokens);
  if (normalizedTokens.length === 0 || isOperatorToken(normalizedTokens[normalizedTokens.length - 1])) {
    const withoutTrailingOperator = normalizedTokens.slice(0, -1);
    const value = evaluateExpressionTokens(withoutTrailingOperator);
    return value === undefined ? tokens : [...withoutTrailingOperator, '=', String(value)];
  }

  const value = evaluateExpressionTokens(normalizedTokens);
  return value === undefined ? tokens : [...normalizedTokens, '=', String(value)];
}

function unwrapPendingPriorityExpression(tokens: string[]) {
  if (tokens.length !== 2 || !isPriorityOperator(tokens[1])) {
    return tokens;
  }

  const wrappedExpression = unwrapParenthesizedToken(tokens[0]);
  return wrappedExpression ?? tokens;
}

function unwrapParenthesizedToken(token: string) {
  const unwrappedToken = unwrapOuterParentheses(token);
  if (unwrappedToken === token) {
    return undefined;
  }

  return unwrappedToken.split(' ');
}

function unwrapOuterParentheses(token: string) {
  let currentToken = token.trim();
  while (hasSingleOuterParentheses(currentToken)) {
    currentToken = currentToken.slice(1, -1).trim();
  }

  return currentToken;
}

function hasSingleOuterParentheses(token: string) {
  if (!token.startsWith('(') || !token.endsWith(')')) {
    return false;
  }

  let depth = 0;
  for (let index = 0; index < token.length; index += 1) {
    const character = token[index];
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth === 0 && index < token.length - 1) {
        return false;
      }
    }
  }

  return depth === 0;
}

function evaluateExpressionTokens(tokens: string[]) {
  if (tokens.length === 0 || isOperatorToken(tokens[tokens.length - 1])) {
    return undefined;
  }

  const expandedTokens = tokens.flatMap((token) => unwrapParenthesizedToken(token) ?? [token]);
  const firstValue = Number(expandedTokens[0]);
  if (!Number.isFinite(firstValue)) {
    return undefined;
  }

  let total = firstValue;
  for (let index = 1; index < expandedTokens.length; index += 2) {
    const operator = expandedTokens[index];
    const value = Number(expandedTokens[index + 1]);
    if (!isOperatorToken(operator) || !Number.isFinite(value)) {
      return undefined;
    }

    if (operator === '+') {
      total += value;
    } else if (operator === '-') {
      total -= value;
    } else if (operator === '×') {
      total *= value;
    } else if (operator === '÷') {
      total /= value;
    }
  }

  return total;
}

function stripExpressionResult(tokens: string[]) {
  const equalsIndex = tokens.indexOf('=');
  return equalsIndex >= 0 ? tokens.slice(0, equalsIndex) : tokens;
}

function isOperatorToken(token: string | undefined): token is OperatorSymbol {
  return token === '+' || token === '-' || token === '×' || token === '÷';
}

function isPriorityOperator(token: string | undefined) {
  return token === '×' || token === '÷';
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F6F1E8',
  },
  header: {
    minHeight: 116,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  stageLabel: {
    color: '#4E5D54',
    fontSize: 14,
    fontWeight: '700',
  },
  title: {
    marginTop: 4,
    color: '#25342C',
    fontSize: 30,
    fontWeight: '900',
  },
  totalBox: {
    minWidth: 86,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#D1C8B9',
    alignItems: 'center',
  },
  totalLabel: {
    color: '#6D766F',
    fontSize: 13,
    fontWeight: '800',
  },
  totalValue: {
    color: '#25342C',
    fontSize: 28,
    fontWeight: '900',
  },
  playArea: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: FIELD_GAP,
  },
  field: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#8A7E6D',
    backgroundColor: '#FBF8F0',
  },
  operatorRail: {
    width: OPERATOR_RAIL_WIDTH,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  operatorButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#B8AD9C',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOperatorButton: {
    borderColor: '#2F7D68',
    backgroundColor: '#2F7D68',
  },
  operatorButtonText: {
    color: '#25342C',
    fontSize: 27,
    fontWeight: '900',
    lineHeight: 31,
  },
  selectedOperatorButtonText: {
    color: '#FFFFFF',
  },
  basinFrameSegment: {
    position: 'absolute',
    height: BASIN_FRAME_THICKNESS,
    borderRadius: BASIN_FRAME_THICKNESS,
    backgroundColor: '#8A7E6D',
  },
  pendingBubbleButton: {
    position: 'absolute',
    zIndex: 2,
  },
  multiplierBubbleButton: {
    transform: [{ rotate: '-10deg' }, { scaleY: 0.92 }],
  },
  multiplierCluster: {
    position: 'relative',
    flex: 1,
  },
  multiplierMiniBubble: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: '#8ED8EF',
    backgroundColor: 'rgba(219, 248, 255, 0.34)',
    shadowColor: '#62B9D9',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  multiplierMiniBubbleNegative: {
    borderColor: '#7E8EA5',
    backgroundColor: 'rgba(87, 102, 124, 0.2)',
    shadowColor: '#506079',
  },
  miniBubbleInnerGlow: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 6,
    bottom: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.62)',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  miniBubbleShine: {
    position: 'absolute',
    left: 7,
    top: 6,
    width: 17,
    height: 11,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.84)',
    transform: [{ rotate: '-24deg' }],
  },
  miniBubbleLowerShine: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    width: 13,
    height: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    transform: [{ rotate: '-18deg' }],
  },
  mergePulse: {
    position: 'absolute',
    zIndex: 3,
    borderWidth: 4,
    opacity: 0.28,
  },
  draggableBeadHitArea: {
    position: 'absolute',
    zIndex: 1,
  },
  bead: {
    position: 'absolute',
    borderWidth: 3,
    shadowColor: '#3D3327',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  groupBubble: {
    borderWidth: 3,
    shadowColor: '#62B9D9',
    shadowOpacity: 0.24,
    shadowRadius: 8,
  },
  multiplicandBubble: {
    borderColor: '#2F7D68',
    borderWidth: 4,
  },
  productBubble: {
    borderColor: '#4D6FB5',
    shadowColor: '#4D6FB5',
    shadowOpacity: 0.28,
  },
  beadShine: {
    marginTop: 4,
    marginLeft: 5,
    opacity: 0.82,
  },
  bubbleShine: {
    position: 'absolute',
    left: 10,
    top: 8,
    width: 30,
    height: 18,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    transform: [{ rotate: '-28deg' }],
  },
  bubbleSmallShine: {
    position: 'absolute',
    right: 14,
    top: 18,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  bubbleInnerGlow: {
    position: 'absolute',
    left: 7,
    right: 7,
    top: 7,
    bottom: 7,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  containedBead: {
    position: 'absolute',
    borderWidth: 3,
    shadowColor: '#3D3327',
    shadowOpacity: 0.12,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  containedBeadShine: {
    marginTop: 4,
    marginLeft: 5,
    width: 8,
    height: 8,
    borderRadius: 4,
    opacity: 0.82,
  },
  messagePill: {
    position: 'absolute',
    top: 78,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2F473A',
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  clearPanel: {
    position: 'absolute',
    left: 24,
    right: 24,
    top: '34%',
    padding: 18,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: '#2F473A',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  clearTitle: {
    color: '#25342C',
    fontSize: 34,
    fontWeight: '900',
  },
  clearText: {
    marginTop: 4,
    color: '#4E5D54',
    fontSize: 18,
    fontWeight: '800',
  },
  clearActions: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  footer: {
    minHeight: 96,
    paddingHorizontal: 18,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  expressionBox: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1C8B9',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
  },
  expressionText: {
    color: '#25342C',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
  },
  expressionPlaceholder: {
    color: '#9B9387',
  },
  button: {
    minHeight: 48,
    minWidth: 92,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2F7D68',
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#B8AD9C',
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
    opacity: 0.86,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  secondaryButtonText: {
    color: '#25342C',
  },
});
