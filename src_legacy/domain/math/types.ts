export type DigitValue = 1 | 10 | 100;

export type DigitCounts = Record<DigitValue, number>;

export type OperatorType = 'add';

export type ExpressionNode =
  | {
      type: 'number';
      value: number;
      sourceGroupId?: string;
    }
  | {
      type: 'operation';
      operator: OperatorType;
      left: ExpressionNode;
      right: ExpressionNode;
      value: number;
    };

export type NumberObject = {
  id: string;
  value: DigitValue;
  groupId: string;
};

export type NumberGroup = {
  id: string;
  objectIds: string[];
  value: number;
  expressionNode: ExpressionNode;
};

export type NormalizedNumber = {
  value: number;
  counts: DigitCounts;
};

export type CarryStep = {
  fromDigit: Exclude<DigitValue, 100>;
  toDigit: Exclude<DigitValue, 1>;
  beforeCount: number;
  carryCount: number;
  remainderCount: number;
};

export type AdditionBreakdown = {
  rawCounts: DigitCounts;
  normalizedCounts: DigitCounts;
  carrySteps: CarryStep[];
};

export type AdditionReadinessState = 'none' | 'near' | 'ready';

export type AdditionReadiness = {
  state: AdditionReadinessState;
  digit?: Exclude<DigitValue, 100>;
  count: number;
  remainingToCarry: number;
};

export type AddEvaluation =
  | {
      ok: true;
      leftValue: number;
      rightValue: number;
      resultValue: number;
      expressionNode: ExpressionNode;
      carryEvents: DigitValue[];
      breakdown: AdditionBreakdown;
    }
  | {
      ok: false;
      reason: 'result-out-of-range';
    };

export type ExpressionHistoryItem = {
  id: string;
  expressionNode: ExpressionNode;
  operator: OperatorType;
  leftValue: number;
  rightValue: number;
  resultValue: number;
  stepIndex: number;
};
