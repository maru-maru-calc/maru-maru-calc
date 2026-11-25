import * as Matter from 'matter-js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { PixelRatio, Pressable, Text, View } from 'react-native';

import { SFX } from '@/audio/sfx';
import { useBoardViewport } from '@/components/marumaru/board-viewport';
import { useStaysPut } from '@/components/marumaru/use-stays-put';
import { useOneShotAudio } from '@/audio/use-one-shot-audio';
import { KukuAnswerPad } from '@/components/marumaru/answer-pad';
import { BasinFrame, BeadLayer } from '@/components/marumaru/beads';
import { BackgroundBubbleLayer, DraggableBubbleView, NO_BACKGROUND_BUBBLES } from '@/components/marumaru/bubbles';
import {
  ANNIHILATION_ANIMATION_MS,
  BUBBLE_BURST_ANIMATION_MS,
  DETAILED_RELEASE_BEAD_LIMIT,
  DIVISION_FAILED_ANIMATION_MS,
  DIVISION_SPLIT_ANIMATION_MS,
  FIELD_BUBBLE_AUTO_BURST_IDLE_MS,
  FIELD_BUBBLE_AUTO_BURST_STEP_MS,
  FIELD_MARGIN,
  FOOTER_HEIGHT,
  HEADER_HEIGHT,
  IDLE_CHECK_MS,
  IDLE_HINT_DELAY_MS,
  IDLE_HINT_PULSE_MS,
  LAUNCH_BUBBLE_COUNT,
  LAUNCH_INITIAL_TOTAL,
  LAUNCH_TARGET,
  MERGE_ANIMATION_MS,
  MERGE_COOLDOWN_MS,
  MULTIPLICATION_EXPANSION_HOLD_MS,
  OPERATOR_TABS_HEIGHT,
  PREVIEW_Y,
  QUEUED_MOVE_CHECK_MS,
  RESULT_READY_DELAY_MS,
  WRONG_ANSWERS_BEFORE_MARU,
  LOOK_AT_MARU_MS,
  STUCK_AFTER_REFUSAL_MS,
  STUCK_WITHOUT_TRYING_MS,
  UNIT_MERGE_ANIMATION_MS,
  UNIT_MERGE_COOLDOWN_MS,
  UNIT_MERGE_READY_DELAY_MS,
} from '@/components/marumaru/constants';
import { ExpressionDisplay, OperatorRail } from '@/components/marumaru/controls';
import {
  BubbleBurst,
  ClearBubbleFireworks,
  DivisionFailedOverlay,
  DivisionSplitOverlay,
  FailedScreenVeil,
  FailedWaterOverlay,
  MergePulse,
  MultiplicationExpansionOverlay,
} from '@/components/marumaru/effects';
import {
  addNumberToExpression,
  getDivisionExpressionTokens,
  getMultiplicationExpressionTokens,
  multiplySigns,
} from '@/components/marumaru/expression-tokens';
import {
  clamp,
  createPendingBubbles,
  getBackgroundBubbleSpecs,
  getBasinFrameSegments,
  getEntityRadius,
  getEntityUnitCount,
  getMultiplierClusterRadius,
  getPlaceValueBeads,
} from '@/components/marumaru/field-layout';
import {
  applyBeadForces,
  createBasinBodies,
  createLaunchBeads,
  findAnnihilationPair,
  findAutoBurstFieldBubble,
  findDecompositionPair,
  findProductBubbleCollision,
  getBeadCollisionFilter,
  getEntityCenter,
  getMergeAnimationTarget,
  getOperationSource,
  getWorldCollisionFilter,
  hasPendingSamePlaceCancellation,
  isBurstableWrappedGroup,
  isStageReadyForResult,
  isUnitMergeSettled,
  isWrappableEntity,
  keepBodiesInsideField,
  removeBodies,
  toSnapshots,
} from '@/components/marumaru/field-physics';
import { HeaderActionButton, KukuGoalTitle, LaunchLogo, StageGoalTitle } from '@/components/marumaru/header';
import type { StageMark } from '@/components/marumaru/header';
import {
  getFooterExpressionTokens,
  getLongFormProblem,
  getLongFormStep,
  getLongFormStepAutomation,
  getLongFormStepPendingBubbles,
  isLongFormPlaceValuePractice,
} from '@/components/marumaru/long-form-rows';
import {
  canUseOperator,
  createDentakuPracticeStage,
  delay,
  getInitialOperatorUsage,
  getInitialSelectedOperator,
  getStageNumberInIsland,
  hasExpressionValue,
} from '@/components/marumaru/operators';
import { styles } from '@/components/marumaru/styles';
import type {
  AnnihilationAnimation,
  BeadEntity,
  BubbleBurstAnimation,
  DentakuAutomationPractice,
  DentakuPractice,
  DivisionFailedAnimation,
  DivisionSplitAnimation,
  HeldTap,
  MergeAnimation,
  MultiplicationExpansionAnimation,
  OperatorButtonSymbol,
  PendingBubble,
} from '@/components/marumaru/types';
import { NavImageIcon } from '@/components/NavImageIcon';
import { createBeadFrameStore, keepSameMaru, snapToPixel } from '@/game/bead-snapshots';
import type { BeadFrameStore } from '@/game/bead-snapshots';
import { getNextPlaceValue } from '@/game/beads';
import {
  OperatorSymbol,
  evaluateExpressionOnEquals,
  getPendingOperationExpressionValue,
  isPriorityOperator,
  replaceTrailingOperator,
  stripExpressionResult,
} from '@/game/expression';
import { matchesLongFormStepAnswer } from '@/game/long-form';
import { findMergeCluster, getTotalValue, hasMergeableCount } from '@/game/merge';
import { BoardPosition, spendOperatorUse, takeBackLastMove } from '@/game/move-history';
import { hasLegalMove } from '@/game/stage-rules';
import { getStage } from '@/game/stages';
import { BeadRole, BeadSign, BeadSnapshot, OperatorUsageLimits, PlaceValue, Stage } from '@/game/types';
import { a11yLabel } from '@/i18n/a11y-label';
import { usePrefersReducedMotion } from '@/layout/reduced-motion';

