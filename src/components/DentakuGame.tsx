import { useCallback, useEffect, useMemo, useState } from 'react';

import { MarumaruGame } from '@/components/MarumaruGame';
import { createDentakuQuestions, DentakuOperator, DentakuQuestion, DentakuStage } from '@/game/dentaku';

const LONG_FORM_QUESTIONS_PER_STAGE = 5;

type DentakuGameProps = {
  stage: DentakuStage;
  longFormMode?: boolean;
  onBack: () => void;
  onNextStage: () => void;
  onStageClear: (stageId: string) => void;
};

export function DentakuGame({ stage, longFormMode = false, onBack, onNextStage, onStageClear }: DentakuGameProps) {
  const [seed, setSeed] = useState(() => Date.now());
  const [endlessQuestionIndex, setEndlessQuestionIndex] = useState(0);
  const questions = useMemo(() => (
    longFormMode
      ? createLongFormQuestions(stage, seed + endlessQuestionIndex * 9973)
      : createDentakuQuestions(stage, seed + endlessQuestionIndex * 9973)
  ), [endlessQuestionIndex, longFormMode, stage, seed]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const question = questions[Math.min(questionIndex, questions.length - 1)];

  useEffect(() => {
    setSeed(Date.now());
    setEndlessQuestionIndex(0);
    setQuestionIndex(0);
  }, [stage.id]);

  const goNextQuestion = useCallback(() => {
    if (questionIndex >= questions.length - 1) {
      if (stage.isEndless) {
        onStageClear(stage.id);
        setSeed(Date.now());
        setEndlessQuestionIndex((current) => current + 1);
        setQuestionIndex(0);
        return;
      }
      onStageClear(stage.id);
      onNextStage();
      return;
    }

    setQuestionIndex((current) => current + 1);
  }, [onNextStage, onStageClear, questionIndex, questions.length, stage.id, stage.isEndless]);

  const dentakuPractice = useMemo(
    () => ({
      questionKey: `${stage.id}-${question.id}`,
      operands: question.operands,
      operators: question.operators,
      answer: question.answer,
      prompt: question.prompt,
      stageLabel: stage.label,
      questionNumber: questionIndex + 1,
      questionTotal: questions.length,
      autoAdvance: stage.worldId === 'kuku',
      longFormMode,
      onNextQuestion: goNextQuestion,
    }),
    [goNextQuestion, longFormMode, question.answer, question.id, question.operands, question.operators, question.prompt, questionIndex, questions.length, stage.id, stage.label, stage.worldId],
  );

  return <MarumaruGame onBack={onBack} dentakuPractice={dentakuPractice} />;
}

function createLongFormQuestions(stage: DentakuStage, seed: number): DentakuQuestion[] {
  const random = createSeededRandom(seed + (stage.problemNumber ?? 1) * 7919);
  const operator = stage.operator ?? '+';
  const questions: DentakuQuestion[] = [];
  const usedPrompts = new Set<string>();

  for (let index = 0; index < LONG_FORM_QUESTIONS_PER_STAGE; index += 1) {
    let question = createLongFormQuestion(operator, random, stage.problemNumber ?? 1, index + 1);
    let attempt = 0;
    while (usedPrompts.has(question.prompt) && attempt < 40) {
      attempt += 1;
      question = createLongFormQuestion(operator, random, stage.problemNumber ?? 1, index + 1);
    }
    usedPrompts.add(question.prompt);
    questions.push(question);
  }

  return questions;
}

function createLongFormQuestion(operator: DentakuOperator, random: () => number, problemNumber: number, questionNumber: number): DentakuQuestion {
  if (operator === '+') {
    return createLongFormAdditionQuestion(random, problemNumber, questionNumber, operator);
  }

  if (operator === '-') {
    return createLongFormSubtractionQuestion(random, problemNumber, questionNumber, operator);
  }

  if (operator === '×') {
    const { left, right } = createLongFormMultiplicationOperands(random, problemNumber, questionNumber);
    return createQuestion(`long-multiply-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
  }

  const { divisor, quotient } = createLongFormDivisionOperands(random, problemNumber, questionNumber);
  return createQuestion(`long-divide-${problemNumber}-${questionNumber}-${divisor * quotient}-${divisor}`, [divisor * quotient, divisor], [operator]);
}

function createLongFormAdditionQuestion(random: () => number, problemNumber: number, questionNumber: number, operator: DentakuOperator) {
  if (problemNumber >= 6) {
    return createLongFormAdditionQuestion(random, questionNumber, questionNumber, operator);
  }

  const difficulty = getLongFormQuestionDifficulty(questionNumber);

  if (problemNumber === 1) {
    const leftTens = randomInt(random, 1 + difficulty, Math.min(8, 4 + difficulty));
    const leftOnes = randomInt(random, 0, 5 + difficulty);
    const right = randomInt(random, 1, 9 - leftOnes);
    const left = leftTens * 10 + leftOnes;
    return createQuestion(`long-add-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
  }

  if (problemNumber === 2) {
    const leftTens = randomInt(random, 1 + difficulty, Math.min(8, 4 + difficulty));
    const leftOnes = randomInt(random, 4 + Math.min(difficulty, 2), 9);
    const right = randomInt(random, Math.max(10 - leftOnes, 1), 9);
    const left = leftTens * 10 + leftOnes;
    return createQuestion(`long-add-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
  }

  if (problemNumber === 3) {
    const leftTens = randomInt(random, 1 + Math.min(difficulty, 2), 7);
    const rightTens = randomInt(random, 1, 8 - leftTens);
    const leftOnes = randomInt(random, 0, 5 + difficulty);
    const rightOnes = randomInt(random, 0, 9 - leftOnes);
    const left = leftTens * 10 + leftOnes;
    const right = rightTens * 10 + rightOnes;
    return createQuestion(`long-add-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
  }

  if (problemNumber === 4) {
    const leftTens = randomInt(random, 1 + Math.min(difficulty, 2), 4);
    const rightTens = randomInt(random, 1, 8 - leftTens);
    const leftOnes = randomInt(random, 4 + Math.min(difficulty, 2), 9);
    const rightOnes = randomInt(random, Math.max(10 - leftOnes, 1), 9);
    const left = leftTens * 10 + leftOnes;
    const right = rightTens * 10 + rightOnes;
    return createQuestion(`long-add-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
  }

  const leftTens = randomInt(random, 5, 8);
  const rightTens = randomInt(random, Math.max(10 - leftTens, 1), 9);
  const leftOnes = randomInt(random, 4, 9);
  const rightOnes = randomInt(random, Math.max(10 - leftOnes, 1), 9);
  const left = leftTens * 10 + leftOnes;
  const right = rightTens * 10 + rightOnes;
  return createQuestion(`long-add-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
}

function createLongFormSubtractionQuestion(random: () => number, problemNumber: number, questionNumber: number, operator: DentakuOperator) {
  if (problemNumber >= 5) {
    return createLongFormSubtractionQuestion(random, Math.min(questionNumber, 4), questionNumber, operator);
  }

  const difficulty = getLongFormQuestionDifficulty(questionNumber);

  if (problemNumber === 1) {
    const leftTens = randomInt(random, 1 + difficulty, 9);
    const right = randomInt(random, 1, Math.min(8, 4 + difficulty));
    const leftOnes = randomInt(random, right, 9);
    const left = leftTens * 10 + leftOnes;
    return createQuestion(`long-subtract-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
  }

  if (problemNumber === 2) {
    const leftTens = randomInt(random, 2 + Math.min(difficulty, 2), 9);
    const leftOnes = randomInt(random, 0, Math.min(5, 2 + difficulty));
    const right = randomInt(random, leftOnes + 1, 9);
    const left = leftTens * 10 + leftOnes;
    return createQuestion(`long-subtract-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
  }

  if (problemNumber === 3) {
    const rightTens = randomInt(random, 1 + Math.min(difficulty, 2), 7);
    const leftTens = randomInt(random, rightTens + 1, 9);
    const rightOnes = randomInt(random, 0, Math.min(8, 4 + difficulty));
    const leftOnes = randomInt(random, rightOnes, 9);
    const left = leftTens * 10 + leftOnes;
    const right = rightTens * 10 + rightOnes;
    return createQuestion(`long-subtract-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
  }

  const rightTens = randomInt(random, 1 + Math.min(difficulty, 2), 6);
  const leftTens = randomInt(random, rightTens + 2, 9);
  const leftOnes = randomInt(random, 0, Math.min(5, 2 + difficulty));
  const rightOnes = randomInt(random, leftOnes + 1, 9);
  const left = leftTens * 10 + leftOnes;
  const right = rightTens * 10 + rightOnes;
  return createQuestion(`long-subtract-${problemNumber}-${questionNumber}-${left}-${right}`, [left, right], [operator]);
}

function getLongFormQuestionDifficulty(questionNumber: number) {
  return Math.max(0, Math.min(4, questionNumber - 1));
}

function createLongFormMultiplicationOperands(random: () => number, problemNumber: number, questionNumber: number) {
  if (problemNumber >= 4) {
    return createLongFormMultiplicationOperands(random, Math.min(questionNumber, 3), questionNumber);
  }

  if (problemNumber === 1) {
    return { left: randomInt(random, 12 + questionNumber, 23), right: randomInt(random, 11, 12) };
  }
  if (problemNumber === 2) {
    return { left: randomInt(random, 21 + questionNumber, 39), right: randomInt(random, 13, 19) };
  }
  return { left: randomInt(random, 24 + questionNumber, 49), right: randomInt(random, 18, 29) };
}

function createLongFormDivisionOperands(random: () => number, problemNumber: number, questionNumber: number) {
  const candidates: Array<{ divisor: number; quotient: number; dividend: number }> = [];

  for (let divisor = 2; divisor <= 9; divisor += 1) {
    for (let quotient = 11; quotient <= Math.floor(99 / divisor); quotient += 1) {
      const dividend = divisor * quotient;
      const dividendTens = Math.floor(dividend / 10);
      const quotientTens = Math.floor(quotient / 10);
      const firstProduct = divisor * quotientTens;
      const firstRemainder = dividendTens - firstProduct;
      if (firstProduct > dividendTens) {
        continue;
      }
      const dividendOnes = dividend % 10;
      const quotientOnes = quotient % 10;
      const loweredValue = firstRemainder * 10 + dividendOnes;
      const stageKind = problemNumber >= 4 ? Math.min(questionNumber, 3) : problemNumber;
      if (stageKind === 1 && firstRemainder !== 0) {
        continue;
      }
      if (stageKind === 2 && (firstRemainder <= 0 || dividendOnes !== 0)) {
        continue;
      }
      if (stageKind === 3 && (firstRemainder <= 0 || dividendOnes <= 0 || quotientOnes <= 0 || loweredValue < divisor)) {
        continue;
      }
      candidates.push({ divisor, quotient, dividend });
    }
  }

  if (candidates.length > 0) {
    const sortedCandidates = candidates.sort((left, right) => left.dividend - right.dividend || left.divisor - right.divisor);
    const bucketStart = Math.floor(sortedCandidates.length * getLongFormQuestionDifficulty(questionNumber) / LONG_FORM_QUESTIONS_PER_STAGE);
    const bucketEnd = Math.max(bucketStart + 1, Math.floor(sortedCandidates.length * questionNumber / LONG_FORM_QUESTIONS_PER_STAGE));
    const bucket = sortedCandidates.slice(bucketStart, Math.min(sortedCandidates.length, bucketEnd));
    const selected = bucket[randomInt(random, 0, bucket.length - 1)] ?? sortedCandidates[randomInt(random, 0, sortedCandidates.length - 1)];
    return { divisor: selected.divisor, quotient: selected.quotient };
  }

  for (let attempt = 0; attempt < 300; attempt += 1) {
    const divisor = randomInt(random, 2, 9);
    const quotient = randomInt(random, 11, Math.floor(99 / divisor));
    const dividend = divisor * quotient;
    const dividendTens = Math.floor(dividend / 10);
    const quotientTens = Math.floor(quotient / 10);
    const firstProduct = divisor * quotientTens;
    const firstRemainder = dividendTens - firstProduct;
    if (firstProduct > dividendTens) {
      continue;
    }
    if (problemNumber === 1 && firstRemainder !== 0) {
      continue;
    }
    if (problemNumber === 2 && firstRemainder <= 0) {
      continue;
    }
    return { divisor, quotient };
  }

  return problemNumber === 1 ? { divisor: 4, quotient: 12 } : { divisor: 4, quotient: 17 };
}

function createQuestion(id: string, operands: number[], operators: DentakuOperator[]): DentakuQuestion {
  const answer = operators.reduce((current, operator, index) => applyOperator(current, operands[index + 1], operator), operands[0]);
  return {
    id,
    operands,
    operators,
    answer,
    prompt: `${operands[0]} ${operators[0]} ${operands[1]} = ?`,
  };
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
