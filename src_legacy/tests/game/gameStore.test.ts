import { beforeEach, describe, expect, it } from 'vitest';

import { initialStages } from '@/data/stages';
import { Stage } from '@/domain/stage/types';
import { useGameStore } from '@/store/gameStore';

const stageOne = initialStages[0];
const carryStage = initialStages[2];
const multiStepStage = initialStages[5];
const outOfRangeStage: Stage = {
  id: 'stage-99',
  worldId: 'addition-island',
  kind: 'practice',
  title: 'Out of range',
  description: 'Out of range',
  order: 99,
  targetValue: 999,
  initialGroups: [{ value: 900 }, { value: 100 }],
  allowedOperators: ['add'],
  solution: {
    steps: [],
  },
};

describe('gameStore', () => {
  beforeEach(() => {
    useGameStore.getState().resetStage(stageOne);
  });

  it('keeps source groups visible while an add merge is evaluating', () => {
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.selectGroup(left.id);
    store.selectGroup(right.id);
    store.executeActiveOperation();

    const evaluatingState = useGameStore.getState();
    expect(evaluatingState.status).toBe('evaluating');
    expect(evaluatingState.numberGroups.map((group) => group.value)).toEqual([2, 3]);
    expect(evaluatingState.selectedGroupIds).toEqual([left.id, right.id]);
    expect(evaluatingState.groupPositions[left.id]).toEqual({ x: 0.44, y: 0.52 });
    expect(evaluatingState.groupPositions[right.id]).toEqual({ x: 0.56, y: 0.52 });
    expect(evaluatingState.activeMerge).toMatchObject({
      leftValue: 2,
      rightValue: 3,
      resultValue: 5,
    });
    expect(evaluatingState.history).toHaveLength(0);
  });

  it('starts stages with groups queued above an empty bowl', () => {
    const state = useGameStore.getState();

    expect(state.placedGroupIds).toEqual([]);
    expect(state.queuedGroupIds).toEqual(state.numberGroups.map((group) => group.id));
  });

  it('drops the first queued group into the bowl without an operator', () => {
    const [firstGroup] = useGameStore.getState().numberGroups;

    useGameStore.getState().dropQueuedGroup();

    const state = useGameStore.getState();
    expect(state.placedGroupIds).toEqual([firstGroup.id]);
    expect(state.queuedGroupIds).toEqual([state.numberGroups[1].id]);
    expect(state.settledGroupId).toBe(firstGroup.id);
    expect(state.lastMessageKey).toBe('placed');
  });

  it('requires an operator before dropping a second queued group', () => {
    useGameStore.getState().dropQueuedGroup();
    useGameStore.getState().dropQueuedGroup();

    const state = useGameStore.getState();
    expect(state.placedGroupIds).toHaveLength(1);
    expect(state.queuedGroupIds).toHaveLength(1);
    expect(state.status).toBe('invalid');
    expect(state.lastMessageKey).toBe('selectOperatorBeforeDrop');
  });

  it('does not let an operator selected before the first drop arm the second drop', () => {
    useGameStore.getState().selectOperator('add');
    useGameStore.getState().dropQueuedGroup();

    expect(useGameStore.getState().activeOperator).toBeUndefined();

    useGameStore.getState().dropQueuedGroup();

    expect(useGameStore.getState().placedGroupIds).toHaveLength(1);
    expect(useGameStore.getState().lastMessageKey).toBe('selectOperatorBeforeDrop');
  });

  it('drops the second queued group after selecting add and prepares the pair', () => {
    const [left, right] = useGameStore.getState().numberGroups;

    useGameStore.getState().dropQueuedGroup();
    useGameStore.getState().selectOperator('add');
    useGameStore.getState().dropQueuedGroup();

    const state = useGameStore.getState();
    expect(state.placedGroupIds).toEqual([left.id, right.id]);
    expect(state.queuedGroupIds).toEqual([]);
    expect(state.selectedGroupIds).toEqual([left.id, right.id]);
    expect(state.lastMessageKey).toBe('readyToAdd');
  });

  it('stacks queued groups into different bowl positions as they land', () => {
    const store = useGameStore.getState();

    store.dropQueuedGroup();
    const firstLanding = useGameStore.getState().groupPositions[store.numberGroups[0].id];

    store.selectOperator('add');
    store.dropQueuedGroup();
    const secondLanding = useGameStore.getState().groupPositions[store.numberGroups[1].id];

    expect(firstLanding).toEqual({ x: 0.5, y: 0.34 });
    expect(secondLanding).toEqual({ x: 0.42, y: 0.42 });
  });

  it('clears a stage through the queued bubble drop flow', () => {
    useGameStore.getState().dropQueuedGroup();
    useGameStore.getState().selectOperator('add');
    useGameStore.getState().dropQueuedGroup();
    useGameStore.getState().executeActiveOperation();
    useGameStore.getState().finishActiveMerge();

    const state = useGameStore.getState();
    expect(state.status).toBe('clear');
    expect(state.placedGroupIds).toEqual([state.numberGroups[0].id]);
    expect(state.queuedGroupIds).toEqual([]);
    expect(state.activeOperator).toBeUndefined();
  });

  it('commits the result group after the merge animation finishes', () => {
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.selectGroup(left.id);
    store.selectGroup(right.id);
    store.executeActiveOperation();
    useGameStore.getState().finishActiveMerge();

    const committedState = useGameStore.getState();
    expect(committedState.status).toBe('clear');
    expect(committedState.numberGroups.map((group) => group.value)).toEqual([5]);
    expect(committedState.numberObjects).toHaveLength(5);
    expect(committedState.selectedGroupIds).toEqual([]);
    expect(Object.keys(committedState.groupPositions)).toHaveLength(1);
    expect(committedState.settledGroupId).toBe(committedState.numberGroups[0].id);
    expect(committedState.activeMerge).toBeUndefined();
    expect(committedState.history).toHaveLength(1);
  });

  it('moves groups within the bowl bounds without changing the selected groups', () => {
    const store = useGameStore.getState();
    const [left] = store.numberGroups;

    store.selectGroup(left.id);
    store.moveGroup(left.id, { x: 1.2, y: -0.2 });

    const movedState = useGameStore.getState();
    expect(movedState.selectedGroupIds).toEqual([left.id]);
    expect(movedState.groupPositions[left.id]).toEqual({ x: 0.86, y: 0.14 });
  });

  it('tracks the group currently being dragged and clears it when released', () => {
    const store = useGameStore.getState();
    const [left] = store.numberGroups;

    store.startDraggingGroup(left.id);
    expect(useGameStore.getState().draggingGroupId).toBe(left.id);
    expect(useGameStore.getState().lastMessage).toBe('数を動かしています');
    expect(useGameStore.getState().lastSoundEffectId).toBeUndefined();

    useGameStore.getState().endDraggingGroup(left.id, { x: 0.42, y: 0.61 });

    const releasedState = useGameStore.getState();
    expect(releasedState.draggingGroupId).toBeUndefined();
    expect(releasedState.groupPositions[left.id]).toEqual({ x: 0.42, y: 0.61 });
    expect(releasedState.lastMessage).toBe('数を置きました');
    expect(releasedState.lastSoundEffectId).toBe('place');
  });

  it('tracks the group that will pair with the dragged group', () => {
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.startDraggingGroup(left.id);
    useGameStore.getState().moveGroup(left.id, { x: 0.61, y: 0.49 });

    const nearState = useGameStore.getState();
    expect(nearState.draggingGroupId).toBe(left.id);
    expect(nearState.dropTargetGroupId).toBe(right.id);
    expect(nearState.groupPositions[left.id]).toEqual({ x: 0.38, y: 0.58 });

    useGameStore.getState().moveGroup(left.id, { x: 0.14, y: 0.14 });
    expect(useGameStore.getState().dropTargetGroupId).toBeUndefined();
  });

  it('selects two groups when a dragged group is released near another group', () => {
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.startDraggingGroup(left.id);
    useGameStore.getState().endDraggingGroup(left.id, { x: 0.61, y: 0.49 });

    const pairedState = useGameStore.getState();
    expect(pairedState.draggingGroupId).toBeUndefined();
    expect(pairedState.dropTargetGroupId).toBeUndefined();
    expect(pairedState.selectedGroupIds).toEqual([right.id, left.id]);
    expect(pairedState.status).toBe('selecting');
    expect(pairedState.lastMessageKey).toBe('readyToAdd');
    expect(pairedState.lastSoundEffectId).toBe('select');
    expect(pairedState.groupPositions[left.id].x).toBeCloseTo(0.56);
    expect(pairedState.groupPositions[right.id].x).toBeCloseTo(0.67);
  });

  it('rejects a dropped pair when the add result is outside the MVP range', () => {
    useGameStore.getState().startStage(outOfRangeStage);
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.startDraggingGroup(left.id);
    useGameStore.getState().endDraggingGroup(left.id, { x: 0.61, y: 0.49 });

    const rejectedState = useGameStore.getState();
    expect(rejectedState.status).toBe('invalid');
    expect(rejectedState.selectedGroupIds).toEqual([]);
    expect(rejectedState.draggingGroupId).toBeUndefined();
    expect(rejectedState.dropTargetGroupId).toBeUndefined();
    expect(rejectedState.lastMessageKey).toBe('outOfRange');
    expect(rejectedState.lastSoundEffectId).toBe('invalid');
    expect(rejectedState.numberGroups.map((group) => group.id)).toEqual([left.id, right.id]);
  });

  it('does not move groups while an add merge is evaluating', () => {
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.selectGroup(left.id);
    store.selectGroup(right.id);
    store.executeActiveOperation();
    useGameStore.getState().moveGroup(left.id, { x: 0.8, y: 0.8 });

    const evaluatingState = useGameStore.getState();
    expect(evaluatingState.groupPositions[left.id]).toEqual({ x: 0.44, y: 0.52 });
  });

  it('keeps the resolved result group touchable after clear', () => {
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.selectGroup(left.id);
    store.selectGroup(right.id);
    store.executeActiveOperation();
    useGameStore.getState().finishActiveMerge();

    const resultGroup = useGameStore.getState().numberGroups[0];
    useGameStore.getState().moveGroup(resultGroup.id, { x: 0.72, y: 0.68 });

    const movedClearState = useGameStore.getState();
    expect(movedClearState.status).toBe('clear');
    expect(movedClearState.numberGroups.map((group) => group.value)).toEqual([5]);
    expect(movedClearState.groupPositions[resultGroup.id]).toEqual({ x: 0.72, y: 0.68 });
  });

  it('records carry events after a carrying add resolves', () => {
    useGameStore.getState().startStage(carryStage);
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.selectGroup(left.id);
    store.selectGroup(right.id);
    store.executeActiveOperation();
    useGameStore.getState().finishActiveMerge();

    const committedState = useGameStore.getState();
    expect(committedState.status).toBe('clear');
    expect(committedState.numberGroups.map((group) => group.value)).toEqual([12]);
    expect(committedState.lastCarryEvents).toMatchObject([
      {
        fromDigit: 1,
        toDigit: 10,
        beforeCount: 12,
        carryCount: 1,
        remainderCount: 2,
        resultValue: 12,
      },
    ]);
  });

  it('does not evaluate without two selected groups', () => {
    const store = useGameStore.getState();
    const [left] = store.numberGroups;

    store.selectGroup(left.id);
    store.executeActiveOperation();

    const invalidState = useGameStore.getState();
    expect(invalidState.status).toBe('invalid');
    expect(invalidState.lastMessageKey).toBe('selectTwoBeforeAdd');
    expect(invalidState.moveCount).toBe(0);
  });

  it('rejects add results above the MVP range without spending a move', () => {
    useGameStore.getState().startStage(outOfRangeStage);
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.selectGroup(left.id);
    store.selectGroup(right.id);
    store.executeActiveOperation();

    const invalidState = useGameStore.getState();
    expect(invalidState.status).toBe('invalid');
    expect(invalidState.lastMessageKey).toBe('outOfRange');
    expect(invalidState.lastSoundEffectId).toBe('invalid');
    expect(invalidState.moveCount).toBe(0);
    expect(invalidState.numberGroups.map((group) => group.value)).toEqual([900, 100]);
  });

  it('clears the active operator when the last selected group is deselected', () => {
    const store = useGameStore.getState();
    const [left] = store.numberGroups;

    store.selectGroup(left.id);
    store.selectOperator('add');
    store.selectGroup(left.id);

    const clearedSelectionState = useGameStore.getState();
    expect(clearedSelectionState.selectedGroupIds).toEqual([]);
    expect(clearedSelectionState.activeOperator).toBeUndefined();
    expect(clearedSelectionState.lastMessageKey).toBe('selectionCleared');
  });

  it('increments sound effect sequence for repeated selectable actions', () => {
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.selectGroup(left.id);
    const firstSeq = useGameStore.getState().soundEffectSeq;
    useGameStore.getState().selectGroup(right.id);

    const secondSelectionState = useGameStore.getState();
    expect(secondSelectionState.lastSoundEffectId).toBe('select');
    expect(secondSelectionState.soundEffectSeq).toBe(firstSeq + 1);
  });

  it('keeps an intermediate result selectable for the next add step', () => {
    useGameStore.getState().startStage(multiStepStage);
    const store = useGameStore.getState();
    const [two, three, ten] = store.numberGroups;

    store.selectGroup(two.id);
    store.selectGroup(three.id);
    store.executeActiveOperation();
    useGameStore.getState().finishActiveMerge();

    const afterFirstAdd = useGameStore.getState();
    const resultGroup = afterFirstAdd.numberGroups.find((group) => group.value === 5);
    expect(afterFirstAdd.status).toBe('selecting');
    expect(afterFirstAdd.lastMessageKey).toBe('resultReady');
    expect(afterFirstAdd.lastSoundEffectId).toBe('merge');
    expect(resultGroup).toBeDefined();

    if (!resultGroup) {
      throw new Error('expected intermediate result group');
    }

    useGameStore.getState().selectGroup(resultGroup.id);
    useGameStore.getState().selectGroup(ten.id);
    useGameStore.getState().executeActiveOperation();
    useGameStore.getState().finishActiveMerge();

    const clearedState = useGameStore.getState();
    expect(clearedState.status).toBe('clear');
    expect(clearedState.lastSoundEffectId).toBe('clear');
    expect(clearedState.numberGroups.map((group) => group.value)).toEqual([15]);
    expect(clearedState.history.map((item) => item.resultValue)).toEqual([5, 15]);
  });

  it('undoes the previous merge while a stage is still in progress', () => {
    useGameStore.getState().startStage(multiStepStage);
    const store = useGameStore.getState();
    const [two, three] = store.numberGroups;

    store.selectGroup(two.id);
    store.selectGroup(three.id);
    store.executeActiveOperation();
    useGameStore.getState().finishActiveMerge();

    expect(useGameStore.getState().numberGroups.map((group) => group.value)).toEqual([10, 5]);

    useGameStore.getState().undoLastOperation();

    const undoneState = useGameStore.getState();
    expect(undoneState.status).toBe('selecting');
    expect(undoneState.numberGroups.map((group) => group.value)).toEqual([2, 3, 10]);
    expect(undoneState.moveCount).toBe(0);
    expect(undoneState.history).toEqual([]);
    expect(undoneState.lastMessageKey).toBe('undone');
    expect(undoneState.lastSoundEffectId).toBe('reset');
  });

  it('does not undo after a stage has cleared', () => {
    const store = useGameStore.getState();
    const [left, right] = store.numberGroups;

    store.selectGroup(left.id);
    store.selectGroup(right.id);
    store.executeActiveOperation();
    useGameStore.getState().finishActiveMerge();
    useGameStore.getState().undoLastOperation();

    expect(useGameStore.getState().status).toBe('clear');
    expect(useGameStore.getState().numberGroups.map((group) => group.value)).toEqual([5]);
  });
});
