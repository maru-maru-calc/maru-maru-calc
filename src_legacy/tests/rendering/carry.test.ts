import { describe, expect, it } from 'vitest';

import { getCarryStepRenderModel } from '@/rendering/carry';

describe('getCarryStepRenderModel', () => {
  it('renders ten source digits into one target digit', () => {
    expect(
      getCarryStepRenderModel({
        fromDigit: 1,
        toDigit: 10,
        beforeCount: 12,
        carryCount: 1,
        remainderCount: 2,
      }),
    ).toEqual({
      sourceDigits: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      targetDigit: 10,
      remainderDigits: [1, 1],
    });
  });

  it('omits remainder digits when the source digit carries exactly', () => {
    expect(
      getCarryStepRenderModel({
        fromDigit: 10,
        toDigit: 100,
        beforeCount: 10,
        carryCount: 1,
        remainderCount: 0,
      }).remainderDigits,
    ).toEqual([]);
  });
});
