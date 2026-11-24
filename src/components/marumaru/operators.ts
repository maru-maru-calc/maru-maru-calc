// Which operators a stage allows and how often, plus small helpers for the practice modes.
import type { DentakuPractice, OperatorButtonSymbol } from '@/components/marumaru/types';
import { isOperatorToken, stripExpressionResult } from '@/game/expression';
import { getStageOperatorUsage } from '@/game/stage-rules';
import { getStage } from '@/game/stages';
import { OperatorUsageLimit, OperatorUsageLimits } from '@/game/types';
import type { Stage } from '@/game/types';

export function getInitialOperatorUsage(stage: Stage, mode: 'stage' | 'launch'): OperatorUsageLimits {
  if (mode === 'launch') {
    return { '+': 'infinite', '-': 0, '×': 0, '÷': 0 };
  }

  return getStageOperatorUsage(stage);
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
