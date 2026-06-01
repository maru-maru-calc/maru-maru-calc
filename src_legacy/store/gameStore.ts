import { create } from 'zustand';

import { evaluateAdd } from '@/domain/math/evaluate';
import { createNumberGroup } from '@/domain/math/groups';
import { ExpressionHistoryItem, NumberGroup, NumberObject, OperatorType } from '@/domain/math/types';
import { isStageClear } from '@/domain/stage/clear';
import { Stage, StageId } from '@/domain/stage/types';
import { CarryAnimationEvent, GameStatus, GroupPosition, MergeAnimation } from '@/domain/game/types';
import { GameMessageKey, getGameMessage } from '@/domain/game/messages';
import { canDragGroup, canSelectGroup, getAddOperationPreview, getNearestGroupIdWithinRadius } from '@/domain/game/selectors';
import { SoundEffectId, getSoundEffectForMergeResult, getSoundEffectForMessage } from '@/domain/game/audio';

type PendingOperation = {
  numberGroups: NumberGroup[];
  numberObjects: NumberObject[];
  groupPositions: Record<string, GroupPosition>;
  placedGroupIds: string[];
  queuedGroupIds: string[];
  resultGroupId: string;
  historyItem: ExpressionHistoryItem;
  carryEvents: CarryAnimationEvent[];
};

type UndoSnapshot = {
  numberGroups: NumberGroup[];
  numberObjects: NumberObject[];
  groupPositions: Record<string, GroupPosition>;
  placedGroupIds: string[];
  queuedGroupIds: string[];
  moveCount: number;
  history: ExpressionHistoryItem[];
  lastCarryEvents: CarryAnimationEvent[];
};

type GameState = {
  activeStageId?: StageId;
  targetValue: number;
  numberGroups: NumberGroup[];
  numberObjects: NumberObject[];
  placedGroupIds: string[];
  queuedGroupIds: string[];
  selectedGroupIds: string[];
  activeOperator?: OperatorType;
  moveCount: number;
  resetCount: number;
  history: ExpressionHistoryItem[];
  status: GameStatus;
  lastCarryEvents: CarryAnimationEvent[];
  groupPositions: Record<string, GroupPosition>;
  settledGroupId?: string;
  draggingGroupId?: string;
  dropTargetGroupId?: string;
  activeMerge?: MergeAnimation;
  pendingOperation?: PendingOperation;
  undoStack: UndoSnapshot[];
  lastMessageKey?: GameMessageKey;
  lastMessage?: string;
  lastSoundEffectId?: SoundEffectId;
  soundEffectSeq: number;
  startStage: (stage: Stage) => void;
  resetStage: (stage: Stage) => void;
  dropQueuedGroup: () => void;
  selectGroup: (groupId: string) => void;
  startDraggingGroup: (groupId: string) => void;
  moveGroup: (groupId: string, position: GroupPosition) => void;
  endDraggingGroup: (groupId: string, position?: GroupPosition) => void;
  selectOperator: (operator: OperatorType) => void;
  executeActiveOperation: () => void;
  finishActiveMerge: () => void;
  undoLastOperation: () => void;
  clearSelection: () => void;
};

function buildInitialGroups(stage: Stage) {
  const groups: NumberGroup[] = [];
  const objects: NumberObject[] = [];
  const groupPositions: Record<string, GroupPosition> = {};

  stage.initialGroups.forEach((initialGroup, index) => {
    const { group, objects: groupObjects } = createNumberGroup(initialGroup.value, `${stage.id}-group-${index + 1}`);
    groups.push(group);
    objects.push(...groupObjects);
    groupPositions[group.id] = getInitialGroupPosition(index, stage.initialGroups.length);
  });

  return { groups, objects, groupPositions };
}

function createResultGroup(stageId: StageId, moveCount: number, result: ExpressionHistoryItem) {
  return createNumberGroup(result.resultValue, `${stageId}-result-${moveCount}`, result.expressionNode);
}

