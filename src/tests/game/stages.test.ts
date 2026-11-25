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
    expect(STAGES).toHaveLength(100);
    for (const id of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
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
