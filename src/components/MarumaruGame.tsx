import * as Matter from 'matter-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getBeadKind, getNextPlaceValue } from '@/game/beads';
import {
  evaluateExpressionTokens,
  evaluateExpressionOnEquals,
  getDisplayBeadsForPendingPriorityExpression,
  getPendingOperationExpressionValue,
  isOperatorToken,
  isPriorityOperator,
  OperatorSymbol,
  replaceTrailingOperator,
  stripExpressionResult,
} from '@/game/expression';
import { findMergeCluster, getTotalValue, hasMergeableCount } from '@/game/merge';
import { getStage, STAGES } from '@/game/stages';
import { BeadRole, BeadSign, BeadSnapshot, PlaceValue } from '@/game/types';

type BeadEntity = {
  id: string;
  value: PlaceValue;
  count: number;
  sign: BeadSign;
  role: BeadRole;
  createdAt: number;
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

type DivisionSplitAnimation = {
  id: string;
  resultBeadId: string;
  center: {
    x: number;
    y: number;
  };
  quotient: number;
  divisor: number;
  sign: BeadSign;
  startedAt: number;
  progress: number;
};

type OperationSource = {
  entities: BeadEntity[];
  count: number;
  sign: BeadSign;
};

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
const FIELD_ENTITY_INSET = 10;
const BUBBLE_ROW_Y = 56;
const MERGE_ANIMATION_MS = 520;
const UNIT_MERGE_ANIMATION_MS = 820;
const MERGE_COOLDOWN_MS = 420;
const UNIT_MERGE_COOLDOWN_MS = 900;
const UNIT_MERGE_READY_DELAY_MS = 520;
const ANNIHILATION_ANIMATION_MS = 180;
const DIVISION_SPLIT_ANIMATION_MS = 760;
const PRODUCT_BUBBLE_BURST_DELAY_MS = 950;
const OPERATORS: OperatorButtonSymbol[] = ['+', '-', '×', '÷', '='];
const DETAILED_RELEASE_BEAD_LIMIT = 80;
const MULTIPLIER_BUBBLE_X_STEP = 0.34;
const MULTIPLIER_BUBBLE_Y_STEP = 0.28;
const COLLISION_CATEGORY_WORLD = 0x0001;
const COLLISION_CATEGORY_BY_VALUE: Record<PlaceValue, number> = {
  1: 0x0002,
  10: 0x0004,
  100: 0x0008,
  1000: 0x0010,
  10000: 0x0020,
  100000: 0x0040,
};

export function MarumaruGame({ initialStageIndex = 0, onBack }: { initialStageIndex?: number; onBack?: () => void }) {
  const { width, height } = useWindowDimensions();
  const fieldWidth = Math.max(240, width - FIELD_MARGIN * 2 - FIELD_GAP - OPERATOR_RAIL_WIDTH);
  const fieldHeight = Math.max(360, height - HEADER_HEIGHT - FOOTER_HEIGHT);
  const [stageIndex, setStageIndex] = useState(initialStageIndex);
  const stage = getStage(stageIndex);
  const [selectedOperator, setSelectedOperator] = useState<OperatorSymbol>('+');
  const selectedOperatorRef = useRef<OperatorSymbol>('+');
  const [operatorSign, setOperatorSign] = useState<BeadSign>(1);
  const operatorSignRef = useRef<BeadSign>(1);
  const [expressionTokens, setExpressionTokens] = useState<string[]>([]);
  const expressionTokensRef = useRef<string[]>([]);
  const expressionTotalRef = useRef(0);
  const expressionHistoryRef = useRef<string[]>([]);
  const [pendingBubbles, setPendingBubbles] = useState<PendingBubble[]>([]);
  const [beads, setBeads] = useState<BeadSnapshot[]>([]);
  const [mergeAnimation, setMergeAnimation] = useState<MergeAnimation | undefined>(undefined);
  const [annihilationAnimation, setAnnihilationAnimation] = useState<AnnihilationAnimation | undefined>(undefined);
  const [divisionSplitAnimation, setDivisionSplitAnimation] = useState<DivisionSplitAnimation | undefined>(undefined);
  const [message, setMessage] = useState('あわをさわると まるがでるよ');
  const [isClear, setIsClear] = useState(false);
  const [isFailed, setIsFailed] = useState(false);
  const engineRef = useRef<Matter.Engine | null>(null);
  const entitiesRef = useRef<BeadEntity[]>([]);
  const draggingBeadIdRef = useRef<string | undefined>(undefined);
  const idRef = useRef(0);
  const lastMergeAtRef = useRef(0);
  const mergeReadySinceRef = useRef<number | undefined>(undefined);
  const resultReadySinceRef = useRef<number | undefined>(undefined);

  const total = useMemo(() => getTotalValue(beads), [beads]);
  const displayBeads = useMemo(
    () => getDisplayBeadsForPendingPriorityExpression(beads, expressionTokens),
    [beads, expressionTokens],
  );
  const basinFrameSegments = useMemo(() => getBasinFrameSegments(fieldWidth, fieldHeight), [fieldHeight, fieldWidth]);

  const resetStage = useCallback(() => {
    const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.08 } });
    const wallThickness = 80;
    const floor = Matter.Bodies.rectangle(fieldWidth / 2, fieldHeight + wallThickness / 2, fieldWidth, wallThickness, {
      isStatic: true,
      collisionFilter: getWorldCollisionFilter(),
    });
    const basinSegments = createBasinBodies(fieldWidth, fieldHeight);
    const leftWall = Matter.Bodies.rectangle(-wallThickness / 2, fieldHeight / 2, wallThickness, fieldHeight * 2, {
      isStatic: true,
      collisionFilter: getWorldCollisionFilter(),
    });
    const rightWall = Matter.Bodies.rectangle(fieldWidth + wallThickness / 2, fieldHeight / 2, wallThickness, fieldHeight * 2, {
      isStatic: true,
      collisionFilter: getWorldCollisionFilter(),
    });

    Matter.Composite.add(engine.world, [floor, ...basinSegments, leftWall, rightWall]);
    engineRef.current = engine;
    entitiesRef.current = [];
    setBeads([]);
    setPendingBubbles(createPendingBubbles(fieldWidth, stage.bubbleCounts));
    expressionTokensRef.current = [];
    setExpressionTokens([]);
    expressionHistoryRef.current = [];
    expressionTotalRef.current = 0;
    selectedOperatorRef.current = '+';
    operatorSignRef.current = 1;
    setSelectedOperator('+');
    setOperatorSign(1);
    setMergeAnimation(undefined);
    setAnnihilationAnimation(undefined);
    setDivisionSplitAnimation(undefined);
    setMessage('あわをさわると まるがでるよ');
    setIsClear(false);
    setIsFailed(false);
    mergeReadySinceRef.current = undefined;
    resultReadySinceRef.current = undefined;
  }, [fieldHeight, fieldWidth, stage.bubbleCounts]);

  useEffect(() => {
    resetStage();
  }, [resetStage]);

  useEffect(() => {
    expressionTokensRef.current = expressionTokens;
  }, [expressionTokens]);

  useEffect(() => {
    selectedOperatorRef.current = selectedOperator;
  }, [selectedOperator]);

  useEffect(() => {
    operatorSignRef.current = operatorSign;
  }, [operatorSign]);

  useEffect(() => {
    setStageIndex(initialStageIndex);
  }, [initialStageIndex]);

  useEffect(() => {
    if (isClear || !isStageReadyForResult(pendingBubbles)) {
      resultReadySinceRef.current = undefined;
      return;
    }

    const now = Date.now();
    resultReadySinceRef.current ??= now;
    if (now - resultReadySinceRef.current < 650) {
      return;
    }

    const currentTotal = getTotalValue(beads);
    if (currentTotal === stage.target) {
      setIsClear(true);
      setIsFailed(false);
      setMessage('できた!');
      return;
    }

    if (!isFailed && !hasMergeableCount(beads) && !mergeAnimation) {
      setIsFailed(true);
      setMessage('もう一回 やってみよう');
    }

    return undefined;
  }, [beads, isClear, isFailed, mergeAnimation, pendingBubbles, stage.target]);

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
      collisionFilter: getBeadCollisionFilter(value),
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
      createdAt: Date.now(),
      body,
    };
    entitiesRef.current = [...entitiesRef.current, entity];
    Matter.Composite.add(engine.world, body);
    return entity;
    },
    [],
  );

  const addReleasedBeads = useCallback(
    (totalCount: number, sign: BeadSign, center: { x: number; y: number }) => {
      if (totalCount <= DETAILED_RELEASE_BEAD_LIMIT) {
        for (let index = 0; index < totalCount; index += 1) {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(totalCount, 1);
          const ring = 18 + Math.floor(index / 10) * 10;
          addBead(1, 1, sign, center.x + Math.cos(angle) * ring, center.y + Math.sin(angle) * ring, false, {
            x: Math.cos(angle) * 2,
            y: Math.sin(angle) * 1.2,
          });
        }
        return false;
      }

      const beadsToAdd = getPlaceValueBeads(totalCount);
      for (let index = 0; index < beadsToAdd.length; index += 1) {
        const value = beadsToAdd[index];
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(beadsToAdd.length, 1);
        const ring = 22 + Math.floor(index / 8) * 12;
        addBead(value, 1, sign, center.x + Math.cos(angle) * ring, center.y + Math.sin(angle) * ring, false, {
          x: Math.cos(angle) * 1.55,
          y: Math.sin(angle) * 0.9,
        });
      }
      return true;
    },
    [addBead],
  );

  const wrapMultiplicandForMultiplication = useCallback((tokensOverride?: string[]) => {
    const engine = engineRef.current;
    const expressionValue = getPendingOperationExpressionValue(tokensOverride ?? expressionTokensRef.current);
    const targetSign: BeadSign = expressionValue !== undefined && expressionValue < 0 ? -1 : 1;
    const candidates = entitiesRef.current.filter((entity) => isWrappableEntity(entity) && entity.sign === targetSign);
    if (!engine || candidates.length === 0) {
      return;
    }

    const physicalTotal = candidates.reduce((sum, entity) => sum + getEntityUnitCount(entity), 0);
    const totalCount = expressionValue !== undefined && Math.abs(expressionValue) > 0 ? Math.round(Math.abs(expressionValue)) : physicalTotal;
    if (candidates.length === 1 && candidates[0].role === 'multiplicand' && candidates[0].sign === targetSign && getEntityUnitCount(candidates[0]) === totalCount) {
      return;
    }
    const center = getEntityCenter(candidates);
    removeBodies(engine, candidates);
    entitiesRef.current = entitiesRef.current.filter((entity) => !candidates.some((candidate) => candidate.id === entity.id));
    addBead(1, totalCount, targetSign, center.x, center.y, false, undefined, 'multiplicand');
    setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
  }, [addBead, fieldHeight, fieldWidth]);

  useEffect(() => {
    if (isPriorityOperator(expressionTokens[expressionTokens.length - 1])) {
      wrapMultiplicandForMultiplication(expressionTokens);
    }
  }, [expressionTokens, wrapMultiplicandForMultiplication]);

  const multiplyWrappedGroup = useCallback(
    (bubble: PendingBubble) => {
      const engine = engineRef.current;
      const previousTokens = stripExpressionResult(expressionTokensRef.current);
      const source = getOperationSource(entitiesRef.current, previousTokens);
      if (!engine || source.entities.length === 0 || source.count <= 0) {
        return;
      }

      setPendingBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
      removeBodies(engine, source.entities);
      const sourceIds = new Set(source.entities.map((entity) => entity.id));
      const remainingEntities = entitiesRef.current.filter((entity) => !sourceIds.has(entity.id));
      const remainingTotal = getTotalValue(toSnapshots(remainingEntities));
      entitiesRef.current = remainingEntities;
      const sourceCenter = getEntityCenter(source.entities);
      const multiplierSign = operatorSignRef.current;
      const resultSign = multiplySigns(source.sign, multiplierSign);
      const signedSourceCount = source.count * source.sign;
      const signedMultiplier = bubble.count * multiplierSign;

      for (let index = 0; index < bubble.count; index += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / bubble.count;
        const spread = Math.max(46, getEntityRadius(1, source.count) * 0.78);
        const x = sourceCenter.x + Math.cos(angle) * spread;
        const y = sourceCenter.y + Math.sin(angle) * spread * 0.72;
        addBead(1, source.count, resultSign, x, y, false, { x: Math.cos(angle) * 1.8, y: 2 + Math.sin(angle) }, 'product');
      }

      const productTotal = signedSourceCount * signedMultiplier;
      expressionTotalRef.current = remainingTotal + productTotal;
      const nextExpressionTokens = getMultiplicationExpressionTokens(
        previousTokens,
        remainingTotal,
        signedSourceCount,
        signedMultiplier,
        expressionTotalRef.current,
      );
      expressionTokensRef.current = nextExpressionTokens;
      expressionHistoryRef.current = stripExpressionResult(nextExpressionTokens);
      setExpressionTokens(nextExpressionTokens);
      setMessage(`${formatSignedCount(signedSourceCount)}のまとまりが ${formatSignedCount(signedMultiplier)}こ`);
      setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
    },
    [addBead, fieldHeight, fieldWidth],
  );

  const divideWrappedGroup = useCallback(
    (bubble: PendingBubble) => {
      const engine = engineRef.current;
      const previousTokens = stripExpressionResult(expressionTokensRef.current);
      const source = getOperationSource(entitiesRef.current, previousTokens);
      if (!engine || source.entities.length === 0 || source.count <= 0) {
        return;
      }

      if (source.count % bubble.count !== 0) {
        setMessage(`${source.count}は ${bubble.count}つに ぴったりわけられないよ`);
        return;
      }

      setPendingBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
      removeBodies(engine, source.entities);
      const sourceIds = new Set(source.entities.map((entity) => entity.id));
      const remainingEntities = entitiesRef.current.filter((entity) => !sourceIds.has(entity.id));
      const remainingTotal = getTotalValue(toSnapshots(remainingEntities));
      entitiesRef.current = remainingEntities;
      const sourceCenter = getEntityCenter(source.entities);
      const divisorSign = operatorSignRef.current;
      const resultSign = multiplySigns(source.sign, divisorSign);
      const signedSourceCount = source.count * source.sign;
      const signedDivisor = bubble.count * divisorSign;

      const quotient = source.count / bubble.count;
      const resultBead = addBead(1, quotient, resultSign, sourceCenter.x, sourceCenter.y, false, { x: 0, y: -0.4 }, 'division');
      if (!resultBead) {
        return;
      }
      setDivisionSplitAnimation({
        id: `division-${Date.now()}`,
        resultBeadId: resultBead.id,
        center: sourceCenter,
        quotient,
        divisor: bubble.count,
        sign: resultSign,
        startedAt: Date.now(),
        progress: 0,
      });

      expressionTotalRef.current = remainingTotal + quotient * resultSign;
      const nextExpressionTokens = getDivisionExpressionTokens(
        previousTokens,
        remainingTotal,
        signedSourceCount,
        signedDivisor,
        expressionTotalRef.current,
      );
      expressionTokensRef.current = nextExpressionTokens;
      expressionHistoryRef.current = stripExpressionResult(nextExpressionTokens);
      setExpressionTokens(nextExpressionTokens);
      setMessage(`${formatSignedCount(signedSourceCount)}を ${formatSignedCount(signedDivisor)}つに わけたよ`);
      setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
    },
    [addBead, fieldHeight, fieldWidth],
  );

  const unwrapProductGroups = useCallback(() => {
    const engine = engineRef.current;
    const productGroups = entitiesRef.current.filter((entity) => entity.role === 'product' && isBurstableWrappedGroup(entity));
    if (!engine || productGroups.length === 0) {
      return false;
    }

    const totalValue = productGroups.reduce((sum, entity) => sum + entity.count * entity.sign, 0);
    const releaseSign: BeadSign = totalValue < 0 ? -1 : 1;
    const releaseCount = Math.abs(totalValue);
    const center = getEntityCenter(productGroups);
    removeBodies(engine, productGroups);
    entitiesRef.current = entitiesRef.current.filter((entity) => !productGroups.some((product) => product.id === entity.id));

    const usedSimpleRelease = releaseCount > 0 ? addReleasedBeads(releaseCount, releaseSign, center) : false;

    const evaluatedTokens = evaluateExpressionOnEquals(expressionTokens);
    expressionTokensRef.current = evaluatedTokens;
    expressionHistoryRef.current = stripExpressionResult(evaluatedTokens);
    setExpressionTokens(evaluatedTokens);
    setMessage(usedSimpleRelease ? `${formatSignedCount(totalValue)}を まとまったまるでだしたよ` : `${formatSignedCount(totalValue)}この まるになったよ`);
    setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
    return true;
  }, [addReleasedBeads, expressionTokens, fieldHeight, fieldWidth]);

  const unwrapProductGroup = useCallback(
    (productGroupId: string) => {
      const engine = engineRef.current;
      const productGroup = entitiesRef.current.find((entity) => entity.id === productGroupId && isBurstableWrappedGroup(entity));
      if (!engine || !productGroup) {
        return false;
      }

      Matter.Composite.remove(engine.world, productGroup.body);
      entitiesRef.current = entitiesRef.current.filter((entity) => entity.id !== productGroup.id);

      const usedSimpleRelease = addReleasedBeads(productGroup.count, productGroup.sign, productGroup.body.position);

      setMessage(usedSimpleRelease ? `${productGroup.count}を まとまったまるでだしたよ` : `${productGroup.count}この まるに われたよ`);
      setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
      return true;
    },
    [addReleasedBeads, fieldHeight, fieldWidth],
  );

  const unwrapBeadGroup = useCallback(
    (beadId: string) => {
      const engine = engineRef.current;
      const group = entitiesRef.current.find((entity) => entity.id === beadId);
      if (!engine || !group || group.value !== 1 || group.count <= 1) {
        return false;
      }

      Matter.Composite.remove(engine.world, group.body);
      entitiesRef.current = entitiesRef.current.filter((entity) => entity.id !== group.id);

      for (let index = 0; index < group.count; index += 1) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / group.count;
        const ring = 16 + Math.floor(index / 10) * 8;
        addBead(1, 1, group.sign, group.body.position.x + Math.cos(angle) * ring, group.body.position.y + Math.sin(angle) * ring, false, {
          x: Math.cos(angle) * 1.9,
          y: Math.sin(angle) * 1.1,
        });
      }

      setMessage(`${group.count}この まるに われたよ`);
      setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
      return true;
    },
    [addBead, fieldHeight, fieldWidth],
  );

  const burstBubble = useCallback(
    (bubble: PendingBubble) => {
      if (isClear || isFailed) {
        return;
      }

      if (selectedOperator === '×') {
        multiplyWrappedGroup(bubble);
        return;
      }
      if (selectedOperator === '÷') {
        divideWrappedGroup(bubble);
        return;
      }

      const sign: BeadSign = selectedOperator === '-' ? -1 : 1;
      setPendingBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
      expressionTotalRef.current += bubble.count * sign;
      setExpressionTokens((current) => {
        const nextTokens = addNumberToExpression(current, bubble.count, selectedOperator, expressionTotalRef.current);
        expressionTokensRef.current = nextTokens;
        expressionHistoryRef.current = stripExpressionResult(nextTokens);
        return nextTokens;
      });
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
    [addBead, divideWrappedGroup, isClear, isFailed, multiplyWrappedGroup, selectedOperator],
  );

  const selectOperator = useCallback(
    (operator: OperatorButtonSymbol) => {
      if (operator === '=') {
        if (unwrapProductGroups()) {
          return;
        }

        setExpressionTokens((current) => {
          const nextTokens = evaluateExpressionOnEquals(current);
          expressionTokensRef.current = nextTokens;
          expressionHistoryRef.current = stripExpressionResult(nextTokens);
          return nextTokens;
        });
        return;
      }

      const nextOperatorSign: BeadSign = operator === '-' ? -1 : operator === '+' ? 1 : selectedOperatorRef.current === '-' ? -1 : operatorSignRef.current;

      if (operator === selectedOperator) {
        operatorSignRef.current = nextOperatorSign;
        setOperatorSign(nextOperatorSign);
        if (operator === '×' || operator === '÷') {
          const nextTokens = replaceTrailingOperator(expressionTokensRef.current, operator);
          expressionTokensRef.current = nextTokens;
          expressionHistoryRef.current = stripExpressionResult(nextTokens);
          setExpressionTokens(nextTokens);
          wrapMultiplicandForMultiplication(nextTokens);
        }
        return;
      }

      setSelectedOperator(operator);
      selectedOperatorRef.current = operator;
      operatorSignRef.current = nextOperatorSign;
      setOperatorSign(nextOperatorSign);
      const nextTokens = replaceTrailingOperator(expressionTokensRef.current, operator);
      expressionTokensRef.current = nextTokens;
      expressionHistoryRef.current = stripExpressionResult(nextTokens);
      setExpressionTokens(nextTokens);
      if (operator === '×' || operator === '÷') {
        wrapMultiplicandForMultiplication(nextTokens);
      }
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
      setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
    },
    [fieldHeight, fieldWidth],
  );

  const updateMergeAnimation = useCallback(
    (now: number) => {
      if (!mergeAnimation) {
        return;
      }

      const animationDuration = mergeAnimation.value === 1 ? UNIT_MERGE_ANIMATION_MS : MERGE_ANIMATION_MS;
      const progress = clamp((now - mergeAnimation.startedAt) / animationDuration, 0, 1);
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
      if (mergingEntities.length === 0) {
        setMergeAnimation(undefined);
        lastMergeAtRef.current = now;
        return;
      }

      removeBodies(engine, mergingEntities);
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
      removeBodies(engine, annihilatingEntities);
      entitiesRef.current = entitiesRef.current.filter((entity) => !annihilatingIds.has(entity.id));
      setAnnihilationAnimation(undefined);
      setMessage('');
    },
    [annihilationAnimation],
  );

  const updateDivisionSplitAnimation = useCallback(
    (now: number) => {
      if (!divisionSplitAnimation) {
        return;
      }

      const progress = clamp((now - divisionSplitAnimation.startedAt) / DIVISION_SPLIT_ANIMATION_MS, 0, 1);
      if (progress >= 1) {
        setDivisionSplitAnimation(undefined);
        return;
      }

      setDivisionSplitAnimation((current) => (current ? { ...current, progress } : undefined));
    },
    [divisionSplitAnimation],
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
      const snapshots = toSnapshots(entitiesRef.current);
      const cluster = findMergeCluster(snapshots);
      if (!cluster) {
        mergeReadySinceRef.current = undefined;
        return;
      }

      const cooldown = cluster.value === 1 ? UNIT_MERGE_COOLDOWN_MS : MERGE_COOLDOWN_MS;
      if (now - lastMergeAtRef.current < cooldown) {
        return;
      }

      if (cluster.value === 1) {
        mergeReadySinceRef.current ??= now;
        if (now - mergeReadySinceRef.current < UNIT_MERGE_READY_DELAY_MS) {
          return;
        }
      } else {
        mergeReadySinceRef.current = undefined;
      }

      const latestCluster = findMergeCluster(toSnapshots(entitiesRef.current));
      if (!latestCluster) {
        mergeReadySinceRef.current = undefined;
        return;
      }

      const nextPlaceValue = getNextPlaceValue(latestCluster.value);
      const engine = engineRef.current;
      if (!engine || !nextPlaceValue) {
        return;
      }

      setMergeAnimation({
        id: `merge-${now}`,
        value: latestCluster.value,
        sign: latestCluster.sign,
        beadIds: latestCluster.beadIds,
        center: latestCluster.center,
        startedAt: now,
        nextValue: nextPlaceValue,
      });
      mergeReadySinceRef.current = undefined;
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
      updateDivisionSplitAnimation(now);
      updateMergeAnimation(now);
      Matter.Engine.update(engine, delta);
      keepBodiesInsideField(fieldWidth, fieldHeight, entitiesRef.current);
      if (isPriorityOperator(expressionTokensRef.current[expressionTokensRef.current.length - 1])) {
        wrapMultiplicandForMultiplication(expressionTokensRef.current);
      }
      if (!mergeAnimation && !annihilationAnimation) {
        const productCollision = findProductBubbleCollision(entitiesRef.current, now);
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
      setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [
    annihilationAnimation,
    fieldHeight,
    fieldWidth,
    mergeAnimation,
    settleMergeIfReady,
    splitHigherBead,
    unwrapProductGroup,
    updateAnnihilationAnimation,
    updateDivisionSplitAnimation,
    updateMergeAnimation,
    wrapMultiplicandForMultiplication,
  ]);

  const goNextStage = () => {
    setStageIndex((current) => Math.min(current + 1, STAGES.length - 1));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          {onBack ? (
            <Pressable accessibilityRole="button" onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressedButton]}>
              <Text style={styles.backButtonText}>‹</Text>
            </Pressable>
          ) : null}
          <View>
            <Text style={styles.stageLabel}>
              {stage.islandTitle} / {stage.setTitle} / ステージ {stageIndex + 1}
            </Text>
            <Text style={styles.title}>{stage.title}</Text>
          </View>
        </View>
        <View style={styles.totalBox} testID="current-total">
          <Text style={styles.totalLabel}>いま</Text>
          <Text style={styles.totalValue} testID="current-total-value">
            {total}
          </Text>
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
          {pendingBubbles.map((bubble) => {
            const bubbleSign: BeadSign = selectedOperator === '×' || selectedOperator === '÷' ? operatorSign : selectedOperator === '-' ? -1 : 1;
            return (
              <DraggableBubbleView
                key={bubble.id}
                bubble={bubble}
                sign={bubbleSign}
                isMultiplier={selectedOperator === '×'}
                isDivider={selectedOperator === '÷'}
                onBurst={burstBubble}
                onMove={moveBubble}
              />
            );
          })}
          {displayBeads.map((bead) => (
            divisionSplitAnimation?.resultBeadId === bead.id ? null :
            <DraggableBeadView
              key={bead.id}
              bead={bead}
              onMove={moveBead}
              onDragStart={startDragBead}
              onDragEnd={endDragBead}
              onTap={bead.id !== 'expression-wrap-preview' && canBurstBead(bead) ? () => unwrapBeadGroup(bead.id) : undefined}
            />
          ))}
          {mergeAnimation ? <MergePulse animation={mergeAnimation} /> : null}
          {divisionSplitAnimation ? <DivisionSplitOverlay animation={divisionSplitAnimation} /> : null}
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
          {isFailed ? (
            <View style={[styles.clearPanel, styles.failedPanel]}>
              <Text style={styles.clearTitle}>ざんねん</Text>
              <Text style={styles.clearText}>
                {total} になったよ。{stage.target} をつくろう
              </Text>
              <View style={styles.clearActions}>
                <GameButton label="もう一回" onPress={resetStage} variant="secondary" />
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
        role === 'division' && styles.divisionBubble,
        {
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor: isGroupBubble ? (sign < 0 ? 'rgba(80, 92, 112, 0.32)' : 'rgba(215, 246, 255, 0.36)') : palette.color,
          borderColor: isGroupBubble ? (sign < 0 ? '#5E6B87' : '#8ED8EF') : palette.rimColor,
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
          <BubbleNumberBadge count={count} sign={sign} />
        </>
      ) : (
        <>
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

function DivisionSplitOverlay({ animation }: { animation: DivisionSplitAnimation }) {
  const radius = getEntityRadius(1, animation.quotient);
  const spread = Math.min(86, Math.max(42, radius * 1.15));
  const fadeProgress = clamp((animation.progress - 0.18) / 0.72, 0, 1);
  const parts = Array.from({ length: animation.divisor }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(animation.divisor, 1);
    const startX = animation.center.x + Math.cos(angle) * spread;
    const startY = animation.center.y + Math.sin(angle) * spread * 0.58;
    const isSurvivor = index === 0;
    const settleProgress = isSurvivor ? clamp(animation.progress / 0.72, 0, 1) : 0;
    const evaporateY = isSurvivor ? 0 : fadeProgress * 42;
    return {
      id: `${animation.id}-${index}`,
      x: startX + (animation.center.x - startX) * settleProgress,
      y: startY + (animation.center.y - startY) * settleProgress - evaporateY,
      opacity: isSurvivor ? 0.92 - fadeProgress * 0.18 : 0.78 * (1 - fadeProgress),
      scale: isSurvivor ? 1 - fadeProgress * 0.04 : 1 + fadeProgress * 0.12,
      isSurvivor,
    };
  });

  return (
    <View pointerEvents="none" testID="division-split-overlay" style={StyleSheet.absoluteFill}>
      {parts.map((part) => (
        <View
          key={part.id}
          testID={part.isSurvivor ? 'division-split-survivor' : 'division-split-discard'}
          style={[
            styles.divisionSplitPart,
            {
              left: part.x - radius,
              top: part.y - radius,
              width: radius * 2,
              height: radius * 2,
              opacity: part.opacity,
              transform: [{ scale: part.scale }],
              zIndex: part.isSurvivor ? 12 : 11,
            },
          ]}
        >
          <BeadView value={1} count={animation.quotient} sign={animation.sign} role="division" x={radius} y={radius} isPreview />
        </View>
      ))}
    </View>
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
            testID={`operator-${operator}`}
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
    <View style={styles.expressionBox} testID="expression-display">
      <Text
        testID="expression-display-text"
        style={[styles.expressionText, tokens.length === 0 && styles.expressionPlaceholder]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {tokens.length > 0 ? tokens.join(' ') : 'しき'}
      </Text>
    </View>
  );
}

function DraggableBubbleView({
  bubble,
  sign,
  isMultiplier,
  isDivider,
  onBurst,
  onMove,
}: {
  bubble: PendingBubble;
  sign: BeadSign;
  isMultiplier: boolean;
  isDivider: boolean;
  onBurst: (bubble: PendingBubble) => void;
  onMove: (bubbleId: string, x: number, y: number) => void;
}) {
  const startPositionRef = useRef({ x: bubble.x, y: bubble.y });
  const hasDraggedRef = useRef(false);
  const isOperatorBubble = isMultiplier || isDivider;
  const radius = isOperatorBubble ? getMultiplierClusterRadius(bubble.count) : getEntityRadius(1, bubble.count);
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
      accessibilityLabel={`${isDivider ? 'divide' : isMultiplier ? 'multiply' : 'bubble'}-${bubble.count}`}
      testID={`pending-bubble-${bubble.count}-${bubble.id}`}
      style={[
        styles.pendingBubbleButton,
        isOperatorBubble && styles.multiplierBubbleButton,
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
      {isOperatorBubble ? (
        <OperatorBubbleCluster count={bubble.count} sign={sign} radius={radius} operator={isDivider ? '÷' : '×'} />
      ) : (
        <BeadView value={1} count={bubble.count} sign={sign} x={radius} y={radius} isPreview />
      )}
    </View>
  );
}

function OperatorBubbleCluster({ count, sign, radius, operator }: { count: number; sign: BeadSign; radius: number; operator: '×' | '÷' }) {
  const bubbles = getMultiplierBubbleParts(count);
  return (
    <View pointerEvents="none" style={styles.multiplierCluster}>
      {getSimpleBubbleStackPositions(bubbles, radius, operator).map(({ bubble, x, y, tilt }, index) => (
        <MiniWrappedBubble
          key={`multiplier-${index}`}
          sign={sign}
          left={x}
          top={y}
          radius={bubble.radius}
          tilt={tilt}
          state={operator === '÷' && index > 0 ? 'ghost' : operator === '÷' ? 'survivor' : 'solid'}
        />
      ))}
      <BubbleNumberBadge count={count} sign={sign} prefix={operator} />
    </View>
  );
}

function BubbleNumberBadge({ count, sign = 1, prefix = '' }: { count: number; sign?: BeadSign; prefix?: string }) {
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

function MiniWrappedBubble({
  sign,
  left,
  top,
  radius,
  tilt,
  state = 'solid',
}: {
  sign: BeadSign;
  left: number;
  top: number;
  radius: number;
  tilt: number;
  state?: 'solid' | 'survivor' | 'ghost';
}) {
  const isNegative = sign < 0;
  const isGhost = state === 'ghost';

  return (
    <View
      style={[
        styles.multiplierMiniBubble,
        state === 'survivor' && styles.divisionSurvivorMiniBubble,
        isGhost && styles.divisionGhostMiniBubble,
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
      <View style={[styles.miniBubbleInnerGlow, isGhost && styles.divisionGhostInnerGlow]} />
      {!isGhost ? <View style={styles.miniBubbleShine} /> : null}
      {!isGhost ? <View style={styles.miniBubbleLowerShine} /> : null}
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
      accessibilityLabel={`bead-${bead.role}-${bead.count}`}
      testID={`bead-${bead.role}-${bead.count}-${bead.id}`}
      style={[
        styles.draggableBeadHitArea,
        {
          left: bead.x - radius - 8,
          top: bead.y - radius - 8,
          width: radius * 2 + 16,
          height: radius * 2 + 16,
          borderRadius: radius + 8,
          zIndex: getBeadLayerZIndex(bead.value),
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

function toSnapshots(entities: BeadEntity[], bounds?: { width: number; height: number }): BeadSnapshot[] {
  return entities.map((entity) => ({
    id: entity.id,
    value: entity.value,
    count: entity.count,
    sign: entity.sign,
    role: entity.role,
    x: bounds ? clampEntityX(entity, bounds.width) : entity.body.position.x,
    y: bounds ? clampEntityY(entity, bounds.height) : entity.body.position.y,
  }));
}

function canBurstBead(bead: BeadSnapshot) {
  return isBurstableWrappedGroup(bead);
}

function isBurstableWrappedGroup(bead: Pick<BeadSnapshot, 'value' | 'count' | 'role'>) {
  return bead.value === 1 && bead.count > 1 && (bead.role === 'normal' || bead.role === 'product' || bead.role === 'division');
}

function isWrappableEntity(entity: Pick<BeadEntity, 'role'>) {
  return entity.role === 'normal' || entity.role === 'product' || entity.role === 'division' || entity.role === 'multiplicand';
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

function removeBodies(engine: Matter.Engine, entities: Pick<BeadEntity, 'body'>[]) {
  for (const entity of entities) {
    Matter.Composite.remove(engine.world, entity.body);
  }
}

function getMultiplicationSource(entities: BeadEntity[], sign: BeadSign = 1): OperationSource {
  const candidates = entities.filter((entity) => isWrappableEntity(entity) && entity.sign === sign);
  return {
    entities: candidates,
    count: candidates.reduce((sum, entity) => sum + getEntityUnitCount(entity), 0),
    sign,
  };
}

function getOperationSource(entities: BeadEntity[], expressionTokens: string[]): OperationSource {
  const expressionValue = getPendingOperationExpressionValue(expressionTokens);
  const targetSign: BeadSign = expressionValue !== undefined && expressionValue < 0 ? -1 : 1;
  const matchingEntities = entities.filter((entity) => isWrappableEntity(entity) && entity.sign === targetSign);
  const matchingTotal = matchingEntities.reduce((sum, entity) => sum + getEntityUnitCount(entity), 0);
  if (expressionValue !== undefined && Math.abs(expressionValue) > 0 && matchingEntities.length > 0) {
    return {
      entities: matchingEntities,
      count: Math.abs(expressionValue),
      sign: targetSign,
    };
  }

  if (matchingEntities.length > 0) {
    return {
      entities: matchingEntities,
      count: matchingTotal,
      sign: targetSign,
    };
  }

  return getMultiplicationSource(entities, targetSign);
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

function findProductBubbleCollision(entities: BeadEntity[], now: number) {
  const productGroups = entities.filter(
    (entity) => isBurstableWrappedGroup(entity) && (entity.role !== 'product' || now - entity.createdAt >= PRODUCT_BUBBLE_BURST_DELAY_MS),
  );

  for (const productGroup of productGroups) {
    for (const collider of entities) {
      if (collider.id === productGroup.id) {
        continue;
      }

      const distance = getPointDistance(productGroup.body.position, collider.body.position);
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

function keepBodiesInsideField(fieldWidth: number, fieldHeight: number, entities: BeadEntity[]) {
  for (const entity of entities) {
    const currentX = entity.body.position.x;
    const currentY = entity.body.position.y;
    const nextX = clampEntityX(entity, fieldWidth);
    const nextY = clampEntityY(entity, fieldHeight);
    if (nextX !== currentX || nextY !== currentY) {
      const pullX = (nextX - currentX) * 0.34;
      const pullY = (nextY - currentY) * 0.34;
      Matter.Body.setPosition(entity.body, { x: nextX, y: nextY });
      Matter.Body.setVelocity(entity.body, {
        x: nextX === currentX ? entity.body.velocity.x : pullX,
        y: nextY === currentY ? entity.body.velocity.y : pullY,
      });
    }
  }
}

function clampEntityX(entity: Pick<BeadEntity, 'value' | 'count' | 'body'>, fieldWidth: number) {
  const radius = getEntityRadius(entity.value, entity.count);
  return clamp(entity.body.position.x, radius + FIELD_ENTITY_INSET, fieldWidth - radius - FIELD_ENTITY_INSET);
}

function clampEntityY(entity: Pick<BeadEntity, 'value' | 'count' | 'body'>, fieldHeight: number) {
  const radius = getEntityRadius(entity.value, entity.count);
  return clamp(entity.body.position.y, radius + FIELD_ENTITY_INSET, fieldHeight - radius - FIELD_ENTITY_INSET);
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

function isStageReadyForResult(pendingBubbles: PendingBubble[]) {
  return pendingBubbles.length === 0;
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

function getPlaceValueBeads(totalCount: number) {
  const beads: PlaceValue[] = [];
  const placeValues: PlaceValue[] = [100000, 10000, 1000, 100, 10, 1];
  let remaining = totalCount;

  for (const value of placeValues) {
    const copies = Math.floor(remaining / value);
    remaining %= value;
    for (let index = 0; index < copies; index += 1) {
      beads.push(value);
    }
  }

  return beads;
}

function getBeadCollisionFilter(value: PlaceValue) {
  const category = COLLISION_CATEGORY_BY_VALUE[value];
  return {
    category,
    mask: COLLISION_CATEGORY_WORLD | category,
  };
}

function getWorldCollisionFilter() {
  return {
    category: COLLISION_CATEGORY_WORLD,
    mask:
      COLLISION_CATEGORY_WORLD |
      COLLISION_CATEGORY_BY_VALUE[1] |
      COLLISION_CATEGORY_BY_VALUE[10] |
      COLLISION_CATEGORY_BY_VALUE[100] |
      COLLISION_CATEGORY_BY_VALUE[1000] |
      COLLISION_CATEGORY_BY_VALUE[10000] |
      COLLISION_CATEGORY_BY_VALUE[100000],
  };
}

function getBeadLayerZIndex(value: PlaceValue) {
  if (value === 1) {
    return 6;
  }
  if (value === 10) {
    return 5;
  }
  if (value === 100) {
    return 4;
  }
  if (value === 1000) {
    return 3;
  }
  if (value === 10000) {
    return 2;
  }
  return 1;
}

function getBeadLayerOpacity(value: PlaceValue) {
  if (value === 1) {
    return 1;
  }
  if (value === 10) {
    return 0.82;
  }
  if (value === 100) {
    return 0.68;
  }
  if (value === 1000) {
    return 0.58;
  }
  if (value === 10000) {
    return 0.52;
  }
  return 0.46;
}

function getMultiplierClusterRadius(count: number) {
  const bubbles = getMultiplierBubbleParts(count);
  const rows = getMultiplierBubbleRows(bubbles);
  const widestRow = rows.reduce((max, row) => Math.max(max, getOverlappedRowWidth(row)), 0);
  const tallestBubble = bubbles.reduce((max, bubble) => Math.max(max, bubble.radius * 2), 0);
  const contentHeight = rows.length === 1 ? tallestBubble : tallestBubble * (1 + MULTIPLIER_BUBBLE_Y_STEP);
  return Math.max(34, Math.min(86, Math.max(widestRow / 2 + 8, contentHeight / 2 + 8)));
}

function createPendingBubbles(fieldWidth: number, counts: number[]): PendingBubble[] {
  const gap = fieldWidth / (counts.length + 1);

  return counts.map((count, index) => ({
    id: `bubble-${index}-${count}`,
    count,
    x: gap * (index + 1),
    y: BUBBLE_ROW_Y,
  }));
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
  const placeValues: PlaceValue[] = [100000, 10000, 1000, 100, 10, 1];
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
  const placeValues: PlaceValue[] = [100000, 10000, 1000, 100, 10, 1];
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

function getSimpleBubbleStackPositions(bubbles: MultiplierBubblePart[], radius: number, operator: '×' | '÷' = '×') {
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
      collisionFilter: getWorldCollisionFilter(),
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
    return [formatSignedInitialValue(value, selectedOperator), selectedOperator];
  } else if (isOperatorToken(nextTokens[nextTokens.length - 1])) {
    nextTokens.push(String(value));
  } else {
    nextTokens.push(selectedOperator, String(value));
  }

  return completeExpression(nextTokens, totalValue);
}

function formatSignedInitialValue(value: number, selectedOperator: OperatorSymbol) {
  return selectedOperator === '-' ? `-${value}` : String(value);
}

function formatSignedCount(value: number) {
  return value < 0 ? `-${Math.abs(value)}` : String(value);
}

function multiplySigns(left: BeadSign, right: BeadSign): BeadSign {
  return left === right ? 1 : -1;
}

function getMultiplicationExpressionTokens(
  previousTokens: string[],
  remainingTotal: number,
  multiplicand: number,
  multiplier: number,
  result: number,
) {
  const previousExpression = getPreviousExpressionForValue(previousTokens, multiplicand);
  const leftTokens = previousExpression ?? [String(multiplicand)];
  const multiplicationTokens = [...leftTokens, '×', String(multiplier)];
  if (remainingTotal === 0) {
    return [...multiplicationTokens, '=', String(result)];
  }

  const connector = remainingTotal > 0 ? '+' : '-';
  return [String(Math.abs(remainingTotal)), connector, ...multiplicationTokens, '=', String(result)];
}

function getDivisionExpressionTokens(
  previousTokens: string[],
  remainingTotal: number,
  dividend: number,
  divisor: number,
  result: number,
) {
  const previousExpression = getPreviousExpressionForValue(previousTokens, dividend);
  const leftTokens = previousExpression ?? [String(dividend)];
  const divisionTokens = [...leftTokens, '÷', String(divisor)];
  if (remainingTotal === 0) {
    return [...divisionTokens, '=', String(result)];
  }

  const connector = remainingTotal > 0 ? '+' : '-';
  return [String(Math.abs(remainingTotal)), connector, ...divisionTokens, '=', String(result)];
}

function getPreviousExpressionForValue(tokens: string[], value: number) {
  const strippedTokens = stripExpressionResult(tokens);
  const expressionTokens = isOperatorToken(strippedTokens[strippedTokens.length - 1]) ? strippedTokens.slice(0, -1) : strippedTokens;
  if (expressionTokens.length === 0) {
    return undefined;
  }

  const evaluatedValue = evaluateExpressionTokens(expressionTokens);
  if (evaluatedValue === undefined || Math.abs(evaluatedValue - value) > 0.00001) {
    return undefined;
  }

  if (expressionTokens.some((token) => token === '+' || token === '-')) {
    return [`(${expressionTokens.join(' ')})`];
  }

  return expressionTokens;
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
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#B8AD9C',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#25342C',
    fontSize: 32,
    fontWeight: '900',
    lineHeight: 34,
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
  divisionSurvivorMiniBubble: {
    borderColor: '#53BFD9',
    borderWidth: 3,
    backgroundColor: 'rgba(219, 248, 255, 0.5)',
    shadowOpacity: 0.3,
  },
  divisionGhostMiniBubble: {
    borderStyle: 'dashed',
    borderWidth: 3,
    borderColor: 'rgba(98, 185, 217, 0.58)',
    backgroundColor: 'rgba(219, 248, 255, 0.12)',
    shadowOpacity: 0.04,
    opacity: 0.62,
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
  divisionGhostInnerGlow: {
    borderColor: 'rgba(255, 255, 255, 0.32)',
    backgroundColor: 'transparent',
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
  divisionSplitPart: {
    position: 'absolute',
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
  divisionBubble: {
    borderColor: '#8A6FAD',
    shadowColor: '#8A6FAD',
    shadowOpacity: 0.24,
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
  bubbleNumberBadge: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    minWidth: 30,
    height: 26,
    paddingHorizontal: 7,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: '#8A7E6D',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3D3327',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleNumberBadgeText: {
    color: '#25342C',
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
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
  failedPanel: {
    borderColor: '#9B6B5C',
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
