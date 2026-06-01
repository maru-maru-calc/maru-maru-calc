import {
  AdditionBreakdown,
  AdditionReadiness,
  CarryStep,
  DigitCounts,
  DigitValue,
  NormalizedNumber,
} from '@/domain/math/types';

export const digitValues: DigitValue[] = [100, 10, 1];

export function assertMvpNumber(value: number) {
  return Number.isInteger(value) && value >= 0 && value <= 999;
}

export function normalizeNumber(value: number): NormalizedNumber {
  if (!assertMvpNumber(value)) {
    throw new Error(`MVP number must be an integer from 0 to 999: ${value}`);
  }

  return {
    value,
    counts: {
      100: Math.floor(value / 100),
      10: Math.floor((value % 100) / 10),
      1: value % 10,
    },
  };
}

export function getAdditionBreakdown(leftValue: number, rightValue: number): AdditionBreakdown {
  const left = normalizeNumber(leftValue).counts;
  const right = normalizeNumber(rightValue).counts;
  const rawCounts: DigitCounts = {
    100: left[100] + right[100],
    10: left[10] + right[10],
    1: left[1] + right[1],
  };
  const normalizedCounts: DigitCounts = { ...rawCounts };
  const carrySteps: CarryStep[] = [];

  normalizeCarryStep(normalizedCounts, carrySteps, 1, 10);
  normalizeCarryStep(normalizedCounts, carrySteps, 10, 100);

  return {
    rawCounts,
    normalizedCounts,
    carrySteps,
  };
}

export function getCarryEvents(leftValue: number, rightValue: number): DigitValue[] {
  return getAdditionBreakdown(leftValue, rightValue).carrySteps.map((step) => step.fromDigit);
}

export function getAdditionReadiness(leftValue: number, rightValue: number): AdditionReadiness {
  const breakdown = getAdditionBreakdown(leftValue, rightValue);
  const onesCount = breakdown.rawCounts[1];
  const onesCarryCount = breakdown.carrySteps.find((step) => step.fromDigit === 1)?.carryCount ?? 0;
  const tensCountAfterOnesCarry = breakdown.rawCounts[10] + onesCarryCount;
  const candidates = [
    getDigitReadiness(1, onesCount),
    getDigitReadiness(10, tensCountAfterOnesCarry),
  ].sort((left, right) => scoreReadiness(right) - scoreReadiness(left));

  return candidates[0];
}

function normalizeCarryStep(
  counts: DigitCounts,
  carrySteps: CarryStep[],
  fromDigit: 1 | 10,
  toDigit: 10 | 100,
) {
  const beforeCount = counts[fromDigit];
  const carryCount = Math.floor(beforeCount / 10);

  if (carryCount === 0) {
    return;
  }

  const remainderCount = beforeCount % 10;
  counts[fromDigit] = remainderCount;
  counts[toDigit] += carryCount;
  carrySteps.push({
    fromDigit,
    toDigit,
    beforeCount,
    carryCount,
    remainderCount,
  });
}

function getDigitReadiness(digit: 1 | 10, count: number): AdditionReadiness {
  if (count >= 10) {
    return {
      state: 'ready',
      digit,
      count,
      remainingToCarry: 0,
    };
  }

  if (count >= 8) {
    return {
      state: 'near',
      digit,
      count,
      remainingToCarry: 10 - count,
    };
  }

  return {
    state: 'none',
    digit,
    count,
    remainingToCarry: 10 - count,
  };
}

function scoreReadiness(readiness: AdditionReadiness) {
  if (readiness.state === 'ready') {
    return 3;
  }

  if (readiness.state === 'near') {
    return 2;
  }

  return 1;
}