function getInitialGroupPosition(index: number, total: number): GroupPosition {
  if (total <= 1) {
    return { x: 0.5, y: 0.56 };
  }

  const spread = Math.min(0.44, 0.24 * (total - 1));
  const startX = 0.5 - spread / 2;
  const stepX = spread / Math.max(1, total - 1);
  const yOffsets = [0.58, 0.48, 0.65, 0.42];

  return {
    x: startX + stepX * index,
    y: yOffsets[index % yOffsets.length],
  };
}

function getSettledResultPosition(moveCount: number): GroupPosition {
  const offsets = [
    { x: 0.5, y: 0.54 },
    { x: 0.56, y: 0.5 },
    { x: 0.44, y: 0.58 },
  ];

  return offsets[moveCount % offsets.length];
}

function getDroppedGroupPosition(placedCount: number): GroupPosition {
  const positions = [
    { x: 0.5, y: 0.34 },
    { x: 0.42, y: 0.42 },
    { x: 0.58, y: 0.42 },
    { x: 0.37, y: 0.5 },
    { x: 0.63, y: 0.5 },
    { x: 0.5, y: 0.58 },
    { x: 0.44, y: 0.64 },
    { x: 0.56, y: 0.64 },
  ];

  return positions[placedCount % positions.length];
}

