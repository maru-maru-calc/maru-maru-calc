export type DentakuOperator = '+' | '-' | '×' | '÷';
export type DentakuWorldId = 'kuku' | 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed2' | 'mixed3' | 'mixed4';

export type DentakuStageKind = 'kukuDan' | 'kukuRandomAll' | 'binary' | 'mixed';

export type DentakuStage = {
  id: string;
  worldId: DentakuWorldId;
  title: string;
  label: string;
  kind: DentakuStageKind;
  operator?: DentakuOperator;
  operatorCount?: 2 | 3 | 4;
  operandCount?: 2 | 3 | 4 | 5;
  dan?: number;
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
  ...Array.from({ length: 9 }, (_, index) => {
    const dan = index + 1;
    return {
      id: `dentaku-kuku-dan-${dan}`,
      worldId: 'kuku' as const,
      title: `${dan} × ?`,
      label: `${dan} × ?`,
      kind: 'kukuDan' as const,
      dan,
    };
  }),
  { id: 'dentaku-kuku-random-all', worldId: 'kuku', title: '? × ?', label: '∞', kind: 'kukuRandomAll' },
  ...createProblemStages('addition', '+', '+'),
  ...createProblemStages('subtraction', '-', '-'),
  ...createProblemStages('multiplication', '×', '×'),
  ...createProblemStages('division', '÷', '÷'),
  ...createMixedProblemStages(),
];

export function createDentakuQuestions(stage: DentakuStage, seed = Date.now()): DentakuQuestion[] {
  if (stage.kind === 'kukuDan') {
    return createKukuDanQuestions(stage.dan ?? 1);
  }

  const random = createSeededRandom(seed);
  if (stage.kind === 'kukuRandomAll') {
    const allQuestions = Array.from({ length: 9 }, (_, index) => createKukuDanQuestions(index + 1)).flat();
    return shuffleQuestions(allQuestions, random).slice(0, 9);
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

function createSingleOperatorQuestion(operator: DentakuOperator, operandCount: 2 | 3 | 4 | 5, random: () => number, problemNumber: number): DentakuQuestion {
  const nextOperandCount = problemNumber === 0 ? randomInt(random, 2, 5) as 2 | 3 | 4 | 5 : operandCount;
  if (nextOperandCount === 2) {
    return createBinaryQuestion(operator, random, problemNumber);
  }

  let attempts = 0;
  while (attempts < 500) {
    attempts += 1;
    const first = operator === '×' ? randomInt(random, 2, 9) : randomInt(random, 3, 18);
    const operands = [first];
    let current = first;
    let valid = true;

    for (let index = 1; index < nextOperandCount; index += 1) {
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

    if (valid) {
      return createQuestion(`${operator}-${problemNumber}-${operands.join('-')}`, operands, Array.from({ length: operands.length - 1 }, () => operator), 'plain');
    }
  }

  return createBinaryQuestion(operator, random, problemNumber);
}

function createBinaryQuestion(operator: DentakuOperator, random: () => number, problemNumber: number): DentakuQuestion {
  if (operator === '+') {
    const left = randomInt(random, 1, 9);
    const right = randomInt(random, 1, 9);
    return createQuestion(`add-${problemNumber}-${left}-${right}`, [left, right], [operator]);
  }

  if (operator === '-') {
    const right = randomInt(random, 1, 9);
    const answer = randomInt(random, 0, 9);
    return createQuestion(`subtract-${problemNumber}-${answer + right}-${right}`, [answer + right, right], [operator]);
  }

  if (operator === '×') {
    const left = randomInt(random, 2, 9);
    const right = randomInt(random, 2, 9);
    return createQuestion(`multiply-${problemNumber}-${left}-${right}`, [left, right], [operator]);
  }

  const right = randomInt(random, 2, 9);
  const answer = randomInt(random, 1, 9);
  return createQuestion(`divide-${problemNumber}-${answer * right}-${right}`, [answer * right, right], [operator]);
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
