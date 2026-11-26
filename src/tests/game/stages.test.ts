import { describe, expect, it } from 'vitest';

import { getStageOperatorUsage, solveStage } from '@/game/stage-rules';
import { STAGE_ISLANDS, STAGES } from '@/game/stages';
import type { Stage } from '@/game/types';

const island = (id: Stage['islandId']) => STAGES.filter((stage) => stage.islandId === id);
const usableOperators = (stage: Stage) => {
  const usage = getStageOperatorUsage(stage);
  return (['+', '-', '×', '÷'] as const).filter((operator) => usage[operator] === 'infinite' || usage[operator] > 0).join('');
};
const winningShare = (stage: Stage) => {
  const solved = solveStage(stage);
  return solved.winning.length / solved.complete;
};
const key = (stage: Stage) => `${[...stage.bubbleCounts].sort((a, b) => a - b).join(' ')} -> ${stage.target}`;

describe('stage list', () => {
  it('has four islands, one for each operator, with unique stage ids', () => {
    // The islands that mixed all four operators are now the puzzle game (game/puzzle-stages.ts).
    expect(STAGE_ISLANDS.map((candidate) => candidate.id)).toEqual(['addition', 'subtraction', 'multiplication', 'division']);
    expect(new Set(STAGES.map((stage) => stage.id)).size).toBe(STAGES.length);
    expect(STAGES).toHaveLength(87);
    expect(island('addition')).toHaveLength(12);
    for (const id of ['subtraction', 'multiplication', 'division'] as const) {
      expect(island(id)).toHaveLength(25);
    }
  });

  it('every stage of an island has a set title the island lists', () => {
    for (const stage of STAGES) {
      const titles = STAGE_ISLANDS.find((candidate) => candidate.id === stage.islandId)?.stageSetTitles ?? [];
      expect(titles).toContain(stage.setTitle);
    }
  });
});

describe('たしざん', () => {
  const stages = island('addition');

  it('is popping every bubble, with only + to use', () => {
    for (const stage of stages) {
      expect(usableOperators(stage)).toBe('+');
      expect(stage.bubbleCounts.reduce((sum, value) => sum + value, 0)).toBe(stage.target);
      expect(winningShare(stage)).toBe(1);
    }
  });

  it('is short, because nothing in it has to be chosen', () => {
    expect(stages).toHaveLength(12);
    expect(new Set(stages.map(key)).size).toBe(stages.length);
    // Up to twenty, no two stages in a row ask for the same number of bubbles.
    const small = stages.filter((stage) => stage.target <= 20);
    for (let index = 1; index < small.length; index += 1) {
      expect(small[index].bubbleCounts.length).not.toBe(small[index - 1].bubbleCounts.length);
    }
  });

  it('goes from two small numbers to tens and hundreds', () => {
    expect(stages[0]).toMatchObject({ id: 'addition-10-ones', bubbleCounts: [2, 3], target: 5 });
    expect(stages.map((stage) => stage.target)).toEqual([5, 10, 8, 9, 10, 10, 11, 15, 20, 50, 100, 120]);
    // Ten is made three ways before the numbers get big.
    expect(stages.filter((stage) => stage.target === 10).map((stage) => stage.bubbleCounts.length)).toEqual([5, 2, 3]);
    expect(stages.findIndex((stage) => stage.target > 10)).toBe(6);
    expect(stages.slice(-3).every((stage) => stage.bubbleCounts.some((value) => value >= 10))).toBe(true);
    expect(stages[stages.length - 1].bubbleCounts).toContain(100);
  });

  it('keeps the ids the stages always had, so that cleared ones stay cleared', () => {
    expect(stages.map((stage) => stage.id)).toEqual([
      'addition-10-ones',
      'addition-10-twos',
      'addition-10-five-five',
      'addition-10-six-four',
      'addition-10-eight-two',
      'addition-10-three-two-five',
      'addition-10-seven-three',
      'addition-10-nine-one',
      'addition-20-pairs',
      'addition-50-times',
      'addition-100-times',
      'addition-120-times',
    ]);
  });
});

describe('ひきざん', () => {
  it('starts with taking away only', () => {
    for (const stage of island('subtraction').slice(0, 5)) {
      expect(stage.bubbleCounts).toHaveLength(2);
      expect(solveStage(stage).winning.every((way) => !way.includes('+'))).toBe(true);
    }
  });

  it('has stages in every set that need one bubble added back', () => {
    const needsPlus = island('subtraction').filter((stage) => solveStage(stage).winning.every((way) => way.includes('+') && way.includes('-')));

    expect(needsPlus.length).toBeGreaterThanOrEqual(8);
    expect(new Set(needsPlus.map((stage) => stage.setTitle)).size).toBe(3);
  });
});

describe('かけざん and わりざん', () => {
  it('open with six stages that only have their own operator', () => {
    expect(island('multiplication').slice(0, 6).map(usableOperators)).toEqual(['×', '×', '×', '×', '×', '×']);
    expect(island('division').slice(0, 6).map(usableOperators)).toEqual(['÷', '÷', '÷', '÷', '÷', '÷']);
    expect(usableOperators(island('multiplication')[6])).toBe('+×');
    expect(usableOperators(island('division')[6])).toBe('-÷');
  });

  it('then ask for a choice between two operators with two bubbles, and not always the same one', () => {
    for (const [id, own, other] of [['multiplication', '×', '+'], ['division', '÷', '-']] as const) {
      const choice = island(id).slice(6, 12);
      expect(choice.every((stage) => stage.bubbleCounts.length === 2)).toBe(true);
      const wantsOwn = choice.filter((stage) => solveStage(stage).winning.every((way) => way.includes(own)));
      const wantsOther = choice.filter((stage) => solveStage(stage).winning.every((way) => way.includes(other)));
      expect(wantsOwn.length).toBe(4);
      expect(wantsOther.length).toBe(2);
    }
  });

  it('get harder step by step instead of in one jump', () => {
    for (const id of ['multiplication', 'division'] as const) {
      const stages = island(id);
      const average = (from: number, to: number) => stages.slice(from, to).reduce((sum, stage) => sum + winningShare(stage), 0) / (to - from);
      const steps = [average(0, 6), average(6, 12), average(12, 18), average(18, 22), average(22, 25)];

      expect(steps[0]).toBe(1);
      for (let index = 1; index < steps.length; index += 1) {
        expect(steps[index]).toBeLessThan(steps[index - 1]);
      }
      // The old jump was from 100% straight to 7%.
      expect(steps[1]).toBeGreaterThan(0.3);
    }
  });
});
