// Shapes of the things the game screen keeps track of: maru on the field, waiting bubbles, running animations.
import * as Matter from 'matter-js';

import type { DentakuOperator } from '@/game/dentaku';
import { OperatorSymbol } from '@/game/expression';
import { BeadRole, BeadSign, PlaceValue } from '@/game/types';

export type BeadEntity = {
  id: string;
  value: PlaceValue;
  count: number;
  sign: BeadSign;
  role: BeadRole;
  createdAt: number;
  body: Matter.Body;
};

export type PendingBubble = {
  id: string;
  count: number;
  x: number;
  y: number;
};

export type DentakuPractice = {
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
  /** Told about each wrong answer to the question itself (not to a step of a long-form sum). */
  onWrongAnswer?: () => void;
};

export type DentakuAutomationPractice = Pick<DentakuPractice, 'operands' | 'operators'>;

export type MergeAnimation = {
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

export type AnnihilationAnimation = {
  id: string;
  beadIds: string[];
  center: {
    x: number;
    y: number;
  };
  startedAt: number;
};

export type DivisionSplitAnimation = {
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

export type DivisionFailedAnimation = {
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

export type BubbleBurstAnimation = {
  id: string;
  x: number;
  y: number;
  radius: number;
  count: number;
  sign: BeadSign;
  startedAt: number;
};

export type MultiplicationExpansionAnimation = {
  id: string;
  groups: Array<{
    x: number;
    y: number;
    count: number;
    sign: BeadSign;
  }>;
  startedAt: number;
};

export type OperationSource = {
  entities: BeadEntity[];
  count: number;
  sign: BeadSign;
};

export type OperatorButtonSymbol = OperatorSymbol;
/** A tap that has to wait for its turn: an operator, or one of the bubbles. */
export type HeldTap = { operator: OperatorButtonSymbol } | { bubbleId: string };
export type MultiplierBubblePart = {
  value: PlaceValue;
  radius: number;
};
export type ContainedBeadPart = {
  value: PlaceValue;
  radius: number;
};
export type BackgroundBubbleSpec = {
  id: string;
  xRatio: number;
  size: number;
  speed: number;
  delay: number;
  drift: number;
};
export type GoalPart = {
  value: PlaceValue;
  count: number;
  sign: BeadSign;
};

export type LongFormProblem = {
  left: number;
  right: number;
  operator: DentakuOperator;
  answer: number;
};

export type LongFormCell = {
  value: string;
  isActive?: boolean;
  isUnknown?: boolean;
  isStruck?: boolean;
};

export type LongFormRow = {
  id: string;
  cells: LongFormCell[];
  operatorLabel?: string;
  hasDivider?: boolean;
  hasTopDivider?: boolean;
  isDivisionBar?: boolean;
  isGuide?: boolean;
};

export type LongFormStep = {
  expectedAnswer: number;
  isFinal: boolean;
  maxInputLength: number;
  /** A column sum that may also be answered with just the digit written under it (see matchesLongFormStepAnswer). */
  acceptsWrittenDigit?: boolean;
};
