import * as Matter from 'matter-js';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { SFX } from '@/audio/sfx';
import { useOneShotAudio } from '@/audio/use-one-shot-audio';
import { BrandLogo } from '@/components/BrandLogo';
import { NavImageIcon } from '@/components/NavImageIcon';
import { OperatorImageIcon } from '@/components/OperatorImageIcon';
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
import { getStage } from '@/game/stages';
import { BeadRole, BeadSign, BeadSnapshot, MergeCluster, OperatorUsageLimit, OperatorUsageLimits, PlaceValue } from '@/game/types';
import type { Stage } from '@/game/types';
import type { DentakuOperator } from '@/game/dentaku';

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

type DentakuPractice = {
  questionKey: string;
  operands: number[];
  operators: DentakuOperator[];
  answer: number;
  prompt: string;
  stageLabel: string;
  questionNumber?: number;
  questionTotal?: number;
  autoAdvance: boolean;
  longFormMode?: boolean;
  onNextQuestion: () => void;
};

type DentakuAutomationPractice = Pick<DentakuPractice, 'operands' | 'operators'>;

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

type DivisionFailedAnimation = {
  id: string;
  center: {
    x: number;
    y: number;
  };
  divisor: number;
  quotient: number;
  remainder: number;
  sign: BeadSign;
  startedAt: number;
};

type BubbleBurstAnimation = {
  id: string;
  x: number;
  y: number;
  radius: number;
  count: number;
  sign: BeadSign;
  startedAt: number;
};

type MultiplicationExpansionAnimation = {
  id: string;
  groups: Array<{
    x: number;
    y: number;
    count: number;
    sign: BeadSign;
  }>;
  startedAt: number;
};

type OperationSource = {
  entities: BeadEntity[];
  count: number;
  sign: BeadSign;
};

type OperatorButtonSymbol = OperatorSymbol;
type MultiplierBubblePart = {
  value: PlaceValue;
  radius: number;
};
type ContainedBeadPart = {
  value: PlaceValue;
  radius: number;
};
type BackgroundBubbleSpec = {
  id: string;
  xRatio: number;
  size: number;
  speed: number;
  delay: number;
  drift: number;
};
type GoalPart = {
  value: PlaceValue;
  count: number;
  sign: BeadSign;
};

