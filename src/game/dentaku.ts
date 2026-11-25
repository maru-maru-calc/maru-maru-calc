import { pickMixedKukuRound } from '@/game/kuku-weak-facts';

export type DentakuOperator = '+' | '-' | '×' | '÷';
export type DentakuWorldId = 'kuku' | 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed2' | 'mixed3' | 'mixed4';

export type DentakuStageKind = 'kukuDan' | 'kukuRandomAll' | 'binary' | 'mixed';
export type DentakuLevel = 1 | 2 | 3 | 4 | 5;

export type DentakuStage = {
  id: string;
  worldId: DentakuWorldId;
  title: string;
  label: string;
  /** A second, smaller line under the label on the map. */
  subLabel?: string;
  kind: DentakuStageKind;
  operator?: DentakuOperator;
  operatorCount?: 2 | 3 | 4;
  operandCount?: 2 | 3 | 4 | 5;
  dan?: number;
  /** A times table asked out of order. */
  isShuffled?: boolean;
  problemNumber?: number;
  isEndless?: boolean;
};

export type DentakuQuestion = {
  id: string;
  operands: number[];
  operators: DentakuOperator[];
  answer: number;
  prompt: string;
};

export const DENTAKU_WORLDS: Array<{ id: DentakuWorldId; label: string }> = [
  { id: 'kuku', label: '9×9' },
  { id: 'addition', label: '+' },
  { id: 'subtraction', label: '-' },
  { id: 'multiplication', label: '×' },
  { id: 'division', label: '÷' },
  { id: 'mixed2', label: '+−×÷' },
  { id: 'mixed3', label: '+−×÷' },
  { id: 'mixed4', label: '+−×÷' },
];

export const DENTAKU_STAGES: DentakuStage[] = [
  // Each times table twice: in order, then out of order. The small line under the label shows which.
  ...Array.from({ length: 9 }, (_, index) => {
    const dan = index + 1;
    return [
      {
        id: `dentaku-kuku-dan-${dan}`,
        worldId: 'kuku' as const,
        title: `${dan} × ?`,
        label: `${dan} × ?`,
        subLabel: '1 2 3',
        kind: 'kukuDan' as const,
        dan,
      },
      {
        id: `dentaku-kuku-dan-${dan}-shuffled`,
        worldId: 'kuku' as const,
        title: `${dan} × ? shuffled`,
        label: `${dan} × ?`,
        subLabel: '7 2 5',
        kind: 'kukuDan' as const,
        dan,
        isShuffled: true,
      },
    ];
  }).flat(),
  { id: 'dentaku-kuku-random-all', worldId: 'kuku', title: '? × ?', label: '∞', kind: 'kukuRandomAll' },
  ...createProblemStages('addition', '+', '+'),
  ...createProblemStages('subtraction', '-', '-'),
  ...createProblemStages('multiplication', '×', '×'),
  ...createProblemStages('division', '÷', '÷'),
  ...createMixedProblemStages(),
];

export function createDentakuQuestions(stage: DentakuStage, seed = Date.now(), weakKukuFacts: string[] = []): DentakuQuestion[] {
  const random = createSeededRandom(seed);
  if (stage.kind === 'kukuDan') {
    const inOrder = createKukuDanQuestions(stage.dan ?? 1);
    if (!stage.isShuffled) {
      return inOrder;
    }
    // Out of order means no two neighbours of the table follow each other: "× 4" is never asked
    // right after "× 3", so the answer cannot be had by adding once more.
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const shuffled = shuffleQuestions(inOrder, random);
      if (shuffled.every((question, index) => index === 0 || question.operands[1] !== shuffled[index - 1].operands[1] + 1)) {
        return shuffled;
      }
    }
    return [...inOrder].reverse();
  }

  if (stage.kind === 'kukuRandomAll') {
    // Facts missed before come back here first; see kuku-weak-facts.
    return pickMixedKukuRound(weakKukuFacts, random).map((factId) => {
      const [left, right] = factId.split('x').map(Number);
      return createQuestion(factId, [left, right], ['×']);
    });
  }

  if (stage.kind === 'binary') {
    return [createSingleOperatorQuestion(stage.operator ?? '+', stage.operandCount ?? 2, random, stage.isEndless ? 0 : stage.problemNumber ?? 1)];
  }

  return [createMixedQuestion(stage.operatorCount ?? 2, random, stage.problemNumber ?? 1)];
}