export function MarumaruGame({
  initialStageIndex = 0,
  onBack,
  onStageClear,
  mode = 'stage',
  onComplete,
  onLogoPress,
  dentakuPractice,
  stages,
  onLastStageNext,
  stageMark,
  showsGoalAsMaru = true,
  onAllBubblesUsed,
  resetSignal = 0,
  cornerBadge,
}: {
  /**
   * Called the moment the last bubble goes in, with whether the amount is the goal. A game played
   * against the clock moves on from here instead of waiting for the maru to settle.
   */
  onAllBubblesUsed?: (isGoal: boolean) => void;
  /** Changing this number starts the stage over. */
  resetSignal?: number;
  /** A short text (a count) shown in the corner under the bowl, opposite the undo button. */
  cornerBadge?: string;
  /** Whether the header also draws the goal as maru, beside the number. */
  showsGoalAsMaru?: boolean;
  /** The stages to play, numbered from 1 in this order. Left out: the stages of まるまるモード. */
  stages?: Stage[];
  /** Called for "next" on the last of `stages`, instead of staying on it. */
  onLastStageNext?: () => void;
  /** Whether the header shows "#n" before the goal. */
  /** Shown before the goal instead of the stage's own number: the start puzzle is #0, the one-minute game shows a clock. */
  stageMark?: StageMark;
  initialStageIndex?: number;
  onBack?: () => void;
  onStageClear?: (stageId: string) => void;
  mode?: 'stage' | 'launch';
  onComplete?: () => void;
  onLogoPress?: () => void;
  dentakuPractice?: DentakuPractice;
}) {
  const { width, height } = useBoardViewport();
  const screenRef = useRef<View>(null);
  useStaysPut(screenRef);
  const fieldWidth = Math.max(240, width - FIELD_MARGIN * 2);
  const fieldHeight = Math.max(360, height - HEADER_HEIGHT - FOOTER_HEIGHT - OPERATOR_TABS_HEIGHT - 20);
  const [stageIndex, setStageIndex] = useState(initialStageIndex);
  const stage = useMemo(
    () => (dentakuPractice ? createDentakuPracticeStage(dentakuPractice) : stages ? stages[Math.max(0, Math.min(stageIndex, stages.length - 1))] : getStage(stageIndex)),
    [dentakuPractice, stageIndex, stages],
  );
  const target = mode === 'launch' ? LAUNCH_TARGET : stage.target;
  const stageNumberInIsland = useMemo(() => (stages ? stageIndex + 1 : getStageNumberInIsland(stageIndex)), [stageIndex, stages]);
  // A list of its own (the puzzle game) can have six bubbles; those need a second row.
  const bubbleRows = stages ? 'fit' : 'one';
  const [selectedOperator, setSelectedOperator] = useState<OperatorSymbol>('+');
  const selectedOperatorRef = useRef<OperatorSymbol>('+');
  const [operatorSign, setOperatorSign] = useState<BeadSign>(1);
  const operatorSignRef = useRef<BeadSign>(1);
  const [expressionTokens, setExpressionTokens] = useState<string[]>([]);
  const expressionTokensRef = useRef<string[]>([]);
  const expressionTotalRef = useRef(0);
  const expressionHistoryRef = useRef<string[]>([]);
  const [pendingBubbles, setPendingBubbles] = useState<PendingBubble[]>([]);
  // Which maru exist. This list is replaced only when a maru is added, removed or changed, so the
  // x and y in it go stale: the rules below never look at them. Where the maru are right now lives
  // in beadFrameStore, and only BeadLayer listens to that.
  const [beads, setBeads] = useState<BeadSnapshot[]>([]);
  const [beadFrameStore] = useState(createBeadFrameStore);
  const [mergeAnimation, setMergeAnimation] = useState<MergeAnimation | undefined>(undefined);
  const [annihilationAnimation, setAnnihilationAnimation] = useState<AnnihilationAnimation | undefined>(undefined);
  const [divisionSplitAnimation, setDivisionSplitAnimation] = useState<DivisionSplitAnimation | undefined>(undefined);
  const [divisionFailedAnimation, setDivisionFailedAnimation] = useState<DivisionFailedAnimation | undefined>(undefined);
  const [multiplicationExpansionAnimation, setMultiplicationExpansionAnimation] = useState<MultiplicationExpansionAnimation | undefined>(undefined);
  const [bubbleBurstAnimations, setBubbleBurstAnimations] = useState<BubbleBurstAnimation[]>([]);
  const [operatorUsage, setOperatorUsage] = useState<OperatorUsageLimits>(() => getInitialOperatorUsage(stages ? stages[Math.max(0, Math.min(initialStageIndex, stages.length - 1))] : getStage(initialStageIndex), mode));
  const [kukuInput, setKukuInput] = useState('');
  // 'showing': after two wrong answers the maru act the calculation out, and then stay in full
  // view for the child to read. The answer pad lies over the bowl, so it stays away until the
  // child taps (or a while has passed).
  const [kukuInputState, setKukuInputState] = useState<'input' | 'wrong' | 'running' | 'showing'>('input');
  const wrongAnswersRef = useRef(0);
  // The maru of the answer are on the board for the child to read; the number itself is not shown.
  const [isAnswerShownAsMaru, setIsAnswerShownAsMaru] = useState(false);
  const isReadingAnswerFromMaru = kukuInputState === 'showing' || (isAnswerShownAsMaru && kukuInputState !== 'running');
  const [longFormStepIndex, setLongFormStepIndex] = useState(0);
  const [longFormQuestionChangedAt, setLongFormQuestionChangedAt] = useState(() => Date.now());
  const [hasReleasedBubble, setHasReleasedBubble] = useState(false);
  // A × or ÷ tapped while the maru are still settling cannot act yet. It waits here, with the
  // bubble tapped after it, and both are carried out as soon as the board is ready.
  const [queuedOperator, setQueuedOperator] = useState<OperatorButtonSymbol | undefined>(undefined);
  const [queuedBubbleId, setQueuedBubbleId] = useState<string | undefined>(undefined);
  const queuedOperatorRef = useRef<OperatorButtonSymbol | undefined>(undefined);
  const queuedBubbleIdRef = useRef<string | undefined>(undefined);
  // Taps made while a bubble is still waiting for the board. They are carried out in the order
  // they were made once that bubble has gone in, so tapping ahead never drops a move.
  const heldTapsRef = useRef<HeldTap[]>([]);
  const [heldTapCount, setHeldTapCount] = useState(0);
  const carryingOutWaitingMoveRef = useRef(false);
  // The position after each move of this attempt, for taking the last move back.
  const positionsRef = useRef<BoardPosition<PendingBubble>[]>([]);
  const [movesMade, setMovesMade] = useState(0);
  const setWaitingBubble = (bubbleId: string | undefined) => {
    queuedBubbleIdRef.current = bubbleId;
    setQueuedBubbleId(bubbleId);
  };
  const holdTap = (tap: HeldTap) => {
    const isSameBubbleAgain = 'bubbleId' in tap && heldTapsRef.current.some((held) => 'bubbleId' in held && held.bubbleId === tap.bubbleId);
    if (!isSameBubbleAgain) {
      heldTapsRef.current = [...heldTapsRef.current, tap];
      setHeldTapCount(heldTapsRef.current.length);
    }
  };
  const clearHeldTaps = () => {
    heldTapsRef.current = [];
    setHeldTapCount(0);
  };
  // Counts taps the game could not accept, so a stage with nothing left to do can end right after one.
  const [refusedMoves, setRefusedMoves] = useState(0);
  const stuckPositionRef = useRef<{ key: string; refusedMoves: number } | undefined>(undefined);
  const [isClear, setIsClear] = useState(false);
  const [clearedStageId, setClearedStageId] = useState<string | undefined>(undefined);
  const [isFailed, setIsFailed] = useState(false);
  // The maru have come to rest and nothing covers them: the child is looking.
  const isLookingAtMaru = kukuInputState === 'showing' && isAnswerShownAsMaru && !isClear && !isFailed;
  const [failedAt, setFailedAt] = useState<number | undefined>(undefined);
  // -1 while the player is active; once they have been idle for a while it counts the hint's pulses.
  const [idleHintStep, setIdleHintStep] = useState(-1);
  // Decorative movement (drifting bubbles, fireworks, pulsing buttons) is dropped when less motion is asked for.
  const prefersReducedMotion = usePrefersReducedMotion();
  const [resultCheckRetry, setResultCheckRetry] = useState(0);
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
  const basinFrameSegments = useMemo(() => getBasinFrameSegments(fieldWidth, fieldHeight), [fieldHeight, fieldWidth]);
  const backgroundBubbles = useMemo(() => getBackgroundBubbleSpecs(width), [width]);
  const markBubbleInteraction = useCallback(() => {
    const now = Date.now();
    lastBubbleInteractionAtRef.current = now;
    setIdleHintStep(-1);
  }, []);
  const shouldHintPendingBubbles =
    mode === 'launch' &&
    pendingBubbles.length > 0 &&
    !isClear &&
    !isFailed &&
    draggingBeadId === undefined &&
    idleHintStep >= 0;
  const shouldPulsePendingBubbles = shouldHintPendingBubbles && idleHintStep % 2 === 0;
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
    publishBeads(beadFrameStore, setBeads, initialEntities, fieldWidth, fieldHeight);
    setPendingBubbles(createPendingBubbles(fieldWidth, mode === 'launch' ? [LAUNCH_BUBBLE_COUNT] : stage.bubbleCounts, bubbleRows));
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
    queuedOperatorRef.current = undefined;
    setQueuedOperator(undefined);
    setWaitingBubble(undefined);
    clearHeldTaps();
    positionsRef.current = [];
    setMovesMade(0);
    stuckPositionRef.current = undefined;
    setMergeAnimation(undefined);
    setAnnihilationAnimation(undefined);
    setDivisionSplitAnimation(undefined);
    setDivisionFailedAnimation(undefined);
    setMultiplicationExpansionAnimation(undefined);
    setBubbleBurstAnimations([]);
    setIsClear(false);
    setClearedStageId(undefined);
    setIsFailed(false);
    setFailedAt(undefined);
    lastFieldBubbleAutoBurstAtRef.current = 0;
    mergeReadySinceRef.current = undefined;
    resultReadySinceRef.current = undefined;
  }, [bubbleRows, fadeOutResultSfx, fieldHeight, fieldWidth, markBubbleInteraction, mode, stage.bubbleCounts]);

  const onAllBubblesUsedRef = useRef(onAllBubblesUsed);
  onAllBubblesUsedRef.current = onAllBubblesUsed;

  // The owner of the board can ask for the stage to be started over.
  const lastResetSignalRef = useRef(resetSignal);
  useEffect(() => {
    if (lastResetSignalRef.current !== resetSignal) {
      lastResetSignalRef.current = resetSignal;
      resetStage();
    }
  }, [resetSignal, resetStage]);

  // A new stage or question starts on a fresh board. The id is watched as well as the bubbles:
  // the same question asked twice in a row has the same bubbles, and used to keep the old board
  // (already cleared, so it was passed over without being asked).
  useEffect(() => {
    resetStage();
  }, [resetStage, stage.id]);

  useEffect(() => {
    // Only the launch screen hints at its bubbles.
    if (mode !== 'launch' || pendingBubbles.length === 0 || isClear || isFailed) {
      return undefined;
    }

    // The screen is drawn again only when the hint changes (it starts, or pulses), not on every look at the clock.
    const interval = setInterval(() => {
      const idleFor = Date.now() - lastBubbleInteractionAtRef.current;
      setIdleHintStep(idleFor >= IDLE_HINT_DELAY_MS ? Math.floor((idleFor - IDLE_HINT_DELAY_MS) / IDLE_HINT_PULSE_MS) : -1);
    }, 260);
    return () => clearInterval(interval);
  }, [isClear, isFailed, mode, pendingBubbles.length]);

  // The line, the chosen operator and its sign are written to their refs at the moment they are
  // changed, everywhere. They used to be copied from state after each draw as well, which could
  // put an older value back: after a ×, the operator is reset to + and that draw can come late;
  // an operator tapped in between was then undone for a moment, and a bubble tapped in that
  // moment went in with + (or was turned away, where + had no uses left).
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
    wrongAnswersRef.current = 0;
    setIsAnswerShownAsMaru(false);
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

    // The board has to stay ready for a moment before the result counts. Nothing redraws this
    // screen while the board rests, so the wait is a timer that runs this check again.
    const checkAgainIn = (ms: number) => {
      const timeout = setTimeout(() => setResultCheckRetry((count) => count + 1), ms);
      return () => clearTimeout(timeout);
    };
    const now = Date.now();
    resultReadySinceRef.current ??= now;
    const waited = now - resultReadySinceRef.current;
    if (waited < RESULT_READY_DELAY_MS) {
      return checkAgainIn(RESULT_READY_DELAY_MS - waited);
    }

    if (hasPendingSamePlaceCancellation(beads)) {
      resultReadySinceRef.current = now;
      return checkAgainIn(RESULT_READY_DELAY_MS);
    }

    // The maru shown after two wrong answers are a help, not a result: the question is finished
    // by the child's own answer.
    if (isReadingAnswerFromMaru) {
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
    }

    return undefined;
  }, [annihilationAnimation, beads, completeCurrentStage, dentakuPractice, divisionFailedAnimation, divisionSplitAnimation, isClear, isFailed, isReadingAnswerFromMaru, kukuInputState, mergeAnimation, multiplicationExpansionAnimation, pendingBubbles, resultCheckRetry, target]);

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
    publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
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
      publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
      setTimeout(() => {
        if (engineRef.current !== engine) {
          return;
        }

        expansionGroups.forEach((group) => {
          addBead(1, source.count, resultSign, group.x, group.y, false, { x: Math.cos(group.angle) * 1.8, y: 2 + Math.sin(group.angle) }, 'product');
        });
        setMultiplicationExpansionAnimation((current) => (current?.id === expansionId ? undefined : current));
        publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
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
      publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
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

    if (releaseCount > 0) {
      addReleasedBeads(releaseCount, releaseSign, center);
    }

    const evaluatedTokens = evaluateExpressionOnEquals(expressionTokens);
    expressionTokensRef.current = evaluatedTokens;
    expressionHistoryRef.current = stripExpressionResult(evaluatedTokens);
    setExpressionTokens(evaluatedTokens);
    publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
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

      addReleasedBeads(productGroup.count, productGroup.sign, productGroup.body.position);
      publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
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

      publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
      return true;
    },
    [addBead, fieldHeight, fieldWidth],
  );

  useEffect(() => {
    if (!divisionFailedAnimation) {
      return undefined;
    }

    const remaining = divisionFailedAnimation.startedAt + DIVISION_FAILED_ANIMATION_MS - Date.now();
    const timeout = setTimeout(() => setDivisionFailedAnimation(undefined), Math.max(0, remaining));
    return () => clearTimeout(timeout);
  }, [divisionFailedAnimation]);

  useEffect(() => {
    if (isClear || isFailed || draggingBeadId !== undefined || mergeAnimation || divisionSplitAnimation || divisionFailedAnimation || annihilationAnimation || multiplicationExpansionAnimation) {
      return undefined;
    }

    // Looks at the clock on a timer of its own, so waiting for the player costs no redraw.
    const burstWhenIdle = () => {
      const now = Date.now();
      if (now - lastBubbleInteractionAtRef.current < FIELD_BUBBLE_AUTO_BURST_IDLE_MS) {
        return;
      }

      if (now - lastFieldBubbleAutoBurstAtRef.current < FIELD_BUBBLE_AUTO_BURST_STEP_MS) {
        return;
      }

      const fieldBubble = findAutoBurstFieldBubble(entitiesRef.current, fieldWidth, fieldHeight);
      if (!fieldBubble) {
        return;
      }

      lastFieldBubbleAutoBurstAtRef.current = now;
      playBubblePopSfx();
      unwrapBeadGroup(fieldBubble.id);
    };

    const interval = setInterval(burstWhenIdle, IDLE_CHECK_MS);
    return () => clearInterval(interval);
  }, [annihilationAnimation, divisionFailedAnimation, divisionSplitAnimation, draggingBeadId, fieldHeight, fieldWidth, isClear, isFailed, mergeAnimation, multiplicationExpansionAnimation, playBubblePopSfx, unwrapBeadGroup]);

  const burstBubble = useCallback(
    (bubble: PendingBubble) => {
      markBubbleInteraction();
      if (isClear || isFailed) {
        return;
      }
      if (consumedPendingBubbleIdsRef.current.has(bubble.id)) {
        return;
      }
      if (queuedBubbleIdRef.current !== undefined && !carryingOutWaitingMoveRef.current) {
        // Another bubble is already waiting for the board: this one takes its turn after it.
        if (queuedBubbleIdRef.current !== bubble.id) {
          holdTap({ bubbleId: bubble.id });
        }
        return;
      }
      if (queuedOperatorRef.current) {
        // Its operator is still waiting for the board, so this bubble waits behind it.
        setWaitingBubble(bubble.id);
        return;
      }
      consumedPendingBubbleIdsRef.current.add(bubble.id);
      const hasPriorValue = hasExpressionValue(expressionTokensRef.current);
      const activeOperator: OperatorButtonSymbol = hasPriorValue ? selectedOperatorRef.current : '+';
      if (hasPriorValue && !canUseOperator(operatorUsage[activeOperator])) {
        consumedPendingBubbleIdsRef.current.delete(bubble.id);
        setRefusedMoves((count) => count + 1);
        return;
      }
      if (hasPriorValue && (activeOperator === '×' || activeOperator === '÷') && isBoardBusyForPriorityOperation()) {
        consumedPendingBubbleIdsRef.current.delete(bubble.id);
        if (canBoardBecomeReadyForPriorityOperation()) {
          // The maru are still settling: pop it once they have, instead of dropping the tap.
          setWaitingBubble(bubble.id);
        } else {
          setRefusedMoves((count) => count + 1);
        }
        return;
      }

      if (hasPriorValue && activeOperator === '×') {
        consumeOperatorUsage(activeOperator);
        if (multiplyWrappedGroup(bubble)) {
          playBubblePopSfx();
          resetOperatorSelection();
          notePositionAfterMove(activeOperator);
        } else {
          restoreOperatorUsage(activeOperator);
          consumedPendingBubbleIdsRef.current.delete(bubble.id);
          setRefusedMoves((count) => count + 1);
        }
        return;
      }
      if (hasPriorValue && activeOperator === '÷') {
        consumeOperatorUsage(activeOperator);
        if (divideWrappedGroup(bubble)) {
          playBubblePopSfx();
          resetOperatorSelection();
          notePositionAfterMove(activeOperator);
        } else {
          restoreOperatorUsage(activeOperator);
          consumedPendingBubbleIdsRef.current.delete(bubble.id);
          setRefusedMoves((count) => count + 1);
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
      const nextTokens = addNumberToExpression(expressionTokensRef.current, bubble.count, activeOperator, expressionTotalRef.current);
      expressionTokensRef.current = nextTokens;
      expressionHistoryRef.current = stripExpressionResult(nextTokens);
      setExpressionTokens(nextTokens);
      addReleasedBeads(bubble.count, sign, { x: bubble.x, y: bubble.y });
      resetOperatorSelection();
      notePositionAfterMove(hasPriorValue ? activeOperator : undefined);
    },
    [addReleasedBeads, divideWrappedGroup, isClear, isFailed, markBubbleInteraction, multiplyWrappedGroup, operatorUsage, playBubblePopSfx, triggerBubbleBurst],
  );

  // Called once a bubble has gone in. Everything is read from refs that the move has just set, so
  // the note is right whether or not the screen has been drawn again since.
  const notePositionAfterMove = (usedOperator: OperatorButtonSymbol | undefined) => {
    const positions = positionsRef.current;
    const usageBefore = positions[positions.length - 1]?.operatorUsage ?? operatorUsage;
    positionsRef.current = [
      ...positions,
      {
        tokens: expressionTokensRef.current,
        total: expressionTotalRef.current,
        pendingBubbles: pendingBubblesRef.current.filter((candidate) => !consumedPendingBubbleIdsRef.current.has(candidate.id)),
        operatorUsage: spendOperatorUse(usageBefore, usedOperator),
      },
    ];
    setMovesMade(positionsRef.current.length);
    const latest = positionsRef.current[positionsRef.current.length - 1];
    if (latest.pendingBubbles.length === 0) {
      onAllBubblesUsedRef.current?.(latest.total === target);
    }
  };

  const canUndo = !dentakuPractice && mode !== 'launch' && movesMade > 0 && !isClear;

  // Takes the last move back: the board is set up again as it stood after the move before it,
  // with that amount as plain maru. Also after a wrong result, so one slip need not cost the stage.
  const undoLastMove = () => {
    const taken = canUndo ? takeBackLastMove(positionsRef.current) : undefined;
    if (!taken) {
      return;
    }

    playUiActionSfx();
    resetStage();
    const position = taken.restore;
    if (!position) {
      return;
    }

    positionsRef.current = taken.positions;
    setMovesMade(taken.positions.length);
    pendingBubblesRef.current = position.pendingBubbles;
    setPendingBubbles(position.pendingBubbles);
    setOperatorUsage(position.operatorUsage);
    if (position.total !== 0) {
      addReleasedBeads(Math.abs(position.total), position.total < 0 ? -1 : 1, { x: fieldWidth / 2, y: fieldHeight * 0.42 });
      publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
    }
    expressionTokensRef.current = position.tokens;
    expressionHistoryRef.current = stripExpressionResult(position.tokens);
    expressionTotalRef.current = position.total;
    setExpressionTokens(position.tokens);
    resetOperatorSelection();
  };

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

  const clearQueuedMove = () => {
    queuedOperatorRef.current = undefined;
    setQueuedOperator(undefined);
    setWaitingBubble(undefined);
    clearHeldTaps();
  };

  // × and ÷ act on a positive amount. While the board is busy but the amount is positive, it is
  // only a matter of waiting for the maru to settle; at zero or below it will never be ready.
  const canBoardBecomeReadyForPriorityOperation = () => (getPendingOperationExpressionValue(expressionTokensRef.current) ?? 0) > 0;

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
      if (!canUseOperator(operatorUsage[operator])) {
        return;
      }
      if (queuedBubbleIdRef.current !== undefined && !carryingOutWaitingMoveRef.current) {
        // A bubble is waiting for the board, so that move is already made. This operator is for
        // the move after it. (It used to replace the waiting move, which then never happened.)
        playUiActionSfx();
        holdTap({ operator });
        return;
      }
      if ((operator === '×' || operator === '÷') && isBoardBusyForPriorityOperation()) {
        if (canBoardBecomeReadyForPriorityOperation()) {
          // Remember the tap and show it as chosen; it takes effect when the maru have settled.
          // (It used to be dropped without a sign, and the next bubble was then added instead.)
          if (queuedOperatorRef.current !== operator) {
            playUiActionSfx();
          }
          queuedOperatorRef.current = operator;
          setQueuedOperator(operator);
        } else {
          setRefusedMoves((count) => count + 1);
        }
        return;
      }
      // Choosing an operator directly replaces one that was waiting. A bubble waiting behind it
      // stays only when this is that same operator finally taking effect.
      const waitingOperator = queuedOperatorRef.current;
      queuedOperatorRef.current = undefined;
      setQueuedOperator(undefined);
      if (waitingOperator !== operator) {
        setWaitingBubble(undefined);
      }
      playUiActionSfx();
      const nextOperatorSign: BeadSign = operator === '-' ? -1 : operator === '+' ? 1 : selectedOperatorRef.current === '-' ? -1 : operatorSignRef.current;
      setHasReleasedBubble(true);

      if (operator === selectedOperator) {
        const toggledOperatorSign: BeadSign = (operator === '×' || operator === '÷') && operatorSignRef.current < 0 ? 1 : nextOperatorSign;
        operatorSignRef.current = toggledOperatorSign;
        setOperatorSign(toggledOperatorSign);
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
    [markBubbleInteraction, operatorUsage, playUiActionSfx, selectedOperator, wrapMultiplicandForMultiplication],
  );

  // Carries out a waiting operator, then the bubble behind it, once the maru have settled.
  useEffect(() => {
    if (queuedOperator === undefined && queuedBubbleId === undefined) {
      return undefined;
    }
    if (isClear || isFailed) {
      clearQueuedMove();
      return undefined;
    }

    const interval = setInterval(() => {
      if (isBoardBusyForPriorityOperation()) {
        if (!canBoardBecomeReadyForPriorityOperation()) {
          clearQueuedMove();
        }
        return;
      }

      carryingOutWaitingMoveRef.current = true;
      try {
        if (queuedOperator !== undefined) {
          selectOperator(queuedOperator);
          return;
        }

        const bubble = pendingBubbles.find((candidate) => candidate.id === queuedBubbleId);
        setWaitingBubble(undefined);
        if (bubble) {
          burstBubble(bubble);
        }
      } finally {
        carryingOutWaitingMoveRef.current = false;
      }
    }, QUEUED_MOVE_CHECK_MS);
    return () => clearInterval(interval);
    // clearQueuedMove and the two board checks only read refs and set state.
  }, [burstBubble, isClear, isFailed, pendingBubbles, queuedBubbleId, queuedOperator, selectOperator]);

  // Once nothing is waiting any more, carries out the taps that were made in the meantime, one
  // per render so that each sees the result of the one before. A tap may start waiting itself (a
  // × while the maru are still moving); the rest then stay held behind it.
  useEffect(() => {
    if (heldTapCount === 0 || queuedOperator !== undefined || queuedBubbleId !== undefined) {
      return;
    }
    if (isClear || isFailed) {
      clearHeldTaps();
      return;
    }

    const [tap, ...laterTaps] = heldTapsRef.current;
    heldTapsRef.current = laterTaps;
    setHeldTapCount(laterTaps.length);
    if (tap === undefined) {
      return;
    }
    if ('operator' in tap) {
      selectOperator(tap.operator);
      return;
    }
    const bubble = pendingBubbles.find((candidate) => candidate.id === tap.bubbleId);
    if (bubble) {
      burstBubble(bubble);
    }
    // clearHeldTaps only resets a ref and sets state.
  }, [burstBubble, heldTapCount, isClear, isFailed, pendingBubbles, queuedBubbleId, queuedOperator, selectOperator]);

  // A stage with bubbles left but no move the game would accept (the only operator left is a
  // division that does not come out even, say) cannot be finished. It used to just sit there. Now
  // it ends like a wrong result: quickly if the player has just tried something that was refused,
  // otherwise after a pause.
  useEffect(() => {
    if (mode === 'launch' || dentakuPractice || isClear || isFailed || pendingBubbles.length === 0 || !hasExpressionValue(expressionTokens)) {
      stuckPositionRef.current = undefined;
      return undefined;
    }

    const boardTotal = getPendingOperationExpressionValue(expressionTokens);
    const bubbleCounts = pendingBubbles.map((bubble) => bubble.count);
    if (boardTotal === undefined || queuedOperator !== undefined || queuedBubbleId !== undefined || heldTapCount > 0 || hasLegalMove(boardTotal, bubbleCounts, operatorUsage)) {
      stuckPositionRef.current = undefined;
      return undefined;
    }

    const positionKey = `${expressionTokens.join(' ')}|${pendingBubbles.map((bubble) => bubble.id).join(',')}`;
    if (stuckPositionRef.current?.key !== positionKey) {
      stuckPositionRef.current = { key: positionKey, refusedMoves };
    }
    if (divisionFailedAnimation) {
      // Let "this does not divide" finish playing first.
      return undefined;
    }

    const wasJustRefused = refusedMoves > stuckPositionRef.current.refusedMoves;
    const timeout = setTimeout(() => {
      setIsFailed(true);
      setFailedAt(Date.now());
    }, wasJustRefused ? STUCK_AFTER_REFUSAL_MS : STUCK_WITHOUT_TRYING_MS);
    return () => clearTimeout(timeout);
  }, [dentakuPractice, divisionFailedAnimation, expressionTokens, heldTapCount, isClear, isFailed, mode, operatorUsage, pendingBubbles, queuedBubbleId, queuedOperator, refusedMoves]);

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
        // The replay may have been skipped while this waited; its next bubble must not go in then.
        if (dentakuAutomationRunRef.current !== runId) {
          return;
        }
      }

      if (operand === 0) {
        const nextTokens = addNumberToExpression(expressionTokensRef.current, 0, selectedOperatorRef.current, expressionTotalRef.current);
        expressionTokensRef.current = nextTokens;
        expressionHistoryRef.current = stripExpressionResult(nextTokens);
        setExpressionTokens(nextTokens);
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

  // A child who does not find the way back to the pad is not left without it.
  useEffect(() => {
    if (!isLookingAtMaru) {
      return undefined;
    }
    const timeout = setTimeout(() => setKukuInputState('input'), LOOK_AT_MARU_MS);
    return () => clearTimeout(timeout);
  }, [isLookingAtMaru]);

  const canSkipReplay = Boolean(dentakuPractice && !dentakuPractice.longFormMode && kukuInputState === 'running' && !isClear && !isFailed);

  // After a right answer the maru act the calculation out, which takes a while with several
  // numbers. A tap stops that and shows where it would have ended: the answer on the board.
  const skipReplay = () => {
    if (!dentakuPractice || !canSkipReplay) {
      return;
    }

    dentakuAutomationRunRef.current += 1;
    // A fresh board, so nothing that was still moving or about to appear turns up afterwards.
    resetStage();
    pendingBubblesRef.current = [];
    setPendingBubbles([]);
    if (dentakuPractice.answer > 0) {
      addReleasedBeads(dentakuPractice.answer, 1, { x: fieldWidth / 2, y: fieldHeight * 0.42 });
      publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
    }
    const tokens = [
      ...dentakuPractice.operands.flatMap((operand, index) => (index === 0 ? [String(operand)] : [dentakuPractice.operators[index - 1], String(operand)])),
      '=',
      String(dentakuPractice.answer),
    ];
    expressionTokensRef.current = tokens;
    expressionHistoryRef.current = stripExpressionResult(tokens);
    expressionTotalRef.current = dentakuPractice.answer;
    setExpressionTokens(tokens);
    completeCurrentStage();
  };

  // After two wrong answers: the maru act the calculation out, then the question is asked again
  // with the result on the board as maru (and not as a number) for the child to read.
  const showAnswerAsMaru = (practice: DentakuPractice) => {
    setKukuInputState('showing');
    const runId = dentakuAutomationRunRef.current + 1;
    dentakuAutomationRunRef.current = runId;
    void (async () => {
      await runDentakuAutomation(practice, runId);
      await waitForDentakuAutomationIdle(runId);
      if (dentakuAutomationRunRef.current !== runId) {
        return;
      }
      // The state stays 'showing': the maru are left in view until the child asks for the pad.
      setIsAnswerShownAsMaru(true);
    })();
  };

  const answerAfterLooking = () => {
    if (isLookingAtMaru) {
      playUiActionSfx();
      setKukuInputState('input');
    }
  };

  const submitKukuAnswer = () => {
    if (!dentakuPractice || kukuInputState !== 'input' || isClear || isFailed || kukuInput.length === 0) {
      return;
    }

    const longFormStep = getLongFormStep(dentakuPractice, longFormStepIndex);
    const expectedAnswer = longFormStep?.expectedAnswer ?? dentakuPractice.answer;

    if (!matchesLongFormStepAnswer(kukuInput, expectedAnswer, longFormStep?.acceptsWrittenDigit ?? false)) {
      let showsMaru = false;
      if (!longFormStep) {
        dentakuPractice.onWrongAnswer?.();
        wrongAnswersRef.current += 1;
        showsMaru = wrongAnswersRef.current >= WRONG_ANSWERS_BEFORE_MARU && !isAnswerShownAsMaru;
      }
      playFailSfx();
      setKukuInputState('wrong');
      const runAtSubmit = dentakuAutomationRunRef.current;
      setTimeout(() => {
        // The question may have changed while the "wrong" shake played.
        if (dentakuAutomationRunRef.current !== runAtSubmit) {
          return;
        }
        setKukuInput('');
        if (showsMaru) {
          showAnswerAsMaru(dentakuPractice);
        } else if (isAnswerShownAsMaru) {
          // Wrong again with the maru already out: the pad steps aside for another look.
          setKukuInputState('showing');
        } else {
          setKukuInputState('input');
        }
      }, 560);
      return;
    }

    if (isAnswerShownAsMaru) {
      // The maru are already there; the right answer just ends the question.
      setKukuInputState('running');
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
      publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
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
        } else {
          const decomposition = productCollision ? undefined : findDecompositionPair(toSnapshots(entitiesRef.current));
          if (decomposition) {
            splitHigherBead(decomposition.higherBeadId, decomposition.lowerValue);
          } else {
            settleMergeIfReady(now);
          }
        }
      }
      // Moving maru redraw only the maru layer; this screen hears about it when the set of maru changes.
      publishBeads(beadFrameStore, setBeads, entitiesRef.current, fieldWidth, fieldHeight);
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

  const playNextStage = () => {
    playUiActionSfx();
    fadeOutResultSfx();
    markBubbleInteraction();
    if (dentakuPractice) {
      dentakuPractice.onNextQuestion();
      return;
    }
    if (stages && stageIndex >= stages.length - 1) {
      onLastStageNext?.();
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

  // A physical keyboard can drive the answer pad: digits, Backspace and Enter.
  const hasAnswerPad = Boolean(dentakuPractice);
  const isAnswerPadActive = hasAnswerPad && kukuInputState === 'input' && !isClear && !isFailed;
  const answerPadKeyHandlersRef = useRef({ isAnswerPadActive, appendKukuDigit, deleteKukuDigit, submitKukuAnswer });
  answerPadKeyHandlersRef.current = { isAnswerPadActive, appendKukuDigit, deleteKukuDigit, submitKukuAnswer };

  useEffect(() => {
    if (!hasAnswerPad || typeof document === 'undefined') {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) {
        return;
      }

      const handlers = answerPadKeyHandlersRef.current;
      if (!handlers.isAnswerPadActive) {
        return;
      }

      if (/^[0-9]$/.test(event.key)) {
        handlers.appendKukuDigit(event.key);
      } else if (event.key === 'Backspace') {
        handlers.deleteKukuDigit();
      } else if (event.key === 'Enter') {
        handlers.submitKukuAnswer();
      } else {
        return;
      }

      // Stops a focused on-screen key from also reacting to the same key press.
      event.preventDefault();
      event.stopPropagation();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [hasAnswerPad]);
  const longFormProblem = dentakuPractice?.longFormMode ? getLongFormProblem(dentakuPractice) : undefined;

  return (
    <View ref={screenRef} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTitleGroup}>
          {onBack && mode !== 'launch' ? (
            <Pressable accessibilityLabel={a11yLabel('Back')} accessibilityRole="button" onPress={goBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressedButton]}>
              <NavImageIcon kind="back" size={29} />
            </Pressable>
          ) : null}
          {(!dentakuPractice && (mode !== 'launch' || isClear)) || (dentakuPractice && isClear && !dentakuPractice.autoAdvance) ? (
            <HeaderActionButton
              isClear={isClear}
              isFailed={isFailed}
              failedAt={failedAt}
              isLaunch={mode === 'launch'}
              prefersReducedMotion={prefersReducedMotion}
              onPress={isClear ? (mode === 'launch' ? completeLaunch : playNextStage) : retryStage}
            />
          ) : null}
          {isLookingAtMaru ? (
            <Pressable
              accessibilityLabel={a11yLabel('answer')}
              accessibilityRole="button"
              testID="answer-after-looking"
              onPress={answerAfterLooking}
              style={({ pressed }) => [styles.headerRetryButton, pressed && styles.pressedButton]}
            >
              <NavImageIcon kind="skip" size={29} />
            </Pressable>
          ) : null}
          {canSkipReplay ? (
            <Pressable
              accessibilityLabel={a11yLabel('skip the replay')}
              accessibilityRole="button"
              testID="skip-replay"
              onPress={skipReplay}
              style={({ pressed }) => [styles.headerRetryButton, pressed && styles.pressedButton]}
            >
              <NavImageIcon kind="skip" size={29} />
            </Pressable>
          ) : null}
          <View style={styles.headerMainTitleShift}>
            {mode === 'launch' ? (
              <LaunchLogo onPress={onLogoPress} />
            ) : dentakuPractice ? (
              <KukuGoalTitle
                practice={dentakuPractice}
                input={kukuInput}
                maxWidth={Math.max(168, fieldWidth - 132)}
                isWrong={kukuInputState === 'wrong'}
              />
            ) : (
              <StageGoalTitle showsGoalParts={showsGoalAsMaru} stageMark={stageMark ?? stageNumberInIsland} target={target} maxWidth={Math.max(168, fieldWidth - 132)} />
            )}
          </View>
        </View>
        <Text testID="current-total-value" style={styles.hiddenMetric}>
          {total}
        </Text>
      </View>

      <View style={[styles.playArea, { width: fieldWidth }]}>
        <OperatorRail
          selectedOperator={queuedOperator ?? selectedOperator}
          operatorSign={operatorSign}
          operatorUsage={operatorUsage}
          hasInputValue={hasExpressionValue(expressionTokens)}
          hasActiveSelection={hasReleasedBubble || queuedOperator !== undefined}
          isLocked={isStageReadyForResult(pendingBubbles)}
          onSelect={selectOperator}
        />
        <View style={[styles.field, { width: fieldWidth, height: fieldHeight }]}>
          <BasinFrame segments={basinFrameSegments} />
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
          {isClear && !prefersReducedMotion ? <ClearBubbleFireworks fieldWidth={fieldWidth} fieldHeight={fieldHeight} /> : null}
          <BeadLayer
            store={beadFrameStore}
            expressionTokens={expressionTokens}
            hiddenBeadId={divisionSplitAnimation?.resultBeadId}
            draggingBeadId={draggingBeadId}
            onMove={moveBead}
            onDragStart={startDragBead}
            onDragEnd={endDragBead}
            onUnwrap={unwrapBeadGroup}
          />
          {mergeAnimation ? <MergePulse animation={mergeAnimation} /> : null}
          {divisionSplitAnimation ? <DivisionSplitOverlay animation={divisionSplitAnimation} /> : null}
          {divisionFailedAnimation ? <DivisionFailedOverlay animation={divisionFailedAnimation} /> : null}
          {isFailed ? <FailedWaterOverlay failedAt={failedAt} /> : null}
          {cornerBadge === undefined ? null : (
            <View pointerEvents="none" testID="corner-badge" style={styles.cornerBadge}>
              <Text style={styles.cornerBadgeText}>{cornerBadge}</Text>
            </View>
          )}
          {/* In the corner under the bowl, just above the end of the calculation line. The line's own box stays as it is on the opening screen. */}
          {!dentakuPractice && mode !== 'launch' ? (
            <Pressable
              accessibilityLabel={a11yLabel('undo')}
              accessibilityRole="button"
              accessibilityState={{ disabled: !canUndo }}
              disabled={!canUndo}
              testID="undo-move"
              onPress={undoLastMove}
              style={({ pressed }) => [styles.undoButton, !canUndo && styles.undoButtonDisabled, pressed && styles.pressedButton]}
            >
              <NavImageIcon kind="undo" size={29} />
            </Pressable>
          ) : null}
          {/* The whole board skips too; the button in the header is the one that says so. */}
          {canSkipReplay ? <Pressable aria-hidden focusable={false} testID="skip-replay-field" onPress={skipReplay} style={styles.skipReplayField} /> : null}
          {isLookingAtMaru ? <Pressable aria-hidden focusable={false} testID="look-at-maru-field" onPress={answerAfterLooking} style={styles.skipReplayField} /> : null}
        </View>
      </View>

      <View style={[styles.footer, { width: fieldWidth }]}>
        <View style={styles.footerControls}>
          {/* While the child reads the answer from the maru, the line stops before the "= result". */}
          <ExpressionDisplay tokens={isReadingAnswerFromMaru ? stripExpressionResult(footerExpressionTokens) : footerExpressionTokens} />
        </View>
      </View>
      {dentakuPractice && !isClear && (kukuInputState === 'input' || kukuInputState === 'wrong') ? (
        <KukuAnswerPad
          state={kukuInputState}
          canSubmit={kukuInput.length > 0 && kukuInputState === 'input' && !isFailed}
          longFormProblem={longFormProblem}
          longFormStepIndex={longFormStepIndex}
          longFormQuestionChangedAt={longFormQuestionChangedAt}
          input={kukuInput}
          onDigit={appendKukuDigit}
          onDelete={deleteKukuDigit}
          onSubmit={submitKukuAnswer}
        />
      ) : null}
      {isFailed ? <FailedScreenVeil failedAt={failedAt} /> : null}
      <BackgroundBubbleLayer
        bubbles={prefersReducedMotion ? NO_BACKGROUND_BUBBLES : backgroundBubbles}
        fieldWidth={width}
        fieldHeight={height}
        bubbleStarts={backgroundBubbleStarts}
        onPop={(bubbleId) => {
          playBackgroundBubbleSfx();
          setBackgroundBubbleStarts((current) => ({ ...current, [bubbleId]: Date.now() }));
        }}
      />
    </View>
  );
}

/**
 * Shows the maru as they are now: the maru layer gets the new positions, and the game screen is
 * told only if the set of maru changed.
 */
function publishBeads(
  store: BeadFrameStore,
  setBeads: Dispatch<SetStateAction<BeadSnapshot[]>>,
  entities: BeadEntity[],
  fieldWidth: number,
  fieldHeight: number,
) {
  const next = toSnapshots(entities, { width: fieldWidth, height: fieldHeight });
  // Positions are drawn on whole screen pixels anyway. Snapping them here means a maru that only
  // swayed by a fraction of a pixel is not drawn again.
  const pixelRatio = PixelRatio.get();
  for (const bead of next) {
    bead.x = snapToPixel(bead.x, pixelRatio);
    bead.y = snapToPixel(bead.y, pixelRatio);
  }
  store.publish(next);
  setBeads((current) => keepSameMaru(current, next));
}