export const useGameStore = create<GameState>()((set, get) => ({
  targetValue: 0,
  numberGroups: [],
  numberObjects: [],
  placedGroupIds: [],
  queuedGroupIds: [],
  selectedGroupIds: [],
  moveCount: 0,
  resetCount: 0,
  history: [],
  status: 'idle',
  lastCarryEvents: [],
  groupPositions: {},
  undoStack: [],
  soundEffectSeq: 0,
  startStage: (stage) => {
    const current = get();
    if (current.activeStageId === stage.id && current.numberGroups.length > 0 && current.status !== 'clear') {
      return;
    }

    const { groups, objects, groupPositions } = buildInitialGroups(stage);
    set({
      activeStageId: stage.id,
      targetValue: stage.targetValue,
      numberGroups: groups,
      numberObjects: objects,
      placedGroupIds: [],
      queuedGroupIds: groups.map((group) => group.id),
      selectedGroupIds: [],
      activeOperator: undefined,
      moveCount: 0,
      resetCount: 0,
      history: [],
      status: 'selecting',
      lastCarryEvents: [],
      groupPositions,
      settledGroupId: undefined,
      draggingGroupId: undefined,
      dropTargetGroupId: undefined,
      activeMerge: undefined,
      pendingOperation: undefined,
      undoStack: [],
      lastMessageKey: 'start',
      lastMessage: getGameMessage('start'),
      lastSoundEffectId: undefined,
      soundEffectSeq: current.soundEffectSeq,
    });
  },
  resetStage: (stage) => {
    const { groups, objects, groupPositions } = buildInitialGroups(stage);
    set((state) => ({
      activeStageId: stage.id,
      targetValue: stage.targetValue,
      numberGroups: groups,
      numberObjects: objects,
      placedGroupIds: [],
      queuedGroupIds: groups.map((group) => group.id),
      selectedGroupIds: [],
      activeOperator: undefined,
      moveCount: 0,
      resetCount: state.resetCount + 1,
      history: [],
      status: 'selecting',
      lastCarryEvents: [],
      groupPositions,
      settledGroupId: undefined,
      draggingGroupId: undefined,
      dropTargetGroupId: undefined,
      activeMerge: undefined,
      pendingOperation: undefined,
      undoStack: [],
      lastMessageKey: 'reset',
      lastMessage: getGameMessage('reset'),
      ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('reset')),
    }));
  },
  dropQueuedGroup: () => {
    const state = get();
    if (state.status === 'evaluating' || state.status === 'clear') {
      return;
    }

    const queuedGroupId = state.queuedGroupIds[0];
    if (!queuedGroupId) {
      return;
    }

    if (state.placedGroupIds.length > 0 && !state.activeOperator) {
      set({
        status: 'invalid',
        lastMessageKey: 'selectOperatorBeforeDrop',
        lastMessage: getGameMessage('selectOperatorBeforeDrop'),
        ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('selectOperatorBeforeDrop')),
      });
      return;
    }

    const nextPlacedGroupIds = [...state.placedGroupIds, queuedGroupId];
    const nextQueuedGroupIds = state.queuedGroupIds.slice(1);
    const nextGroupPositions = {
      ...state.groupPositions,
      [queuedGroupId]: getDroppedGroupPosition(state.placedGroupIds.length),
    };
    const previousPlacedGroupId = state.placedGroupIds.at(-1);
    const nextSelectedGroupIds =
      previousPlacedGroupId && state.activeOperator ? [previousPlacedGroupId, queuedGroupId] : state.selectedGroupIds;
    const lastMessageKey: GameMessageKey = nextSelectedGroupIds.length === 2 ? 'readyToAdd' : 'placed';

    set({
      placedGroupIds: nextPlacedGroupIds,
      queuedGroupIds: nextQueuedGroupIds,
      groupPositions: nextGroupPositions,
      selectedGroupIds: nextSelectedGroupIds,
      activeOperator: previousPlacedGroupId ? state.activeOperator : undefined,
      status: 'selecting',
      settledGroupId: queuedGroupId,
      lastMessageKey,
      lastMessage: getGameMessage(lastMessageKey),
      ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage(lastMessageKey)),
    });
  },
  selectGroup: (groupId) => {
    const { activeOperator, selectedGroupIds, status } = get();
    if (!canSelectGroup(status)) {
      return;
    }

    const nextSelectedGroupIds = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter((selectedGroupId) => selectedGroupId !== groupId)
      : [...selectedGroupIds, groupId].slice(-2);

    const lastMessageKey: GameMessageKey =
      nextSelectedGroupIds.length === 0
        ? 'selectionCleared'
        : nextSelectedGroupIds.length === 2
          ? 'readyToAdd'
          : 'selectAnother';
    set({
      selectedGroupIds: nextSelectedGroupIds,
      activeOperator: nextSelectedGroupIds.length === 0 ? undefined : activeOperator,
      lastMessageKey,
      lastMessage: getGameMessage(lastMessageKey),
      ...withSoundEffect(get().soundEffectSeq, getSoundEffectForMessage(lastMessageKey)),
      status: 'selecting',
      settledGroupId: undefined,
    });
  },
  startDraggingGroup: (groupId) => {
    const { status } = get();
    if (!canDragGroup(status)) {
      return;
    }

    const lastMessageKey: GameMessageKey = status === 'clear' ? 'draggingClear' : 'dragging';
    set({
      draggingGroupId: groupId,
      dropTargetGroupId: undefined,
      settledGroupId: undefined,
      lastMessageKey,
      lastMessage: getGameMessage(lastMessageKey),
      lastSoundEffectId: undefined,
    });
  },
  moveGroup: (groupId, position) => {
    const { status, numberGroups, groupPositions, draggingGroupId } = get();
    if (!canDragGroup(status)) {
      return;
    }

    const nextPosition = clampGroupPosition(position);
    const dropTargetGroupId =
      status === 'clear'
        ? undefined
        : getNearestGroupIdWithinRadius(numberGroups, groupPositions, groupId, nextPosition, DROP_PAIR_RADIUS);

    if (draggingGroupId === groupId) {
      set({
        dropTargetGroupId,
        settledGroupId: undefined,
      });
      return;
    }

    set({
      groupPositions: {
        ...groupPositions,
        [groupId]: nextPosition,
      },
      dropTargetGroupId,
      settledGroupId: undefined,
    });
  },
  endDraggingGroup: (groupId, position) => {
    const state = get();
    if (!canDragGroup(state.status)) {
      return;
    }

    const nextPosition = clampGroupPosition(position ?? state.groupPositions[groupId] ?? { x: 0.5, y: 0.55 });
    if (state.status === 'clear') {
      set({
        groupPositions: {
          ...state.groupPositions,
          [groupId]: nextPosition,
        },
        draggingGroupId: undefined,
        dropTargetGroupId: undefined,
        settledGroupId: groupId,
        lastMessageKey: 'draggingClear',
        lastMessage: getGameMessage('draggingClear'),
        ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('draggingClear')),
      });
      return;
    }

    const nearestGroupId = getNearestGroupIdWithinRadius(
      state.numberGroups,
      state.groupPositions,
      groupId,
      nextPosition,
      DROP_PAIR_RADIUS,
    );

    if (nearestGroupId) {
      const preview = getAddOperationPreview(state.numberGroups, [nearestGroupId, groupId]);
      if (!preview.ok) {
        const lastMessageKey: GameMessageKey = preview.reason === 'result-out-of-range' ? 'outOfRange' : 'retrySelection';
        set({
          groupPositions: {
            ...state.groupPositions,
            [groupId]: nextPosition,
          },
          selectedGroupIds: [],
          activeOperator: undefined,
          draggingGroupId: undefined,
          dropTargetGroupId: undefined,
          settledGroupId: undefined,
          status: 'invalid',
          lastMessageKey,
          lastMessage: getGameMessage(lastMessageKey),
          ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage(lastMessageKey)),
        });
        return;
      }

      const targetPosition = state.groupPositions[nearestGroupId] ?? nextPosition;
      const snappedPositions = getSnappedPairPositions(nextPosition, targetPosition);
      set({
        groupPositions: {
          ...state.groupPositions,
          [groupId]: snappedPositions.source,
          [nearestGroupId]: snappedPositions.target,
        },
        selectedGroupIds: [nearestGroupId, groupId],
        activeOperator: undefined,
        draggingGroupId: undefined,
        dropTargetGroupId: undefined,
        settledGroupId: undefined,
        status: 'selecting',
        lastMessageKey: 'readyToAdd',
        lastMessage: getGameMessage('readyToAdd'),
        ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('readyToAdd')),
      });
      return;
    }

    set({
      groupPositions: {
        ...state.groupPositions,
        [groupId]: nextPosition,
      },
      draggingGroupId: undefined,
      dropTargetGroupId: undefined,
      settledGroupId: undefined,
      lastMessageKey: 'placed',
      lastMessage: getGameMessage('placed'),
      ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('placed')),
    });
  },
  selectOperator: (operator) => {
    const { selectedGroupIds, status } = get();
    if (status === 'clear') {
      return;
    }

    const lastMessageKey: GameMessageKey = selectedGroupIds.length === 2 ? 'pressPlusAgain' : 'selectTwo';
    set({
      activeOperator: operator,
      lastMessageKey,
      lastMessage: getGameMessage(lastMessageKey),
      ...withSoundEffect(get().soundEffectSeq, getSoundEffectForMessage(lastMessageKey)),
    });
  },
  executeActiveOperation: () => {
    const state = get();
    if (state.status === 'clear') {
      return;
    }

    const preview = getAddOperationPreview(state.numberGroups, state.selectedGroupIds);
    if (!preview.ok && preview.reason === 'needs-two-groups') {
      set({
        status: 'invalid',
        lastMessageKey: 'selectTwoBeforeAdd',
        lastMessage: getGameMessage('selectTwoBeforeAdd'),
        ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('selectTwoBeforeAdd')),
      });
      return;
    }

    if (!preview.ok && preview.reason === 'result-out-of-range') {
      set({
        status: 'invalid',
        lastMessageKey: 'outOfRange',
        lastMessage: getGameMessage('outOfRange'),
        ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('outOfRange')),
      });
      return;
    }

    const [leftGroupId, rightGroupId] = state.selectedGroupIds;
    const leftGroup = state.numberGroups.find((group) => group.id === leftGroupId);
    const rightGroup = state.numberGroups.find((group) => group.id === rightGroupId);
    if (!preview.ok || !leftGroup || !rightGroup) {
      set({
        status: 'invalid',
        selectedGroupIds: [],
        lastMessageKey: 'retrySelection',
        lastMessage: getGameMessage('retrySelection'),
        ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('retrySelection')),
      });
      return;
    }

    const evaluation = evaluateAdd(leftGroup, rightGroup);
    if (!evaluation.ok) {
      set({
        status: 'invalid',
        lastMessageKey: 'outOfRange',
        lastMessage: getGameMessage('outOfRange'),
        ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('outOfRange')),
      });
      return;
    }

    const nextMoveCount = state.moveCount + 1;
    const activeStageId = state.activeStageId ?? 'stage-1';
    const historyItem: ExpressionHistoryItem = {
      id: `${activeStageId}-step-${nextMoveCount}`,
      expressionNode: evaluation.expressionNode,
      operator: 'add',
      leftValue: evaluation.leftValue,
      rightValue: evaluation.rightValue,
      resultValue: evaluation.resultValue,
      stepIndex: nextMoveCount,
    };
    const { group: resultGroup, objects: resultObjects } = createResultGroup(activeStageId, nextMoveCount, historyItem);
    const resultPosition = getSettledResultPosition(nextMoveCount);
    const nextNumberGroups = [
      ...state.numberGroups.filter((group) => group.id !== leftGroup.id && group.id !== rightGroup.id),
      resultGroup,
    ];
    const nextNumberObjects = [
      ...state.numberObjects.filter((object) => object.groupId !== leftGroup.id && object.groupId !== rightGroup.id),
      ...resultObjects,
    ];
    const nextGroupPositions = {
      ...Object.fromEntries(
        Object.entries(state.groupPositions).filter(
          ([groupId]) => groupId !== leftGroup.id && groupId !== rightGroup.id,
        ),
      ),
      [resultGroup.id]: resultPosition,
    };
    const nextPlacedGroupIds = [
      ...state.placedGroupIds.filter((groupId) => groupId !== leftGroup.id && groupId !== rightGroup.id),
      resultGroup.id,
    ];
    const carryEvents = evaluation.breakdown.carrySteps.map((step) => ({
      id: `${historyItem.id}-carry-${step.fromDigit}`,
      fromDigit: step.fromDigit,
      toDigit: step.toDigit,
      beforeCount: step.beforeCount,
      carryCount: step.carryCount,
      remainderCount: step.remainderCount,
      resultValue: evaluation.resultValue,
    }));

    const lastMessageKey: GameMessageKey = evaluation.carryEvents.length > 0 ? 'carryBuilding' : 'merging';
    set({
      selectedGroupIds: [leftGroup.id, rightGroup.id],
      activeOperator: 'add',
      moveCount: nextMoveCount,
      status: 'evaluating',
      groupPositions: {
        ...state.groupPositions,
        [leftGroup.id]: { x: 0.44, y: 0.52 },
        [rightGroup.id]: { x: 0.56, y: 0.52 },
      },
      settledGroupId: undefined,
      draggingGroupId: undefined,
      dropTargetGroupId: undefined,
      activeMerge: {
        id: historyItem.id,
        leftValue: evaluation.leftValue,
        rightValue: evaluation.rightValue,
        resultValue: evaluation.resultValue,
        carryEvents: evaluation.carryEvents,
        carrySteps: evaluation.breakdown.carrySteps,
      },
      pendingOperation: {
        numberGroups: nextNumberGroups,
        numberObjects: nextNumberObjects,
        groupPositions: nextGroupPositions,
        placedGroupIds: nextPlacedGroupIds,
        queuedGroupIds: state.queuedGroupIds,
        resultGroupId: resultGroup.id,
        historyItem,
        carryEvents,
      },
      undoStack: [
        ...state.undoStack,
        {
          numberGroups: state.numberGroups,
          numberObjects: state.numberObjects,
          groupPositions: state.groupPositions,
          placedGroupIds: state.placedGroupIds,
          queuedGroupIds: state.queuedGroupIds,
          moveCount: state.moveCount,
          history: state.history,
          lastCarryEvents: state.lastCarryEvents,
        },
      ],
      lastMessageKey,
      lastMessage: getGameMessage(lastMessageKey),
      ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage(lastMessageKey)),
    });
  },
  finishActiveMerge: () => {
    const state = get();
    if (state.status !== 'evaluating') {
      return;
    }

    const pendingOperation = state.pendingOperation;
    if (!pendingOperation) {
      set({
        status: 'selecting',
        activeMerge: undefined,
        selectedGroupIds: [],
        lastMessageKey: 'retrySelection',
        lastMessage: getGameMessage('retrySelection'),
        ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('retrySelection')),
      });
      return;
    }

    const nextStatus = isStageClear(pendingOperation.numberGroups, state.targetValue) ? 'clear' : 'selecting';
    const lastMessageKey: GameMessageKey =
      nextStatus === 'clear' ? 'targetMade' : pendingOperation.carryEvents.length > 0 ? 'carryMade' : 'resultReady';
    set({
      numberGroups: pendingOperation.numberGroups,
      numberObjects: pendingOperation.numberObjects,
      groupPositions: pendingOperation.groupPositions,
      placedGroupIds: pendingOperation.placedGroupIds,
      queuedGroupIds: pendingOperation.queuedGroupIds,
      settledGroupId: pendingOperation.resultGroupId,
      selectedGroupIds: [],
      activeOperator: undefined,
      history: [...state.history, pendingOperation.historyItem],
      status: nextStatus,
      activeMerge: undefined,
      pendingOperation: undefined,
      draggingGroupId: undefined,
      dropTargetGroupId: undefined,
      lastCarryEvents: pendingOperation.carryEvents,
      lastMessageKey,
      lastMessage: getGameMessage(lastMessageKey),
      ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMergeResult(nextStatus, pendingOperation.carryEvents)),
    });
  },
  undoLastOperation: () => {
    const state = get();
    if (state.status === 'evaluating' || state.status === 'clear' || state.undoStack.length === 0) {
      return;
    }

    const snapshot = state.undoStack.at(-1);
    if (!snapshot) {
      return;
    }

    set({
      numberGroups: snapshot.numberGroups,
      numberObjects: snapshot.numberObjects,
      groupPositions: snapshot.groupPositions,
      placedGroupIds: snapshot.placedGroupIds,
      queuedGroupIds: snapshot.queuedGroupIds,
      moveCount: snapshot.moveCount,
      history: snapshot.history,
      lastCarryEvents: snapshot.lastCarryEvents,
      undoStack: state.undoStack.slice(0, -1),
      selectedGroupIds: [],
      activeOperator: undefined,
      status: 'selecting',
      activeMerge: undefined,
      pendingOperation: undefined,
      settledGroupId: undefined,
      draggingGroupId: undefined,
      dropTargetGroupId: undefined,
      lastMessageKey: 'undone',
      lastMessage: getGameMessage('undone'),
      ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('undone')),
    });
  },
  clearSelection: () =>
    set((state) => ({
      selectedGroupIds: [],
      activeOperator: undefined,
      pendingOperation: undefined,
      settledGroupId: undefined,
      draggingGroupId: undefined,
      dropTargetGroupId: undefined,
      lastMessageKey: 'selectionCleared',
      lastMessage: getGameMessage('selectionCleared'),
      ...withSoundEffect(state.soundEffectSeq, getSoundEffectForMessage('selectionCleared')),
    })),
}));

const DROP_PAIR_RADIUS = 0.2;

function clampPosition(value: number) {
  return Math.min(0.86, Math.max(0.14, value));
}

function clampGroupPosition(position: GroupPosition): GroupPosition {
  return {
    x: clampPosition(position.x),
    y: clampPosition(position.y),
  };
}

function getSnappedPairPositions(source: GroupPosition, target: GroupPosition) {
  const center = {
    x: clampPosition((source.x + target.x) / 2),
    y: clampPosition((source.y + target.y) / 2),
  };
  const sourceIsRight = source.x >= target.x;
  const offsetX = 0.055;
  const offsetY = 0.012;

  return {
    source: {
      x: clampPosition(center.x + (sourceIsRight ? offsetX : -offsetX)),
      y: clampPosition(center.y + offsetY),
    },
    target: {
      x: clampPosition(center.x + (sourceIsRight ? -offsetX : offsetX)),
      y: clampPosition(center.y - offsetY),
    },
  };
}

function withSoundEffect(soundEffectSeq: number, soundEffectId?: SoundEffectId) {
  return {
    lastSoundEffectId: soundEffectId,
    soundEffectSeq: soundEffectId ? soundEffectSeq + 1 : soundEffectSeq,
  };
}