function createProblemStages(worldId: DentakuWorldId, title: string, operator: DentakuOperator): DentakuStage[] {
  const stages = Array.from({ length: 100 }, (_, index) => {
    const problemNumber = index + 1;
    return {
      id: `dentaku-${worldId}-${problemNumber}`,
      worldId,
      title,
      label: `#${problemNumber}`,
      kind: 'binary' as const,
      operator,
      operandCount: getOperandCountForProblem(problemNumber),
      problemNumber,
    };
  });

  return [
    ...stages,
    {
      id: `dentaku-${worldId}-random`,
      worldId,
      title,
      label: '?',
      kind: 'binary',
      operator,
      operandCount: 2,
      isEndless: true,
    },
  ];
}

function createMixedProblemStages(): DentakuStage[] {
  return ([2, 3, 4] as const).flatMap((operatorCount) => Array.from({ length: 9 }, (_, index) => {
    const problemNumber = index + 1;
    return {
      id: `dentaku-mixed-${operatorCount}-${problemNumber}`,
      worldId: `mixed${operatorCount}` as DentakuWorldId,
      title: `${operatorCount} ops`,
      label: `#${problemNumber}`,
      kind: 'mixed',
      operatorCount,
      problemNumber,
    };
  }));
}

function createKukuDanQuestions(dan: number): DentakuQuestion[] {
  return Array.from({ length: 9 }, (_, index) => {
    const right = index + 1;
    return createQuestion(`${dan}x${right}`, [dan, right], ['×']);
  });
}

/**
 * How hard a single-operator stage is, from 1 to 5.
 *
 * The hundred stages of an operator come in stretches of 25 with the same number of numbers (2, 3,
 * 4, then 5). Inside a stretch the numbers grow in five steps of five stages, so "#1" and "#25"
 * are no longer the same kind of question.
 */
export function getDentakuLevel(problemNumber: number): DentakuLevel {
  return (Math.floor(((Math.max(1, problemNumber) - 1) % 25) / 5) + 1) as DentakuLevel;
}

function createSingleOperatorQuestion(operator: DentakuOperator, operandCount: 2 | 3 | 4 | 5, random: () => number, problemNumber: number): DentakuQuestion {
  // The endless stage (problem number 0) draws both the length and the level.
  const count = problemNumber === 0 ? randomInt(random, 2, 5) as 2 | 3 | 4 | 5 : operandCount;
  const level = problemNumber === 0 ? randomInt(random, 1, 5) as DentakuLevel : getDentakuLevel(problemNumber);
  const operands = count === 2 ? createPair(operator, level, random) : createChain(operator, count, level, random);
  return createQuestion(
    `${operator}-${problemNumber}-${operands.join('-')}`,
    operands,
    Array.from({ length: operands.length - 1 }, () => operator),
    count === 2 ? 'leftAssociative' : 'plain',
  );
}

/** Two numbers for "a ○ b". */
function createPair(operator: DentakuOperator, level: DentakuLevel, random: () => number): number[] {
  if (operator === '+') {
    if (level === 1) {
      // Up to 5 + 5.
      return pickPair(random, [1, 5], [1, 5], () => true);
    }
    if (level === 2) {
      // A bigger number, still within 10: 7 + 3.
      return pickPair(random, [1, 9], [1, 9], (left, right) => left + right <= 10 && Math.max(left, right) >= 6);
    }
    if (level === 3) {
      // Over ten: 8 + 6.
      return pickPair(random, [2, 9], [2, 9], (left, right) => left + right >= 11);
    }
    if (level === 4) {
      // Two digits, the ones stay below ten: 23 + 5.
      return pickPair(random, [11, 49], [1, 9], (left, right) => left % 10 >= 1 && (left % 10) + right <= 9);
    }
    // Two digits, into the next ten: 47 + 8.
    return pickPair(random, [12, 89], [2, 9], (left, right) => (left % 10) + right >= 10);
  }

  if (operator === '-') {
    if (level === 1) {
      return pickPair(random, [2, 5], [1, 4], (left, right) => right < left);
    }
    if (level === 2) {
      return pickPair(random, [6, 10], [1, 9], (left, right) => right <= left);
    }
    if (level === 3) {
      // Back through ten: 14 - 6.
      return pickPair(random, [11, 18], [2, 9], (left, right) => left - right <= 9);
    }
    if (level === 4) {
      // Two digits, the ones are enough: 47 - 5.
      return pickPair(random, [21, 99], [1, 9], (left, right) => left % 10 >= right);
    }
    // Two digits, back through a ten: 52 - 7.
    return pickPair(random, [20, 98], [1, 9], (left, right) => left % 10 < right);
  }

  // Division asks the multiplication of the same level the other way round.
  const [left, right] = createFactors(level, random);
  return operator === '×' ? [left, right] : [left * right, right];
}

