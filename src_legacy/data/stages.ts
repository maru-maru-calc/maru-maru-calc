import { Stage } from '@/domain/stage/types';

export const initialStages: Stage[] = [
  {
    id: 'stage-1',
    worldId: 'addition-island',
    kind: 'mvp',
    title: 'ステージ 1',
    titleHiragana: 'すてーじ 1',
    description: '2つの数をあわせる',
    descriptionHiragana: '2つのかずをあわせる',
    order: 1,
    targetValue: 5,
    initialGroups: [{ value: 2 }, { value: 3 }],
    allowedOperators: ['add'],
    solution: {
      steps: [{ operator: 'add', leftValue: 2, rightValue: 3, resultValue: 5 }],
    },
  },
  {
    id: 'stage-2',
    worldId: 'addition-island',
    kind: 'mvp',
    title: 'ステージ 2',
    titleHiragana: 'すてーじ 2',
    description: '10をつくる',
    descriptionHiragana: '10をつくる',
    order: 2,
    targetValue: 10,
    initialGroups: [{ value: 4 }, { value: 6 }],
    allowedOperators: ['add'],
    solution: {
      steps: [{ operator: 'add', leftValue: 4, rightValue: 6, resultValue: 10 }],
    },
  },
  {
    id: 'stage-3',
    worldId: 'addition-island',
    kind: 'mvp',
    title: 'ステージ 3',
    titleHiragana: 'すてーじ 3',
    description: '1のまとまりが10になる',
    descriptionHiragana: '1のまとまりが10になる',
    order: 3,
    targetValue: 12,
    initialGroups: [{ value: 7 }, { value: 5 }],
    allowedOperators: ['add'],
    solution: {
      steps: [{ operator: 'add', leftValue: 7, rightValue: 5, resultValue: 12 }],
    },
  },
  {
    id: 'stage-4',
    worldId: 'addition-island',
    kind: 'mvp',
    title: 'ステージ 4',
    titleHiragana: 'すてーじ 4',
    description: '2けたの数をあわせる',
    descriptionHiragana: '2けたのかずをあわせる',
    order: 4,
    targetValue: 31,
    initialGroups: [{ value: 19 }, { value: 12 }],
    allowedOperators: ['add'],
    solution: {
      steps: [{ operator: 'add', leftValue: 19, rightValue: 12, resultValue: 31 }],
    },
  },
  {
    id: 'stage-5',
    worldId: 'addition-island',
    kind: 'mvp',
    title: 'ステージ 5',
    titleHiragana: 'すてーじ 5',
    description: '100をつくる',
    descriptionHiragana: '100をつくる',
    order: 5,
    targetValue: 100,
    initialGroups: [{ value: 55 }, { value: 45 }],
    allowedOperators: ['add'],
    solution: {
      steps: [{ operator: 'add', leftValue: 55, rightValue: 45, resultValue: 100 }],
    },
  },
  {
    id: 'stage-6',
    worldId: 'addition-island',
    kind: 'practice',
    title: 'ステージ 6',
    titleHiragana: 'すてーじ 6',
    description: 'できた数をもう一度つかう',
    descriptionHiragana: 'できたかずをもういちどつかう',
    order: 6,
    targetValue: 15,
    initialGroups: [{ value: 2 }, { value: 3 }, { value: 10 }],
    allowedOperators: ['add'],
    solution: {
      steps: [
        { operator: 'add', leftValue: 2, rightValue: 3, resultValue: 5 },
        { operator: 'add', leftValue: 5, rightValue: 10, resultValue: 15 },
      ],
    },
  },
];

export function findStageById(stageId: string | undefined) {
  return initialStages.find((stage) => stage.id === stageId);
}

export function findNextStageId(stageId: string | undefined) {
  const stage = findStageById(stageId);
  if (!stage) {
    return undefined;
  }

  return initialStages.find((candidate) => candidate.order === stage.order + 1)?.id;
}
