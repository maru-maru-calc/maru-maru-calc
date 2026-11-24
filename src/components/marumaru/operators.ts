// Which operators a stage allows and how often, plus small helpers for the practice modes.
import type { DentakuPractice, OperatorButtonSymbol } from '@/components/marumaru/types';
import { isOperatorToken, stripExpressionResult } from '@/game/expression';
import { getStage } from '@/game/stages';
import { BeadSign, OperatorUsageLimit, OperatorUsageLimits } from '@/game/types';
import type { Stage } from '@/game/types';

export function getInitialOperatorUsage(stage: Stage, mode: 'stage' | 'launch'): OperatorUsageLimits {
  const base: OperatorUsageLimits = getDefaultOperatorUsage(stage, mode);

  return {
    ...base,
    ...stage.operatorLimits,
  };
}

function getDefaultOperatorUsage(stage: Stage, mode: 'stage' | 'launch'): OperatorUsageLimits {
  if (mode === 'launch' || stage.islandId === 'addition') {
    return { '+': 'infinite', '-': 0, '×': 0, '÷': 0 };
  }
  if (stage.islandId === 'subtraction') {
    return { '+': 'infinite', '-': 'infinite', '×': 0, '÷': 0 };
  }
  if (stage.islandId === 'mixed3Free' || stage.islandId === 'mixed4Free' || stage.islandId === 'mixed5Free') {
    return { '+': 'infinite', '-': 'infinite', '×': 'infinite', '÷': 'infinite' };
  }
  return { '+': 0, '-': 0, '×': 0, '÷': 0 };
}

export function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createDentakuPracticeStage(practice: DentakuPractice): Stage {
  const operatorLimits: Partial<OperatorUsageLimits> = {
    '+': practice.operators.includes('+') || (practice.longFormMode && practice.operators.includes('-')) ? 'infinite' : 0,
    '-': practice.operators.includes('-') ? 'infinite' : 0,
    '×': practice.operators.includes('×') ? 'infinite' : 0,
    '÷': practice.operators.includes('÷') ? 'infinite' : 0,
  };

  return {
    id: `dentaku-practice-${practice.questionKey}`,
    title: practice.prompt.replace(' = ?', ''),
    target: practice.answer,
    allowedValues: [1],
    islandId: 'multiplication',
    islandTitle: 'dentaku',
    setTitle: 'dentaku',
    bubbleCounts: practice.operands,
    operatorLimits,
  };
}

export function getInitialSelectedOperator(_operatorUsage: OperatorUsageLimits): OperatorButtonSymbol {
  return '+';
}

export function canUseOperator(usage: OperatorUsageLimit) {
  return usage === 'infinite' || usage > 0;
}

export function hasExpressionValue(tokens: string[]) {
  return stripExpressionResult(tokens).some((token) => !isOperatorToken(token));
}

function getOperatorButtonLabel(operator: OperatorButtonSymbol) {
  if (operator === '+') {
    return 'たす';
  }
  if (operator === '-') {
    return 'ひく';
  }
  if (operator === '×') {
    return 'かける';
  }
  if (operator === '÷') {
    return 'わる';
  }
  return 'こたえ';
}

export function getOperatorHelpMessage(operator: OperatorButtonSymbol, sign: BeadSign) {
  if (operator === '+') {
    return 'まるを ふやすよ';
  }
  if (operator === '-') {
    return 'まるを へらすよ';
  }
  if (operator === '×') {
    return sign < 0 ? 'まとまりを マイナスで ふやすよ' : 'まとまりを ふやすよ';
  }
  return sign < 0 ? 'まとまりを マイナスで わるよ' : 'まとまりを わるよ';
}

export function getStageNumberInIsland(stageIndex: number) {
  const stage = getStage(stageIndex);
  let count = 0;
  for (let index = 0; index <= stageIndex; index += 1) {
    if (getStage(index).islandId === stage.islandId) {
      count += 1;
    }
  }
  return Math.max(1, count);
}
