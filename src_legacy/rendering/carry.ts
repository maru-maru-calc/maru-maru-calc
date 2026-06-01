import { CarryStep, DigitValue } from '@/domain/math/types';

export type CarryStepRenderModel = {
  sourceDigits: DigitValue[];
  targetDigit: DigitValue;
  remainderDigits: DigitValue[];
};

export function getCarryStepRenderModel(step: CarryStep): CarryStepRenderModel {
  return {
    sourceDigits: Array.from({ length: 10 }, () => step.fromDigit),
    targetDigit: step.toDigit,
    remainderDigits: Array.from({ length: step.remainderCount }, () => step.fromDigit),
  };
}
