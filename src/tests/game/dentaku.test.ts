import { describe, expect, it } from 'vitest';

import { createDentakuQuestions, DENTAKU_STAGES } from '@/game/dentaku';

describe('dentaku stages', () => {
  it('keeps kuku dan questions ordered', () => {
    const stage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-kuku-dan-2');

    expect(stage).toBeDefined();
    expect(createDentakuQuestions(stage!, 1).map((question) => question.prompt)).toEqual([
      '2 × 1 = ?',
      '2 × 2 = ?',
      '2 × 3 = ?',
      '2 × 4 = ?',
      '2 × 5 = ?',
      '2 × 6 = ?',
      '2 × 7 = ?',
      '2 × 8 = ?',
      '2 × 9 = ?',
    ]);
  });

  it('creates division questions with integer answers', () => {
    const stage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-division-1');
    const questions = createDentakuQuestions(stage!, 12);

    expect(questions).toHaveLength(1);
    for (const question of questions) {
      expect(Number.isInteger(question.answer)).toBe(true);
      expect(question.operators).toEqual(['÷']);
    }
  });

  it('creates mixed questions with the requested operator count and integer answers', () => {
    const stage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-mixed-3-1');
    const questions = createDentakuQuestions(stage!, 99);

    expect(questions).toHaveLength(1);
    for (const question of questions) {
      expect(question.operators).toHaveLength(3);
      expect(Number.isInteger(question.answer)).toBe(true);
      expect(question.prompt).toMatch(/^\(.+\) [×÷] [2-9]( [×÷] [2-9])? = \?$/);
      expect(question.prompt).not.toContain('((');
      expect(question.prompt).not.toMatch(/[×÷] 1( | =)/);
      expect(hasTrivialInversePair(question.operands, question.operators)).toBe(false);
    }
  });

  it('avoids multiply/divide pairs that cancel each other out in mixed questions', () => {
    const stages = DENTAKU_STAGES.filter((stage) => stage.kind === 'mixed');

    for (const stage of stages) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const question = createDentakuQuestions(stage, seed)[0];
        expect(hasTrivialInversePair(question.operands, question.operators)).toBe(false);
      }
    }
  });

  it('avoids low-value multiply and divide by one questions', () => {
    const multiplyStage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-multiplication-1');
    const divisionStage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-division-1');

    for (let seed = 1; seed <= 40; seed += 1) {
      expect(createDentakuQuestions(multiplyStage!, seed)[0].prompt).not.toMatch(/× 1( | =)/);
      expect(createDentakuQuestions(divisionStage!, seed)[0].prompt).not.toMatch(/÷ 1( | =)/);
    }
  });

  it('creates about one hundred single-operator stages plus an endless random stage', () => {
    const additionStages = DENTAKU_STAGES.filter((stage) => stage.worldId === 'addition');

    expect(additionStages).toHaveLength(101);
    expect(additionStages[0]).toMatchObject({ label: '#1', operandCount: 2 });
    expect(additionStages[25]).toMatchObject({ label: '#26', operandCount: 3 });
    expect(additionStages[50]).toMatchObject({ label: '#51', operandCount: 4 });
    expect(additionStages[75]).toMatchObject({ label: '#76', operandCount: 5 });
    expect(additionStages[100]).toMatchObject({ label: '?', isEndless: true });
  });

  it('increases single-operator question length without nested parentheses', () => {
    const stage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-multiplication-76');
    const question = createDentakuQuestions(stage!, 123)[0];

    expect(question.operands).toHaveLength(5);
    expect(question.operators).toEqual(['×', '×', '×', '×']);
    expect(question.prompt).not.toContain('(');
    expect(question.prompt).not.toMatch(/× 1( | =)/);
    expect(Number.isInteger(question.answer)).toBe(true);
    expect(question.answer).toBeLessThanOrEqual(99);
  });
});

function hasTrivialInversePair(operands: number[], operators: string[]) {
  return operators.some((operator, index) => {
    if (index === 0) {
      return false;
    }
    const previousOperator = operators[index - 1];
    return operands[index] === operands[index + 1] &&
      ((previousOperator === '×' && operator === '÷') || (previousOperator === '÷' && operator === '×'));
  });
}
