import { OperatorType } from '@/domain/math/types';

export type StageId = `stage-${number}`;
export type WorldId = 'addition-island';
export type StageKind = 'mvp' | 'practice';

export type StageSolutionStep = {
  operator: OperatorType;
  leftValue: number;
  rightValue: number;
  resultValue: number;
};

export type Stage = {
  id: StageId;
  worldId: WorldId;
  kind: StageKind;
  title: string;
  titleHiragana?: string;
  description: string;
  descriptionHiragana?: string;
  order: number;
  targetValue: number;
  initialGroups: {
    value: number;
  }[];
  allowedOperators: OperatorType[];
  solution: {
    steps: StageSolutionStep[];
  };
};
