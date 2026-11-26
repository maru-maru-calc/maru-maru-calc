import { describe, expect, it } from 'vitest';

import { createDentakuQuestions, DENTAKU_STAGES, DentakuQuestion, DentakuStage, getDentakuLevel, withRegroupedDentakuStages } from '@/game/dentaku';

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
    const stage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-division-set-1');
    const questions = createDentakuQuestions(stage!, 12);

    expect(questions).toHaveLength(5);
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
    const multiplyStage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-multiplication-set-1');
    const divisionStage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-division-set-1');

    for (let seed = 1; seed <= 40; seed += 1) {
      expect(createDentakuQuestions(multiplyStage!, seed)[0].prompt).not.toMatch(/× 1( | =)/);
      expect(createDentakuQuestions(divisionStage!, seed)[0].prompt).not.toMatch(/÷ 1( | =)/);
    }
  });

  it('gives each operator twenty stages plus an endless random stage', () => {
    const additionStages = DENTAKU_STAGES.filter((stage) => stage.worldId === 'addition');

    expect(additionStages).toHaveLength(21);
    expect(additionStages[0]).toMatchObject({ id: 'dentaku-addition-set-1', label: '#1', operandCount: 2 });
    expect(additionStages[5]).toMatchObject({ label: '#6', operandCount: 3 });
    expect(additionStages[10]).toMatchObject({ label: '#11', operandCount: 4 });
    expect(additionStages[15]).toMatchObject({ label: '#16', operandCount: 5 });
    expect(additionStages[19]).toMatchObject({ id: 'dentaku-addition-set-20', label: '#20', operandCount: 5 });
    expect(additionStages[20]).toMatchObject({ label: '?', isEndless: true });
  });

  it('asks five different questions of the same kind in a stage', () => {
    for (const world of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
      for (let stageNumber = 1; stageNumber <= 20; stageNumber += 1) {
        const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-set-${stageNumber}`);
        for (let seed = 1; seed <= 40; seed += 1) {
          const questions = createDentakuQuestions(stage!, seed * 104729);

          expect(questions).toHaveLength(5);
          expect(new Set(questions.map((question) => question.prompt)).size).toBe(5);
          expect(new Set(questions.map((question) => question.id)).size).toBe(5);
          expect(questions.every((question) => question.operands.length === stage!.operandCount)).toBe(true);
        }
      }
    }
  });

  it('still asks one question at a time in the endless stages', () => {
    const stage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-addition-random');
    expect(createDentakuQuestions(stage!, 7)).toHaveLength(1);
  });

  it('counts a stage as cleared when all five of its old one-question stages were', () => {
    const oldIds = (world: string, numbers: number[]) => numbers.map((number) => `dentaku-${world}-${number}`);

    // #1 to #5 of the old hundred were the five questions of today's #1.
    expect(withRegroupedDentakuStages(oldIds('addition', [1, 2, 3, 4, 5]))).toEqual([...oldIds('addition', [1, 2, 3, 4, 5]), 'dentaku-addition-set-1']);
    // Four of five is not the whole stage.
    const fourOfFive = oldIds('addition', [1, 2, 3, 5]);
    expect(withRegroupedDentakuStages(fourOfFive)).toBe(fourOfFive);
    // The last old stages, and another operator.
    expect(withRegroupedDentakuStages([...oldIds('division', [96, 97, 98, 99, 100]), ...oldIds('subtraction', [6, 7, 8, 9, 10])]).slice(-2)).toEqual(['dentaku-subtraction-set-2', 'dentaku-division-set-20']);
    // Everything else is left as it is, and nothing is added twice.
    const mixed = ['dentaku-kuku-dan-3', 'dentaku-mixed-2-1', 'dentaku-addition-random', ...oldIds('multiplication', [1, 2, 3, 4, 5]), 'dentaku-multiplication-set-1'];
    expect(withRegroupedDentakuStages(mixed)).toBe(mixed);
    expect(withRegroupedDentakuStages([])).toEqual([]);
  });

  it('increases single-operator question length without nested parentheses', () => {
    const stage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-multiplication-set-16');
    const question = createDentakuQuestions(stage!, 123)[0];

    expect(question.operands).toHaveLength(5);
    expect(question.operators).toEqual(['×', '×', '×', '×']);
    expect(question.prompt).not.toContain('(');
    expect(question.prompt).not.toMatch(/× 1( | =)/);
    expect(Number.isInteger(question.answer)).toBe(true);
    expect(question.answer).toBeLessThanOrEqual(99);
  });

  it('gives every stretch of five stages five levels', () => {
    expect([1, 2, 3, 4, 5].map(getDentakuLevel)).toEqual([1, 2, 3, 4, 5]);
    expect([6, 10, 11, 15, 16, 20].map(getDentakuLevel)).toEqual([1, 5, 1, 5, 1, 5]);
  });

  it('keeps every single-operator question whole, within 0 to 99 at every step, and of the right length', () => {
    for (const world of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
      for (let stageNumber = 1; stageNumber <= 20; stageNumber += 1) {
        const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-set-${stageNumber}`);
        for (const question of sampleRounds(stage!, 60)) {
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
    const questionsOf = (world: string, stageNumber: number) => sampleQuestions(DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-set-${stageNumber}`)!, 300);
    const ones = (value: number) => value % 10;

    // Addition: within 5 + 5, within ten, over ten, two digits without carrying, two digits with carrying.
    expect(questionsOf('addition', 1).every(({ operands: [left, right] }) => left <= 5 && right <= 5)).toBe(true);
    expect(questionsOf('addition', 2).every(({ operands: [left, right], answer }) => answer <= 10 && Math.max(left, right) >= 6)).toBe(true);
    expect(questionsOf('addition', 3).every(({ operands: [left, right], answer }) => left <= 9 && right <= 9 && answer >= 11)).toBe(true);
    expect(questionsOf('addition', 4).every(({ operands: [left, right] }) => left >= 11 && right <= 9 && ones(left) + right <= 9)).toBe(true);
    expect(questionsOf('addition', 5).every(({ operands: [left, right] }) => left >= 12 && right <= 9 && ones(left) + right >= 10)).toBe(true);

    // Subtraction: from up to 5, from up to 10, back through ten, two digits without borrowing, with borrowing.
    expect(questionsOf('subtraction', 1).every(({ operands: [left], answer }) => left <= 5 && answer >= 1)).toBe(true);
    expect(questionsOf('subtraction', 2).every(({ operands: [left] }) => left >= 6 && left <= 10)).toBe(true);
    expect(questionsOf('subtraction', 3).every(({ operands: [left, right], answer }) => left >= 11 && left <= 18 && right <= 9 && answer <= 9)).toBe(true);
    expect(questionsOf('subtraction', 4).every(({ operands: [left, right] }) => left >= 21 && right <= 9 && ones(left) >= right)).toBe(true);
    expect(questionsOf('subtraction', 5).every(({ operands: [left, right] }) => left >= 20 && right <= 9 && ones(left) < right)).toBe(true);

    // No question dominates a level.
    for (const world of ['addition', 'subtraction']) {
      for (const stageNumber of [1, 2, 3, 4, 5]) {
        const counts = countPrompts(questionsOf(world, stageNumber));
        expect(Math.max(...counts.values())).toBeLessThan(300 * 0.2);
      }
    }
  });

  it('makes two-number multiplications harder step by step, and divisions ask the same facts backwards', () => {
    const questionsOf = (world: string, stageNumber: number) => sampleQuestions(DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-set-${stageNumber}`)!, 300);
    const isSmall = (value: number) => value >= 2 && value <= 5;
    const isLarge = (value: number) => value >= 6 && value <= 9;

    for (const [world, factorsOf] of [
      ['multiplication', ({ operands: [left, right] }: { operands: number[]; answer: number }) => [left, right]],
      ['division', ({ operands: [, right], answer }: { operands: number[]; answer: number }) => [answer, right]],
    ] as const) {
      // The 2 and 5 times tables up to × 5.
      expect(questionsOf(world, 1).map(factorsOf).every(([left, right]) => isSmall(left) && isSmall(right) && [left, right].some((value) => value === 2 || value === 5))).toBe(true);
      // One factor up to 5, the other from 6.
      expect(questionsOf(world, 2).map(factorsOf).every(([left, right]) => (isSmall(left) && isLarge(right)) || (isLarge(left) && isSmall(right)))).toBe(true);
      // Both from 6.
      expect(questionsOf(world, 3).map(factorsOf).every(([left, right]) => isLarge(left) && isLarge(right))).toBe(true);
      // Two digits times one digit: without carrying, then with.
      expect(questionsOf(world, 4).map(factorsOf).every(([left, right]) => left >= 11 && right <= 9 && (left % 10) * right <= 9 && left % 10 !== 0)).toBe(true);
      expect(questionsOf(world, 5).map(factorsOf).every(([left, right]) => left >= 12 && right <= 9 && (left % 10) * right >= 10)).toBe(true);
    }
  });

  it('makes the chains of three to five numbers grow from level to level', () => {
    const middle = (values: number[]) => [...values].sort((left, right) => left - right)[Math.floor(values.length / 2)];

    for (const world of ['addition', 'subtraction', 'multiplication', 'division'] as const) {
      for (const firstStage of [6, 11, 16]) {
        // The biggest number in the question: the sum or product, or the number taken from.
        const sizes = [0, 1, 2, 3, 4].map((offset) => {
          const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-set-${firstStage + offset}`);
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

    for (const [firstStage, count] of [[6, 3], [11, 4], [16, 5]] as const) {
      ranges.forEach((range, index) => {
        const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-subtraction-set-${firstStage + index}`);
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
      for (const [firstStage, count] of [[6, 3], [11, 4], [16, 5]] as const) {
        const everyPrompt = new Set<string>();

        for (const offset of [0, 1, 2, 3, 4]) {
          const stage = DENTAKU_STAGES.find((candidate) => candidate.id === `dentaku-${world}-set-${firstStage + offset}`);
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

/** The first question of many rounds: what a stage draws, before "five different ones" narrows the choice. */
function sampleQuestions(stage: DentakuStage, count: number): DentakuQuestion[] {
  return Array.from({ length: count }, (_, index) => createDentakuQuestions(stage, 1000 + index * 7919)[0]);
}

/** Every question of many rounds. */
function sampleRounds(stage: DentakuStage, count: number): DentakuQuestion[] {
  return Array.from({ length: count }, (_, index) => createDentakuQuestions(stage, 1000 + index * 7919)).flat();
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