function createFactors(level: DentakuLevel, random: () => number): number[] {
  if (level === 1) {
    // The 2 and 5 times tables, up to × 5.
    return inEitherOrder([random() < 0.5 ? 2 : 5, randomInt(random, 2, 5)], random);
  }
  if (level === 2) {
    return inEitherOrder([randomInt(random, 2, 5), randomInt(random, 6, 9)], random);
  }
  if (level === 3) {
    return [randomInt(random, 6, 9), randomInt(random, 6, 9)];
  }
  // Two digits times one digit, within 99: without carrying (23 × 3), then with (16 × 5).
  const pairs = getTwoDigitFactorPairs(level === 5);
  return pairs[randomInt(random, 0, pairs.length - 1)];
}

const twoDigitFactorPairCache = new Map<boolean, number[][]>();

function getTwoDigitFactorPairs(withCarry: boolean): number[][] {
  const cached = twoDigitFactorPairCache.get(withCarry);
  if (cached) {
    return cached;
  }

  const pairs: number[][] = [];
  for (let left = 11; left <= 49; left += 1) {
    for (let right = 2; right <= 9 && left * right <= 99; right += 1) {
      const ones = left % 10;
      if (ones !== 0 && (ones * right >= 10) === withCarry) {
        pairs.push([left, right]);
      }
    }
  }
  twoDigitFactorPairCache.set(withCarry, pairs);
  return pairs;
}

/** Three to five numbers for "a ○ b ○ c ...". Nothing goes above 99 or below 0. */
function createChain(operator: DentakuOperator, count: 3 | 4 | 5, level: DentakuLevel, random: () => number): number[] {
  if (operator === '+') {
    if (level === 1) {
      return Array.from({ length: count }, () => randomInt(random, 1, 3));
    }
    if (level === 2) {
      // Any single digits, as long as the sum stays within 20.
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const operands = Array.from({ length: count }, () => randomInt(random, 1, 9));
        if (operands.reduce((sum, value) => sum + value, 0) <= 20) {
          return operands;
        }
      }
      return Array.from({ length: count }, () => randomInt(random, 1, 4));
    }
    if (level === 3) {
      return Array.from({ length: count }, () => randomInt(random, 2, 9));
    }
    const first = level === 4 ? randomInt(random, 10, 30) : randomInt(random, 20, 60);
    return [first, ...Array.from({ length: count - 1 }, () => randomInt(random, level === 4 ? 1 : 2, 9))];
  }

  if (operator === '-') {
    // Built from the answer backwards. Starting from a number and taking away whatever still fits
    // runs out of room: with five numbers more than half of the answers were 0.
    const [answer, smallest, largest] =
      level === 1 ? [randomInt(random, 1, 5), 1, 3]
        : level === 2 ? [randomInt(random, 0, 9), 1, 5]
          : level === 3 ? [randomInt(random, 0, 9), 1, 9]
            : level === 4 ? [randomInt(random, 10, 30), 1, 9]
              : [randomInt(random, 20, 60), 2, 9];
    const subtrahends = Array.from({ length: count - 1 }, () => randomInt(random, smallest, largest));
    return [subtrahends.reduce((sum, value) => sum + value, answer), ...subtrahends];
  }

  // × and ÷: every chain that stays within 99, in order of size, cut into five parts.
  const chains = operator === '×' ? getMultiplicationChains(count) : getDivisionChains(count - 1);
  const start = Math.floor((chains.length * (level - 1)) / 5);
  const end = Math.max(start + 1, Math.floor((chains.length * level) / 5));
  return chains[randomInt(random, start, end - 1)];
}

const multiplicationChainCache = new Map<number, number[][]>();

