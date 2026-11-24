import { describe, expect, it } from 'vitest';

import { createDentakuQuestions, DENTAKU_STAGES, DentakuQuestion, DentakuStage, getDentakuLevel } from '@/game/dentaku';

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

  it('offers every times table twice: in order, then out of order', () => {
    const kuku = DENTAKU_STAGES.filter((stage) => stage.worldId === 'kuku');

    expect(kuku).toHaveLength(19);
    expect(kuku.slice(0, 4).map((stage) => stage.id)).toEqual(['dentaku-kuku-dan-1', 'dentaku-kuku-dan-1-shuffled', 'dentaku-kuku-dan-2', 'dentaku-kuku-dan-2-shuffled']);
    expect(kuku[18].id).toBe('dentaku-kuku-random-all');
    // Same label, told apart by the small line under it.
    expect(kuku[4]).toMatchObject({ label: '3 × ?', subLabel: '1 2 3' });
    expect(kuku[5]).toMatchObject({ label: '3 × ?', subLabel: '7 2 5', isShuffled: true });
    expect(new Set(DENTAKU_STAGES.map((stage) => stage.id)).size).toBe(DENTAKU_STAGES.length);
  });

  it('asks an out-of-order times table completely, with no "× 4" right after "× 3"', () => {
    for (let dan = 1; dan <= 9; dan += 1) {
      const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-kuku-dan-${dan}-shuffled`);
      const orders = new Set<string>();

      for (let seed = 1; seed <= 100; seed += 1) {
        const questions = createDentakuQuestions(stage!, seed * 104729);
        const multipliers = questions.map((question) => question.operands[1]);

        expect(questions.every((question) => question.operands[0] === dan)).toBe(true);
        expect([...multipliers].sort((left, right) => left - right)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
        expect(multipliers.some((multiplier, index) => index > 0 && multiplier === multipliers[index - 1] + 1)).toBe(false);
        orders.add(multipliers.join(''));
      }
      expect(orders.size).toBeGreaterThan(90);
    }
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

  it('gives every stretch of 25 stages five levels of five stages', () => {
    expect([1, 5, 6, 10, 11, 20, 21, 25].map(getDentakuLevel)).toEqual([1, 1, 2, 2, 3, 4, 5, 5]);
    expect([26, 30, 31, 50, 51, 75, 76, 96, 100].map(getDentakuLevel)).toEqual([1, 1, 2, 5, 1, 5, 1, 5, 5]);
  });

  it('keeps every single-operator question whole, within 0 to 99 at every step, and of the right length', () => {
    for (const world of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
      for (let problemNumber = 1; problemNumber <= 100; problemNumber += 1) {
        const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-${problemNumber}`);
        for (const question of sampleQuestions(stage!, 60)) {
          expect(question.operands).toHaveLength(stage!.operandCount!);
          expect(question.operators.every((operator) => operator === stage!.operator)).toBe(true);
          expect(question.prompt).not.toContain('(');
          expect(question.prompt).not.toMatch(/[×÷] 1( | =)/);
          for (const value of [...question.operands, ...runningValues(question)]) {
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(99);
          }
        }
      }
    }
  });

  it('makes two-number additions and subtractions harder in the order a child meets them', () => {
    const questionsOf = (world: string, problemNumber: number) => sampleQuestions(DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-${problemNumber}`)!, 300);
    const ones = (value: number) => value % 10;

    // Addition: within 5 + 5, within ten, over ten, two digits without carrying, two digits with carrying.
    expect(questionsOf('addition', 1).every(({ operands: [left, right] }) => left <= 5 && right <= 5)).toBe(true);
    expect(questionsOf('addition', 6).every(({ operands: [left, right], answer }) => answer <= 10 && Math.max(left, right) >= 6)).toBe(true);
    expect(questionsOf('addition', 11).every(({ operands: [left, right], answer }) => left <= 9 && right <= 9 && answer >= 11)).toBe(true);
    expect(questionsOf('addition', 16).every(({ operands: [left, right] }) => left >= 11 && right <= 9 && ones(left) + right <= 9)).toBe(true);
    expect(questionsOf('addition', 21).every(({ operands: [left, right] }) => left >= 12 && right <= 9 && ones(left) + right >= 10)).toBe(true);

    // Subtraction: from up to 5, from up to 10, back through ten, two digits without borrowing, with borrowing.
    expect(questionsOf('subtraction', 1).every(({ operands: [left], answer }) => left <= 5 && answer >= 1)).toBe(true);
    expect(questionsOf('subtraction', 6).every(({ operands: [left] }) => left >= 6 && left <= 10)).toBe(true);
    expect(questionsOf('subtraction', 11).every(({ operands: [left, right], answer }) => left >= 11 && left <= 18 && right <= 9 && answer <= 9)).toBe(true);
    expect(questionsOf('subtraction', 16).every(({ operands: [left, right] }) => left >= 21 && right <= 9 && ones(left) >= right)).toBe(true);
    expect(questionsOf('subtraction', 21).every(({ operands: [left, right] }) => left >= 20 && right <= 9 && ones(left) < right)).toBe(true);

    // No question dominates a level.
    for (const world of ['addition', 'subtraction']) {
      for (const problemNumber of [1, 6, 11, 16, 21]) {
        const counts = countPrompts(questionsOf(world, problemNumber));
        expect(Math.max(...counts.values())).toBeLessThan(300 * 0.2);
      }
    }
  });

  it('makes two-number multiplications harder step by step, and divisions ask the same facts backwards', () => {
    const questionsOf = (world: string, problemNumber: number) => sampleQuestions(DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-${problemNumber}`)!, 300);
    const isSmall = (value: number) => value >= 2 && value <= 5;
    const isLarge = (value: number) => value >= 6 && value <= 9;

    for (const [world, factorsOf] of [
      ['multiplication', ({ operands: [left, right] }: { operands: number[]; answer: number }) => [left, right]],
      ['division', ({ operands: [, right], answer }: { operands: number[]; answer: number }) => [answer, right]],
    ] as const) {
      // The 2 and 5 times tables up to × 5.
      expect(questionsOf(world, 1).map(factorsOf).every(([left, right]) => isSmall(left) && isSmall(right) && [left, right].some((value) => value === 2 || value === 5))).toBe(true);
      // One factor up to 5, the other from 6.
      expect(questionsOf(world, 6).map(factorsOf).every(([left, right]) => (isSmall(left) && isLarge(right)) || (isLarge(left) && isSmall(right)))).toBe(true);
      // Both from 6.
      expect(questionsOf(world, 11).map(factorsOf).every(([left, right]) => isLarge(left) && isLarge(right))).toBe(true);
      // Two digits times one digit: without carrying, then with.
      expect(questionsOf(world, 16).map(factorsOf).every(([left, right]) => left >= 11 && right <= 9 && (left % 10) * right <= 9 && left % 10 !== 0)).toBe(true);
      expect(questionsOf(world, 21).map(factorsOf).every(([left, right]) => left >= 12 && right <= 9 && (left % 10) * right >= 10)).toBe(true);
    }
  });

  it('makes the chains of three to five numbers grow from level to level', () => {
    const middle = (values: number[]) => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];

    for (const world of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
      for (const firstStage of [26, 51, 76]) {
        // The biggest number in the question: the sum or product, or the number taken from.
        const sizes = [0, 5, 10, 15, 20].map((offset) => {
          const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-${firstStage + offset}`);
          return middle(sampleQuestions(stage!, 300).map((question) => Math.max(question.answer, question.operands[0])));
        });
        for (let level = 1; level < sizes.length; level += 1) {
          expect(sizes[level]).toBeGreaterThanOrEqual(sizes[level - 1]);
        }
        expect(sizes[4]).toBeGreaterThan(sizes[0]);
      }
    }
  });

  it('starts chains of subtractions small and keeps them varied', () => {
    const ranges = [
      { answer: [1, 5], takenAway: [1, 3] },
      { answer: [0, 9], takenAway: [1, 5] },
      { answer: [0, 9], takenAway: [1, 9] },
      { answer: [10, 30], takenAway: [1, 9] },
      { answer: [20, 60], takenAway: [2, 9] },
    ];

    for (const [firstStage, count] of [[26, 3], [51, 4], [76, 5]] as const) {
      ranges.forEach((range, index) => {
        const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-subtraction-${firstStage + index * 5}`);
        const questions = sampleQuestions(stage!, 400);

        for (const question of questions) {
          expect(question.operands).toHaveLength(count);
          expect(question.answer).toBeGreaterThanOrEqual(range.answer[0]);
          expect(question.answer).toBeLessThanOrEqual(range.answer[1]);
          expect(question.operands.slice(1).every((value) => value >= range.takenAway[0] && value <= range.takenAway[1])).toBe(true);
          expect(question.operands[0]).toBe(question.operands.slice(1).reduce((sum, value) => sum + value, question.answer));
        }
        // With five numbers the answer used to be 0 more than half of the time.
        expect(questions.filter((question) => question.answer === 0).length).toBeLessThan(400 * 0.2);
        expect(countPrompts(questions).size).toBeGreaterThan(index === 0 ? 30 : 150);
      });
    }
  });

  it('keeps chains of multiplications and divisions varied', () => {
    for (const world of ['multiplication', 'division'] as const) {
      for (const [firstStage, count] of [[26, 3], [51, 4], [76, 5]] as const) {
        const everyPrompt = new Set<string>();

        for (const offset of [0, 5, 10, 15, 20]) {
          const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-${firstStage + offset}`);
          const questions = sampleQuestions(stage!, 400);
          const counts = countPrompts(questions);

          for (const question of questions) {
            expect(question.operands).toHaveLength(count);
            expect(question.operands.slice(1).every((value) => value >= 2 && value <= 9)).toBe(true);
            if (world === 'division') {
              expect(question.answer).toBeGreaterThanOrEqual(1);
              expect(question.answer).toBeLessThanOrEqual(9);
            }
            everyPrompt.add(question.prompt);
          }
          // With five numbers 83% of the divisions used to be "16 ÷ 2 ÷ 2 ÷ 2 ÷ 2". Only 51 chains of
          // five factors stay within 99, so a level of those has ten to choose from.
          expect(Math.max(...counts.values())).toBeLessThan(400 * (world === 'multiplication' && count === 5 ? 0.2 : 0.06));
          expect(counts.size).toBeGreaterThanOrEqual(world === 'multiplication' && count === 5 ? 10 : 30);
        }
        expect(everyPrompt.size).toBeGreaterThanOrEqual(world === 'multiplication' && count === 5 ? 51 : 150);
      }
    }
  });

  it('draws both the length and the level in the endless stages', () => {
    for (const world of ['addition', 'subtraction', 'multiplication', 'division']) {
      const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-random`);
      const questions = Array.from({ length: 400 }, (_, index) => createDentakuQuestions(stage!, (index + 1) * 104729)[0]);

      for (const count of [2, 3, 4, 5]) {
        expect(questions.filter((question) => question.operands.length === count).length).toBeGreaterThan(400 * 0.15);
      }
      const twoNumberSizes = questions.filter((question) => question.operands.length === 2).map((question) => Math.max(question.operands[0], question.answer));
      expect(Math.min(...twoNumberSizes)).toBeLessThanOrEqual(10);
      expect(Math.max(...twoNumberSizes)).toBeGreaterThanOrEqual(40);
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

function sampleQuestions(stage: DentakuStage, count: number): DentakuQuestion[] {
  return Array.from({ length: count }, (_, index) => createDentakuQuestions(stage, 1000 + index * 7919)[0]);
}

function runningValues(question: DentakuQuestion): number[] {
  const values: number[] = [];
  let current = question.operands[0];
  question.operators.forEach((operator, index) => {
    const next = question.operands[index + 1];
    current = operator === '+' ? current + next : operator === '-' ? current - next : operator === '×' ? current * next : current / next;
    values.push(current);
  });
  return values;
}

function countPrompts(questions: DentakuQuestion[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const question of questions) {
    counts.set(question.prompt, (counts.get(question.prompt) ?? 0) + 1);
  }
  return counts;
}
