import { describe, expect, it } from 'vitest';

import { applyMove, getStageOperatorUsage, hasLegalMove, solveStage } from '@/game/stage-rules';
import { STAGES } from '@/game/stages';
import type { OperatorUsageLimits } from '@/game/types';

const stage = (id: string) => {
  const found = STAGES.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`no stage ${id}`);
  }
  return found;
};
const usage = (overrides: Partial<OperatorUsageLimits>): OperatorUsageLimits => ({ '+': 0, '-': 0, '×': 0, '÷': 0, ...overrides });

describe('a single move', () => {
  it('adds and takes away, below zero too', () => {
    expect(applyMove(5, '+', 3)).toBe(8);
    expect(applyMove(2, '-', 7)).toBe(-5);
    expect(applyMove(-5, '+', 2)).toBe(-3);
  });

  it('multiplies everything on the board', () => {
    expect(applyMove(5, '×', 3)).toBe(15);
  });

  it('divides only when it comes out even', () => {
    expect(applyMove(12, '÷', 3)).toBe(4);
    expect(applyMove(2, '÷', 6)).toBeUndefined();
    expect(applyMove(35, '÷', 3)).toBeUndefined();
  });

  it('cannot multiply or divide nothing, or a negative amount', () => {
    expect(applyMove(0, '×', 4)).toBeUndefined();
    expect(applyMove(0, '÷', 4)).toBeUndefined();
    expect(applyMove(-3, '×', 4)).toBeUndefined();
    expect(applyMove(-8, '÷', 4)).toBeUndefined();
  });
});

describe('is there anything left to do', () => {
  it('yes while a bubble can be added or taken away', () => {
    expect(hasLegalMove(2, [6], usage({ '+': 'infinite' }))).toBe(true);
    expect(hasLegalMove(-4, [6], usage({ '-': 1 }))).toBe(true);
  });

  it('no when the only operator left is a division that does not come out even', () => {
    expect(hasLegalMove(2, [6], usage({ '÷': 'infinite' }))).toBe(false);
    expect(hasLegalMove(35, [3], usage({ '÷': 1 }))).toBe(false);
  });

  it('yes when one of the waiting bubbles divides evenly', () => {
    expect(hasLegalMove(12, [5, 3], usage({ '÷': 'infinite' }))).toBe(true);
  });

  it('no when every operator has been used up', () => {
    expect(hasLegalMove(6, [4], usage({}))).toBe(false);
  });

  it('no when only × or ÷ is left and the board is at zero or below', () => {
    expect(hasLegalMove(0, [4], usage({ '×': 1 }))).toBe(false);
    expect(hasLegalMove(-1, [2], usage({ '×': 'infinite', '÷': 'infinite' }))).toBe(false);
  });

  it('an operator with no uses left does not count', () => {
    expect(hasLegalMove(12, [3], usage({ '+': 0, '÷': 1 }))).toBe(true);
    expect(hasLegalMove(12, [5], usage({ '+': 0, '÷': 1 }))).toBe(false);
  });

  it('nothing to do without bubbles', () => {
    expect(hasLegalMove(6, [], usage({ '+': 'infinite' }))).toBe(false);
  });
});

describe('operators a stage starts with', () => {
  it('follows the island', () => {
    expect(getStageOperatorUsage(stage('addition-10-ones'))).toEqual({ '+': 'infinite', '-': 0, '×': 0, '÷': 0 });
    expect(getStageOperatorUsage(stage('subtraction-1'))).toEqual({ '+': 'infinite', '-': 'infinite', '×': 0, '÷': 0 });
    expect(getStageOperatorUsage(stage('division-1'))).toEqual({ '+': 0, '-': 0, '×': 0, '÷': 'infinite' });
    expect(getStageOperatorUsage(stage('mixed3-1'))).toEqual({ '+': 1, '-': 0, '×': 1, '÷': 0 });
    expect(getStageOperatorUsage(stage('mixed3Free-1'))).toEqual({ '+': 'infinite', '-': 'infinite', '×': 'infinite', '÷': 'infinite' });
  });
});

describe('playing a stage every possible way', () => {
  it('counts the ways of a small stage', () => {
    const solved = solveStage(stage('mixed3-1'));

    expect(solved.complete).toBe(12);
    expect([...solved.winning].sort()).toEqual(['2 × 3 + 4', '3 × 2 + 4']);
  });

  it('works left to right: 2 + 3 × 4 is 20, not 14', () => {
    const free = solveStage({ ...stage('mixed3Free-1'), target: 20 });

    expect(free.winning).toContain('2 + 3 × 4');
    expect(solveStage({ ...stage('mixed3Free-1'), target: 14 }).winning).not.toContain('2 + 3 × 4');
  });

  it('sees the dead end of dividing the wrong way round', () => {
    const solved = solveStage(stage('division-1'));

    expect(solved.winning).toEqual(['6 ÷ 2']);
    expect(solved.deadEnds).toBe(1);
  });

  it('treats two bubbles with the same number as one choice', () => {
    expect(solveStage(stage('addition-10-twos')).complete).toBe(1);
  });

  it('every stage can be solved', () => {
    const unsolvable = STAGES.filter((candidate) => solveStage(candidate).winning.length === 0).map((candidate) => candidate.id);

    expect(unsolvable).toEqual([]);
  });

  it('the stage that could not be solved now can', () => {
    expect([...solveStage(stage('mixed4-9')).winning].sort()).toEqual(['5 × 5 + 2 ÷ 3', '5 ÷ 5 + 2 × 3']);
    expect(solveStage(stage('mixed4Free-9')).winning.length).toBeGreaterThan(0);
  });
});
