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
  it('has ten islands with unique stage ids', () => {
    expect(STAGE_ISLANDS).toHaveLength(10);
    expect(new Set(STAGES.map((stage) => stage.id)).size).toBe(STAGES.length);
    expect(STAGES).toHaveLength(160);
    for (const id of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
      expect(island(id)).toHaveLength(25);
    }
    for (const id of ['mixed3', 'mixed4', 'mixed5', 'mixed3Free', 'mixed4Free', 'mixed5Free'] as const) {
      expect(island(id)).toHaveLength(10);
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

describe('じゆう islands', () => {
  const free = [...island('mixed3Free'), ...island('mixed4Free'), ...island('mixed5Free')];

  it('never repeat a problem of the islands with limited operators', () => {
    const limited = new Set([...island('mixed3'), ...island('mixed4'), ...island('mixed5')].map(key));

    expect(free.filter((stage) => limited.has(key(stage))).map(key)).toEqual([]);
    expect(new Set(free.map(key)).size).toBe(free.length);
  });

  it('cannot be solved by adding and taking away alone', () => {
    const tooEasy = free.filter((stage) => solveStage(stage).winning.some((way) => !/[×÷]/.test(way))).map((stage) => stage.id);

    expect(tooEasy).toEqual([]);
  });

  it('have a winning way that never needs more than 60 maru or goes below 1', () => {
    for (const stage of free) {
      const calm = solveStage(stage).winning.some((way) => {
        const tokens = way.split(' ');
        let total = Number(tokens[0]);
        let ok = total >= 1 && total <= 60;
        for (let index = 1; index < tokens.length; index += 2) {
          const value = Number(tokens[index + 1]);
          total = tokens[index] === '+' ? total + value : tokens[index] === '-' ? total - value : tokens[index] === '×' ? total * value : total / value;
          ok = ok && total >= 1 && total <= 60;
        }
        return ok;
      });
      expect(calm).toBe(true);
    }
  });

  it('never let multiplying everything grow past what the board is known to handle', () => {
    for (const stage of free) {
      expect(stage.bubbleCounts.reduce((product, value) => product * value, 1)).toBeLessThanOrEqual(2520);
    }
  });

  it('go from more winning ways to fewer within the four- and five-bubble islands', () => {
    for (const id of ['mixed4Free', 'mixed5Free'] as const) {
      const wins = island(id).map((stage) => solveStage(stage).winning.length);
      expect(wins).toEqual([...wins].sort((a, b) => b - a));
    }
  });
});
