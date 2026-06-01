import { describe, expect, it } from 'vitest';

import { getAdditionBreakdown, getAdditionReadiness, getCarryEvents, normalizeNumber } from '@/domain/math/normalize';

describe('normalizeNumber', () => {
  it.each([
    [0, { 100: 0, 10: 0, 1: 0 }],
    [9, { 100: 0, 10: 0, 1: 9 }],
    [10, { 100: 0, 10: 1, 1: 0 }],
    [31, { 100: 0, 10: 3, 1: 1 }],
    [100, { 100: 1, 10: 0, 1: 0 }],
    [999, { 100: 9, 10: 9, 1: 9 }],
  ])('normalizes %i into digit object counts', (value, counts) => {
    expect(normalizeNumber(value).counts).toEqual(counts);
  });

  it('rejects values outside the MVP range', () => {
    expect(() => normalizeNumber(1000)).toThrow('MVP number');
    expect(() => normalizeNumber(-1)).toThrow('MVP number');
    expect(() => normalizeNumber(1.5)).toThrow('MVP number');
  });
});

describe('getCarryEvents', () => {
  it('returns ones carry for 23 + 8', () => {
    expect(getCarryEvents(23, 8)).toEqual([1]);
  });

  it('returns cascading carries for 55 + 45', () => {
    expect(getCarryEvents(55, 45)).toEqual([1, 10]);
  });

  it('returns no carry when no digit reaches ten', () => {
    expect(getCarryEvents(12, 23)).toEqual([]);
  });
});

describe('getAdditionBreakdown', () => {
  it('keeps raw counts before carrying and normalized counts after carrying', () => {
    expect(getAdditionBreakdown(23, 8)).toEqual({
      rawCounts: { 100: 0, 10: 2, 1: 11 },
      normalizedCounts: { 100: 0, 10: 3, 1: 1 },
      carrySteps: [
        {
          fromDigit: 1,
          toDigit: 10,
          beforeCount: 11,
          carryCount: 1,
          remainderCount: 1,
        },
      ],
    });
  });

  it('captures cascading carrying from ones to tens to hundreds', () => {
    expect(getAdditionBreakdown(55, 45)).toEqual({
      rawCounts: { 100: 0, 10: 9, 1: 10 },
      normalizedCounts: { 100: 1, 10: 0, 1: 0 },
      carrySteps: [
        {
          fromDigit: 1,
          toDigit: 10,
          beforeCount: 10,
          carryCount: 1,
          remainderCount: 0,
        },
        {
          fromDigit: 10,
          toDigit: 100,
          beforeCount: 10,
          carryCount: 1,
          remainderCount: 0,
        },
      ],
    });
  });
});

describe('getAdditionReadiness', () => {
  it('returns none when no digit is close to carrying', () => {
    expect(getAdditionReadiness(12, 23)).toEqual({
      state: 'none',
      digit: 1,
      count: 5,
      remainingToCarry: 5,
    });
  });

  it('returns near when a digit is close to ten', () => {
    expect(getAdditionReadiness(4, 4)).toEqual({
      state: 'near',
      digit: 1,
      count: 8,
      remainingToCarry: 2,
    });
  });

  it('returns ready when a digit reaches ten', () => {
    expect(getAdditionReadiness(7, 5)).toEqual({
      state: 'ready',
      digit: 1,
      count: 12,
      remainingToCarry: 0,
    });
  });

  it('detects tens readiness after ones carrying', () => {
    expect(getAdditionReadiness(55, 45)).toEqual({
      state: 'ready',
      digit: 1,
      count: 10,
      remainingToCarry: 0,
    });
  });
});