/** Every chain "a × b × c ..." of `factorCount` factors from 2 to 9 with a product within 99, smallest product first. */
function getMultiplicationChains(factorCount: number): number[][] {
  const cached = multiplicationChainCache.get(factorCount);
  if (cached) {
    return cached;
  }

  const chains: number[][] = [];
  const extend = (factors: number[], product: number) => {
    if (factors.length === factorCount) {
      chains.push(factors);
      return;
    }
    for (let factor = 2; factor <= 9 && product * factor <= 99; factor += 1) {
      extend([...factors, factor], product * factor);
    }
  };
  extend([], 1);
  const productOf = (factors: number[]) => factors.reduce((product, factor) => product * factor, 1);
  chains.sort((left, right) => productOf(left) - productOf(right));
  multiplicationChainCache.set(factorCount, chains);
  return chains;
}

const divisionChainCache = new Map<number, number[][]>();

/**
 * Every chain "a ÷ b ÷ c ..." with `divisorCount` divisors from 2 to 9, a whole answer from 1 to 9
 * and nothing above 99, smallest first number first.
 *
 * Starting from a number up to 18 and looking for divisors, as this used to do, left almost
 * nothing to pick from: with five numbers 83% of the questions were "16 ÷ 2 ÷ 2 ÷ 2 ÷ 2".
 */
function getDivisionChains(divisorCount: number): number[][] {
  const cached = divisionChainCache.get(divisorCount);
  if (cached) {
    return cached;
  }

  const chains: number[][] = [];
  const extend = (divisors: number[], product: number) => {
    if (divisors.length === divisorCount) {
      for (let answer = 1; answer <= 9 && answer * product <= 99; answer += 1) {
        chains.push([answer * product, ...divisors]);
      }
      return;
    }
    for (let divisor = 2; divisor <= 9 && product * divisor <= 99; divisor += 1) {
      extend([...divisors, divisor], product * divisor);
    }
  };
  extend([], 1);
  chains.sort((left, right) => left[0] - right[0]);
  divisionChainCache.set(divisorCount, chains);
  return chains;
}

/** One pair, each equally likely, from every "left, right" in the two ranges that fits. */
function pickPair(random: () => number, leftRange: [number, number], rightRange: [number, number], fits: (left: number, right: number) => boolean): number[] {
  const pairs: number[][] = [];
  for (let left = leftRange[0]; left <= leftRange[1]; left += 1) {
    for (let right = rightRange[0]; right <= rightRange[1]; right += 1) {
      if (fits(left, right)) {
        pairs.push([left, right]);
      }
    }
  }
  return pairs[randomInt(random, 0, pairs.length - 1)];
}

function inEitherOrder(pair: number[], random: () => number): number[] {
  return random() < 0.5 ? pair : [pair[1], pair[0]];
}

function getOperandCountForProblem(problemNumber: number): 2 | 3 | 4 | 5 {
  if (problemNumber <= 25) {
    return 2;
  }
  if (problemNumber <= 50) {
    return 3;
  }
  if (problemNumber <= 75) {
    return 4;
  }
  return 5;
}

function createMixedQuestion(operatorCount: 2 | 3 | 4, random: () => number, problemNumber: number): DentakuQuestion {
  let attempts = 0;

  while (attempts < 500) {
    attempts += 1;
    const firstOperator: DentakuOperator = random() < 0.5 ? '+' : '-';
    const operators: DentakuOperator[] = [
      firstOperator,
      ...Array.from({ length: operatorCount - 1 }, () => (random() < 0.5 ? '×' : '÷') as DentakuOperator),
    ];
    if (!operators.includes('÷')) {
      operators[randomInt(random, 1, operators.length - 1)] = '÷';
    }

    const first = randomInt(random, 3, 9);
    const second = chooseSecondOperand(first, firstOperator, random);
    const operands = [first, second];
    let current = applyOperator(first, second, firstOperator);
    let valid = true;

    for (const operator of operators.slice(1)) {
      const next = chooseNextOperandForCurrent(current, operator, random);
      if (next === undefined) {
        valid = false;
        break;
      }
      operands.push(next);
      current = applyOperator(current, next, operator);
      if (!Number.isInteger(current) || current < 0 || current > 99) {
        valid = false;
        break;
      }
    }

    if (!valid || hasTrivialInversePair(operands, operators)) {
      continue;
    }

    return createQuestion(`mixed-${operatorCount}-${problemNumber}-${operands.join('-')}-${operators.join('')}`, operands, operators, 'singleGroup');
  }

  return createQuestion(`mixed-${operatorCount}-${problemNumber}-fallback`, createMixedFallbackOperands(operatorCount), createMixedFallbackOperators(operatorCount), 'singleGroup');
}

