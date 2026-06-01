import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { getMergeAnimationDuration } from '@/animation/merge';
import { useSoundEffect } from '@/animation/useSoundEffect';
import { AppButton } from '@/components/AppButton';
import { AdditionReadinessHint } from '@/components/AdditionReadinessHint';
import { Bowl } from '@/components/Bowl';
import { FallingGroupBubble } from '@/components/FallingGroupBubble';
import { ExpressionHistoryList } from '@/components/ExpressionHistoryList';
import { InlineClearPanel } from '@/components/InlineClearPanel';
import { OperatorTray } from '@/components/OperatorTray';
import { OperationPreview } from '@/components/OperationPreview';
import { QueuedGroupBubble } from '@/components/QueuedGroupBubble';
import { ScreenShell } from '@/components/ScreenShell';
import { TargetDisplay } from '@/components/TargetDisplay';
import { getCopy } from '@/data/copy';
import { findStageById, initialStages } from '@/data/stages';
import { getGameMessage } from '@/domain/game/messages';
import {
  canExecuteAdd,
  canDragGroup,
  getAddOperationPreview,
  getDisplayExpressionHistory,
  getLatestDisplayExpression,
  getSelectedAdditionReadiness,
} from '@/domain/game/selectors';
import { NumberGroup, NumberObject } from '@/domain/math/types';
import { getStageDescription, getStageTitle } from '@/domain/stage/copy';
import { getStageIdAfterClear } from '@/domain/stage/progress';
import { formatSolutionHint, getMinimumMoveCount, getNextSolutionStep, getSolutionHintGroupIds } from '@/domain/stage/solution';
import { useGameStore } from '@/store/gameStore';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function StagePlayScreen() {
  const { stageId } = useLocalSearchParams<{ stageId: string }>();
  const stage = findStageById(stageId);
  const [hintVisible, setHintVisible] = useState(false);
  const [fallingGroup, setFallingGroup] = useState<NumberGroup | undefined>(undefined);
  const [fallingRequestId, setFallingRequestId] = useState(0);
  const [landingPulseId, setLandingPulseId] = useState(0);
  const [landingBurstObjects, setLandingBurstObjects] = useState<NumberObject[]>([]);
  const fallingRequestRef = useRef(0);

  const targetValue = useGameStore((state) => state.targetValue);
  const numberGroups = useGameStore((state) => state.numberGroups);
  const numberObjects = useGameStore((state) => state.numberObjects);
  const placedGroupIds = useGameStore((state) => state.placedGroupIds);
  const queuedGroupIds = useGameStore((state) => state.queuedGroupIds);
  const selectedGroupIds = useGameStore((state) => state.selectedGroupIds);
  const activeOperator = useGameStore((state) => state.activeOperator);
  const moveCount = useGameStore((state) => state.moveCount);
  const resetCount = useGameStore((state) => state.resetCount);
  const history = useGameStore((state) => state.history);
  const status = useGameStore((state) => state.status);
  const lastCarryEvents = useGameStore((state) => state.lastCarryEvents);
  const groupPositions = useGameStore((state) => state.groupPositions);
  const settledGroupId = useGameStore((state) => state.settledGroupId);
  const draggingGroupId = useGameStore((state) => state.draggingGroupId);
  const dropTargetGroupId = useGameStore((state) => state.dropTargetGroupId);
  const activeMerge = useGameStore((state) => state.activeMerge);
  const canUndo = useGameStore((state) => state.undoStack.length > 0 && state.status !== 'evaluating' && state.status !== 'clear');
  const lastMessageKey = useGameStore((state) => state.lastMessageKey);
  const lastMessage = useGameStore((state) => state.lastMessage);
  const lastSoundEffectId = useGameStore((state) => state.lastSoundEffectId);
  const soundEffectSeq = useGameStore((state) => state.soundEffectSeq);
  const startStage = useGameStore((state) => state.startStage);
  const resetStage = useGameStore((state) => state.resetStage);
  const dropQueuedGroup = useGameStore((state) => state.dropQueuedGroup);
  const selectGroup = useGameStore((state) => state.selectGroup);
  const startDraggingGroup = useGameStore((state) => state.startDraggingGroup);
  const moveGroup = useGameStore((state) => state.moveGroup);
  const endDraggingGroup = useGameStore((state) => state.endDraggingGroup);
  const selectOperator = useGameStore((state) => state.selectOperator);
  const executeActiveOperation = useGameStore((state) => state.executeActiveOperation);
  const finishActiveMerge = useGameStore((state) => state.finishActiveMerge);
  const undoLastOperation = useGameStore((state) => state.undoLastOperation);
  const markStageCompleted = useProgressStore((state) => state.markStageCompleted);
  const setLastPlayedStage = useProgressStore((state) => state.setLastPlayedStage);
  const completedStageIds = useProgressStore((state) => state.completedStageIds);
  const accessibleMode = useSettingsStore((state) => state.accessibleMode);
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const effectsEnabled = useSettingsStore((state) => state.effectsEnabled);
  const textMode = useSettingsStore((state) => state.textMode);

  useEffect(() => {
    setFallingGroup(undefined);
    setFallingRequestId(0);
    setLandingPulseId(0);
    setLandingBurstObjects([]);
    fallingRequestRef.current = 0;
  }, [stage?.id]);

  useSoundEffect({
    soundEffectId: lastSoundEffectId,
    soundEffectSeq,
    soundEnabled,
    effectsEnabled,
  });

  useEffect(() => {
    if (stage) {
      startStage(stage);
      setLastPlayedStage(stage.id);
      setHintVisible(false);
    }
  }, [setLastPlayedStage, stage, startStage]);

  useEffect(() => {
    if (status !== 'evaluating') {
      return;
    }

    const timeoutId = setTimeout(() => {
      finishActiveMerge();
    }, getMergeAnimationDuration(activeMerge));

    return () => clearTimeout(timeoutId);
  }, [activeMerge, finishActiveMerge, status]);

  useEffect(() => {
    if (!stage || status !== 'clear') {
      return;
    }

    markStageCompleted(stage.id);
  }, [markStageCompleted, stage, status]);

  useEffect(() => {
    if (selectedGroupIds.length > 0 || status === 'evaluating' || status === 'clear') {
      setHintVisible(false);
    }
  }, [selectedGroupIds.length, status]);

  const displayExpressionHistory = useMemo(() => getDisplayExpressionHistory(history), [history]);
  const latestDisplayExpression = useMemo(() => getLatestDisplayExpression(history), [history]);
  const placedGroups = useMemo(
    () => placedGroupIds.map((groupId) => numberGroups.find((group) => group.id === groupId)).filter((group) => group !== undefined),
    [numberGroups, placedGroupIds],
  );
  const queuedGroup = useMemo(
    () => numberGroups.find((group) => group.id === queuedGroupIds[0]),
    [numberGroups, queuedGroupIds],
  );
  const queuedObjects = useMemo(
    () => (queuedGroup ? numberObjects.filter((object) => object.groupId === queuedGroup.id) : []),
    [numberObjects, queuedGroup],
  );
  const placedObjects = useMemo(
    () => numberObjects.filter((object) => placedGroupIds.includes(object.groupId)),
    [numberObjects, placedGroupIds],
  );
  const canExecuteAddition = useMemo(() => canExecuteAdd(selectedGroupIds), [selectedGroupIds]);
  const additionReadiness = useMemo(
    () => getSelectedAdditionReadiness(numberGroups, selectedGroupIds),
    [numberGroups, selectedGroupIds],
  );
  const dropReadiness = useMemo(() => {
    if (!draggingGroupId || !dropTargetGroupId) {
      return undefined;
    }

    return getSelectedAdditionReadiness(numberGroups, [draggingGroupId, dropTargetGroupId]);
  }, [draggingGroupId, dropTargetGroupId, numberGroups]);
  const operationPreview = useMemo(
    () => getAddOperationPreview(numberGroups, selectedGroupIds),
    [numberGroups, selectedGroupIds],
  );
  const dropOperationPreview = useMemo(() => {
    if (!draggingGroupId || !dropTargetGroupId || selectedGroupIds.length === 2) {
      return undefined;
    }

    return getAddOperationPreview(numberGroups, [draggingGroupId, dropTargetGroupId]);
  }, [draggingGroupId, dropTargetGroupId, numberGroups, selectedGroupIds.length]);
  const dropBlocked = dropOperationPreview?.ok === false;
  const visibleOperationPreview = dropOperationPreview ?? operationPreview;
  const operationPreviewGuidance = dropOperationPreview?.ok ? getCopy('releaseToPair', textMode) : undefined;
  const displayMessage = lastMessageKey ? getGameMessage(lastMessageKey, textMode) : lastMessage;
  const nextStageId = stage ? getStageIdAfterClear(initialStages, completedStageIds, stage.id) : undefined;
  const nextStage = findStageById(nextStageId);
  const nextSolutionStep = stage ? getNextSolutionStep(stage, history) : undefined;
  const hintText = nextSolutionStep ? formatSolutionHint(nextSolutionStep) : undefined;
  const hintedGroupIds = hintVisible ? getSolutionHintGroupIds(numberGroups, nextSolutionStep) : [];
  const queuedGroupHinted =
    hintVisible &&
    queuedGroup !== undefined &&
    nextSolutionStep !== undefined &&
    (queuedGroup.value === nextSolutionStep.leftValue || queuedGroup.value === nextSolutionStep.rightValue);
  const isDroppingQueuedGroup = fallingGroup !== undefined;

  const handleQueuedGroupPress = useCallback(() => {
    if (!queuedGroup || isDroppingQueuedGroup) {
      return;
    }

    const nextRequestId = fallingRequestRef.current + 1;
    fallingRequestRef.current = nextRequestId;
    setFallingRequestId(nextRequestId);
    setFallingGroup(queuedGroup);
    setLandingBurstObjects(queuedObjects);
  }, [isDroppingQueuedGroup, queuedGroup]);

  const handleFallingGroupComplete = useCallback(
    (requestId: number) => {
      if (fallingRequestRef.current !== requestId) {
        return;
      }

      fallingRequestRef.current = 0;
      setFallingGroup(undefined);
      setFallingRequestId(0);
      dropQueuedGroup();
      setLandingPulseId((value) => value + 1);
    },
    [dropQueuedGroup],
  );

  if (!stage) {
    return (
      <ScreenShell title={getCopy('stageMissing', textMode)} backTo="/stages" backLabel={getCopy('back', textMode)}>
        <Text style={styles.message}>{getCopy('retryStageSelect', textMode)}</Text>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title={getStageTitle(stage, textMode)} backTo="/stages" backLabel={getCopy('back', textMode)}>
      <TargetDisplay value={targetValue} moveCount={moveCount} textMode={textMode} accessibleMode={accessibleMode} />
      <Text style={styles.description}>{getStageDescription(stage, textMode)}</Text>
      <View style={styles.dropArea}>
        <QueuedGroupBubble
          group={queuedGroup}
          disabled={
            status === 'evaluating' ||
            status === 'clear' ||
            isDroppingQueuedGroup ||
            (placedGroupIds.length > 0 && !activeOperator)
          }
          requiresOperator={placedGroupIds.length > 0 && !activeOperator}
          highlighted={queuedGroupHinted}
          hidden={isDroppingQueuedGroup}
          textMode={textMode}
          accessibleMode={accessibleMode}
          onPress={handleQueuedGroupPress}
        />
        {fallingGroup ? (
          <FallingGroupBubble
            key={`${fallingGroup.id}-${fallingRequestId}`}
            group={fallingGroup}
            accessibleMode={accessibleMode}
            onComplete={() => handleFallingGroupComplete(fallingRequestId)}
          />
        ) : null}
        <Bowl
          groups={placedGroups}
          objects={placedObjects}
          selectedGroupIds={selectedGroupIds}
          hintedGroupIds={hintedGroupIds}
          selectedReadinessState={additionReadiness?.state}
          dropReadinessState={dropReadiness?.state}
          dropBlocked={dropBlocked || isDroppingQueuedGroup}
          groupPositions={groupPositions}
          settledGroupId={settledGroupId}
          draggingGroupId={draggingGroupId}
          dropTargetGroupId={dropTargetGroupId}
          activeMerge={activeMerge}
          landingPulseId={landingPulseId}
          landingBurstObjects={landingBurstObjects}
          disabled={!canDragGroup(status) || isDroppingQueuedGroup}
          accessibleMode={accessibleMode}
          onSelectGroup={selectGroup}
          onStartDragGroup={startDraggingGroup}
          onMoveGroup={moveGroup}
          onEndDragGroup={endDraggingGroup}
        />
      </View>
      {additionReadiness && status === 'selecting' ? (
        <AdditionReadinessHint readiness={additionReadiness} textMode={textMode} />
      ) : null}
      {status === 'selecting' ? (
        <OperationPreview preview={visibleOperationPreview} textMode={textMode} guidance={operationPreviewGuidance} />
      ) : null}
      <OperatorTray
        allowedOperators={stage.allowedOperators}
        activeOperator={activeOperator}
        readinessState={additionReadiness?.state}
        disabled={status === 'evaluating' || status === 'clear' || isDroppingQueuedGroup}
        onPressOperator={(operator) => {
          if (operator === 'add' && canExecuteAddition) {
            executeActiveOperation();
            return;
          }

          selectOperator(operator);
        }}
      />
      {status !== 'evaluating' && status !== 'clear' && hintText ? (
        hintVisible ? (
          <Text style={styles.hint}>{hintText}</Text>
        ) : (
          <AppButton label={getCopy('hint', textMode)} variant="secondary" onPress={() => setHintVisible(true)} />
        )
      ) : null}
      <Text style={[styles.message, status === 'invalid' ? styles.invalid : null]}>{displayMessage}</Text>
      {lastCarryEvents.length > 0 && status !== 'evaluating' ? (
        <Text style={styles.carry}>{getCopy('carryCompleted', textMode)}</Text>
      ) : null}
      {status !== 'clear' ? (
        <ExpressionHistoryList expressions={displayExpressionHistory.slice(-2)} textMode={textMode} compact />
      ) : null}
      {status === 'clear' ? (
        <InlineClearPanel
          moveCount={moveCount}
          resetCount={resetCount}
          minimumMoveCount={getMinimumMoveCount(stage)}
          expression={latestDisplayExpression}
          expressionHistory={displayExpressionHistory}
          hasNextStage={nextStageId !== undefined}
          nextStageKind={nextStage?.kind}
          textMode={textMode}
          onNextStage={() => {
            if (nextStageId) {
              router.replace(`/play/${nextStageId}`);
            }
          }}
          onRetry={() => resetStage(stage)}
          onStageSelect={() => router.replace('/stages')}
        />
      ) : (
        <>
          {canUndo ? (
            <AppButton
              label={getCopy('undo', textMode)}
              variant="secondary"
              onPress={() => {
                setHintVisible(false);
                undoLastOperation();
              }}
            />
          ) : null}
          <AppButton
            label={getCopy('reset', textMode)}
            variant="secondary"
            onPress={() => {
              setHintVisible(false);
              setFallingGroup(undefined);
              setFallingRequestId(0);
              setLandingPulseId(0);
              setLandingBurstObjects([]);
              fallingRequestRef.current = 0;
              resetStage(stage);
            }}
          />
        </>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  description: {
    color: '#746852',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  dropArea: {
    position: 'relative',
  },
  message: {
    color: '#746852',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  invalid: {
    color: '#b15c00',
  },
  hint: {
    color: '#256f5d',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },
  carry: {
    color: '#256f5d',
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
});
