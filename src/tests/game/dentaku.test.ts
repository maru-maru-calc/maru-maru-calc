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

  it('keeps chains of subtractions varied, with answers from 0 to 9', () => {
    for (const [stageId, count] of [['dentaku-subtraction-26', 3], ['dentaku-subtraction-51', 4], ['dentaku-subtraction-76', 5]] as const) {
      const stage = DENTAKU_STAGES.find((candidate) => candidate.id === stageId);
      const questions = Array.from({ length: 400 }, (_, index) => createDentakuQuestions(stage!, 1000 + index * 7919)[0]);

      for (const question of questions) {
        expect(question.operands).toHaveLength(count);
        expect(question.operators.every((operator) => operator === '-')).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.answer).toBeLessThanOrEqual(9);
        expect(question.operands.slice(1).every((value) => value >= 1 && value <= 9)).toBe(true);
        expect(question.operands[0]).toBe(question.operands.slice(1).reduce((sum, value) => sum + value, question.answer));
        expect(question.prompt).not.toContain('(');
      }
      // It used to be 0 more than half of the time with five numbers.
      expect(questions.filter((question) => question.answer === 0).length).toBeLessThan(400 * 0.2);
      expect(new Set(questions.map((question) => question.prompt)).size).toBeGreaterThan(200);
    }
  });

  it('keeps chains of divisions varied and within 99', () => {
    for (const [stageId, count] of [['dentaku-division-26', 3], ['dentaku-division-51', 4], ['dentaku-division-76', 5]] as const) {
      const stage = DENTAKU_STAGES.find((candidate) => candidate.id === stageId);
      const questions = Array.from({ length: 400 }, (_, index) => createDentakuQuestions(stage!, 1000 + index * 7919)[0]);
      const counts = new Map<string, number>();

      for (const question of questions) {
        counts.set(question.prompt, (counts.get(question.prompt) ?? 0) + 1);
        expect(question.operands).toHaveLength(count);
        expect(question.operators.every((operator) => operator === '÷')).toBe(true);
        expect(Number.isInteger(question.answer)).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(1);
        expect(question.answer).toBeLessThanOrEqual(9);
        expect(question.operands[0]).toBeLessThanOrEqual(99);
        expect(question.operands.slice(1).every((value) => value >= 2 && value <= 9)).toBe(true);
        expect(question.prompt).not.toContain('(');
      }
      // With five numbers 83% used to be "16 ÷ 2 ÷ 2 ÷ 2 ÷ 2".
      expect(Math.max(...counts.values())).toBeLessThan(400 * 0.05);
      expect(counts.size).toBeGreaterThan(100);
    }
  });

  it('the endless subtraction and division stages never fall back to something else', () => {
    for (const stageId of ['dentaku-subtraction-random', 'dentaku-division-random']) {
      const stage = DENTAKU_STAGES.find((candidate) => candidate.id === stageId);
      for (let seed = 1; seed <= 200; seed += 1) {
        const question = createDentakuQuestions(stage!, seed * 104729)[0];
        expect(Number.isInteger(question.answer)).toBe(true);
        expect(question.answer).toBeGreaterThanOrEqual(0);
        expect(question.operands.length).toBeGreaterThanOrEqual(2);
        expect(question.operands.length).toBeLessThanOrEqual(5);
      }
    }
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