const FIELD_MARGIN = 0;
const OPERATOR_TABS_HEIGHT = 64;
const HEADER_HEIGHT = 112;
const FOOTER_HEIGHT = 96;
const PREVIEW_Y = 38;
const ATTRACTION_RADIUS = 220;
const ATTRACTION_FORCE = 0.000095;
const ANNIHILATION_ATTRACTION_RADIUS = 360;
const ANNIHILATION_ATTRACTION_FORCE = 0.00032;
const SEPARATION_RADIUS = 92;
const SEPARATION_FORCE = 0.000075;
const BASIN_BODY_THICKNESS = 18;
const BASIN_FRAME_THICKNESS = 5;
const FIELD_ENTITY_INSET = 10;
const BASIN_ENTITY_GUARD_MARGIN = 3;
const BUBBLE_ROW_Y = 56;
const MERGE_ANIMATION_MS = 520;
const UNIT_MERGE_ANIMATION_MS = 560;
const MERGE_COOLDOWN_MS = 420;
const UNIT_MERGE_COOLDOWN_MS = 540;
const UNIT_MERGE_READY_DELAY_MS = 360;
const UNIT_MERGE_MIN_SETTLED_Y_RATIO = 0.34;
const UNIT_MERGE_MAX_CLUSTER_SPEED = 5.2;
const LAUNCH_INITIAL_TOTAL = 8;
const LAUNCH_BUBBLE_COUNT = 5;
const LAUNCH_TARGET = 13;
const BUBBLE_BURST_ANIMATION_MS = 120;
const ANNIHILATION_ANIMATION_MS = 420;
const DIVISION_SPLIT_ANIMATION_MS = 760;
const DIVISION_FAILED_ANIMATION_MS = 980;
const MULTIPLICATION_EXPANSION_HOLD_MS = 1100;
const PRODUCT_BUBBLE_BURST_DELAY_MS = 1250;
const BACKGROUND_BUBBLE_TICK_MS = 90;
const FAILED_VEIL_FADE_IN_MS = 3200;
const FIELD_BUBBLE_AUTO_BURST_IDLE_MS = 650;
const FIELD_BUBBLE_AUTO_BURST_STEP_MS = 360;
const BASIN_POINT_COUNT = 45;
const BUBBLE_BURST_DROP_COUNT = 6;
const BUBBLE_BURST_SHARD_COUNT = 3;
const MERGE_POP_PARTICLE_COUNT = 4;
const OPERATORS: OperatorButtonSymbol[] = ['+', '-', '×', '÷'];
const PLAYFUL_FONT_FAMILY = 'Noto Sans Japanese';
const LATIN_FONT_FAMILY = 'Helvetica';
const TEXT_BASE_COLOR = '#12334A';
const TEXT_ACCENT_COLOR = '#0284C7';
const GRID = 8;
const RADIUS_SM = 8;
const RADIUS_MD = 12;
const RADIUS_LG = 16;
const RADIUS_XL = 24;
const RADIUS_PILL = 999;
const HEADER_ACTION_BUTTON_SIZE = 48;
const MIN_TOUCH_TARGET_SIZE = 88;
const KUKU_QUESTION_BASE_FONT_SIZE = 38;
const KUKU_QUESTION_MIN_FONT_SIZE = 14;
const TAP_DRIFT_TO_BURST_THRESHOLD = 24;
const DETAILED_RELEASE_BEAD_LIMIT = 10;
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
export function MarumaruGame({
  initialStageIndex = 0,
  onBack,
  onStageClear,
  mode = 'stage',
  onComplete,
  onLogoPress,
  dentakuPractice,
}: {
  initialStageIndex?: number;
  onBack?: () => void;
  onStageClear?: (stageId: string) => void;
  mode?: 'stage' | 'launch';
  onComplete?: () => void;
  onLogoPress?: () => void;
  dentakuPractice?: DentakuPractice;
}) {
  const { width, height } = useWindowDimensions();
  const fieldWidth = Math.max(240, width - FIELD_MARGIN * 2);
  const fieldHeight = Math.max(360, height - HEADER_HEIGHT - FOOTER_HEIGHT - OPERATOR_TABS_HEIGHT - 20);
  const [stageIndex, setStageIndex] = useState(initialStageIndex);
  const stage = useMemo(() => (dentakuPractice ? createDentakuPracticeStage(dentakuPractice) : getStage(stageIndex)), [dentakuPractice, stageIndex]);
  const target = mode === 'launch' ? LAUNCH_TARGET : stage.target;
  const stageNumberInIsland = useMemo(() => getStageNumberInIsland(stageIndex), [stageIndex]);
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
  const [divisionFailedAnimation, setDivisionFailedAnimation] = useState<DivisionFailedAnimation | undefined>(undefined);
  const [multiplicationExpansionAnimation, setMultiplicationExpansionAnimation] = useState<MultiplicationExpansionAnimation | undefined>(undefined);
  const [bubbleBurstAnimations, setBubbleBurstAnimations] = useState<BubbleBurstAnimation[]>([]);
  const [message, setMessage] = useState('あわをさわると まるがでるよ');
  const [operatorUsage, setOperatorUsage] = useState<OperatorUsageLimits>(() => getInitialOperatorUsage(getStage(initialStageIndex), mode));
  const [kukuInput, setKukuInput] = useState('');
  const [kukuInputState, setKukuInputState] = useState<'input' | 'wrong' | 'running'>('input');
  const [longFormStepIndex, setLongFormStepIndex] = useState(0);
  const [longFormQuestionChangedAt, setLongFormQuestionChangedAt] = useState(() => Date.now());
  const [hasReleasedBubble, setHasReleasedBubble] = useState(false);
  const [isClear, setIsClear] = useState(false);
  const [clearedStageId, setClearedStageId] = useState<string | undefined>(undefined);
  const [isFailed, setIsFailed] = useState(false);
  const [failedAt, setFailedAt] = useState<number | undefined>(undefined);
  const [idleHintTick, setIdleHintTick] = useState(() => Date.now());
  const [backgroundBubbleTick, setBackgroundBubbleTick] = useState(() => Date.now());
  const [backgroundBubbleStarts, setBackgroundBubbleStarts] = useState<Record<string, number>>({});
  const engineRef = useRef<Matter.Engine | null>(null);
  const entitiesRef = useRef<BeadEntity[]>([]);
  const consumedPendingBubbleIdsRef = useRef<Set<string>>(new Set());
  const pendingBubblesRef = useRef<PendingBubble[]>([]);
  const mergeAnimationRef = useRef<MergeAnimation | undefined>(undefined);
  const annihilationAnimationRef = useRef<AnnihilationAnimation | undefined>(undefined);
  const divisionSplitAnimationRef = useRef<DivisionSplitAnimation | undefined>(undefined);
  const divisionFailedAnimationRef = useRef<DivisionFailedAnimation | undefined>(undefined);
  const multiplicationExpansionAnimationRef = useRef<MultiplicationExpansionAnimation | undefined>(undefined);
  const dentakuAutomationRunRef = useRef(0);
  const draggingBeadIdRef = useRef<string | undefined>(undefined);
  const [draggingBeadId, setDraggingBeadId] = useState<string | undefined>(undefined);
  const idRef = useRef(0);
  const lastMergeAtRef = useRef(0);
  const mergeReadySinceRef = useRef<number | undefined>(undefined);
  const resultReadySinceRef = useRef<number | undefined>(undefined);
  const reportedClearStageIdRef = useRef<string | undefined>(undefined);
  const reportedCompleteRef = useRef(false);
  const lastBubbleInteractionAtRef = useRef(Date.now());
  const lastFieldBubbleAutoBurstAtRef = useRef(0);
  const didPlayClearSfxRef = useRef(false);
  const didPlayFailSfxRef = useRef(false);

  const total = useMemo(() => getTotalValue(beads), [beads]);
  const displayBeads = useMemo(
    () => getDisplayBeadsForPendingPriorityExpression(beads, expressionTokens),
    [beads, expressionTokens],
  );
  const almostMergeBeadIds = useMemo(() => findAlmostMergeBeadIds(displayBeads), [displayBeads]);
  const basinFrameSegments = useMemo(() => getBasinFrameSegments(fieldWidth, fieldHeight), [fieldHeight, fieldWidth]);
  const backgroundBubbles = useMemo(() => getBackgroundBubbleSpecs(width), [width]);
  const markBubbleInteraction = useCallback(() => {
    const now = Date.now();
    lastBubbleInteractionAtRef.current = now;
    setIdleHintTick(now);
  }, []);
  const shouldHintPendingBubbles =
    mode === 'launch' &&
    pendingBubbles.length > 0 &&
    !isClear &&
    !isFailed &&
    draggingBeadId === undefined &&
    idleHintTick - lastBubbleInteractionAtRef.current >= 2200;
  const shouldPulsePendingBubbles =
    shouldHintPendingBubbles && Math.floor((idleHintTick - lastBubbleInteractionAtRef.current - 2200) / 720) % 2 === 0;
  const footerExpressionTokens = getFooterExpressionTokens({
    dentakuPractice,
    expressionTokens,
    isClear,
    mode,
    pendingBubbles,
  });

  const { fadeOut: fadeOutClearSfx, play: playClearSfx } = useOneShotAudio(SFX.clear.source, SFX.clear.volume);
  const { fadeOut: fadeOutFailSfx, play: playFailSfx } = useOneShotAudio(SFX.fail.source, SFX.fail.volume);
  const { play: playBeadTouchSfx } = useOneShotAudio(SFX.beadTouch.source, SFX.beadTouch.volume);
  const { play: playBubblePopSfx } = useOneShotAudio(SFX.bubblePop.source, SFX.bubblePop.volume);
  const { play: playBackgroundBubbleSfx } = useOneShotAudio(SFX.backgroundBubble.source, SFX.backgroundBubble.volume);
  const { play: playUiActionSfx } = useOneShotAudio(SFX.uiAction.source, SFX.uiAction.volume);
  const { play: playMergeSfx } = useOneShotAudio(SFX.merge.source, SFX.merge.volume);
  const { play: playAnnihilationSfx } = useOneShotAudio(SFX.annihilation.source, SFX.annihilation.volume);
  const fadeOutResultSfx = useCallback(() => {
    fadeOutClearSfx();
    fadeOutFailSfx();
  }, [fadeOutClearSfx, fadeOutFailSfx]);
  const completeCurrentStage = useCallback(() => {
    setClearedStageId(stage.id);
    setIsClear(true);
    setIsFailed(false);
    setFailedAt(undefined);
    setMessage('できた!');
  }, [stage.id]);

  useEffect(() => {
    if (!isClear) {
      didPlayClearSfxRef.current = false;
      return;
    }

    if (didPlayClearSfxRef.current) {
      return;
    }

    didPlayClearSfxRef.current = true;
    playClearSfx();
  }, [isClear, playClearSfx]);

  useEffect(() => {
    if (!isFailed) {
      didPlayFailSfxRef.current = false;
      return;
    }

    if (didPlayFailSfxRef.current) {
      return;
    }

    didPlayFailSfxRef.current = true;
    playFailSfx();
  }, [isFailed, playFailSfx]);

  const resetStage = useCallback(() => {
    fadeOutResultSfx();
    markBubbleInteraction();
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
    const initialEntities = mode === 'launch' ? createLaunchBeads(engine, fieldWidth, fieldHeight) : [];
    entitiesRef.current = initialEntities;
    setBeads(toSnapshots(initialEntities, { width: fieldWidth, height: fieldHeight }));
    setPendingBubbles(createPendingBubbles(fieldWidth, mode === 'launch' ? [LAUNCH_BUBBLE_COUNT] : stage.bubbleCounts));
    const initialExpression = mode === 'launch' ? [String(LAUNCH_INITIAL_TOTAL), '+'] : [];
    expressionTokensRef.current = initialExpression;
    setExpressionTokens(initialExpression);
    expressionHistoryRef.current = [];
    consumedPendingBubbleIdsRef.current = new Set();
    expressionTotalRef.current = mode === 'launch' ? LAUNCH_INITIAL_TOTAL : 0;
    const nextOperatorUsage = getInitialOperatorUsage(stage, mode);
    const nextSelectedOperator = getInitialSelectedOperator(nextOperatorUsage);
    setOperatorUsage(nextOperatorUsage);
    selectedOperatorRef.current = nextSelectedOperator;
    operatorSignRef.current = 1;
    setSelectedOperator(nextSelectedOperator);
    setOperatorSign(1);
    setHasReleasedBubble(false);
    setMergeAnimation(undefined);
    setAnnihilationAnimation(undefined);
    setDivisionSplitAnimation(undefined);
    setDivisionFailedAnimation(undefined);
    setMultiplicationExpansionAnimation(undefined);
    setBubbleBurstAnimations([]);
    setMessage('');
    setIsClear(false);
    setClearedStageId(undefined);
    setIsFailed(false);
    setFailedAt(undefined);
    lastFieldBubbleAutoBurstAtRef.current = 0;
    mergeReadySinceRef.current = undefined;
    resultReadySinceRef.current = undefined;
  }, [fadeOutResultSfx, fieldHeight, fieldWidth, markBubbleInteraction, mode, stage.bubbleCounts]);

  useEffect(() => {
    resetStage();
  }, [resetStage]);

  useEffect(() => {
    const interval = setInterval(() => setBackgroundBubbleTick(Date.now()), BACKGROUND_BUBBLE_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pendingBubbles.length === 0 || isClear || isFailed) {
      return undefined;
    }

    const interval = setInterval(() => setIdleHintTick(Date.now()), 260);
    return () => clearInterval(interval);
  }, [isClear, isFailed, pendingBubbles.length]);

  useEffect(() => {
    expressionTokensRef.current = expressionTokens;
  }, [expressionTokens]);

  useEffect(() => {
    pendingBubblesRef.current = pendingBubbles;
  }, [pendingBubbles]);

  useEffect(() => {
    mergeAnimationRef.current = mergeAnimation;
  }, [mergeAnimation]);

  useEffect(() => {
    annihilationAnimationRef.current = annihilationAnimation;
  }, [annihilationAnimation]);

  useEffect(() => {
    divisionSplitAnimationRef.current = divisionSplitAnimation;
  }, [divisionSplitAnimation]);

  useEffect(() => {
    divisionFailedAnimationRef.current = divisionFailedAnimation;
  }, [divisionFailedAnimation]);

  useEffect(() => {
    multiplicationExpansionAnimationRef.current = multiplicationExpansionAnimation;
  }, [multiplicationExpansionAnimation]);

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
    reportedClearStageIdRef.current = undefined;
    reportedCompleteRef.current = false;
  }, [stage.id]);

  useEffect(() => {
    if (!dentakuPractice) {
      return;
    }

    dentakuAutomationRunRef.current += 1;
    setKukuInput('');
    setKukuInputState('input');
    setLongFormStepIndex(0);
    setLongFormQuestionChangedAt(Date.now());
  }, [dentakuPractice]);

  useEffect(() => {
    if (!isClear || clearedStageId === undefined || reportedClearStageIdRef.current === clearedStageId) {
      return;
    }

    reportedClearStageIdRef.current = clearedStageId;
    onStageClear?.(clearedStageId);
  }, [clearedStageId, isClear, onStageClear]);

  useEffect(() => {
    if (!isClear || mode !== 'launch' || reportedCompleteRef.current) {
      return;
    }

    reportedCompleteRef.current = true;
  }, [isClear, mode, onComplete]);

  useEffect(() => {
    if (!dentakuPractice || !dentakuPractice.autoAdvance || !isClear) {
      return undefined;
    }

    const timeout = setTimeout(() => {
      fadeOutResultSfx();
      markBubbleInteraction();
      dentakuPractice.onNextQuestion();
    }, 1350);

    return () => clearTimeout(timeout);
  }, [fadeOutResultSfx, isClear, dentakuPractice, markBubbleInteraction]);

  useEffect(() => {
    if (isClear || !isStageReadyForResult(pendingBubbles) || mergeAnimation || annihilationAnimation || divisionSplitAnimation || divisionFailedAnimation || multiplicationExpansionAnimation) {
      resultReadySinceRef.current = undefined;
      return;
    }

    const now = Date.now();
    resultReadySinceRef.current ??= now;
    if (now - resultReadySinceRef.current < 1400) {
      return;
    }

    if (hasPendingSamePlaceCancellation(beads)) {
      resultReadySinceRef.current = now;
      return;
    }

    const currentTotal = getTotalValue(beads);
    if (currentTotal === target) {
      completeCurrentStage();
      return;
    }

    if (dentakuPractice && kukuInputState === 'running') {
      return;
    }

    if (!isFailed && !hasMergeableCount(beads) && !mergeAnimation) {
      setIsFailed(true);
      setFailedAt(Date.now());
      setMessage('もういっかい やってみよう');
    }

    return undefined;
  }, [annihilationAnimation, beads, completeCurrentStage, dentakuPractice, divisionFailedAnimation, divisionSplitAnimation, isClear, isFailed, kukuInputState, mergeAnimation, multiplicationExpansionAnimation, pendingBubbles, target]);

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
      if (totalCount < DETAILED_RELEASE_BEAD_LIMIT) {
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

  const triggerBubbleBurst = useCallback((bubble: PendingBubble, isOperatorBubble: boolean, sign: BeadSign) => {
    if (!isOperatorBubble && bubble.count <= 1) {
      return;
    }

    const radius = isOperatorBubble ? getMultiplierClusterRadius(bubble.count) : getEntityRadius(1, bubble.count);
    const startedAt = Date.now();
    setBubbleBurstAnimations((current) => [
      ...current.slice(-5),
      {
        id: `bubble-burst-${bubble.id}-${startedAt}`,
        x: bubble.x,
        y: bubble.y,
        radius,
        count: bubble.count,
        sign,
        startedAt,
      },
    ]);
  }, []);

  const multiplyWrappedGroup = useCallback(
    (bubble: PendingBubble) => {
      const engine = engineRef.current;
      const previousTokens = stripExpressionResult(expressionTokensRef.current);
      const source = getOperationSource(entitiesRef.current, previousTokens);
      if (!engine || source.entities.length === 0 || source.count <= 0) {
        return false;
      }

      const multiplierSign = operatorSignRef.current;
      triggerBubbleBurst(bubble, true, multiplierSign);
      setPendingBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
      removeBodies(engine, source.entities);
      const sourceIds = new Set(source.entities.map((entity) => entity.id));
      const remainingEntities = entitiesRef.current.filter((entity) => !sourceIds.has(entity.id));
      const remainingTotal = getTotalValue(toSnapshots(remainingEntities));
      entitiesRef.current = remainingEntities;
      const sourceCenter = getEntityCenter(source.entities);
      const resultSign = multiplySigns(source.sign, multiplierSign);
      const signedSourceCount = source.count * source.sign;
      const signedMultiplier = bubble.count * multiplierSign;
      const expansionGroups = Array.from({ length: bubble.count }, (_, index) => {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / bubble.count;
        const spread = Math.max(46, getEntityRadius(1, source.count) * 0.78);
        return {
          angle,
          x: sourceCenter.x + Math.cos(angle) * spread,
          y: sourceCenter.y + Math.sin(angle) * spread * 0.72,
        };
      });
      const expansionId = `multiplication-expansion-${bubble.id}-${Date.now()}`;
      setMultiplicationExpansionAnimation({
        id: expansionId,
        groups: expansionGroups.map((group) => ({
          x: group.x,
          y: group.y,
          count: source.count,
          sign: resultSign,
        })),
        startedAt: Date.now(),
      });

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
      setTimeout(() => {
        if (engineRef.current !== engine) {
          return;
        }

        expansionGroups.forEach((group) => {
          addBead(1, source.count, resultSign, group.x, group.y, false, { x: Math.cos(group.angle) * 1.8, y: 2 + Math.sin(group.angle) }, 'product');
        });
        setMultiplicationExpansionAnimation((current) => (current?.id === expansionId ? undefined : current));
        setBeads(toSnapshots(entitiesRef.current, { width: fieldWidth, height: fieldHeight }));
      }, MULTIPLICATION_EXPANSION_HOLD_MS);
      return true;
    },
    [addBead, fieldHeight, fieldWidth, triggerBubbleBurst],
  );

  const divideWrappedGroup = useCallback(
    (bubble: PendingBubble) => {
      const engine = engineRef.current;
      const previousTokens = stripExpressionResult(expressionTokensRef.current);
      const source = getOperationSource(entitiesRef.current, previousTokens);
      if (!engine || source.entities.length === 0 || source.count <= 0) {
        return false;
      }

      const sourceCenter = getEntityCenter(source.entities);
      if (source.count % bubble.count !== 0) {
        setDivisionFailedAnimation({
          id: `division-failed-${Date.now()}`,
          center: sourceCenter,
          divisor: bubble.count,
          quotient: Math.floor(source.count / bubble.count),
          remainder: source.count % bubble.count,
          sign: multiplySigns(source.sign, operatorSignRef.current),
          startedAt: Date.now(),
        });
        setMessage(`${source.count}は ${bubble.count}つに ぴったりわけられないよ`);
        return false;
      }

      const divisorSign = operatorSignRef.current;
      setDivisionFailedAnimation(undefined);
      triggerBubbleBurst(bubble, true, divisorSign);
      setPendingBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
      removeBodies(engine, source.entities);
      const sourceIds = new Set(source.entities.map((entity) => entity.id));
      const remainingEntities = entitiesRef.current.filter((entity) => !sourceIds.has(entity.id));
      const remainingTotal = getTotalValue(toSnapshots(remainingEntities));
      entitiesRef.current = remainingEntities;
      const resultSign = multiplySigns(source.sign, divisorSign);
      const signedSourceCount = source.count * source.sign;
      const signedDivisor = bubble.count * divisorSign;

      const quotient = source.count / bubble.count;
      const resultBead = addBead(1, quotient, resultSign, sourceCenter.x, sourceCenter.y, false, { x: 0, y: -0.4 }, 'division');
      if (!resultBead) {
        return false;
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
      return true;
    },
    [addBead, fieldHeight, fieldWidth, triggerBubbleBurst],
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

  useEffect(() => {
    if (!divisionFailedAnimation) {
      return;
    }

    if (backgroundBubbleTick - divisionFailedAnimation.startedAt >= DIVISION_FAILED_ANIMATION_MS) {
      setDivisionFailedAnimation(undefined);
    }
  }, [backgroundBubbleTick, divisionFailedAnimation]);

  useEffect(() => {
    if (isClear || isFailed || draggingBeadId !== undefined || mergeAnimation || divisionSplitAnimation || divisionFailedAnimation || annihilationAnimation || multiplicationExpansionAnimation) {
      return;
    }

    const idleDuration = backgroundBubbleTick - lastBubbleInteractionAtRef.current;
    if (idleDuration < FIELD_BUBBLE_AUTO_BURST_IDLE_MS) {
      return;
    }

    if (backgroundBubbleTick - lastFieldBubbleAutoBurstAtRef.current < FIELD_BUBBLE_AUTO_BURST_STEP_MS) {
      return;
    }

    const fieldBubble = findAutoBurstFieldBubble(entitiesRef.current, fieldWidth, fieldHeight);
    if (!fieldBubble) {
      return;
    }

    lastFieldBubbleAutoBurstAtRef.current = backgroundBubbleTick;
    playBubblePopSfx();
    unwrapBeadGroup(fieldBubble.id);
  }, [annihilationAnimation, backgroundBubbleTick, divisionFailedAnimation, divisionSplitAnimation, draggingBeadId, fieldHeight, fieldWidth, isClear, isFailed, mergeAnimation, multiplicationExpansionAnimation, playBubblePopSfx, unwrapBeadGroup]);

  const burstBubble = useCallback(
    (bubble: PendingBubble) => {
      markBubbleInteraction();
      if (isClear || isFailed) {
        return;
      }
      if (consumedPendingBubbleIdsRef.current.has(bubble.id)) {
        return;
      }
      consumedPendingBubbleIdsRef.current.add(bubble.id);
      const hasPriorValue = hasExpressionValue(expressionTokensRef.current);
      const activeOperator: OperatorButtonSymbol = hasPriorValue ? selectedOperatorRef.current : '+';
      if (hasPriorValue && !canUseOperator(operatorUsage[activeOperator])) {
        consumedPendingBubbleIdsRef.current.delete(bubble.id);
        return;
      }
      if (hasPriorValue && (activeOperator === '×' || activeOperator === '÷') && isBoardBusyForPriorityOperation()) {
        consumedPendingBubbleIdsRef.current.delete(bubble.id);
        return;
      }

      if (hasPriorValue && activeOperator === '×') {
        consumeOperatorUsage(activeOperator);
        if (multiplyWrappedGroup(bubble)) {
          playBubblePopSfx();
          resetOperatorSelection();
        } else {
          restoreOperatorUsage(activeOperator);
          consumedPendingBubbleIdsRef.current.delete(bubble.id);
        }
        return;
      }
      if (hasPriorValue && activeOperator === '÷') {
        consumeOperatorUsage(activeOperator);
        if (divideWrappedGroup(bubble)) {
          playBubblePopSfx();
          resetOperatorSelection();
        } else {
          restoreOperatorUsage(activeOperator);
          consumedPendingBubbleIdsRef.current.delete(bubble.id);
        }
        return;
      }

      if (hasPriorValue) {
        consumeOperatorUsage(activeOperator);
      }
      const sign: BeadSign = hasPriorValue && activeOperator === '-' ? -1 : 1;
      playBubblePopSfx();
      triggerBubbleBurst(bubble, false, sign);
      setPendingBubbles((current) => current.filter((candidate) => candidate.id !== bubble.id));
      expressionTotalRef.current += bubble.count * sign;
      setExpressionTokens((current) => {
        const nextTokens = addNumberToExpression(current, bubble.count, activeOperator, expressionTotalRef.current);
        expressionTokensRef.current = nextTokens;
        expressionHistoryRef.current = stripExpressionResult(nextTokens);
        return nextTokens;
      });
      const usedPlaceValues = addReleasedBeads(bubble.count, sign, { x: bubble.x, y: bubble.y });
      setMessage(usedPlaceValues ? `${bubble.count}を まとまったまるでだしたよ` : `${bubble.count}この まるがでたよ`);
      resetOperatorSelection();
    },
    [addReleasedBeads, divideWrappedGroup, isClear, isFailed, markBubbleInteraction, multiplyWrappedGroup, operatorUsage, playBubblePopSfx, triggerBubbleBurst],
  );

  const consumeOperatorUsage = (operator: OperatorButtonSymbol) => {
    setOperatorUsage((current) => {
      const remaining = current[operator];
      if (remaining === 'infinite' || remaining <= 0) {
        return current;
      }
      return {
        ...current,
        [operator]: remaining - 1,
      };
    });
  };

  const restoreOperatorUsage = (operator: OperatorButtonSymbol) => {
    setOperatorUsage((current) => {
      const remaining = current[operator];
      if (remaining === 'infinite') {
        return current;
      }
      return {
        ...current,
        [operator]: remaining + 1,
      };
    });
  };

  const resetOperatorSelection = () => {
    selectedOperatorRef.current = '+';
    operatorSignRef.current = 1;
    setSelectedOperator('+');
    setOperatorSign(1);
    setHasReleasedBubble(false);
  };

  const isBoardBusyForPriorityOperation = () => {
    const snapshots = toSnapshots(entitiesRef.current);
    return Boolean(
      mergeAnimationRef.current ||
      annihilationAnimationRef.current ||
      divisionSplitAnimationRef.current ||
      divisionFailedAnimationRef.current ||
      multiplicationExpansionAnimationRef.current ||
      hasPendingSamePlaceCancellation(snapshots) ||
      hasMergeableCount(snapshots) ||
      snapshots.some((bead) => bead.sign < 0),
    );
  };

  const selectOperator = useCallback(
    (operator: OperatorButtonSymbol) => {
      markBubbleInteraction();
      if ((operator === '×' || operator === '÷') && isBoardBusyForPriorityOperation()) {
        return;
      }
      if (!canUseOperator(operatorUsage[operator])) {
        return;
      }
      playUiActionSfx();
      const nextOperatorSign: BeadSign = operator === '-' ? -1 : operator === '+' ? 1 : selectedOperatorRef.current === '-' ? -1 : operatorSignRef.current;
      setHasReleasedBubble(true);

      if (operator === selectedOperator) {
        const toggledOperatorSign: BeadSign = (operator === '×' || operator === '÷') && operatorSignRef.current < 0 ? 1 : nextOperatorSign;
        operatorSignRef.current = toggledOperatorSign;
        setOperatorSign(toggledOperatorSign);
        setMessage(getOperatorHelpMessage(operator, toggledOperatorSign));
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
      setMessage(getOperatorHelpMessage(operator, nextOperatorSign));
      const nextTokens = replaceTrailingOperator(expressionTokensRef.current, operator);
      expressionTokensRef.current = nextTokens;
      expressionHistoryRef.current = stripExpressionResult(nextTokens);
      setExpressionTokens(nextTokens);
      if (operator === '×' || operator === '÷') {
        wrapMultiplicandForMultiplication(nextTokens);
      }
    },
    [markBubbleInteraction, operatorUsage, playUiActionSfx, selectedOperator, wrapMultiplicandForMultiplication],
  );

  const appendKukuDigit = (digit: string) => {
    if (!dentakuPractice || kukuInputState !== 'input' || isClear || isFailed) {
      return;
    }
    playUiActionSfx();
    const maxInputLength = getLongFormStep(dentakuPractice, longFormStepIndex)?.maxInputLength ?? 2;
    setKukuInput((current) => {
      if (current.length >= maxInputLength) {
        return current;
      }
      if (current === '0') {
        return current;
      }
      return `${current}${digit}`;
    });
  };

  const deleteKukuDigit = () => {
    if (!dentakuPractice || kukuInputState !== 'input' || isClear || isFailed) {
      return;
    }
    playUiActionSfx();
    setKukuInput((current) => current.slice(0, -1));
  };

  const waitForDentakuAutomationIdle = async (runId: number) => {
    let stableSince: number | undefined;
    const startedAt = Date.now();

    while (dentakuAutomationRunRef.current === runId && Date.now() - startedAt < 8000) {
      const snapshots = toSnapshots(entitiesRef.current);
      const isBusy = Boolean(
        mergeAnimationRef.current ||
        annihilationAnimationRef.current ||
        divisionSplitAnimationRef.current ||
        divisionFailedAnimationRef.current ||
        multiplicationExpansionAnimationRef.current ||
        hasPendingSamePlaceCancellation(snapshots) ||
        hasMergeableCount(snapshots) ||
        snapshots.some((bead) => bead.sign < 0),
      );

      if (!isBusy) {
        stableSince ??= Date.now();
        if (Date.now() - stableSince >= 520) {
          return true;
        }
      } else {
        stableSince = undefined;
      }

      await delay(120);
    }

    return dentakuAutomationRunRef.current === runId;
  };

  const runDentakuAutomation = async (practice: DentakuAutomationPractice, runId: number, shouldWaitBetweenOperands = true) => {
    const remainingBubbles = [...pendingBubblesRef.current];

    for (let index = 0; index < practice.operands.length; index += 1) {
      if (dentakuAutomationRunRef.current !== runId) {
        return;
      }

      const operand = practice.operands[index];
      if (operand === 0 && index > 0) {
        continue;
      }

      if (index > 0) {
        if (shouldWaitBetweenOperands) {
          const isReady = await waitForDentakuAutomationIdle(runId);
          if (!isReady) {
            return;
          }
        }

        const operator = practice.operators[index - 1];
        selectOperator(operator);
        await delay(650);
      }

      if (operand === 0) {
        const nextTokens = addNumberToExpression(expressionTokensRef.current, 0, selectedOperatorRef.current, expressionTotalRef.current);
        expressionTokensRef.current = nextTokens;
        expressionHistoryRef.current = stripExpressionResult(nextTokens);
        setExpressionTokens(nextTokens);
        setMessage('0から はじめるよ');
        resetOperatorSelection();
        await delay(220);
        continue;
      }

      const bubbleIndex = remainingBubbles.findIndex((bubble) => bubble.count === operand);
      const bubble = bubbleIndex >= 0 ? remainingBubbles.splice(bubbleIndex, 1)[0] : undefined;
      if (!bubble) {
        return;
      }

      burstBubble(bubble);
      await delay(350);
    }
  };

  const runLongFormStepAutomation = async (practice: DentakuPractice, stepIndex: number, runId: number, shouldWaitForFinalIdle = true) => {
    const automationPractice = getLongFormStepAutomation(practice, stepIndex);
    if (!automationPractice) {
      return false;
    }

    const stepBubbles = getLongFormStepPendingBubbles(practice, stepIndex, fieldWidth);
    if (stepBubbles) {
      consumedPendingBubbleIdsRef.current.clear();
      pendingBubblesRef.current = stepBubbles;
      setPendingBubbles(stepBubbles);
      await delay(120);
    }

    await runDentakuAutomation(automationPractice, runId, shouldWaitForFinalIdle);
    const isIdle = shouldWaitForFinalIdle ? await waitForDentakuAutomationIdle(runId) : dentakuAutomationRunRef.current === runId;

    if (isIdle && stepIndex <= 0) {
      const nextStepBubbles = getLongFormStepPendingBubbles(practice, stepIndex + 1, fieldWidth);
      if (nextStepBubbles) {
        consumedPendingBubbleIdsRef.current.clear();
        pendingBubblesRef.current = nextStepBubbles;
        setPendingBubbles(nextStepBubbles);
      }
    }

    return isIdle;
  };

  const submitKukuAnswer = () => {
    if (!dentakuPractice || kukuInputState !== 'input' || isClear || isFailed || kukuInput.length === 0) {
      return;
    }

    const longFormStep = getLongFormStep(dentakuPractice, longFormStepIndex);
    const expectedAnswer = longFormStep?.expectedAnswer ?? dentakuPractice.answer;

    if (Number(kukuInput) !== expectedAnswer) {
      playFailSfx();
      setKukuInputState('wrong');
      setTimeout(() => {
        setKukuInput('');
        setKukuInputState('input');
      }, 560);
      return;
    }

    if (longFormStep && !longFormStep.isFinal) {
      if (isLongFormPlaceValuePractice(dentakuPractice)) {
        setLongFormStepIndex((current) => current + 1);
        setKukuInput('');
        setKukuInputState('input');
        return;
      }

      setKukuInputState('running');
      const runId = dentakuAutomationRunRef.current + 1;
      dentakuAutomationRunRef.current = runId;
      const currentStepIndex = longFormStepIndex;
      void (async () => {
        await runLongFormStepAutomation(dentakuPractice, currentStepIndex, runId);
        if (dentakuAutomationRunRef.current !== runId) {
          return;
        }
        setLongFormStepIndex(currentStepIndex + 1);
        setKukuInput('');
        setKukuInputState('input');
      })();
      return;
    }

    setKukuInputState('running');
    const runId = dentakuAutomationRunRef.current + 1;
    dentakuAutomationRunRef.current = runId;
    if (longFormStep) {
      if (isLongFormPlaceValuePractice(dentakuPractice)) {
        void (async () => {
          const problem = getLongFormProblem(dentakuPractice);
          const shouldWaitForOnesIdle = problem?.operator !== '-';
          const onesIsIdle = await runLongFormStepAutomation(dentakuPractice, 0, runId, shouldWaitForOnesIdle);
          if (dentakuAutomationRunRef.current !== runId || !onesIsIdle) {
            return;
          }
          await delay(260);
          await runLongFormStepAutomation(dentakuPractice, 1, runId, false);
          if (dentakuAutomationRunRef.current !== runId) {
            return;
          }
          completeCurrentStage();
        })();
        return;
      }

      const automationPractice = getLongFormStepAutomation(dentakuPractice, longFormStepIndex);
      if (automationPractice) {
        void runLongFormStepAutomation(dentakuPractice, longFormStepIndex, runId);
      } else {
        void runDentakuAutomation(dentakuPractice, runId);
      }
      return;
    }

    void runDentakuAutomation(dentakuPractice, runId);
  };

  useEffect(() => {
    if (!isStageReadyForResult(pendingBubbles)) {
      return;
    }

    if (mode === 'launch' && total === LAUNCH_INITIAL_TOTAL) {
      return;
    }

    if (unwrapProductGroups()) {
      return;
    }

    setExpressionTokens((current) => {
      const nextTokens = evaluateExpressionOnEquals(current);
      if (nextTokens.join('\u0000') === current.join('\u0000')) {
        return current;
      }

      expressionTokensRef.current = nextTokens;
      expressionHistoryRef.current = stripExpressionResult(nextTokens);
      return nextTokens;
    });
  }, [mode, pendingBubbles, total, unwrapProductGroups]);

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

        const alignTarget = getMergeAnimationTarget(entity.id, mergeAnimation, progress);
        const dx = alignTarget.x - entity.body.position.x;
        const dy = alignTarget.y - entity.body.position.y;
        const pull = mergeAnimation.value === 1 && progress < 0.72 ? 0.22 + progress * 0.34 : 0.16 + progress * 0.52;
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
        const pull = 0.18 + progress * 0.42;
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

  const updateBubbleBurstAnimations = useCallback((now: number) => {
    setBubbleBurstAnimations((current) => {
      if (current.length === 0) {
        return current;
      }
      const next = current.filter((animation) => now - animation.startedAt < BUBBLE_BURST_ANIMATION_MS);
      return next.length === current.length ? current : next;
    });
  }, []);

  const startDragBead = useCallback((beadId: string) => {
    playBeadTouchSfx();
    const entity = entitiesRef.current.find((candidate) => candidate.id === beadId);
    if (entity) {
      Matter.Body.setStatic(entity.body, true);
      Matter.Body.setVelocity(entity.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(entity.body, 0);
    }
    draggingBeadIdRef.current = beadId;
    setDraggingBeadId(beadId);
  }, [playBeadTouchSfx]);

  const endDragBead = useCallback((beadId: string) => {
    const entity = entitiesRef.current.find((candidate) => candidate.id === beadId);
    if (entity) {
      Matter.Body.setStatic(entity.body, false);
      Matter.Body.setVelocity(entity.body, { x: 0, y: 0 });
      Matter.Body.setAngularVelocity(entity.body, 0);
    }
    if (draggingBeadIdRef.current === beadId) {
      draggingBeadIdRef.current = undefined;
      setDraggingBeadId(undefined);
    }
  }, []);

  const moveBubble = useCallback(
    (bubbleId: string, x: number, y: number) => {
      markBubbleInteraction();
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
    [fieldHeight, fieldWidth, markBubbleInteraction],
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

      if (cluster.value === 1 && !isUnitMergeSettled(cluster, entitiesRef.current, fieldHeight)) {
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

      if (latestCluster.value === 1 && !isUnitMergeSettled(latestCluster, entitiesRef.current, fieldHeight)) {
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
      playMergeSfx();
      mergeReadySinceRef.current = undefined;
      setMessage('ぎゅっと まとまるよ');
    },
    [fieldHeight, playMergeSfx],
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
      applyBeadForces(entitiesRef.current, draggingBeadIdRef.current);
      updateAnnihilationAnimation(now);
      updateDivisionSplitAnimation(now);
      updateMergeAnimation(now);
      updateBubbleBurstAnimations(now);
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
        const pair = productCollision ? undefined : findAnnihilationPair(toSnapshots(entitiesRef.current));
        if (pair) {
          playAnnihilationSfx();
          setAnnihilationAnimation({
            id: `annihilation-${now}`,
            beadIds: pair.beadIds,
            center: pair.center,
            startedAt: now,
          });
          setMessage('');
        } else {
          const decomposition = productCollision ? undefined : findDecompositionPair(toSnapshots(entitiesRef.current));
          if (decomposition) {
            splitHigherBead(decomposition.higherBeadId, decomposition.lowerValue);
            setMessage('おおきなまるが こまかくなったよ');
          } else {
            settleMergeIfReady(now);
          }
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
    playAnnihilationSfx,
    settleMergeIfReady,
    splitHigherBead,
    unwrapProductGroup,
    updateAnnihilationAnimation,
    updateBubbleBurstAnimations,
    updateDivisionSplitAnimation,
    updateMergeAnimation,
    wrapMultiplicandForMultiplication,
  ]);

  const playPendingBubbles = () => {
    markBubbleInteraction();
    pendingBubbles.forEach((bubble, index) => {
      setTimeout(() => burstBubble(bubble), index * 220);
    });
  };
  const playNextStage = () => {
    playUiActionSfx();
    fadeOutResultSfx();
    markBubbleInteraction();
    if (dentakuPractice) {
      dentakuPractice.onNextQuestion();
      return;
    }
    setStageIndex((current) => current + 1);
  };
  const retryStage = () => {
    playUiActionSfx();
    resetStage();
  };
  const goBack = () => {
    playUiActionSfx();
    onBack?.();
  };
  const completeLaunch = () => {
    playUiActionSfx();
    onComplete?.();
  };
  const clearActionPulse = isClear ? 1 + Math.sin(backgroundBubbleTick / 170) * 0.08 : 1;
  const failedProgress = failedAt ? clamp((backgroundBubbleTick - failedAt) / FAILED_VEIL_FADE_IN_MS, 0, 1) : 0;
  const failedActionPulse = isFailed ? 1 + Math.sin(backgroundBubbleTick / 155) * (0.04 + failedProgress * 0.09) : 1;
  const clearEquation = `${formatResultExpression(expressionTokens, target)} = ${target}`;
  const failedEquation = `${total} ≠ ${target}`;
  const longFormProblem = dentakuPractice?.longFormMode ? getLongFormProblem(dentakuPractice) : undefined;
  const longFormQuestionTransition = dentakuPractice?.longFormMode
    ? 1 - clamp((backgroundBubbleTick - longFormQuestionChangedAt) / 420, 0, 1)
    : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          {onBack && mode !== 'launch' ? (
            <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={goBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressedButton]}>
              <NavImageIcon kind="back" size={29} />
            </Pressable>
          ) : null}
          {(!dentakuPractice && (mode !== 'launch' || isClear)) || (dentakuPractice && isClear && !dentakuPractice.autoAdvance) ? (
            <Pressable
              accessibilityLabel={isClear ? 'next stage' : 'retry'}
              accessibilityRole="button"
              onPress={isClear ? (mode === 'launch' ? completeLaunch : playNextStage) : retryStage}
              style={({ pressed }) => [
                styles.headerRetryButton,
                isClear && styles.headerNextButton,
                mode === 'launch' && isClear && styles.headerLaunchNextButton,
                isFailed && styles.headerRetryButtonFailed,
                isFailed && { transform: [{ scale: failedActionPulse }], shadowOpacity: 0.18 + failedProgress * 0.46, shadowRadius: 8 + failedProgress * 16 },
                pressed && styles.pressedButton,
              ]}
            >
              <View pointerEvents="none" style={isClear ? { transform: [{ scale: clearActionPulse }] } : undefined}>
                <NavImageIcon kind={isClear ? 'next' : 'retry'} size={isClear ? 31 : 29} />
              </View>
            </Pressable>
          ) : null}
          <View style={styles.headerMainTitleShift}>
            {mode === 'launch' ? (
              <LaunchLogo onPress={onLogoPress} />
            ) : dentakuPractice ? (
              <KukuGoalTitle practice={dentakuPractice} input={kukuInput} maxWidth={Math.max(168, fieldWidth - 132)} />
            ) : (
              <StageGoalTitle stageNumber={stageNumberInIsland} target={target} maxWidth={Math.max(168, fieldWidth - 132)} />
            )}
          </View>
        </View>
        <Text testID="current-total-value" style={styles.hiddenMetric}>
          {total}
        </Text>
      </View>

      <View style={[styles.playArea, { width: fieldWidth }]}>
        <OperatorRail
          selectedOperator={selectedOperator}
          operatorSign={operatorSign}
          operatorUsage={operatorUsage}
          hasInputValue={hasExpressionValue(expressionTokens)}
          hasActiveSelection={hasReleasedBubble}
          isLocked={isStageReadyForResult(pendingBubbles)}
          onSelect={selectOperator}
        />
        <View style={[styles.field, { width: fieldWidth, height: fieldHeight }]}>
          {basinFrameSegments.map((segment) => (
            <View
              key={`${segment.id}-tray`}
              pointerEvents="none"
              style={[
                styles.basinTraySegment,
                {
                  left: segment.x,
                  top: segment.y + 3,
                  width: segment.length + 4,
                  transform: [{ rotate: `${segment.angle}rad` }],
                },
              ]}
            />
          ))}
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
          {basinFrameSegments.map((segment) => (
            <View
              key={`${segment.id}-shine`}
              pointerEvents="none"
              style={[
                styles.basinFrameHighlightSegment,
                {
                  left: segment.x + 1,
                  top: segment.y - 2,
                  width: segment.length,
                  transform: [{ rotate: `${segment.angle}rad` }],
                },
              ]}
            />
          ))}
          {pendingBubbles.map((bubble) => {
            const activePendingOperator = hasReleasedBubble ? selectedOperator : '+';
            const bubbleSign: BeadSign = activePendingOperator === '×' || activePendingOperator === '÷' ? operatorSign : activePendingOperator === '-' ? -1 : 1;
            return (
              <DraggableBubbleView
                key={bubble.id}
                bubble={bubble}
                sign={bubbleSign}
                isMultiplier={activePendingOperator === '×'}
                isDivider={activePendingOperator === '÷'}
                isHinting={shouldPulsePendingBubbles}
                onBurst={dentakuPractice ? () => undefined : burstBubble}
                onMove={dentakuPractice ? () => undefined : moveBubble}
              />
            );
          })}
          {bubbleBurstAnimations.map((animation) => (
            <BubbleBurst key={animation.id} animation={animation} />
          ))}
          {multiplicationExpansionAnimation ? <MultiplicationExpansionOverlay animation={multiplicationExpansionAnimation} /> : null}
          {isClear ? <ClearBubbleFireworks fieldWidth={fieldWidth} fieldHeight={fieldHeight} tick={backgroundBubbleTick} /> : null}
          {displayBeads.map((bead) => (
            divisionSplitAnimation?.resultBeadId === bead.id ? null :
            <DraggableBeadView
              key={bead.id}
              bead={bead}
              onMove={moveBead}
              onDragStart={startDragBead}
              onDragEnd={endDragBead}
              isDragging={draggingBeadId === bead.id}
              isAlmostMerge={almostMergeBeadIds.has(bead.id)}
              onTap={bead.id !== 'expression-wrap-preview' && canBurstBead(bead) ? () => unwrapBeadGroup(bead.id) : undefined}
            />
          ))}
          {mergeAnimation ? <MergePulse animation={mergeAnimation} /> : null}
          {divisionSplitAnimation ? <DivisionSplitOverlay animation={divisionSplitAnimation} /> : null}
          {divisionFailedAnimation ? <DivisionFailedOverlay animation={divisionFailedAnimation} tick={backgroundBubbleTick} /> : null}
          {isFailed ? <FailedWaterOverlay progress={failedProgress} /> : null}
        </View>
      </View>

      <View style={[styles.footer, { width: fieldWidth }]}>
        <View style={styles.footerControls}>
          <ExpressionDisplay tokens={footerExpressionTokens} />
        </View>
      </View>
      {dentakuPractice && !isClear && kukuInputState !== 'running' ? (
        <KukuAnswerPad
          state={kukuInputState}
          canSubmit={kukuInput.length > 0 && kukuInputState === 'input' && !isFailed}
          longFormProblem={longFormProblem}
          longFormStepIndex={longFormStepIndex}
          longFormQuestionTransition={longFormQuestionTransition}
          longFormFeedbackTick={backgroundBubbleTick}
          input={kukuInput}
          onDigit={appendKukuDigit}
          onDelete={deleteKukuDigit}
          onSubmit={submitKukuAnswer}
        />
      ) : null}
      {isFailed ? <View pointerEvents="none" style={[styles.failedScreenVeil, { opacity: failedProgress }]} /> : null}
      <BackgroundBubbleLayer
        bubbles={backgroundBubbles}
        fieldWidth={width}
        fieldHeight={height}
        tick={backgroundBubbleTick}
        bubbleStarts={backgroundBubbleStarts}
        onPop={(bubbleId) => {
          playBackgroundBubbleSfx();
          setBackgroundBubbleStarts((current) => ({ ...current, [bubbleId]: Date.now() }));
        }}
      />
    </View>
  );
}

function LaunchLogo({ variant = 'header', onPress }: { variant?: 'header' | 'tada'; onPress?: () => void }) {
  const content = (
    <View accessibilityLabel={onPress ? undefined : 'maru logo'} style={[styles.launchLogo, variant === 'tada' && styles.launchLogoTada]}>
      <BrandLogo size="medium" />
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable accessibilityLabel="maru logo" accessibilityRole="link" onPress={onPress} style={({ pressed }) => pressed && styles.pressedButton}>
      {content}
    </Pressable>
  );
}

function StageGoalTitle({ stageNumber, target, maxWidth }: { stageNumber: number; target: number; maxWidth: number }) {
  return (
    <View testID="stage-goal-title" style={[styles.stageGameTitle, { maxWidth }]}>
      <View style={styles.stageGameNumberSlot}>
        <Text testID="stage-goal-number" style={styles.stageGameNumber}>#{stageNumber}</Text>
      </View>
      <HeaderGoalParts target={target} maxWidth={Math.max(54, maxWidth - 118)} />
      <View style={styles.stageGameEqualsSlot}>
        <Text testID="stage-goal-equals" style={styles.stageGameEquals}>=</Text>
      </View>
      <View style={styles.stageGameTargetSlot}>
        <Text testID="stage-goal-target" style={styles.stageGameTarget}>{target}</Text>
      </View>
    </View>
  );
}

function KukuGoalTitle({ practice, input, maxWidth }: { practice: DentakuPractice; input: string; maxWidth: number }) {
  if (practice.longFormMode) {
    return <LongFormStageTitle label={practice.stageLabel} questionNumber={practice.questionNumber} questionTotal={practice.questionTotal} maxWidth={maxWidth} />;
  }

  const expression = practice.prompt.replace(' = ?', '');
  const answerText = input || '?';
  const questionText = `${expression} = ${answerText}`;
  const titleTextStyle = getKukuQuestionTitleTextStyle(questionText, maxWidth);

  return (
    <View style={[styles.kukuGameTitle, { maxWidth }]}>
      <Text testID="kuku-question-title" numberOfLines={1} style={[styles.kukuQuestionText, titleTextStyle]}>
        {expression} = <Text style={input.length === 0 ? styles.kukuQuestionUnknown : undefined}>{answerText}</Text>
      </Text>
    </View>
  );
}

function LongFormStageTitle({ label, questionNumber, questionTotal, maxWidth }: { label: string; questionNumber?: number; questionTotal?: number; maxWidth: number }) {
  const progressText = questionNumber !== undefined && questionTotal !== undefined ? ` ${questionNumber}/${questionTotal}` : '';
  return (
    <View style={[styles.kukuGameTitle, { maxWidth }]}>
      <Text testID="kuku-question-title" numberOfLines={1} style={styles.kukuQuestionText}>
        {label}{progressText}
      </Text>
    </View>
  );
}

type LongFormProblem = {
  left: number;
  right: number;
  operator: DentakuOperator;
  answer: number;
};

function LongFormGoalTitle({
  problem,
  input,
  stepIndex,
  transition,
  isWrong,
  feedbackTick,
  maxWidth,
}: {
  problem: LongFormProblem;
  input: string;
  stepIndex: number;
  transition: number;
  isWrong: boolean;
  feedbackTick: number;
  maxWidth: number;
}) {
  const answerText = input || '?';
  const hasInput = input.length > 0;
  const promptText = `${problem.left} ${problem.operator} ${problem.right} = ${answerText}`;
  const rows = buildLongFormRows(problem, answerText, hasInput, stepIndex);
  const columnCount = Math.max(...rows.map((row) => row.cells.length), 1);
  const cellSize = Math.max(24, Math.min(30, Math.floor((maxWidth - 58) / Math.max(columnCount, 3))));
  const transitionScale = 1 + transition * 0.045;
  const transitionOpacity = 0.78 + (1 - transition) * 0.22;
  const wrongOffset = isWrong ? Math.sin(feedbackTick / 34) * 3 : 0;

  return (
    <View testID="long-form-panel" style={[styles.longFormPanel, { maxWidth }]}>
      <Text testID="long-form-question-prompt" style={styles.hiddenMetric}>{promptText}</Text>
      <View style={[styles.longFormBody, { opacity: transitionOpacity, transform: [{ translateX: -11 }, { scale: transitionScale }] }]}>
        {rows.map((row) => (
          <View key={row.id} style={styles.longFormRow}>
            <View style={[
              styles.longFormOperatorSlot,
              row.isDivisionBar && styles.longFormDivisionOperatorSlot,
              row.hasDivider && styles.longFormDividerOperatorSlot,
            ]}>
              <Text style={[
                styles.longFormOperatorText,
                row.isDivisionBar && styles.longFormDivisionOperatorText,
                row.isGuide && styles.longFormGuideText,
              ]}>{row.operatorLabel ?? ''}</Text>
            </View>
            <View style={[
              styles.longFormDigits,
              row.hasTopDivider && styles.longFormTopDivider,
              row.isDivisionBar && styles.longFormDivisionTopDivider,
              row.hasDivider && styles.longFormDivider,
              { width: cellSize * columnCount },
            ]}>
              {padLongFormCells(row.cells, columnCount).map((cell, index) => (
                <View
                  key={`${row.id}-${index}`}
                  style={[
                    styles.longFormCell,
                    { width: cellSize, height: row.isGuide ? Math.max(16, cellSize * 0.66) : cellSize },
                    cell.isActive && styles.longFormActiveCell,
                    cell.isActive && cell.isUnknown && styles.longFormActiveUnknownCell,
                    cell.isActive && isWrong && styles.longFormWrongCell,
                    cell.isActive && isWrong && { transform: [{ translateX: wrongOffset }] },
                  ]}
                >
                  <Text style={[
                    styles.longFormDigit,
                    row.isGuide && styles.longFormGuideText,
                    cell.isUnknown && styles.longFormUnknownText,
                  ]}>
                    {cell.value}
                  </Text>
                  {cell.isStruck ? <View pointerEvents="none" style={styles.longFormStrike} /> : null}
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

type LongFormCell = {
  value: string;
  isActive?: boolean;
  isUnknown?: boolean;
  isStruck?: boolean;
};

type LongFormRow = {
  id: string;
  cells: LongFormCell[];
  operatorLabel?: string;
  hasDivider?: boolean;
  hasTopDivider?: boolean;
  isDivisionBar?: boolean;
  isGuide?: boolean;
};

function getLongFormProblem(practice: DentakuPractice): LongFormProblem | undefined {
  if (practice.autoAdvance || practice.operators.length !== 1 || practice.operands.length !== 2) {
    return undefined;
  }

  const operator = practice.operators[0];
  if (operator !== '+' && operator !== '-' && operator !== '×' && operator !== '÷') {
    return undefined;
  }

  return {
    left: practice.operands[0],
    right: practice.operands[1],
    operator,
    answer: practice.answer,
  };
}

type LongFormStep = {
  expectedAnswer: number;
  isFinal: boolean;
  maxInputLength: number;
};

function getLongFormStep(practice: DentakuPractice, stepIndex: number): LongFormStep | undefined {
  const problem = practice.longFormMode ? getLongFormProblem(practice) : undefined;
  if (!problem || (problem.operator !== '+' && problem.operator !== '-' && problem.operator !== '×' && problem.operator !== '÷')) {
    return undefined;
  }

  if (problem.operator === '×') {
    return getLongFormMultiplicationStep(problem, stepIndex);
  }

  if (problem.operator === '÷') {
    return getLongFormDivisionStep(problem, stepIndex);
  }

  const placeStep = getLongFormPlaceStep(problem);
  if (!placeStep) {
    return undefined;
  }

  if (stepIndex <= 0) {
    return {
      expectedAnswer: placeStep.onesAnswer,
      isFinal: false,
      maxInputLength: 2,
    };
  }

  return {
    expectedAnswer: placeStep.tensAnswer,
    isFinal: true,
    maxInputLength: String(placeStep.tensAnswer).length,
  };
}

function isLongFormPlaceValuePractice(practice: DentakuPractice) {
  const problem = practice.longFormMode ? getLongFormProblem(practice) : undefined;
  return problem?.operator === '+' || problem?.operator === '-';
}

function getLongFormStepAutomation(practice: DentakuPractice, stepIndex: number): DentakuAutomationPractice | undefined {
  const problem = practice.longFormMode ? getLongFormProblem(practice) : undefined;
  const parts = problem ? getLongFormPlaceParts(problem) : undefined;
  if (!problem || !parts || (problem.operator !== '+' && problem.operator !== '-')) {
    return undefined;
  }

  if (stepIndex <= 0) {
    return {
      operands: [parts.onesLeft, parts.onesRight],
      operators: [problem.operator],
    };
  }

  return {
    operands: [parts.tensLeft, parts.tensRight],
    operators: [problem.operator],
  };
}

function getLongFormStepPendingBubbles(practice: DentakuPractice, stepIndex: number, fieldWidth: number): PendingBubble[] | undefined {
  const problem = practice.longFormMode ? getLongFormProblem(practice) : undefined;
  const parts = problem ? getLongFormPlaceParts(problem) : undefined;
  if (!parts || (problem?.operator !== '+' && problem?.operator !== '-')) {
    return undefined;
  }

  const counts = stepIndex <= 0
    ? [parts.onesLeft, parts.onesRight]
    : [parts.tensLeft, parts.tensRight];

  return createPendingBubbles(fieldWidth, counts.filter((count) => count > 0));
}

function getLongFormPlaceStep(problem: LongFormProblem) {
  if (problem.operator === '+') {
    const onesAnswer = problem.left % 10 + problem.right % 10;
    const carry = Math.floor(onesAnswer / 10);
    const tensAnswer = Math.floor(problem.left / 10) + Math.floor(problem.right / 10) + carry;
    return { onesAnswer, tensAnswer };
  }

  if (problem.operator === '-') {
    const needsBorrow = problem.left % 10 < problem.right % 10;
    const onesAnswer = (needsBorrow ? problem.left % 10 + 10 : problem.left % 10) - (problem.right % 10);
    const tensAnswer = Math.floor(problem.left / 10) - (needsBorrow ? 1 : 0) - Math.floor(problem.right / 10);
    return { onesAnswer, tensAnswer };
  }

  return undefined;
}

function getLongFormPlaceParts(problem: LongFormProblem) {
  if (problem.operator === '+') {
    return {
      onesLeft: problem.left % 10,
      onesRight: problem.right % 10,
      tensLeft: Math.floor(problem.left / 10) * 10,
      tensRight: Math.floor(problem.right / 10) * 10,
    };
  }

  if (problem.operator === '-') {
    return {
      onesLeft: problem.left % 10,
      onesRight: problem.right % 10,
      tensLeft: Math.floor(problem.left / 10) * 10,
      tensRight: Math.floor(problem.right / 10) * 10,
    };
  }

    return undefined;
}

function getLongFormMultiplicationStep(problem: LongFormProblem, stepIndex: number): LongFormStep | undefined {
  const state = getLongFormMultiplicationState(problem);
  if (!state) {
    return undefined;
  }

  const partial = state.partialProducts[stepIndex];
  if (partial) {
    return {
      expectedAnswer: partial.inputValue,
      isFinal: false,
      maxInputLength: String(partial.inputValue).length,
    };
  }

  const additionStep = state.additionSteps[stepIndex - state.partialProducts.length];
  if (!additionStep) {
    return undefined;
  }

  return {
    expectedAnswer: additionStep.expectedAnswer,
    isFinal: stepIndex - state.partialProducts.length >= state.additionSteps.length - 1,
    maxInputLength: String(additionStep.expectedAnswer).length,
  };
}

function getLongFormMultiplicationState(problem: LongFormProblem) {
  if (problem.operator !== '×' || problem.left < 10 || problem.left > 99 || problem.right < 10 || problem.right > 99) {
    return undefined;
  }

  const leftTens = Math.floor(problem.left / 10);
  const leftOnes = problem.left % 10;
  const rightTens = Math.floor(problem.right / 10);
  const rightOnes = problem.right % 10;
  const partialProducts = [
    { inputValue: leftOnes * rightOnes, value: leftOnes * rightOnes, leftColumn: 1, rightColumn: 1 },
    { inputValue: leftTens * rightOnes, value: leftTens * 10 * rightOnes, leftColumn: 0, rightColumn: 1 },
    { inputValue: leftOnes * rightTens, value: leftOnes * rightTens * 10, leftColumn: 1, rightColumn: 0 },
    { inputValue: leftTens * rightTens, value: leftTens * 10 * rightTens * 10, leftColumn: 0, rightColumn: 0 },
  ];
  const partialValues = partialProducts.map((partial) => partial.value);
  const answerWidth = Math.max(String(problem.answer).length, ...partialValues.map((value) => String(value).length), 3);
  const additionSteps = buildLongFormColumnAdditionSteps(partialValues, answerWidth);

  return {
    answerWidth,
    partialProducts,
    additionSteps,
  };
}

function buildLongFormColumnAdditionSteps(values: number[], width: number) {
  const steps: { column: number; expectedAnswer: number; carryIn: number }[] = [];
  let carry = 0;

  for (let column = width - 1; column >= 0; column -= 1) {
    const place = 10 ** (width - 1 - column);
    const expectedAnswer = values.reduce((sum, value) => sum + Math.floor(value / place) % 10, carry);
    steps.push({ column, expectedAnswer, carryIn: carry });
    carry = Math.floor(expectedAnswer / 10);
  }

  while (steps.length > 1 && steps[steps.length - 1].expectedAnswer === 0 && steps[steps.length - 1].carryIn === 0) {
    steps.pop();
  }

  return steps;
}

function getLongFormDivisionStep(problem: LongFormProblem, stepIndex: number): LongFormStep | undefined {
  const state = getLongFormDivisionState(problem);
  const step = state?.steps[stepIndex];
  if (!step) {
    return undefined;
  }

  return {
    expectedAnswer: step.expectedAnswer,
    isFinal: stepIndex >= state.steps.length - 1,
    maxInputLength: String(step.expectedAnswer).length,
  };
}

function getLongFormDivisionState(problem: LongFormProblem) {
  if (problem.operator !== '÷' || problem.left < 10 || problem.left > 99 || problem.right < 2 || problem.right > 9 || !Number.isInteger(problem.answer) || problem.answer < 10 || problem.answer > 99) {
    return undefined;
  }

  const dividendTens = Math.floor(problem.left / 10);
  const dividendOnes = problem.left % 10;
  const quotientTens = Math.floor(problem.answer / 10);
  const quotientOnes = problem.answer % 10;
  const firstProduct = problem.right * quotientTens;
  const firstRemainder = dividendTens - firstProduct;
  const loweredValue = firstRemainder * 10 + dividendOnes;
  const secondProduct = problem.right * quotientOnes;
  const finalRemainder = loweredValue - secondProduct;

  if (quotientTens <= 0 || firstProduct > dividendTens || finalRemainder !== 0) {
    return undefined;
  }

  return {
    dividendOnes,
    dividendTens,
    finalRemainder,
    firstProduct,
    firstRemainder,
    loweredValue,
    quotientOnes,
    quotientTens,
    secondProduct,
    steps: [
      { expectedAnswer: quotientTens },
      { expectedAnswer: firstProduct },
      { expectedAnswer: firstRemainder },
      { expectedAnswer: quotientOnes },
      { expectedAnswer: secondProduct },
      { expectedAnswer: finalRemainder },
    ],
  };
}

function getFooterExpressionTokens({
  dentakuPractice,
  expressionTokens,
  isClear,
  mode,
  pendingBubbles,
}: {
  dentakuPractice?: DentakuPractice;
  expressionTokens: string[];
  isClear: boolean;
  mode: 'stage' | 'launch';
  pendingBubbles: PendingBubble[];
}) {
  const problem = dentakuPractice?.longFormMode ? getLongFormProblem(dentakuPractice) : undefined;
  if (problem && isClear) {
    return [String(problem.left), problem.operator, String(problem.right), '=', String(problem.answer)];
  }

  if (mode === 'launch' && pendingBubbles.length > 0) {
    return [String(LAUNCH_INITIAL_TOTAL), '+'];
  }

  return expressionTokens;
}

function buildLongFormRows(problem: LongFormProblem, answerText: string, showGuideRows: boolean, stepIndex: number): LongFormRow[] {
  if (problem.operator === '÷') {
    return buildDivisionLongFormRows(problem, answerText, stepIndex);
  }

  if (problem.operator === '×') {
    return buildMultiplicationLongFormRows(problem, answerText, stepIndex);
  }

  const operandWidth = Math.max(String(problem.left).length, String(problem.right).length, String(problem.answer).length);
  const shouldShowGuideRows = (problem.operator === '+' || problem.operator === '-')
    ? stepIndex > 0
    : showGuideRows;
  const guideRows = shouldShowGuideRows ? buildPlaceValueGuideRows(problem, operandWidth) : [];
  const answerCells = buildLongFormAnswerCells(problem, answerText, operandWidth, stepIndex);
  const activePlaceColumn = getLongFormActivePlaceColumn(problem, operandWidth, stepIndex);
  const leftCells = activePlaceColumn == null
    ? formatLongFormNumber(problem.left)
    : formatLongFormPlaceNumber(problem.left, operandWidth, activePlaceColumn);
  const displayedLeftCells = markLongFormBorrowedTensCell(problem, leftCells, operandWidth, stepIndex);
  const rightCells = activePlaceColumn == null
    ? formatLongFormNumber(problem.right)
    : formatLongFormPlaceNumber(problem.right, operandWidth, activePlaceColumn);

  return [
    ...guideRows,
    { id: 'left', cells: displayedLeftCells },
    { id: 'right', operatorLabel: problem.operator, hasDivider: true, cells: rightCells },
    { id: 'answer', cells: answerCells },
  ];
}

function buildMultiplicationLongFormRows(problem: LongFormProblem, answerText: string, stepIndex: number): LongFormRow[] {
  const state = getLongFormMultiplicationState(problem);
  if (!state) {
    return [
      { id: 'left', cells: formatLongFormNumber(problem.left) },
      { id: 'right', operatorLabel: problem.operator, hasDivider: true, cells: formatLongFormNumber(problem.right) },
      { id: 'answer', cells: formatLongFormNumber(answerText, { unknown: answerText === '?' }) },
    ];
  }

  const width = state.answerWidth;
  const activeOperandColumns = getMultiplicationActiveOperandColumns(state, stepIndex);
  const leftCells = activeOperandColumns.left == null
    ? padLongFormCells(formatLongFormNumber(problem.left), width)
    : formatLongFormPlaceNumber(problem.left, width, activeOperandColumns.left);
  const rightCells = activeOperandColumns.right == null
    ? padLongFormCells(formatLongFormNumber(problem.right), width)
    : formatLongFormPlaceNumber(problem.right, width, activeOperandColumns.right);
  const additionGuideRows = buildMultiplicationAdditionGuideRows(state, stepIndex);
  const partialRows = buildMultiplicationPartialRows(state, answerText, stepIndex);
  const answerCells = buildMultiplicationAnswerCells(problem, state, answerText, stepIndex);
  const isAdditionStage = stepIndex >= state.partialProducts.length;

  return [
    { id: 'left', cells: leftCells },
    { id: 'right', operatorLabel: problem.operator, hasDivider: true, cells: rightCells },
    ...additionGuideRows,
    ...partialRows.map((row, index) => ({
      id: `partial-${index}`,
      cells: row,
      operatorLabel: isAdditionStage && index === state.partialProducts.length - 1 ? '+' : undefined,
      hasDivider: isAdditionStage && index === state.partialProducts.length - 1,
    })),
    ...(isAdditionStage ? [{ id: 'answer', cells: answerCells }] : []),
  ];
}

function getMultiplicationActiveOperandColumns(state: NonNullable<ReturnType<typeof getLongFormMultiplicationState>>, stepIndex: number) {
  const partial = state.partialProducts[stepIndex];
  if (!partial) {
    return {};
  }

  return {
    left: state.answerWidth - 2 + partial.leftColumn,
    right: state.answerWidth - 2 + partial.rightColumn,
  };
}

function buildMultiplicationAdditionGuideRows(state: NonNullable<ReturnType<typeof getLongFormMultiplicationState>>, stepIndex: number): LongFormRow[] {
  const additionStep = state.additionSteps[stepIndex - state.partialProducts.length];
  if (!additionStep || additionStep.carryIn <= 0) {
    return [];
  }

  return [{
    id: 'multiply-addition-carry',
    isGuide: true,
    cells: placeLongFormGuideCell(state.answerWidth, additionStep.column, String(additionStep.carryIn)),
  }];
}

function buildMultiplicationPartialRows(state: NonNullable<ReturnType<typeof getLongFormMultiplicationState>>, answerText: string, stepIndex: number): LongFormCell[][] {
  const width = state.answerWidth;
  const rows: LongFormCell[][] = [];
  const visibleRowCount = stepIndex >= state.partialProducts.length ? state.partialProducts.length : stepIndex + 1;
  const additionStep = state.additionSteps[stepIndex - state.partialProducts.length];

  for (let index = 0; index < visibleRowCount; index += 1) {
    const partial = state.partialProducts[index];
    if (index < stepIndex || stepIndex >= state.partialProducts.length) {
      rows.push(markActiveLongFormColumn(formatLongFormNumberToWidth(partial.value, width), additionStep?.column));
      continue;
    }

    const placeMultiplier = getMultiplicationPartialPlaceMultiplier(partial);
    const visibleValue = answerText === '?' ? getMultiplicationPartialPlaceholder(placeMultiplier) : String(Number(answerText) * placeMultiplier);
    rows.push(placeInputTextInLongFormCells(width, width - 1, visibleValue, true));
  }

  return rows;
}

function markActiveLongFormColumn(cells: LongFormCell[], activeColumn: number | undefined): LongFormCell[] {
  if (activeColumn == null) {
    return cells;
  }

  return cells.map((cell, index) => ({
    ...cell,
    isActive: cell.value !== '' && index === activeColumn,
  }));
}

function getMultiplicationPartialPlaceMultiplier(partial: { leftColumn: number; rightColumn: number }) {
  return 10 ** ((1 - partial.leftColumn) + (1 - partial.rightColumn));
}

function getMultiplicationPartialPlaceholder(placeMultiplier: number) {
  const zeroCount = Math.max(0, String(placeMultiplier).length - 1);
  return `${'?'}${'0'.repeat(zeroCount)}`;
}

function buildMultiplicationAnswerCells(problem: LongFormProblem, state: NonNullable<ReturnType<typeof getLongFormMultiplicationState>>, answerText: string, stepIndex: number): LongFormCell[] {
  const width = state.answerWidth;
  if (stepIndex < state.partialProducts.length) {
    return placeLongFormGuideCell(width, width - 1, '?').map((cell) => ({
      ...cell,
      isActive: false,
      isUnknown: cell.value === '?',
    }));
  }

  const completedDigits = String(problem.answer).padStart(width, ' ').split('');
  const activeColumn = state.additionSteps[stepIndex - state.partialProducts.length]?.column ?? 0;
  const currentAnswerText = answerText === '?' ? '?' : answerText;
  return Array.from({ length: width }, (_, index) => {
    if (index < activeColumn) {
      return { value: '' };
    }
    if (index === activeColumn) {
      return {
        value: currentAnswerText,
        isActive: true,
        isUnknown: currentAnswerText === '?',
      };
    }
    const value = completedDigits[index] === ' ' ? '' : completedDigits[index];
    return { value };
  });
}

function markLongFormBorrowedTensCell(problem: LongFormProblem, cells: LongFormCell[], width: number, stepIndex: number) {
  if (problem.operator !== '-' || stepIndex <= 0 || width < 2 || problem.left % 10 >= problem.right % 10) {
    return cells;
  }

  return cells.map((cell, index) => (
    index === width - 2
      ? { ...cell, isStruck: true }
      : cell
  ));
}

function getLongFormActivePlaceColumn(problem: LongFormProblem, width: number, stepIndex: number) {
  if (problem.operator !== '+' && problem.operator !== '-') {
    return undefined;
  }

  if (stepIndex <= 0) {
    return width - 1;
  }

  return width >= 2 ? width - 2 : undefined;
}

function buildLongFormAnswerCells(problem: LongFormProblem, answerText: string, width: number, stepIndex: number): LongFormCell[] {
  if (problem.operator !== '+' && problem.operator !== '-') {
    return formatLongFormNumber(answerText, { unknown: answerText === '?' });
  }

  if (stepIndex > 0) {
    const placeStep = getLongFormPlaceStep(problem);
    const onesDigit = placeStep ? placeStep.onesAnswer % 10 : 0;
    const placeAnswerText = answerText === '?' ? '?' : answerText;
    const answerPrefixCells = formatLongFormNumber(placeAnswerText, {
      active: true,
      unknown: answerText === '?',
    });
    const maxPrefixWidth = Math.max(1, width - 1);
    const trimmedPrefixCells = answerPrefixCells.slice(-maxPrefixWidth);
    return [
      ...Array.from({ length: Math.max(0, width - 1 - trimmedPrefixCells.length) }, () => ({ value: '' })),
      ...trimmedPrefixCells,
      { value: String(onesDigit) },
    ];
  }

  if (answerText !== '?') {
    return formatLongFormNumber(answerText);
  }

  if (stepIndex <= 0) {
    return placeLongFormGuideCell(width, width - 1, '?').map((cell) => ({
      ...cell,
      isActive: cell.value === '?',
      isUnknown: cell.value === '?',
    }));
  }

  return formatLongFormNumber(answerText, { unknown: answerText === '?' });
}

function buildDivisionLongFormRows(problem: LongFormProblem, answerText: string, stepIndex: number): LongFormRow[] {
  const state = getLongFormDivisionState(problem);
  if (state) {
    return buildStructuredDivisionLongFormRows(problem, state, answerText, stepIndex);
  }

  return [
    {
      id: 'division-question',
      cells: [
        ...formatLongFormNumber(problem.left),
        { value: '÷' },
        ...formatLongFormNumber(problem.right),
      ],
    },
    {
      id: 'division-answer',
      operatorLabel: '=',
      hasDivider: true,
      cells: formatLongFormNumber(answerText, { unknown: answerText === '?' }),
    },
  ];
}

function buildStructuredDivisionLongFormRows(problem: LongFormProblem, state: NonNullable<ReturnType<typeof getLongFormDivisionState>>, answerText: string, stepIndex: number): LongFormRow[] {
  const width = 2;
  const quotientCells = buildDivisionQuotientCells(problem, state, answerText, stepIndex);
  const dividendCells = markActiveLongFormColumn(formatLongFormNumberToWidth(problem.left, width), stepIndex <= 0 ? 0 : undefined);
  const rows: LongFormRow[] = [
    { id: 'division-quotient', cells: quotientCells },
    { id: 'division-dividend', operatorLabel: `${problem.right})`, hasTopDivider: true, isDivisionBar: true, cells: dividendCells },
  ];

  if (stepIndex >= 1) {
    rows.push({ id: 'division-first-product', operatorLabel: '-', hasDivider: true, cells: buildDivisionStepCells(width, 0, state.firstProduct, answerText, 1, stepIndex) });
  }

  if (stepIndex >= 2) {
    rows.push({ id: 'division-first-remainder', cells: buildDivisionFirstRemainderCells(state, answerText, stepIndex) });
  }

  if (stepIndex >= 4) {
    rows.push({ id: 'division-second-product', operatorLabel: '-', hasDivider: true, cells: buildDivisionStepCells(width, 1, state.secondProduct, answerText, 4, stepIndex) });
  }

  if (stepIndex >= 5) {
    rows.push({ id: 'division-final-remainder', cells: buildDivisionStepCells(width, 1, state.finalRemainder, answerText, 5, stepIndex) });
  }

  return rows;
}

function buildDivisionQuotientCells(problem: LongFormProblem, state: NonNullable<ReturnType<typeof getLongFormDivisionState>>, answerText: string, stepIndex: number): LongFormCell[] {
  if (stepIndex <= 0) {
    return placeInputTextInLongFormCells(2, 0, answerText, true);
  }

  if (stepIndex <= 3) {
    return [
      { value: String(state.quotientTens) },
      { value: stepIndex === 3 ? answerText : '', isActive: stepIndex === 3, isUnknown: stepIndex === 3 && answerText === '?' },
    ];
  }

  return formatLongFormNumberToWidth(problem.answer, 2);
}

function buildDivisionStepCells(width: number, endColumn: number, completedValue: number, answerText: string, activeStep: number, stepIndex: number): LongFormCell[] {
  if (stepIndex < activeStep) {
    return placeInputTextInLongFormCells(width, endColumn, '?', false);
  }

  if (stepIndex === activeStep) {
    return placeInputTextInLongFormCells(width, endColumn, answerText, true);
  }

  return placeInputTextInLongFormCells(width, endColumn, String(completedValue), false);
}

function buildDivisionFirstRemainderCells(state: NonNullable<ReturnType<typeof getLongFormDivisionState>>, answerText: string, stepIndex: number): LongFormCell[] {
  if (stepIndex < 2) {
    return placeInputTextInLongFormCells(2, 0, '?', false);
  }

  if (stepIndex === 2) {
    return placeInputTextInLongFormCells(2, 0, answerText, true);
  }

  return [
    { value: String(state.firstRemainder) },
    { value: String(state.dividendOnes) },
  ];
}

function buildPlaceValueGuideRows(problem: LongFormProblem, width: number): LongFormRow[] {
  if (problem.operator === '+') {
    const onesSum = problem.left % 10 + problem.right % 10;
    if (onesSum >= 10 && width >= 2) {
      return [{ id: 'carry', isGuide: true, cells: placeLongFormGuideCell(width, width - 2, '1') }];
    }
    return [];
  }

  if (problem.operator === '-') {
    const needsBorrow = problem.left >= 10 && problem.left % 10 < problem.right % 10;
    if (needsBorrow && width >= 2) {
      const tensAfterBorrow = Math.floor(problem.left / 10) - 1;
      return [{ id: 'borrow', isGuide: true, cells: placeLongFormGuideCell(width, width - 2, String(tensAfterBorrow)) }];
    }
  }

  return [];
}

function formatLongFormNumber(value: number | string, options: { active?: boolean; unknown?: boolean } = {}): LongFormCell[] {
  return Array.from(String(value)).map((digit) => ({
    value: digit,
    isActive: options.active,
    isUnknown: options.unknown || digit === '?',
  }));
}

function formatLongFormNumberToWidth(value: number | string, width: number, options: { active?: boolean; unknown?: boolean } = {}): LongFormCell[] {
  return padLongFormCells(formatLongFormNumber(value, options), width);
}

function placeInputTextInLongFormCells(width: number, endColumn: number, value: string, active: boolean): LongFormCell[] {
  const text = value || '?';
  const digits = Array.from(text);
  const cells: LongFormCell[] = Array.from({ length: width }, () => ({ value: '' }));
  const firstColumn = Math.max(0, endColumn - digits.length + 1);

  digits.forEach((digit, index) => {
    const column = firstColumn + index;
    if (column > endColumn || column >= width) {
      return;
    }
    cells[column] = {
      value: digit,
      isActive: active,
      isUnknown: digit === '?',
    };
  });

  return cells;
}

function formatLongFormPlaceNumber(value: number | string, width: number, activeColumn: number): LongFormCell[] {
  const digits = Array.from(String(value));
  const leadingBlankCount = Math.max(0, width - digits.length);
  return Array.from({ length: width }, (_, cellIndex) => {
    const digitIndex = cellIndex - leadingBlankCount;
    const digit = digitIndex >= 0 ? digits[digitIndex] : '';
    return {
      value: digit,
      isActive: digit !== '' && cellIndex === activeColumn,
    };
  });
}

function padLongFormCells(cells: LongFormCell[], width: number): LongFormCell[] {
  if (cells.length >= width) {
    return cells;
  }

  return [
    ...Array.from({ length: width - cells.length }, () => ({ value: '' })),
    ...cells,
  ];
}

function placeLongFormGuideCell(width: number, index: number, value: string): LongFormCell[] {
  return Array.from({ length: width }, (_, cellIndex) => ({
    value: cellIndex === index ? value : '',
    isActive: cellIndex === index,
  }));
}

function KukuAnswerPad({
  state,
  canSubmit,
  longFormProblem,
  longFormStepIndex,
  longFormQuestionTransition,
  longFormFeedbackTick,
  input,
  onDigit,
  onDelete,
  onSubmit,
}: {
  state: 'input' | 'wrong' | 'running';
  canSubmit: boolean;
  longFormProblem?: LongFormProblem;
  longFormStepIndex: number;
  longFormQuestionTransition: number;
  longFormFeedbackTick: number;
  input: string;
  onDigit: (digit: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
}) {
  return (
    <View style={[styles.kukuAnswerPad, longFormProblem && styles.kukuAnswerPadWithLongForm, state === 'wrong' && styles.kukuAnswerPadWrong, state === 'running' && styles.kukuAnswerPadRunning]} testID="kuku-keypad">
      {longFormProblem ? (
        <View pointerEvents="none" style={styles.kukuPadLongFormArea}>
          <LongFormGoalTitle
            problem={longFormProblem}
            input={input}
            stepIndex={longFormStepIndex}
            transition={longFormQuestionTransition}
            isWrong={state === 'wrong'}
            feedbackTick={longFormFeedbackTick}
            maxWidth={280}
          />
        </View>
      ) : null}
      <View style={styles.kukuKeyGrid}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <KukuKey key={digit} label={digit} disabled={state !== 'input'} onPress={() => onDigit(digit)} />
        ))}
        <KukuKey label="delete" disabled={state !== 'input'} onPress={onDelete} />
        <KukuKey label="0" disabled={state !== 'input'} onPress={() => onDigit('0')} />
        <KukuKey label="submit" testIDLabel="submit" accent disabled={!canSubmit} onPress={onSubmit} />
      </View>
    </View>
  );
}

function KukuKey({ label, testIDLabel = label, accent = false, disabled = false, onPress }: { label: string; testIDLabel?: string; accent?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      testID={`kuku-key-${testIDLabel}`}
      onPress={onPress}
      style={({ pressed }) => [styles.kukuKey, accent && styles.kukuKeyAccent, disabled && styles.kukuKeyDisabled, pressed && styles.pressedButton]}
    >
      {label === 'delete' ? (
        <Text>⌫</Text>
      ) : label === 'submit' ? (
        <Text>↵</Text>
      ) : (
        <Text style={styles.kukuKeyText}>{label}</Text>
      )}
    </Pressable>
  );
}

function HeaderGoalParts({ target, maxWidth }: { target: number; maxWidth: number }) {
  const parts = useMemo(() => getGoalParts(target), [target]);
  const visibleParts = parts.slice(0, 5);
  const overflowCount = Math.max(0, parts.length - visibleParts.length);
  const beadSize = Math.max(22, Math.min(30, Math.floor((maxWidth - overflowCount * 24) / Math.max(visibleParts.length, 1)) - 5));

  return (
    <View pointerEvents="none" testID="stage-goal-parts" style={styles.headerGoalParts}>
      {visibleParts.map((part, index) => (
        <MiniGoalBead key={`header-goal-${part.value}-${part.count}-${index}`} part={part} size={beadSize} />
      ))}
      {overflowCount > 0 ? (
        <View style={styles.headerGoalOverflow}>
          <Text style={styles.headerGoalOverflowText}>+{overflowCount}</Text>
        </View>
      ) : null}
    </View>
  );
}

function MiniGoalBead({ part, size }: { part: GoalPart; size: number }) {
  const isGroup = part.value === 1 && part.count > 1;
  const palette = getSignedPalette(getBeadKind(part.value), part.sign);
  const dotCount = isGroup ? Math.min(part.count, 6) : 0;
  const dots = Array.from({ length: dotCount }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(dotCount, 1);
    const radius = size * 0.18;
    return {
      left: size / 2 + Math.cos(angle) * radius - size * 0.12,
      top: size / 2 + Math.sin(angle) * radius - size * 0.12,
    };
  });

  return (
    <View
      testID="stage-goal-bead"
      style={[
        styles.headerGoalBead,
        isGroup && styles.headerGoalGroupBead,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isGroup ? 'rgba(215, 246, 255, 0.44)' : getTranslucentBeadColor(part.value, palette.color),
          borderColor: isGroup ? '#8ED8EF' : palette.rimColor,
        },
      ]}
    >
      <View style={styles.headerGoalBeadGlass} />
      <View style={[styles.headerGoalBeadShine, { width: size * 0.28, height: size * 0.2, borderRadius: size * 0.14 }]} />
      {isGroup
        ? dots.map((dot, index) => (
            <View
              key={`mini-dot-${index}`}
              style={[
                styles.headerGoalContainedDot,
                {
                  left: dot.left,
                  top: dot.top,
                  width: size * 0.24,
                  height: size * 0.24,
                  borderRadius: size * 0.12,
                },
              ]}
            />
          ))
        : null}
      {isGroup ? (
        <View style={styles.headerGoalBadge}>
          <Text style={styles.headerGoalBadgeText}>{part.count}</Text>
        </View>
      ) : null}
    </View>
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
  isFocused = false,
  isAlmostMerge = false,
}: {
  value: PlaceValue;
  count: number;
  sign: BeadSign;
  role?: BeadRole;
  x: number;
  y: number;
  isPreview?: boolean;
  isFocused?: boolean;
  isAlmostMerge?: boolean;
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
        isFocused && styles.focusedBead,
        isAlmostMerge && styles.almostMergeBead,
        isGroupBubble && styles.groupBubble,
        role === 'product' && styles.productBubble,
        role === 'multiplicand' && styles.multiplicandBubble,
        role === 'division' && styles.divisionBubble,
        {
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          backgroundColor: isGroupBubble ? (sign < 0 ? 'rgba(75, 91, 119, 0.3)' : 'rgba(215, 246, 255, 0.36)') : getTranslucentBeadColor(value, palette.color),
          borderColor: isGroupBubble ? (sign < 0 ? '#51627D' : '#8ED8EF') : palette.rimColor,
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
                  backgroundColor: getTranslucentBeadColor(bead.value, beadPalette.color),
                  borderColor: beadPalette.rimColor,
                },
              ]}
            >
            </View>
            );
          })}
          {count > 1 ? <BubbleNumberBadge count={count} sign={sign} /> : null}
        </>
      ) : (
        <>
          <View style={styles.beadInnerGlass} />
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
  const particles = Array.from({ length: MERGE_POP_PARTICLE_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / 10;
    const distance = nextKind.radius + 22 + (index % 2) * 8;
    const size = index % 3 === 0 ? 9 : 6;
    return {
      id: `merge-pop-${index}`,
      left: animation.center.x + Math.cos(angle) * distance - size / 2,
      top: animation.center.y + Math.sin(angle) * distance - size / 2,
      size,
      opacity: index % 2 === 0 ? 0.78 : 0.52,
    };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.mergeSettleGlow,
          {
            left: animation.center.x - nextKind.radius - 12,
            top: animation.center.y - nextKind.radius - 12,
            width: (nextKind.radius + 12) * 2,
            height: (nextKind.radius + 12) * 2,
            borderRadius: nextKind.radius + 12,
            borderColor: nextKind.rimColor,
          },
        ]}
      />
      <View
        style={[
          styles.mergePulse,
          {
            left: animation.center.x - nextKind.radius - 20,
            top: animation.center.y - nextKind.radius - 20,
            width: (nextKind.radius + 20) * 2,
            height: (nextKind.radius + 20) * 2,
            borderRadius: nextKind.radius + 20,
            borderColor: nextKind.rimColor,
            backgroundColor: nextKind.shineColor,
          },
          ]}
      />
      <View
        style={[
          styles.mergeSettleCore,
          {
            left: animation.center.x - nextKind.radius * 0.54,
            top: animation.center.y - nextKind.radius * 0.54,
            width: nextKind.radius * 1.08,
            height: nextKind.radius * 1.08,
            borderRadius: nextKind.radius,
            backgroundColor: nextKind.shineColor,
          },
        ]}
      />
      {particles.map((particle) => (
        <View
          key={particle.id}
          style={[
            styles.mergePopParticle,
            {
              left: particle.left,
              top: particle.top,
              width: particle.size,
              height: particle.size,
              borderRadius: particle.size / 2,
              opacity: particle.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

function FailedWaterOverlay({ progress }: { progress: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.failedWaterOverlay, { opacity: progress }]}>
      <View style={[styles.failedSiltCloud, styles.failedSiltCloudLeft]} />
      <View style={[styles.failedSiltCloud, styles.failedSiltCloudCenter]} />
      <View style={[styles.failedSiltCloud, styles.failedSiltCloudRight]} />
      <View style={[styles.failedDeflatedBubble, styles.failedDeflatedBubbleOne]} />
      <View style={[styles.failedDeflatedBubble, styles.failedDeflatedBubbleTwo]} />
      <View style={[styles.failedDeflatedBubble, styles.failedDeflatedBubbleThree]} />
    </View>
  );
}

function MultiplicationExpansionOverlay({ animation }: { animation: MultiplicationExpansionAnimation }) {
  const age = Date.now() - animation.startedAt;
  const settleProgress = clamp(age / MULTIPLICATION_EXPANSION_HOLD_MS, 0, 1);
  const scale = 0.92 + settleProgress * 0.08;
  const opacity = clamp(age / 180, 0, 1) * (1 - clamp((age - MULTIPLICATION_EXPANSION_HOLD_MS + 220) / 220, 0, 0.18));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {animation.groups.map((group, index) => (
        <View
          key={`${animation.id}-${index}`}
          style={[
            styles.multiplicationExpansionBubble,
            {
              left: group.x,
              top: group.y,
              opacity,
              transform: [{ scale }],
            },
          ]}
        >
          <BeadView value={1} count={group.count} sign={group.sign} x={0} y={0} role="product" isPreview />
        </View>
      ))}
    </View>
  );
}

function BubbleBurst({ animation }: { animation: BubbleBurstAnimation }) {
  const progress = clamp((Date.now() - animation.startedAt) / BUBBLE_BURST_ANIMATION_MS, 0, 1);
  const fade = 1 - progress;
  const ringRadius = animation.radius + 3 + progress * 8;
  const innerRingRadius = animation.radius * 0.58 + progress * 4;
  const isNegative = animation.sign < 0;
  const drops = Array.from({ length: BUBBLE_BURST_DROP_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / BUBBLE_BURST_DROP_COUNT;
    const distance = animation.radius + 7 + progress * (10 + (index % 3) * 3);
    const size = 4 + (index % 3);
    return {
      id: `drop-${index}`,
      left: animation.x + Math.cos(angle) * distance - size / 2,
      top: animation.y + Math.sin(angle) * distance - size / 2,
      size,
      opacity: fade * (index % 2 === 0 ? 0.58 : 0.34),
    };
  });
  const shards = Array.from({ length: BUBBLE_BURST_SHARD_COUNT }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * (index + 0.35)) / BUBBLE_BURST_SHARD_COUNT;
    const distance = animation.radius * 0.72 + progress * 10;
    return {
      id: `shard-${index}`,
      left: animation.x + Math.cos(angle) * distance - 7,
      top: animation.y + Math.sin(angle) * distance - 2,
      rotate: `${angle + Math.PI / 2}rad`,
      opacity: fade * 0.42,
    };
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={[
          styles.bubbleBurstRing,
          isNegative && styles.bubbleBurstRingNegative,
          {
            left: animation.x - ringRadius,
            top: animation.y - ringRadius,
            width: ringRadius * 2,
            height: ringRadius * 2,
            borderRadius: ringRadius,
            opacity: fade * 0.62,
          },
        ]}
      />
      <View
        style={[
          styles.bubbleBurstInnerRing,
          {
            left: animation.x - innerRingRadius,
            top: animation.y - innerRingRadius,
            width: innerRingRadius * 2,
            height: innerRingRadius * 2,
            borderRadius: innerRingRadius,
            opacity: fade * 0.42,
          },
        ]}
      />
      {drops.map((drop) => (
        <View
          key={drop.id}
          style={[
            styles.bubbleBurstDrop,
            isNegative && styles.bubbleBurstDropNegative,
            {
              left: drop.left,
              top: drop.top,
              width: drop.size,
              height: drop.size,
              borderRadius: drop.size / 2,
              opacity: drop.opacity,
            },
          ]}
        />
      ))}
      {shards.map((shard) => (
        <View
          key={shard.id}
          style={[
            styles.bubbleBurstShard,
            {
              left: shard.left,
              top: shard.top,
              opacity: shard.opacity,
              transform: [{ rotate: shard.rotate }],
            },
          ]}
        />
      ))}
    </View>
  );
}

function ClearSplash() {
  const splashes = [
    { left: 44, top: 122, size: 18 },
    { left: 94, top: 92, size: 9 },
    { right: 76, top: 98, size: 16 },
    { right: 38, top: 148, size: 10 },
    { left: 142, top: 176, size: 7 },
    { right: 154, top: 182, size: 8 },
  ];
  const sparkles = [
    { left: 118, top: 136, size: 22 },
    { right: 116, top: 132, size: 18 },
    { left: 0, right: 0, top: 82, size: 15 },
  ];

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.clearCelebrationLayer]}>
      {splashes.map((splash, index) => (
        <View
          key={`clear-splash-${index}`}
          style={[
            styles.clearSplashDrop,
            {
              left: splash.left,
              right: splash.right,
              top: splash.top,
              width: splash.size,
              height: splash.size,
              borderRadius: splash.size / 2,
            },
          ]}
        />
      ))}
      {sparkles.map((sparkle, index) => (
        <Text
          key={`clear-sparkle-${index}`}
          style={[
            styles.clearSparkle,
            {
              left: sparkle.left,
              right: sparkle.right,
              top: sparkle.top,
              fontSize: sparkle.size,
              textAlign: sparkle.left === 0 && sparkle.right === 0 ? 'center' : undefined,
            },
          ]}
        >
          ✦
        </Text>
      ))}
    </View>
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

function DivisionFailedOverlay({ animation, tick }: { animation: DivisionFailedAnimation; tick: number }) {
  const age = tick - animation.startedAt;
  const progress = clamp(age / DIVISION_FAILED_ANIMATION_MS, 0, 1);
  const showProgress = clamp(progress / 0.34, 0, 1);
  const rejectProgress = clamp((progress - 0.46) / 0.42, 0, 1);
  const fade = 1 - clamp((progress - 0.72) / 0.28, 0, 1);
  const wobble = Math.sin(progress * Math.PI * 8) * (1 - rejectProgress) * 5;
  const ringRadius = 22;
  const spread = Math.min(82, Math.max(48, animation.divisor * 12));
  const quotient = Math.max(1, animation.quotient);
  const remainder = Math.max(1, animation.remainder);

  const slots = Array.from({ length: Math.min(animation.divisor, 8) }, (_, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(Math.min(animation.divisor, 8), 1);
    const targetX = animation.center.x + Math.cos(angle) * spread;
    const targetY = animation.center.y + Math.sin(angle) * spread * 0.58;
    return {
      id: `failed-slot-${index}`,
      x: animation.center.x + (targetX - animation.center.x) * showProgress + wobble,
      y: animation.center.y + (targetY - animation.center.y) * showProgress,
    };
  });

  const remainderX = animation.center.x + spread * 0.72 + rejectProgress * 22;
  const remainderY = animation.center.y + spread * 0.52 + rejectProgress * 8;

  return (
    <View pointerEvents="none" testID="division-failed-overlay" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
      {slots.map((slot) => (
        <View
          key={slot.id}
          style={[
            styles.divisionFailedSlot,
            {
              left: slot.x - ringRadius,
              top: slot.y - ringRadius,
              width: ringRadius * 2,
              height: ringRadius * 2,
              borderRadius: ringRadius,
              transform: [{ scale: 0.86 + showProgress * 0.14 }],
            },
          ]}
        >
          {animation.quotient > 0 ? <BeadView value={1} count={quotient} sign={animation.sign} role="division" x={ringRadius} y={ringRadius} isPreview /> : null}
        </View>
      ))}
      <View
        style={[
          styles.divisionFailedRemainder,
          {
            left: remainderX - ringRadius,
            top: remainderY - ringRadius,
            width: ringRadius * 2,
            height: ringRadius * 2,
            borderRadius: ringRadius,
            transform: [{ scale: 1 + rejectProgress * 0.08 }],
          },
        ]}
      >
        <BeadView value={1} count={remainder} sign={animation.sign} x={ringRadius} y={ringRadius} isPreview />
      </View>
    </View>
  );
}

function OperatorRail({
  selectedOperator,
  operatorSign,
  operatorUsage,
  hasInputValue,
  hasActiveSelection,
  isLocked,
  onSelect,
}: {
  selectedOperator: OperatorSymbol;
  operatorSign: BeadSign;
  operatorUsage: OperatorUsageLimits;
  hasInputValue: boolean;
  hasActiveSelection: boolean;
  isLocked: boolean;
  onSelect: (operator: OperatorButtonSymbol) => void;
}) {
  return (
    <View style={styles.operatorRail}>
      {OPERATORS.map((operator) => {
        const usage = operatorUsage[operator];
        const isUsable = canUseOperator(usage);
        const isMainSelected = hasActiveSelection && isUsable && operator === selectedOperator;
        const isSignSelected = hasActiveSelection && isUsable && operator === '-' && operatorSign < 0 && (selectedOperator === '×' || selectedOperator === '÷');
        const isSelected = isMainSelected || isSignSelected;
        const isDisabled = !hasInputValue || isLocked || !isUsable;
        return (
          <Pressable
            key={operator}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected, disabled: isDisabled }}
            disabled={isDisabled}
            testID={`operator-${operator}`}
            onPress={() => onSelect(operator)}
            style={({ pressed }) => [
              styles.operatorButton,
              isMainSelected && styles.selectedOperatorButton,
              isSignSelected && styles.selectedSignOperatorButton,
              isDisabled && styles.disabledOperatorButton,
              pressed && styles.pressedButton,
            ]}
          >
            <View style={[styles.operatorIconWrap, isDisabled && styles.disabledOperatorIconWrap]}>
              <OperatorImageIcon operator={operator} size={28} />
            </View>
            {typeof usage === 'number' && usage > 0 ? (
              <View testID={`operator-${operator}-usage`} style={styles.operatorUsageBadge}>
                <Text style={styles.operatorUsageBadgeText}>{usage}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function getInitialOperatorUsage(stage: Stage, mode: 'stage' | 'launch'): OperatorUsageLimits {
  const base: OperatorUsageLimits = getDefaultOperatorUsage(stage, mode);

  return {
    ...base,
    ...stage.operatorLimits,
  };
}

function getDefaultOperatorUsage(stage: Stage, mode: 'stage' | 'launch'): OperatorUsageLimits {
  if (mode === 'launch' || stage.islandId === 'addition') {
    return { '+': 'infinite', '-': 0, '×': 0, '÷': 0 };
  }
  if (stage.islandId === 'subtraction') {
    return { '+': 'infinite', '-': 'infinite', '×': 0, '÷': 0 };
  }
  if (stage.islandId === 'mixed3Free' || stage.islandId === 'mixed4Free' || stage.islandId === 'mixed5Free') {
    return { '+': 'infinite', '-': 'infinite', '×': 'infinite', '÷': 'infinite' };
  }
  return { '+': 0, '-': 0, '×': 0, '÷': 0 };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createDentakuPracticeStage(practice: DentakuPractice): Stage {
  const operatorLimits: Partial<OperatorUsageLimits> = {
    '+': practice.operators.includes('+') || (practice.longFormMode && practice.operators.includes('-')) ? 'infinite' : 0,
    '-': practice.operators.includes('-') ? 'infinite' : 0,
    '×': practice.operators.includes('×') ? 'infinite' : 0,
    '÷': practice.operators.includes('÷') ? 'infinite' : 0,
  };

  return {
    id: `dentaku-practice-${practice.questionKey}`,
    title: practice.prompt.replace(' = ?', ''),
    target: practice.answer,
    allowedValues: [1],
    islandId: 'multiplication',
    islandTitle: 'dentaku',
    setTitle: 'dentaku',
    bubbleCounts: practice.operands,
    operatorLimits,
  };
}

function getInitialSelectedOperator(_operatorUsage: OperatorUsageLimits): OperatorButtonSymbol {
  return '+';
}

function canUseOperator(usage: OperatorUsageLimit) {
  return usage === 'infinite' || usage > 0;
}

function hasExpressionValue(tokens: string[]) {
  return stripExpressionResult(tokens).some((token) => !isOperatorToken(token));
}

function getOperatorButtonLabel(operator: OperatorButtonSymbol) {
  if (operator === '+') {
    return 'たす';
  }
  if (operator === '-') {
    return 'ひく';
  }
  if (operator === '×') {
    return 'かける';
  }
  if (operator === '÷') {
    return 'わる';
  }
  return 'こたえ';
}

function getOperatorHelpMessage(operator: OperatorButtonSymbol, sign: BeadSign) {
  if (operator === '+') {
    return 'まるを ふやすよ';
  }
  if (operator === '-') {
    return 'まるを へらすよ';
  }
  if (operator === '×') {
    return sign < 0 ? 'まとまりを マイナスで ふやすよ' : 'まとまりを ふやすよ';
  }
  return sign < 0 ? 'まとまりを マイナスで わるよ' : 'まとまりを わるよ';
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
        {tokens.length > 0 ? tokens.join(' ') : ''}
      </Text>
    </View>
  );
}

function BackgroundBubbleLayer({
  bubbles,
  fieldWidth,
  fieldHeight,
  tick,
  bubbleStarts,
  onPop,
}: {
  bubbles: BackgroundBubbleSpec[];
  fieldWidth: number;
  fieldHeight: number;
  tick: number;
  bubbleStarts: Record<string, number>;
  onPop: (bubbleId: string) => void;
}) {
  return (
    <View pointerEvents="box-none" style={styles.backgroundBubbleLayer}>
      {bubbles.map((bubble) => {
        const startAt = bubbleStarts[bubble.id] ?? 0;
        const elapsedSeconds = Math.max(0, (tick - startAt - bubble.delay) / 1000);
        const travel = fieldHeight + bubble.size * 3;
        const cycle = (elapsedSeconds * bubble.speed) % travel;
        const y = fieldHeight + bubble.size - cycle;
        const drift = Math.sin(elapsedSeconds * 0.62 + bubble.delay * 0.001) * bubble.drift;
        const x = bubble.xRatio * fieldWidth + drift - bubble.size / 2;
        const opacity = elapsedSeconds < 0.24 ? elapsedSeconds / 0.24 : 1;

        return (
          <Pressable
            key={bubble.id}
            accessibilityLabel="decorative bubble"
            accessibilityRole="button"
            testID={`background-bubble-${bubble.id}`}
            onPress={() => onPop(bubble.id)}
            style={({ pressed }) => [
              styles.backgroundBubble,
              pressed && styles.backgroundBubblePressed,
              {
                left: x,
                top: y,
                width: bubble.size,
                height: bubble.size,
                borderRadius: bubble.size / 2,
                opacity: opacity * 0.78,
              },
            ]}
          />
        );
      })}
    </View>
  );
}

function ClearBubbleFireworks({ fieldWidth, fieldHeight, tick }: { fieldWidth: number; fieldHeight: number; tick: number }) {
  const cycle = 2600;
  const baseTime = tick % cycle;
  const burstSpecs = [
    { x: fieldWidth * 0.5, y: fieldHeight * 0.42, delay: 0, count: 10, spread: 92 },
    { x: fieldWidth * 0.28, y: fieldHeight * 0.5, delay: 460, count: 8, spread: 72 },
    { x: fieldWidth * 0.72, y: fieldHeight * 0.46, delay: 920, count: 8, spread: 78 },
  ];
  const colors = [
    'rgba(14, 165, 233, 0.88)',
    'rgba(6, 182, 212, 0.84)',
    'rgba(34, 197, 94, 0.78)',
    'rgba(234, 179, 8, 0.76)',
    'rgba(236, 72, 153, 0.76)',
  ];
  const bubbles = burstSpecs.flatMap((burst, burstIndex) => {
    const age = (baseTime - burst.delay + cycle) % cycle;
    const progress = Math.min(age / 900, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const opacity = progress >= 1 ? 0 : Math.max(0, 1 - progress) * 1;

    return Array.from({ length: burst.count }, (_, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / burst.count;
      const ripple = 0.78 + (index % 5) * 0.08;
      const distance = burst.spread * ease * ripple;
      const size = 7 + (index % 4) * 3 + (1 - progress) * 3;
      const rise = progress * (18 + (index % 6) * 5);
      return {
        id: `clear-firework-${burstIndex}-${index}`,
        x: burst.x + Math.cos(angle) * distance - size / 2,
        y: burst.y + Math.sin(angle) * distance - rise - size / 2,
        size,
        opacity,
        color: colors[(burstIndex + index) % colors.length],
      };
    });
  });
  const starfish = burstSpecs.slice(0, 3).map((burst, index) => {
    const age = (baseTime - burst.delay - 160 + cycle) % cycle;
    const progress = Math.min(age / 1200, 1);
    const opacity = progress >= 1 ? 0 : Math.max(0, 1 - progress) * 0.78;
    const drift = 26 + index * 18;
    return {
      id: `clear-starfish-${index}`,
      x: burst.x + Math.cos(index * 2.1) * drift,
      y: burst.y + Math.sin(index * 1.7) * drift - progress * 34,
      rotate: -16 + index * 18,
      opacity,
    };
  });

  return (
    <View pointerEvents="none" style={styles.clearFireworkLayer}>
      {bubbles.map((bubble) => (
        <View
          key={bubble.id}
          style={[
            styles.clearFireworkBubble,
            {
              left: bubble.x,
              top: bubble.y,
              width: bubble.size,
              height: bubble.size,
              borderRadius: bubble.size / 2,
              opacity: bubble.opacity,
              backgroundColor: bubble.color,
            },
          ]}
        />
      ))}
      {starfish.map((item) => (
        <RoundedStarfish
          key={item.id}
          size={22}
          style={[
            styles.clearFireworkStarfish,
            {
              left: item.x,
              top: item.y,
              opacity: item.opacity,
              transform: [{ rotate: `${item.rotate}deg` }],
            },
          ]}
        />
      ))}
    </View>
  );
}

function DraggableBubbleView({
  bubble,
  sign,
  isMultiplier,
  isDivider,
  isHinting,
  onBurst,
  onMove,
}: {
  bubble: PendingBubble;
  sign: BeadSign;
  isMultiplier: boolean;
  isDivider: boolean;
  isHinting: boolean;
  onBurst: (bubble: PendingBubble) => void;
  onMove: (bubbleId: string, x: number, y: number) => void;
}) {
  const startPositionRef = useRef({ x: bubble.x, y: bubble.y });
  const isOperatorBubble = isMultiplier || isDivider;
  const radius = isOperatorBubble ? getMultiplierClusterRadius(bubble.count) : getEntityRadius(1, bubble.count);
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          startPositionRef.current = { x: bubble.x, y: bubble.y };
        },
        onPanResponderMove: (_event, gesture) => {
          onMove(bubble.id, startPositionRef.current.x + gesture.dx, startPositionRef.current.y + gesture.dy);
        },
        onPanResponderRelease: () => {
          onBurst(bubble);
        },
      }),
    [bubble, onBurst, onMove],
  );

  return (
    <View
      accessibilityRole="button"
      accessibilityLabel={`${isDivider ? 'divide' : isMultiplier ? 'multiply' : 'bubble'}-${bubble.count}`}
      testID={`pending-bubble-${bubble.count}-${bubble.id}`}
      hitSlop={16}
      style={[
        styles.pendingBubbleButton,
        isOperatorBubble && styles.multiplierBubbleButton,
        {
          left: bubble.x - radius,
          top: bubble.y - radius,
          width: radius * 2,
          height: radius * 2,
          borderRadius: radius,
          transform: getPendingBubbleTransform(isOperatorBubble, isHinting),
        },
      ]}
      {...panResponder.panHandlers}
    >
      {isHinting ? <View pointerEvents="none" testID="pending-bubble-hint" style={styles.pendingBubbleHintRing} /> : null}
      {isOperatorBubble ? (
        <OperatorBubbleCluster count={bubble.count} sign={sign} radius={radius} operator={isDivider ? '÷' : '×'} />
      ) : (
        <BeadView value={1} count={bubble.count} sign={sign} x={radius} y={radius} isPreview />
      )}
    </View>
  );
}

function getPendingBubbleTransform(isOperatorBubble: boolean, isHinting: boolean) {
  const scale = isHinting ? 1.035 : 1;
  if (isOperatorBubble) {
    return [{ rotate: '-10deg' }, { scaleY: 0.92 }, { scale }];
  }
  return [{ scale }];
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
  isDragging,
  isAlmostMerge,
  onTap,
}: {
  bead: BeadSnapshot;
  onMove: (beadId: string, x: number, y: number) => void;
  onDragStart: (beadId: string) => void;
  onDragEnd: (beadId: string) => void;
  isDragging: boolean;
  isAlmostMerge: boolean;
  onTap?: () => void;
}) {
  const startPositionRef = useRef({ x: bead.x, y: bead.y });
  const hasDraggedRef = useRef(false);
  const radius = getEntityRadius(bead.value, bead.count);
  const hitSize = Math.max(radius * 2 + 24, MIN_TOUCH_TARGET_SIZE);
  const beadOffset = hitSize / 2;
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
          if (Math.hypot(gesture.dx, gesture.dy) > TAP_DRIFT_TO_BURST_THRESHOLD) {
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
          left: bead.x - hitSize / 2,
          top: bead.y - hitSize / 2,
          width: hitSize,
          height: hitSize,
          borderRadius: hitSize / 2,
          zIndex: isDragging ? 40 : getBeadLayerZIndex(bead.value),
        },
      ]}
      {...panResponder.panHandlers}
    >
      <BeadView
        value={bead.value}
        count={bead.count}
        sign={bead.sign}
        role={bead.role}
        x={beadOffset}
        y={beadOffset}
        isFocused={isDragging}
        isAlmostMerge={isAlmostMerge}
      />
    </View>
  );
}

function StageResultOverlay({
  equation,
  result,
  onRetry,
  onStageSelect,
  onNextStage,
}: {
  equation: string;
  result: 'clear' | 'failed';
  onRetry: () => void;
  onStageSelect?: () => void;
  onNextStage?: () => void;
}) {
  const isClearResult = result === 'clear';
  const equationFontSize = getResultEquationFontSize(equation);

  return (
    <View style={[styles.resultPanel, !isClearResult && styles.resultPanelFailed]}>
      <View style={styles.resultMain}>
        {isClearResult ? <ResultStar /> : <BrokenResultStar />}
        <Text
          accessibilityLabel={isClearResult ? 'clear equation' : 'failed equation'}
          style={[
            styles.resultEquation,
            { fontSize: equationFontSize, lineHeight: Math.round(equationFontSize * 1.2) },
            !isClearResult && styles.failedEquation,
          ]}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.32}
          ellipsizeMode="clip"
        >
          {equation}
        </Text>
      </View>
      <View style={[styles.resultActions, !isClearResult && styles.resultActionsFailed]}>
        <ResultActionButton accessibilityLabel={isClearResult ? 'Next stage' : 'Retry'} primary onPress={isClearResult && onNextStage ? onNextStage : onRetry}>
          <NavImageIcon kind={isClearResult ? 'next' : 'retry'} size={36} />
        </ResultActionButton>
      </View>
    </View>
  );
}

function getResultEquationFontSize(equation: string) {
  if (equation.length > 44) {
    return 18;
  }
  if (equation.length > 34) {
    return 21;
  }
  if (equation.length > 26) {
    return 25;
  }
  return 34;
}

function ResultStar() {
  return (
    <View accessibilityLabel="clear starfish" style={styles.resultStar}>
      <RoundedStarfish size={58} />
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

function BrokenResultStar() {
  return (
    <View accessibilityLabel="broken medal" style={styles.brokenMedal}>
      <View style={[styles.brokenMedalHalf, styles.brokenMedalLeft]}>
        <View style={[styles.brokenMedalFace, styles.brokenMedalFaceLeft]}>
          <Text style={styles.brokenMedalStar}>★</Text>
        </View>
      </View>
      <View style={[styles.brokenMedalHalf, styles.brokenMedalRight]}>
        <View style={[styles.brokenMedalFace, styles.brokenMedalFaceRight]}>
          <Text style={styles.brokenMedalStar}>★</Text>
        </View>
      </View>
      <View style={styles.brokenMedalGapTop} />
      <View style={styles.brokenMedalGapBottom} />
    </View>
  );
}

function ResultActionButton({
  accessibilityLabel,
  children,
  onPress,
  primary = false,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.resultActionButton, primary && styles.resultActionButtonPrimary, pressed && styles.pressedButton]}
    >
      {children}
    </Pressable>
  );
}

function formatResultExpression(tokens: string[], target: number) {
  const expressionTokens = stripExpressionResult(tokens);
  const meaningfulTokens = isOperatorToken(expressionTokens[expressionTokens.length - 1])
    ? expressionTokens.slice(0, -1)
    : expressionTokens;

  if (meaningfulTokens.length === 0) {
    return String(target);
  }

  return meaningfulTokens.join(' ');
}

function toSnapshots(entities: BeadEntity[], bounds?: { width: number; height: number }): BeadSnapshot[] {
  return entities.map((entity) => {
    const x = bounds ? clampEntityX(entity, bounds.width) : entity.body.position.x;
    return {
      id: entity.id,
      value: entity.value,
      count: entity.count,
      sign: entity.sign,
      role: entity.role,
      x,
      y: bounds ? clampEntityY(entity, bounds.width, bounds.height, x) : entity.body.position.y,
    };
  });
}

function canBurstBead(bead: BeadSnapshot) {
  return isBurstableWrappedGroup(bead);
}

function isBurstableWrappedGroup(bead: Pick<BeadSnapshot, 'value' | 'count' | 'role'>) {
  return bead.value === 1 && bead.count > 1;
}

function findAutoBurstFieldBubble(entities: BeadEntity[], fieldWidth: number, fieldHeight: number) {
  return entities
    .filter((entity) => {
      if (!isBurstableWrappedGroup(entity) || entity.role === 'multiplicand') {
        return false;
      }

      const radius = getEntityRadius(entity.value, entity.count);
      const bottomY = getBasinSurfaceY(fieldWidth, fieldHeight, entity.body.position.x) - radius - BASIN_ENTITY_GUARD_MARGIN;
      const velocity = entity.body.velocity;
      const speed = Math.hypot(velocity.x, velocity.y);
      return entity.body.position.y >= bottomY - 32 && speed < 1.15;
    })
    .sort((left, right) => right.body.position.y - left.body.position.y || right.count - left.count)[0];
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

  const wrappableEntities = entities.filter((entity) => isWrappableEntity(entity));
  const wrappedGroup = wrappableEntities.find((entity) => entity.role === 'multiplicand');
  const fallbackSign = wrappedGroup?.sign ?? wrappableEntities[0]?.sign ?? targetSign;
  return getMultiplicationSource(entities, fallbackSign);
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

      const samePlaceCancellationTarget = beads.some(
        (candidate) => candidate.id !== lower.id && candidate.value === lower.value && candidate.count === lower.count && candidate.sign === -lower.sign,
      );
      if (samePlaceCancellationTarget) {
        continue;
      }

      const distance = getPointDistance(higher, lower);
      const threshold = getEntityRadius(higher.value, higher.count) + getEntityRadius(lower.value, lower.count) + 14;
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
    (entity) =>
      isBurstableWrappedGroup(entity) &&
      entity.role !== 'multiplicand' &&
      (entity.role !== 'product' || now - entity.createdAt >= PRODUCT_BUBBLE_BURST_DELAY_MS),
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
  const candidates: Array<{ beadIds: string[]; center: { x: number; y: number }; value: PlaceValue; distance: number }> = [];

  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive.value !== negative.value || positive.count !== negative.count) {
        continue;
      }

      const distance = getPointDistance(positive, negative);
      const threshold = Math.max(104, getEntityRadius(positive.value, positive.count) + getEntityRadius(negative.value, negative.count) + 28);
      if (distance <= threshold) {
        candidates.push({
          beadIds: [positive.id, negative.id],
          center: {
            x: (positive.x + negative.x) / 2,
            y: (positive.y + negative.y) / 2,
          },
          value: positive.value,
          distance,
        });
      }
    }
  }

  const pair = candidates.sort((left, right) => left.value - right.value || left.distance - right.distance)[0];
  return pair ? { beadIds: pair.beadIds, center: pair.center } : undefined;
}