function createQuestion(id: string, operands: number[], operators: DentakuOperator[], expressionStyle: 'leftAssociative' | 'singleGroup' | 'plain' = 'leftAssociative'): DentakuQuestion {
  const answer = operators.reduce((current, operator, index) => applyOperator(current, operands[index + 1], operator), operands[0]);
  const expression = expressionStyle === 'plain'
    ? formatPlainExpression(operands, operators)
    : expressionStyle === 'singleGroup'
    ? formatSingleGroupExpression(operands, operators)
    : formatLeftAssociativeExpression(operands, operators);
  return {
    id,
    operands,
    operators,
    answer,
    prompt: `${expression} = ?`,
  };
}

function formatLeftAssociativeExpression(operands: number[], operators: DentakuOperator[]) {
  return operands.slice(1).reduce((tokens, operand, index) => {
    const nextExpression = `${tokens} ${operators[index]} ${operand}`;
    return index < operators.length - 1 ? `(${nextExpression})` : nextExpression;
  }, String(operands[0]));
}

function formatSingleGroupExpression(operands: number[], operators: DentakuOperator[]) {
  if (operators.length === 0) {
    return String(operands[0]);
  }
  const initialGroup = `(${operands[0]} ${operators[0]} ${operands[1]})`;
  return operands.slice(2).reduce((tokens, operand, index) => `${tokens} ${operators[index + 1]} ${operand}`, initialGroup);
}

function formatPlainExpression(operands: number[], operators: DentakuOperator[]) {
  return operands.slice(1).reduce((tokens, operand, index) => `${tokens} ${operators[index]} ${operand}`, String(operands[0]));
}

function chooseSecondOperand(first: number, operator: DentakuOperator, random: () => number) {
  if (operator === '+') {
    return randomInt(random, 2, 9);
  }
  return randomInt(random, 1, Math.max(1, first - 1));
}

function createMixedFallbackOperands(operatorCount: 2 | 3 | 4) {
  if (operatorCount === 2) {
    return [6, 6, 3];
  }
  if (operatorCount === 3) {
    return [8, 8, 4, 2];
  }
  return [8, 8, 4, 2, 3];
}

function createMixedFallbackOperators(operatorCount: 2 | 3 | 4): DentakuOperator[] {
  if (operatorCount === 4) {
    return ['+', '÷', '÷', '×'];
  }
  return ['+', ...Array.from({ length: operatorCount - 1 }, () => '÷' as DentakuOperator)];
}

function hasTrivialInversePair(operands: number[], operators: DentakuOperator[]) {
  return operators.some((operator, index) => {
    if (index === 0) {
      return false;
    }
    const previousOperator = operators[index - 1];
    const previousOperand = operands[index];
    const currentOperand = operands[index + 1];
    return previousOperand === currentOperand &&
      ((previousOperator === '×' && operator === '÷') || (previousOperator === '÷' && operator === '×'));
  });
}

function chooseNextOperandForCurrent(current: number, operator: DentakuOperator, random: () => number) {
  if (operator === '+') {
    return randomInt(random, 1, Math.max(1, Math.min(9, 99 - current)));
  }
  if (operator === '-') {
    return randomInt(random, 1, Math.max(1, Math.min(9, current)));
  }
  if (operator === '×') {
    const max = Math.min(9, Math.floor(99 / current));
    return max >= 2 ? randomInt(random, 2, max) : undefined;
  }

  const divisors = Array.from({ length: 8 }, (_, index) => index + 2).filter((candidate) => current % candidate === 0);
  return divisors.length > 0 ? divisors[randomInt(random, 0, divisors.length - 1)] : undefined;
}

function applyOperator(left: number, right: number, operator: DentakuOperator) {
  if (operator === '+') {
    return left + right;
  }
  if (operator === '-') {
    return left - right;
  }
  if (operator === '×') {
    return left * right;
  }
  return left / right;
}

function shuffleQuestions(questions: DentakuQuestion[], random: () => number): DentakuQuestion[] {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function randomInt(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function createSeededRandom(seed: number) {
  let state = Math.trunc(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
