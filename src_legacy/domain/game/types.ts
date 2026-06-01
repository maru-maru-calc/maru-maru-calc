import { CarryStep, DigitValue, ExpressionHistoryItem, NumberGroup, NumberObject, OperatorType } from '@/domain/math/types';
import { StageId } from '@/domain/stage/types';

export type GameStatus = 'idle' | 'selecting' | 'evaluating' | 'clear' | 'invalid';

export type CarryAnimationEvent = {
  id: string;
  fromDigit: DigitValue;
  toDigit: DigitValue;
  beforeCount: number;
  carryCount: number;
  remainderCount: number;
  resultValue: number;
};

export type MergeAnimation = {
  id: string;
  leftValue: number;
  rightValue: number;
  resultValue: number;
  carryEvents: DigitValue[];
  carrySteps: CarryStep[];
};

export type GroupPosition = {
  x: number;
  y: number;
};

export type GroupMotionState =
  | 'idle'
  | 'selected'
  | 'hinted'
  | 'dragging'
  | 'dropTarget'
  | 'blockedDropTarget'
  | 'merging'
  | 'settled';

export type GameSession = {
  stageId: StageId;
  startedAt: string;
};

export type StageRuntimeState = {
  stageId?: StageId;
  targetValue: number;
  numberGroups: NumberGroup[];
  numberObjects: NumberObject[];
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
  lastMessage?: string;
};