function hasPendingSamePlaceCancellation(beads: BeadSnapshot[]) {
  return beads.some((left, leftIndex) =>
    beads.some(
      (right, rightIndex) =>
        leftIndex !== rightIndex &&
        left.sign !== right.sign &&
        left.value === right.value &&
        left.count === right.count,
    ),
  );
}

function isUnitMergeSettled(cluster: MergeCluster, entities: BeadEntity[], fieldHeight: number) {
  const clusterIds = new Set(cluster.beadIds);
  const clusterEntities = entities.filter((entity) => clusterIds.has(entity.id));
  if (clusterEntities.length === 0) {
    return false;
  }

  const averageY = clusterEntities.reduce((sum, entity) => sum + entity.body.position.y, 0) / clusterEntities.length;
  if (averageY < fieldHeight * UNIT_MERGE_MIN_SETTLED_Y_RATIO) {
    return false;
  }

  const maxSpeed = clusterEntities.reduce((speed, entity) => {
    const velocity = entity.body.velocity;
    return Math.max(speed, Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y));
  }, 0);

  return maxSpeed <= UNIT_MERGE_MAX_CLUSTER_SPEED;
}

function keepBodiesInsideField(fieldWidth: number, fieldHeight: number, entities: BeadEntity[]) {
  for (const entity of entities) {
    const currentX = entity.body.position.x;
    const currentY = entity.body.position.y;
    const nextX = clampEntityX(entity, fieldWidth);
    const nextY = clampEntityY(entity, fieldWidth, fieldHeight, nextX);
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

function clampEntityY(entity: Pick<BeadEntity, 'value' | 'count' | 'body'>, fieldWidth: number, fieldHeight: number, x: number) {
  const radius = getEntityRadius(entity.value, entity.count);
  const basinSurfaceY = getBasinSurfaceY(fieldWidth, fieldHeight, x);
  const maxY = Math.min(fieldHeight - radius - FIELD_ENTITY_INSET, basinSurfaceY - radius - BASIN_ENTITY_GUARD_MARGIN);
  return clamp(entity.body.position.y, radius + FIELD_ENTITY_INSET, maxY);
}

function getSignedPalette(kind: ReturnType<typeof getBeadKind>, sign: BeadSign) {
  if (sign > 0) {
    return kind;
  }

  return {
    color: '#4B5B77',
    rimColor: '#253B56',
    shineColor: '#B9D8F2',
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

function findAlmostMergeBeadIds(beads: BeadSnapshot[]) {
  const highlightedIds = new Set<string>();
  const candidates = beads.filter((bead) => bead.role === 'normal' && bead.value === 1 && bead.count === 1);
  const visitedIds = new Set<string>();

  for (const startBead of candidates) {
    if (visitedIds.has(startBead.id)) {
      continue;
    }

    const connected = findConnectedAlmostMergeBeads(startBead, candidates);
    connected.forEach((bead) => visitedIds.add(bead.id));
    if (connected.length >= 7 && connected.length < 10) {
      connected.forEach((bead) => highlightedIds.add(bead.id));
    }
  }

  return highlightedIds;
}

function findConnectedAlmostMergeBeads(startBead: BeadSnapshot, beads: BeadSnapshot[]) {
  const connectedBeads: BeadSnapshot[] = [];
  const queuedBeads = [startBead];
  const visitedIds = new Set<string>();

  while (queuedBeads.length > 0) {
    const bead = queuedBeads.shift();
    if (!bead || visitedIds.has(bead.id)) {
      continue;
    }

    visitedIds.add(bead.id);
    connectedBeads.push(bead);

    for (const candidate of beads) {
      if (candidate.sign !== bead.sign || visitedIds.has(candidate.id)) {
        continue;
      }
      if (getPointDistance(bead, candidate) <= 82) {
        queuedBeads.push(candidate);
      }
    }
  }

  return connectedBeads;
}

function getMergeAnimationTarget(beadId: string, animation: MergeAnimation, progress: number) {
  if (animation.value !== 1 || progress >= 0.72) {
    return animation.center;
  }

  const beadIndex = Math.max(0, animation.beadIds.indexOf(beadId));
  const beadCount = Math.max(animation.beadIds.length, 1);
  const angle = -Math.PI / 2 + (Math.PI * 2 * beadIndex) / beadCount;
  const ringRadius = 24;

  return {
    x: animation.center.x + Math.cos(angle) * ringRadius,
    y: animation.center.y + Math.sin(angle) * ringRadius,
  };
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

function getGoalParts(target: number): GoalPart[] {
  const sign: BeadSign = target < 0 ? -1 : 1;
  const total = Math.abs(target);
  const parts: GoalPart[] = [];
  const placeValues: PlaceValue[] = [100000, 10000, 1000, 100, 10];
  let remaining = total;

  for (const value of placeValues) {
    const copies = Math.floor(remaining / value);
    remaining %= value;
    for (let index = 0; index < copies; index += 1) {
      parts.push({ value, count: 1, sign });
    }
  }

  if (remaining > 0) {
    parts.push({ value: 1, count: remaining, sign });
  }

  return parts;
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
    return 0.72;
  }
  if (value === 10) {
    return 0.8;
  }
  if (value === 100) {
    return 0.86;
  }
  if (value === 1000) {
    return 0.82;
  }
  if (value === 10000) {
    return 0.8;
  }
  return 0.78;
}

function getTranslucentBeadColor(value: PlaceValue, color: string) {
  const opacityByValue: Record<PlaceValue, number> = {
    1: 0.34,
    10: 0.48,
    100: 0.58,
    1000: 0.52,
    10000: 0.5,
    100000: 0.48,
  };
  return hexToRgba(color, opacityByValue[value]);
}

function hexToRgba(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
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

function createLaunchBeads(engine: Matter.Engine, fieldWidth: number, fieldHeight: number): BeadEntity[] {
  const radius = getEntityRadius(1, 1);
  const curve = getBasinCurveMetrics(fieldWidth, fieldHeight);
  const xPositions = [0.33, 0.39, 0.45, 0.5, 0.55, 0.61, 0.67, 0.73];
  const entities = xPositions.map((ratio, index) => {
    const x = fieldWidth * ratio;
    const arcX = x - curve.centerX;
    const surfaceY = curve.arcCenterY + Math.sqrt(Math.max(0, curve.radius * curve.radius - arcX * arcX));
    const y = surfaceY - radius - 5;
    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: 0.08,
      friction: 0.22,
      frictionStatic: 0.02,
      frictionAir: 0.004,
      density: 0.0028,
      label: 'bead-1',
      collisionFilter: getBeadCollisionFilter(1),
    });

    return {
      id: `launch-bead-${index}`,
      value: 1 as const,
      count: 1,
      sign: 1 as const,
      role: 'normal' as const,
      createdAt: Date.now() - 1000,
      body,
    };
  });

  Matter.Composite.add(engine.world, entities.map((entity) => entity.body));
  return entities;
}

function getBackgroundBubbleSpecs(fieldWidth: number): BackgroundBubbleSpec[] {
  const wideOffset = fieldWidth > 520 ? 0.04 : 0;
  return [
    { id: 'large-right', xRatio: 0.94 - wideOffset, size: 116, speed: 15, delay: 0, drift: 9 },
    { id: 'small-left', xRatio: 0.12 + wideOffset, size: 60, speed: 21, delay: 900, drift: 7 },
    { id: 'tiny-right', xRatio: 0.78, size: 30, speed: 18, delay: 1600, drift: 5 },
    { id: 'medium-right', xRatio: 0.84, size: 54, speed: 12, delay: 4100, drift: 8 },
    { id: 'soft-low-left', xRatio: 0.05 + wideOffset, size: 92, speed: 10, delay: 1700, drift: 7 },
    { id: 'soft-center-right', xRatio: 0.66, size: 36, speed: 14, delay: 6100, drift: 9 },
  ];
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

function applyBeadForces(entities: BeadEntity[], draggingBeadId?: string) {
  const attractionCounts = getAttractionCounts(entities, draggingBeadId);

  for (let leftIndex = 0; leftIndex < entities.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entities.length; rightIndex += 1) {
      const left = entities[leftIndex];
      const right = entities[rightIndex];
      if (left.id === draggingBeadId || right.id === draggingBeadId) {
        continue;
      }

      const dx = right.body.position.x - left.body.position.x;
      const dy = right.body.position.y - left.body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 1) {
        continue;
      }

      const leftSpeed = Math.sqrt(left.body.velocity.x * left.body.velocity.x + left.body.velocity.y * left.body.velocity.y);
      const rightSpeed = Math.sqrt(right.body.velocity.x * right.body.velocity.x + right.body.velocity.y * right.body.velocity.y);
      const velocityFactor = clamp(1 - (leftSpeed + rightSpeed) / 18, 0.35, 1);

      if (left.sign !== right.sign && left.value === right.value && left.count === right.count) {
        if (distance > ANNIHILATION_ATTRACTION_RADIUS) {
          continue;
        }

        const closeness = 1 - distance / ANNIHILATION_ATTRACTION_RADIUS;
        const strength = ANNIHILATION_ATTRACTION_FORCE * closeness * closeness * velocityFactor;
        const force = {
          x: (dx / distance) * strength,
          y: (dy / distance) * strength,
        };

        Matter.Body.applyForce(left.body, left.body.position, force);
        Matter.Body.applyForce(right.body, right.body.position, {
          x: -force.x,
          y: -force.y,
        });
        continue;
      }

      if (left.sign !== right.sign || left.value !== right.value || !getNextPlaceValue(left.value)) {
        applySeparationForce(left, right, dx, dy, distance, velocityFactor);
        continue;
      }

      if (distance > ATTRACTION_RADIUS) {
        continue;
      }

      const attractionMultiplier = getAttractionMultiplier(Math.min(attractionCounts.get(left.id) ?? left.count, attractionCounts.get(right.id) ?? right.count));
      if (attractionMultiplier <= 0) {
        continue;
      }

      const closeness = 1 - distance / ATTRACTION_RADIUS;
      const strength = ATTRACTION_FORCE * attractionMultiplier * closeness * closeness * velocityFactor;
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

function getAttractionCounts(entities: BeadEntity[], draggingBeadId?: string) {
  const counts = new Map<string, number>();

  for (const entity of entities) {
    if (entity.id === draggingBeadId || !getNextPlaceValue(entity.value)) {
      continue;
    }

    let nearbyCount = entity.count;
    for (const candidate of entities) {
      if (
        candidate.id === entity.id ||
        candidate.id === draggingBeadId ||
        candidate.value !== entity.value ||
        candidate.sign !== entity.sign ||
        !getNextPlaceValue(candidate.value)
      ) {
        continue;
      }

      const dx = candidate.body.position.x - entity.body.position.x;
      const dy = candidate.body.position.y - entity.body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= ATTRACTION_RADIUS) {
        nearbyCount += candidate.count;
      }
    }
    counts.set(entity.id, nearbyCount);
  }

  return counts;
}

function getAttractionMultiplier(nearbyCount: number) {
  if (nearbyCount >= 10) {
    return 1.05;
  }
  if (nearbyCount >= 7) {
    return 0.48;
  }
  if (nearbyCount >= 4) {
    return 0.12;
  }
  return 0;
}

function applySeparationForce(left: BeadEntity, right: BeadEntity, dx: number, dy: number, distance: number, velocityFactor: number) {
  const radiusSum = getEntityRadius(left.value, left.count) + getEntityRadius(right.value, right.count);
  const threshold = Math.min(SEPARATION_RADIUS, radiusSum * 1.08);
  if (distance >= threshold) {
    return;
  }

  const closeness = 1 - distance / threshold;
  const strength = SEPARATION_FORCE * closeness * closeness * velocityFactor;
  const force = {
    x: (dx / distance) * strength,
    y: (dy / distance) * strength,
  };

  Matter.Body.applyForce(left.body, left.body.position, {
    x: -force.x,
    y: -force.y,
  });
  Matter.Body.applyForce(right.body, right.body.position, force);
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
  const pointCount = BASIN_POINT_COUNT;

  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const arcX = -curve.halfWidth + curve.halfWidth * 2 * progress;
    const x = curve.centerX + arcX;
    const y = curve.arcCenterY + Math.sqrt(Math.max(0, curve.radius * curve.radius - arcX * arcX));

    return { x, y };
  });
}

function getBasinSurfaceY(fieldWidth: number, fieldHeight: number, x: number) {
  const curve = getBasinCurveMetrics(fieldWidth, fieldHeight);
  const arcX = clamp(x - curve.centerX, -curve.halfWidth, curve.halfWidth);
  const bodyCenterY = curve.arcCenterY + Math.sqrt(Math.max(0, curve.radius * curve.radius - arcX * arcX));
  return bodyCenterY - BASIN_BODY_THICKNESS / 2;
}

function getBasinCurveMetrics(fieldWidth: number, fieldHeight: number) {
  const inset = 14;
  const bottomY = fieldHeight - 18 - BASIN_BODY_THICKNESS / 2;
  const halfWidth = Math.max(80, fieldWidth / 2 - inset);
  const depth = Math.min(fieldHeight * 0.52, Math.max(168, halfWidth * 0.62));
  const radius = (halfWidth * halfWidth + depth * depth) / (2 * depth);
  return {
    width: fieldWidth,
    centerX: fieldWidth / 2,
    bottomY,
    depth,
    halfWidth,
    radius,
    arcCenterY: bottomY - radius,
    sideY: bottomY - depth,
    inset,
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
  if (previousExpression) {
    return [...multiplicationTokens, '=', String(multiplicand * multiplier)];
  }

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
  if (previousExpression) {
    return [...divisionTokens, '=', String(dividend / divisor)];
  }

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

function getCurrentExpressionResult(tokens: string[]) {
  const expressionTokens = stripExpressionResult(tokens);
  if (expressionTokens.length === 0 || isOperatorToken(expressionTokens[expressionTokens.length - 1])) {
    return undefined;
  }
  return evaluateExpressionTokens(expressionTokens);
}

function getStageNumberInIsland(stageIndex: number) {
  const stage = getStage(stageIndex);
  let count = 0;
  for (let index = 0; index <= stageIndex; index += 1) {
    if (getStage(index).islandId === stage.islandId) {
      count += 1;
    }
  }
  return Math.max(1, count);
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

function getKukuQuestionTitleTextStyle(text: string, maxWidth: number) {
  const estimatedWidth = estimateKukuQuestionTextWidth(text, KUKU_QUESTION_BASE_FONT_SIZE);
  const availableWidth = Math.max(80, maxWidth);

  if (estimatedWidth <= availableWidth) {
    return undefined;
  }

  const fontSize = Math.max(KUKU_QUESTION_MIN_FONT_SIZE, Math.floor((KUKU_QUESTION_BASE_FONT_SIZE * availableWidth) / estimatedWidth));
  return {
    fontSize,
    lineHeight: Math.ceil(fontSize * 1.12),
  };
}

function estimateKukuQuestionTextWidth(text: string, fontSize: number) {
  return Array.from(text).reduce((width, character) => {
    if (character === ' ') {
      return width + fontSize * 0.32;
    }
    if (character === '×' || character === '÷' || character === '+' || character === '-' || character === '=') {
      return width + fontSize * 0.72;
    }
    if (character === '(' || character === ')') {
      return width + fontSize * 0.42;
    }
    return width + fontSize * 0.62;
  }, 0);
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#C6E8F4',
    position: 'relative',
    overflow: 'hidden',
    fontFamily: PLAYFUL_FONT_FAMILY,
  },
  header: {
    zIndex: 10,
    minHeight: 120,
    paddingHorizontal: GRID * 2,
    paddingTop: GRID,
    paddingBottom: GRID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleGroup: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  headerMainTitleShift: {
    transform: [{ translateY: 0 }],
  },
  backButton: {
    position: 'absolute',
    left: GRID,
    top: 0,
    zIndex: 2,
    width: HEADER_ACTION_BUTTON_SIZE,
    height: HEADER_ACTION_BUTTON_SIZE,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRetryButton: {
    position: 'absolute',
    right: GRID,
    top: 0,
    zIndex: 2,
    width: HEADER_ACTION_BUTTON_SIZE,
    height: HEADER_ACTION_BUTTON_SIZE,
    borderRadius: RADIUS_LG,
    backgroundColor: 'rgba(255, 255, 255, 0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerNextButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.62,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 0 },
  },
  headerLaunchNextButton: {
    top: 15,
  },
  headerRetryButtonFailed: {
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: '#BAE6FD',
    shadowOpacity: 0.42,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
    transform: [{ scale: 1.08 }],
  },
  stageGameTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'nowrap',
    minHeight: 46,
  },
  stageGameNumberSlot: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageGameEqualsSlot: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageGameTargetSlot: {
    height: 42,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  stageGameNumber: {
    color: TEXT_ACCENT_COLOR,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
    includeFontPadding: false,
  },
  stageGameTarget: {
    color: TEXT_BASE_COLOR,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
    includeFontPadding: false,
  },
  stageGameEquals: {
    color: TEXT_BASE_COLOR,
    fontSize: 24,
    lineHeight: 31,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
    includeFontPadding: false,
  },
  kukuGameTitle: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kukuQuestionText: {
    color: TEXT_BASE_COLOR,
    fontSize: KUKU_QUESTION_BASE_FONT_SIZE,
    lineHeight: 42,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
    includeFontPadding: false,
  },
  kukuQuestionUnknown: {
    color: 'rgba(71, 85, 105, 0.45)',
  },
  longFormPanel: {
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  longFormBody: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    transform: [{ translateX: -11 }],
  },
  longFormRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  longFormOperatorSlot: {
    width: 22,
    minHeight: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  longFormDivisionOperatorSlot: {
    width: 34,
    alignItems: 'flex-end',
    paddingRight: 2,
  },
  longFormDividerOperatorSlot: {
    justifyContent: 'flex-end',
    paddingBottom: 3,
  },
  longFormOperatorText: {
    color: TEXT_BASE_COLOR,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
    includeFontPadding: false,
  },
  longFormDivisionOperatorText: {
    fontSize: 24,
    lineHeight: 28,
  },
  longFormDigits: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  longFormTopDivider: {
    borderTopWidth: 3,
    borderTopColor: 'rgba(18, 51, 74, 0.76)',
  },
  longFormDivisionTopDivider: {
    marginLeft: -3,
  },
  longFormDivider: {
    borderBottomWidth: 3,
    borderBottomColor: 'rgba(18, 51, 74, 0.76)',
  },
  longFormCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS_SM,
    position: 'relative',
  },
  longFormActiveCell: {
    backgroundColor: 'rgba(250, 204, 21, 0.32)',
    borderWidth: 2,
    borderColor: 'rgba(2, 132, 199, 0.42)',
    shadowColor: 'rgba(2, 132, 199, 0.28)',
    shadowOpacity: 1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  longFormActiveUnknownCell: {
    backgroundColor: 'rgba(250, 204, 21, 0.46)',
    borderColor: 'rgba(2, 132, 199, 0.62)',
  },
  longFormWrongCell: {
    backgroundColor: 'rgba(251, 113, 133, 0.34)',
    borderColor: 'rgba(225, 29, 72, 0.62)',
    shadowColor: 'rgba(225, 29, 72, 0.3)',
  },
  longFormDigit: {
    color: TEXT_BASE_COLOR,
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
    includeFontPadding: false,
  },
  longFormGuideText: {
    color: TEXT_ACCENT_COLOR,
    fontSize: 15,
    lineHeight: 18,
  },
  longFormUnknownText: {
    color: 'rgba(71, 85, 105, 0.45)',
  },
  longFormStrike: {
    position: 'absolute',
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(18, 51, 74, 0.78)',
    transform: [{ rotate: '-28deg' }],
  },
  headerGoalParts: {
    minWidth: 34,
    height: 42,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    paddingBottom: 0,
    transform: [{ translateY: -4 }],
  },
  headerGoalBead: {
    position: 'relative',
    borderWidth: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerGoalGroupBead: {
    borderWidth: 2,
  },
  headerGoalBeadGlass: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 4,
    bottom: 4,
    borderRadius: RADIUS_PILL,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerGoalBeadShine: {
    position: 'absolute',
    left: 6,
    top: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
    transform: [{ rotate: '-22deg' }],
  },
  headerGoalContainedDot: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(207, 168, 58, 0.82)',
    backgroundColor: 'rgba(253, 230, 138, 0.7)',
  },
  headerGoalBadge: {
    position: 'absolute',
    right: -5,
    bottom: -5,
    minWidth: 17,
    height: 17,
    borderRadius: RADIUS_PILL,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.86)',
    backgroundColor: 'rgba(224, 247, 255, 0.96)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGoalBadgeText: {
    color: TEXT_BASE_COLOR,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  headerGoalOverflow: {
    minWidth: 22,
    height: 22,
    borderRadius: RADIUS_PILL,
    backgroundColor: 'rgba(255, 255, 255, 0.46)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGoalOverflowText: {
    color: TEXT_BASE_COLOR,
    fontSize: 11,
    lineHeight: 13,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  launchLogo: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 220,
    height: 56,
    position: 'relative',
  },
  launchLogoTada: {
    transform: [{ scale: 1.03 }],
  },
  hiddenMetric: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
    overflow: 'hidden',
    pointerEvents: 'none',
    fontFamily: LATIN_FONT_FAMILY,
  },
  playArea: {
    zIndex: 1,
    alignSelf: 'center',
    alignItems: 'center',
  },
  field: {
    overflow: 'hidden',
    backgroundColor: '#C6E8F4',
  },
  failedScreenVeil: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 4,
    backgroundColor: 'rgba(3, 7, 18, 0.34)',
  },
  failedWaterOverlay: {
    zIndex: 5,
    overflow: 'hidden',
  },
  failedSiltCloud: {
    position: 'absolute',
    bottom: 18,
    borderRadius: 999,
    backgroundColor: 'rgba(186, 230, 253, 0.24)',
    borderWidth: 2,
    borderColor: 'rgba(125, 211, 252, 0.18)',
  },
  failedSiltCloudLeft: {
    left: 24,
    width: 120,
    height: 56,
  },
  failedSiltCloudCenter: {
    left: '34%',
    width: 148,
    height: 68,
    bottom: 6,
  },
  failedSiltCloudRight: {
    right: 20,
    width: 106,
    height: 50,
    bottom: 28,
  },
  failedDeflatedBubble: {
    position: 'absolute',
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.16)',
    transform: [{ scaleY: 0.62 }],
  },
  failedDeflatedBubbleOne: {
    left: '22%',
    top: '28%',
    width: 34,
    height: 34,
    borderRadius: 17,
  },
  failedDeflatedBubbleTwo: {
    right: '24%',
    top: '44%',
    width: 46,
    height: 46,
    borderRadius: 23,
  },
  failedDeflatedBubbleThree: {
    left: '48%',
    bottom: '24%',
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  clearFireworkLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 7,
  },
  clearFireworkBubble: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.92)',
    backgroundColor: 'rgba(14, 165, 233, 0.86)',
    shadowColor: '#38BDF8',
    shadowOpacity: 0.92,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
  },
  clearFireworkStarfish: {
    position: 'absolute',
  },
  backgroundBubbleLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 7,
    elevation: 7,
  },
  backgroundBubble: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: 'rgba(125, 211, 252, 0.42)',
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  backgroundBubblePressed: {
    opacity: 0.18,
    transform: [{ scale: 0.72 }],
  },
  backgroundBubbleShine: {
    position: 'absolute',
    left: '22%',
    top: '18%',
    width: '26%',
    height: '26%',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
  },
  operatorRail: {
    zIndex: 1,
    width: '100%',
    height: OPERATOR_TABS_HEIGHT,
    paddingHorizontal: GRID * 3,
    paddingTop: GRID,
    paddingBottom: GRID,
    flexDirection: 'row',
    alignItems: 'center',
    gap: GRID,
    backgroundColor: '#C6E8F4',
  },
  operatorButton: {
    position: 'relative',
    flex: 1,
    height: 48,
    borderRadius: RADIUS_LG,
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.12,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 4 },
  },
  selectedOperatorButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.96)',
    borderColor: '#38BDF8',
    shadowOpacity: 0.22,
    transform: [{ translateY: -1 }],
  },
  selectedSignOperatorButton: {
    borderColor: '#0EA5E9',
    backgroundColor: '#E0F7FF',
    shadowColor: '#0284C7',
    shadowOpacity: 0.18,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  disabledOperatorButton: {
    borderColor: 'rgba(186, 230, 253, 0.64)',
    backgroundColor: 'rgba(248, 253, 255, 0.78)',
    opacity: 0.72,
    shadowOpacity: 0.03,
  },
  operatorIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledOperatorIconWrap: {
    opacity: 0.38,
  },
  operatorUsageBadge: {
    position: 'absolute',
    top: -7,
    right: -5,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: RADIUS_PILL,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    backgroundColor: '#0EA5E9',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  operatorUsageBadgeText: {
    color: TEXT_BASE_COLOR,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
  },
  basinTraySegment: {
    position: 'absolute',
    height: BASIN_FRAME_THICKNESS + 3,
    borderRadius: BASIN_FRAME_THICKNESS + 3,
    backgroundColor: 'rgba(224, 247, 255, 0.12)',
    shadowColor: '#075985',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  basinFrameSegment: {
    position: 'absolute',
    height: BASIN_FRAME_THICKNESS,
    borderRadius: BASIN_FRAME_THICKNESS,
    backgroundColor: 'rgba(125, 211, 252, 0.78)',
    shadowColor: '#0284C7',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  basinFrameHighlightSegment: {
    position: 'absolute',
    height: 2,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
  },
  pendingBubbleButton: {
    position: 'absolute',
    zIndex: 2,
  },
  pendingBubbleHintRing: {
    position: 'absolute',
    left: -5,
    right: -5,
    top: -5,
    bottom: -5,
    borderRadius: 999,
    borderWidth: 2,
    borderColor: 'rgba(14, 165, 233, 0.22)',
    backgroundColor: 'rgba(186, 230, 253, 0.06)',
    shadowColor: '#0EA5E9',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 1,
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
    borderColor: '#38BDF8',
    backgroundColor: 'rgba(224, 247, 255, 0.48)',
    shadowColor: '#0284C7',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  multiplierMiniBubbleNegative: {
    borderColor: '#64748B',
    backgroundColor: 'rgba(71, 85, 105, 0.2)',
    shadowColor: '#475569',
  },
  divisionSurvivorMiniBubble: {
    borderColor: '#38BDF8',
    borderWidth: 3,
    backgroundColor: 'rgba(224, 247, 255, 0.58)',
    shadowOpacity: 0.3,
  },
  divisionGhostMiniBubble: {
    borderStyle: 'dashed',
    borderWidth: 3,
    borderColor: 'rgba(56, 189, 248, 0.46)',
    backgroundColor: 'rgba(224, 247, 255, 0.16)',
    shadowOpacity: 0.04,
    opacity: 0.62,
  },
  miniBubbleInnerGlow: {
    position: 'absolute',
    left: 6,
    right: 6,
    top: 6,
    bottom: 6,
    borderRadius: RADIUS_PILL,
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
  mergeSettleGlow: {
    position: 'absolute',
    zIndex: 2,
    borderWidth: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    opacity: 0.52,
  },
  mergeSettleCore: {
    position: 'absolute',
    zIndex: 4,
    opacity: 0.62,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.72)',
  },
  mergePopParticle: {
    position: 'absolute',
    zIndex: 4,
    backgroundColor: '#7DD3FC',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.84)',
  },
  bubbleBurstRing: {
    position: 'absolute',
    zIndex: 6,
    borderWidth: 4,
    borderColor: '#7DD3FC',
    backgroundColor: 'rgba(224, 247, 255, 0.18)',
  },
  bubbleBurstRingNegative: {
    borderColor: '#8FA9C5',
    backgroundColor: 'rgba(75, 91, 119, 0.12)',
  },
  bubbleBurstInnerRing: {
    position: 'absolute',
    zIndex: 6,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  bubbleBurstDrop: {
    position: 'absolute',
    zIndex: 7,
    backgroundColor: '#BAE6FD',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
  },
  bubbleBurstDropNegative: {
    backgroundColor: '#9FB5D0',
  },
  bubbleBurstShard: {
    position: 'absolute',
    zIndex: 7,
    width: 14,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.86)',
    shadowColor: '#0284C7',
    shadowOpacity: 0.12,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  multiplicationExpansionBubble: {
    position: 'absolute',
    zIndex: 5,
  },
  divisionSplitPart: {
    position: 'absolute',
  },
  divisionFailedSlot: {
    position: 'absolute',
    zIndex: 12,
    borderWidth: 3,
    borderColor: 'rgba(125, 211, 252, 0.52)',
    backgroundColor: 'rgba(224, 247, 255, 0.16)',
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.24,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    alignItems: 'center',
    justifyContent: 'center',
  },
  divisionFailedRemainder: {
    position: 'absolute',
    zIndex: 13,
    borderWidth: 3,
    borderColor: 'rgba(250, 204, 21, 0.58)',
    backgroundColor: 'rgba(254, 240, 138, 0.14)',
    shadowColor: '#FACC15',
    shadowOpacity: 0.3,
    shadowRadius: 9,
    shadowOffset: { width: 0, height: 0 },
  },
  draggableBeadHitArea: {
    position: 'absolute',
    zIndex: 1,
  },
  bead: {
    position: 'absolute',
    borderWidth: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  focusedBead: {
    borderWidth: 5,
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  almostMergeBead: {
    shadowColor: '#7DD3FC',
    shadowOpacity: 0.58,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 7,
  },
  groupBubble: {
    borderWidth: 3,
    shadowColor: '#0284C7',
    shadowOpacity: 0.24,
    shadowRadius: 8,
  },
  multiplicandBubble: {
    borderColor: '#0EA5E9',
    borderWidth: 4,
  },
  productBubble: {
    borderColor: '#38BDF8',
    shadowColor: '#0284C7',
    shadowOpacity: 0.28,
  },
  divisionBubble: {
    borderColor: '#7DD3FC',
    shadowColor: '#0284C7',
    shadowOpacity: 0.24,
  },
  beadShine: {
    marginTop: 4,
    marginLeft: 5,
    opacity: 0.82,
  },
  beadInnerGlass: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 4,
    bottom: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.44)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
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
    borderRadius: RADIUS_PILL,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.52)',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  bubbleNumberBadge: {
    position: 'absolute',
    right: -6,
    bottom: -4,
    minWidth: 30,
    height: 24,
    paddingHorizontal: GRID,
    borderRadius: RADIUS_PILL,
    borderWidth: 2,
    borderColor: '#BAE6FD',
    backgroundColor: 'rgba(255, 255, 255, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.16,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  bubbleNumberBadgeText: {
    color: TEXT_BASE_COLOR,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 18,
    fontFamily: LATIN_FONT_FAMILY,
  },
  containedBead: {
    position: 'absolute',
    borderWidth: 2,
    shadowColor: '#0284C7',
    shadowOpacity: 0.22,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 3 },
  },
  clearCelebrationLayer: {
    zIndex: 5,
  },
  clearSplashDrop: {
    position: 'absolute',
    backgroundColor: 'rgba(125, 211, 252, 0.62)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.82)',
    shadowColor: '#0284C7',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  clearSparkle: {
    position: 'absolute',
    color: TEXT_ACCENT_COLOR,
    fontWeight: '900',
    textShadowColor: 'rgba(2, 132, 199, 0.38)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 5,
  },
  resultPanel: {
    position: 'absolute',
    zIndex: 6,
    left: GRID * 4,
    right: GRID * 4,
    top: '22%',
    padding: GRID * 3,
    borderRadius: RADIUS_XL,
    backgroundColor: 'rgba(246, 253, 255, 0.88)',
    alignItems: 'center',
    shadowColor: '#0284C7',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 6,
  },
  resultPanelFailed: {
    top: '24%',
  },
  resultMain: {
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  resultStar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#CA8A04',
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 13 },
    elevation: 5,
  },
  roundedStarfishArm: {
    position: 'absolute',
    backgroundColor: '#EAB308',
    borderWidth: 2,
    borderColor: 'rgba(202, 138, 4, 0.28)',
    shadowColor: '#CA8A04',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  roundedStarfishCenter: {
    position: 'absolute',
    backgroundColor: '#FDE68A',
    borderWidth: 2,
    borderColor: 'rgba(202, 138, 4, 0.34)',
  },
  roundedStarfishDot: {
    position: 'absolute',
    backgroundColor: 'rgba(180, 120, 12, 0.36)',
  },
  brokenMedal: {
    position: 'relative',
    width: 76,
    height: 76,
    shadowColor: '#CA8A04',
    shadowOpacity: 0.24,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 13 },
    elevation: 5,
  },
  brokenMedalHalf: {
    position: 'absolute',
    top: 0,
    width: 38,
    height: 76,
    overflow: 'hidden',
  },
  brokenMedalLeft: {
    left: 0,
    transform: [{ translateX: -4 }, { rotate: '-8deg' }],
  },
  brokenMedalRight: {
    right: 0,
    transform: [{ translateX: 4 }, { rotate: '8deg' }],
  },
  brokenMedalFace: {
    position: 'absolute',
    top: 0,
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    backgroundColor: '#FACC15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brokenMedalFaceLeft: {
    left: 0,
  },
  brokenMedalFaceRight: {
    right: 0,
  },
  brokenMedalStar: {
    color: TEXT_BASE_COLOR,
    fontSize: 43,
    lineHeight: 48,
    fontWeight: '900',
  },
  brokenMedalGapTop: {
    position: 'absolute',
    left: 37,
    top: 7,
    width: 4,
    height: 35,
    borderRadius: 999,
    backgroundColor: 'rgba(246, 253, 255, 0.92)',
    transform: [{ rotate: '16deg' }],
  },
  brokenMedalGapBottom: {
    position: 'absolute',
    left: 34,
    top: 36,
    width: 4,
    height: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(246, 253, 255, 0.92)',
    transform: [{ rotate: '-18deg' }],
  },
  resultEquation: {
    color: TEXT_BASE_COLOR,
    fontSize: 34,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -0.6,
    textAlign: 'center',
    maxWidth: '100%',
    fontFamily: LATIN_FONT_FAMILY,
  },
  failedEquation: {
    fontSize: 34,
  },
  resultActions: {
    marginTop: GRID * 3,
    width: '100%',
    flexDirection: 'row',
    gap: GRID * 2,
  },
  resultActionsFailed: {
    marginTop: 24,
  },
  resultActionButton: {
    width: 80,
    height: 64,
    borderRadius: RADIUS_MD,
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultActionButtonPrimary: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.46)',
  },
  footer: {
    zIndex: 1,
    minHeight: 96,
    width: '100%',
    alignItems: 'stretch',
    paddingHorizontal: GRID * 3,
    paddingTop: GRID,
    paddingBottom: GRID * 2,
  },
  footerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 0,
  },
  expressionBox: {
    width: '100%',
    flex: 1,
    height: 48,
    paddingHorizontal: GRID * 2,
    borderRadius: RADIUS_LG,
    borderWidth: 3,
    borderColor: 'rgba(186, 230, 253, 0.72)',
    backgroundColor: 'rgba(255, 255, 255, 0.58)',
    justifyContent: 'center',
  },
  expressionText: {
    color: TEXT_BASE_COLOR,
    fontSize: 18,
    lineHeight: 30,
    fontWeight: '900',
    textAlign: 'center',
    fontFamily: LATIN_FONT_FAMILY,
  },
  expressionPlaceholder: {
    color: TEXT_ACCENT_COLOR,
  },
  kukuAnswerPad: {
    position: 'absolute',
    zIndex: 8,
    left: FIELD_MARGIN + GRID * 3,
    right: FIELD_MARGIN + GRID * 3,
    bottom: GRID * 2,
    padding: GRID * 0.6,
    borderRadius: RADIUS_LG,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.56)',
    backgroundColor: 'rgba(224, 247, 255, 0.58)',
    shadowColor: '#0284C7',
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  kukuAnswerPadWithLongForm: {
    paddingTop: GRID,
  },
  kukuPadLongFormArea: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: GRID,
    paddingBottom: GRID,
    marginBottom: GRID * 0.75,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(255, 255, 255, 0.48)',
  },
  kukuAnswerPadWrong: {
    borderColor: 'rgba(71, 85, 105, 0.34)',
    backgroundColor: 'rgba(148, 163, 184, 0.32)',
  },
  kukuAnswerPadRunning: {},
  kukuKeyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID * 0.5,
    justifyContent: 'space-between',
  },
  kukuKey: {
    width: '32%',
    minWidth: 66,
    height: 48,
    borderRadius: RADIUS_LG,
    borderWidth: 2,
    borderColor: 'rgba(224, 247, 255, 0.95)',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kukuKeyAccent: {
    backgroundColor: '#7DD3FC',
    borderColor: '#38BDF8',
  },
  kukuKeyDisabled: {
    opacity: 0.42,
  },
  kukuKeyText: {
    color: TEXT_BASE_COLOR,
    fontSize: 17,
    lineHeight: 20,
    fontWeight: '900',
    fontFamily: LATIN_FONT_FAMILY,
    includeFontPadding: false,
  },
  pressedButton: {
    transform: [{ scale: 0.98 }],
    opacity: 0.86,
  },
});
