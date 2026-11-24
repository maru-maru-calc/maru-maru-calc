import { PlaceValue, Stage } from './types';

export type StageIsland = {
  id: Stage['islandId'];
  title: string;
  description: string;
  stageSetTitles: string[];
};

export const STAGE_ISLANDS: StageIsland[] = [
  {
    id: 'addition',
    title: 'たしざんのしま',
    description: 'あわせて、ぴったりにまとめる',
    stageSetTitles: ['ちいさなあわせ', '10とそのまわり', 'おおきなかずのひろば'],
  },
  {
    id: 'subtraction',
    title: 'ひきざんのしま',
    description: 'なくなるまるをみながら、ちがいをみつける',
    stageSetTitles: ['ちいさなひきざん', '10と20のひきざん', 'おおきなひきざん'],
  },
  {
    id: 'multiplication',
    title: 'かけざんのしま',
    description: 'まとまりをふやして、かけざんをためす',
    stageSetTitles: ['まとまりをふやす', 'たすか かけるか', 'くみあわせてふやす'],
  },
  {
    id: 'division',
    title: 'わりざんのしま',
    description: 'まとまりをわけて、わりざんをためす',
    stageSetTitles: ['まとまりをわける', 'ひくか わるか', 'くみあわせてわける'],
  },
  {
    id: 'mixed3',
    title: '3つのあわ',
    description: '3つのあわと2つのきごうをぜんぶつかう',
    stageSetTitles: ['3つのあわ'],
  },
  {
    id: 'mixed4',
    title: '4つのあわ',
    description: '4つのあわと3つのきごうをぜんぶつかう',
    stageSetTitles: ['4つのあわ'],
  },
  {
    id: 'mixed5',
    title: '5つのあわ',
    description: '5つのあわと4つのきごうをぜんぶつかう',
    stageSetTitles: ['5つのあわ'],
  },
  {
    id: 'mixed3Free',
    title: '3つのあわ ∞',
    description: '3つのあわを、きごうの回数制限なしでとく',
    stageSetTitles: ['3つのあわ ∞'],
  },
  {
    id: 'mixed4Free',
    title: '4つのあわ ∞',
    description: '4つのあわを、きごうの回数制限なしでとく',
    stageSetTitles: ['4つのあわ ∞'],
  },
  {
    id: 'mixed5Free',
    title: '5つのあわ ∞',
    description: '5つのあわを、きごうの回数制限なしでとく',
    stageSetTitles: ['5つのあわ ∞'],
  },
];

export const STAGES: Stage[] = [
  ...createAdditionStages(),
  ...createSubtractionStages(),
  ...createMultiplicationStages(),
  ...createDivisionStages(),
  ...createMixedStages(),
  ...createFreeMixedStages(),
];

export function getStage(index: number) {
  return STAGES[Math.max(0, Math.min(index, STAGES.length - 1))];
}

export function getStageIndexById(stageId: string) {
  return Math.max(0, STAGES.findIndex((stage) => stage.id === stageId));
}

function createAdditionStages(): Stage[] {
  const specs: Array<[string, string, number[], number, PlaceValue[]?]> = [
    ['addition-10-ones', 'ちいさなあわせ', [2, 3], 5],
    ['addition-10-twos', 'ちいさなあわせ', [2, 2, 2, 2, 2], 10],
    ['addition-10-five-five', 'ちいさなあわせ', [5, 3], 8],
    ['addition-10-six-four', 'ちいさなあわせ', [4, 2, 3], 9],
    ['addition-10-four-six', 'ちいさなあわせ', [6, 1, 5], 12],
    ['addition-10-seven-three', 'ちいさなあわせ', [7, 4], 11],
    ['addition-10-three-seven', 'ちいさなあわせ', [3, 4, 5], 12],
    ['addition-10-eight-two', '10とそのまわり', [8, 2], 10],
    ['addition-10-two-eight', '10とそのまわり', [2, 7, 4], 13],
    ['addition-10-nine-one', '10とそのまわり', [9, 1, 5], 15],
    ['addition-10-one-nine', '10とそのまわり', [1, 9, 8], 18],
    ['addition-10-three-two-five', '10とそのまわり', [3, 2, 5], 10],
    ['addition-10-two-three-five', '10とそのまわり', [2, 3, 6], 11],
    ['addition-10-four-one-five', '10とそのまわり', [4, 1, 7], 12],
    ['addition-10-one-four-five', '10とそのまわり', [1, 4, 9], 14],
    ['addition-10-six-two-two', '10とそのまわり', [6, 2, 2, 5], 15],
    ['addition-10-two-two-six', '10とそのまわり', [2, 2, 6, 8], 18],
    ['addition-10-seven-one-two', '10とそのまわり', [7, 1, 2, 6], 16],
    ['addition-10-one-two-seven', '10とそのまわり', [1, 2, 7, 10], 20],
    ['addition-10-four-three-two-one', '10とそのまわり', [4, 3, 2, 1], 10],
    ['addition-20-pairs', '10とそのまわり', [6, 4, 7, 3], 20],
    ['addition-20-fives', '10とそのまわり', [5, 5, 4, 6], 20],
    ['addition-50-times', 'おおきなかずのひろば', [20, 15, 10, 5], 50, [1, 10]],
    ['addition-100-times', 'おおきなかずのひろば', [40, 30, 20, 10], 100, [1, 10]],
    ['addition-120-times', 'おおきなかずのひろば', [100, 10, 5, 5], 120, [1, 10, 100]],
  ];

  return specs.map(([id, setTitle, bubbleCounts, target, allowedValues = [1]]) => ({
    id,
    title: `${target}にしよう`,
    target,
    allowedValues,
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle,
    bubbleCounts,
  }));
}

function createSubtractionStages(): Stage[] {
  // The first stages of each set only take away. After that some need one bubble added back
  // (9 - 4 + 2), so the player has to decide which bubbles to take away.
  const specs: Array<[string, number[], number]> = [
    ['ちいさなひきざん', [7, 2], 5],
    ['ちいさなひきざん', [9, 4], 5],
    ['ちいさなひきざん', [12, 5], 7],
    ['ちいさなひきざん', [14, 6], 8],
    ['ちいさなひきざん', [16, 7], 9],
    ['ちいさなひきざん', [15, 3, 4], 8],
    ['ちいさなひきざん', [9, 4, 2], 7],
    ['ちいさなひきざん', [12, 5, 3], 10],
    ['10と20のひきざん', [18, 8], 10],
    ['10と20のひきざん', [24, 9], 15],
    ['10と20のひきざん', [30, 10], 20],
    ['10と20のひきざん', [28, 6, 2], 20],
    ['10と20のひきざん', [25, 10, 5], 20],
    ['10と20のひきざん', [32, 7, 5], 20],
    ['10と20のひきざん', [16, 8, 12], 20],
    ['10と20のひきざん', [45, 20, 5], 20],
    ['10と20のひきざん', [40, 10, 15, 5], 20],
    ['おおきなひきざん', [60, 10], 50],
    ['おおきなひきざん', [75, 25], 50],
    ['おおきなひきざん', [90, 20, 10], 60],
    ['おおきなひきざん', [80, 30, 10], 60],
    ['おおきなひきざん', [120, 20], 100],
    ['おおきなひきざん', [130, 50, 20], 100],
    ['おおきなひきざん', [180, 40, 40], 100],
    ['おおきなひきざん', [200, 50, 30, 5], 125],
  ];

  return specs.map(([setTitle, bubbleCounts, target], index) => ({
    id: `subtraction-${index + 1}`,
    title: `${target}にしよう`,
    target,
    allowedValues: [1, 10, 100],
    islandId: 'subtraction',
    islandTitle: 'ひきざんのしま',
    setTitle,
    bubbleCounts,
  }));
}

function createMultiplicationStages(): Stage[] {
  // 1. Only × is there: see what multiplying does.
  const multiplyOnly: Array<[number[], number]> = [
    [[2, 3], 6],
    [[2, 4], 8],
    [[5, 2], 10],
    [[3, 4], 12],
    [[4, 4], 16],
    [[2, 3, 4], 24],
  ];
  // 2. Two bubbles, + or ×: the first real choice. Two of them want +.
  const plusOrMultiply: Array<[number[], number]> = [
    [[3, 3], 9],
    [[6, 3], 18],
    [[4, 5], 9],
    [[7, 2], 14],
    [[6, 2], 8],
    [[3, 7], 21],
  ];
  // 3. Three bubbles, + and ×: multiply two, add the third.
  const plusAndMultiply: Array<[number[], number]> = [
    [[2, 3, 4], 10],
    [[2, 4, 3], 11],
    [[3, 4, 5], 17],
    [[5, 2, 8], 18],
    [[6, 3, 4], 22],
    [[8, 2, 3], 19],
  ];
  // 4. - joins in, then a fourth bubble.
  const plusMinusAndMultiply: Array<[number[], number]> = [
    [[7, 2, 5], 9],
    [[6, 4, 3], 21],
    [[5, 3, 8], 7],
    [[4, 5, 6], 14],
    [[2, 3, 4, 5], 17],
    [[3, 2, 5, 4], 34],
    [[4, 3, 2, 8], 32],
  ];

  return [
    ...operationStageGroup('multiplication', 'かけざんのしま', 'まとまりをふやす', multiplyOnly, { '+': 0, '-': 0, '×': 'infinite', '÷': 0 }),
    ...operationStageGroup('multiplication', 'かけざんのしま', 'たすか かけるか', plusOrMultiply, { '+': 'infinite', '-': 0, '×': 'infinite', '÷': 0 }, multiplyOnly.length),
    ...operationStageGroup('multiplication', 'かけざんのしま', 'くみあわせてふやす', plusAndMultiply, { '+': 'infinite', '-': 0, '×': 'infinite', '÷': 0 }, multiplyOnly.length + plusOrMultiply.length),
    ...operationStageGroup(
      'multiplication',
      'かけざんのしま',
      'くみあわせてふやす',
      plusMinusAndMultiply,
      { '+': 'infinite', '-': 'infinite', '×': 'infinite', '÷': 0 },
      multiplyOnly.length + plusOrMultiply.length + plusAndMultiply.length,
    ),
  ];
}

function createDivisionStages(): Stage[] {
  // 1. Only ÷ is there: see what dividing does (and that the bigger number has to come first).
  const divideOnly: Array<[number[], number]> = [
    [[6, 2], 3],
    [[8, 2], 4],
    [[9, 3], 3],
    [[12, 3], 4],
    [[15, 3], 5],
    [[24, 3, 2], 4],
  ];
  // 2. Two bubbles, - or ÷: the first real choice. Two of them want -.
  const minusOrDivide: Array<[number[], number]> = [
    [[10, 2], 5],
    [[10, 5], 5],
    [[14, 2], 7],
    [[9, 3], 6],
    [[16, 4], 4],
    [[20, 4], 5],
  ];
  // 3. Three bubbles, + and ÷: divide, then add the third.
  const plusAndDivide: Array<[number[], number]> = [
    [[12, 3, 5], 9],
    [[18, 3, 2], 8],
    [[16, 4, 7], 11],
    [[24, 6, 5], 9],
    [[36, 6, 8], 14],
    [[28, 4, 6], 13],
  ];
  // 4. - joins in (one of these adds first and divides after), then a fourth bubble.
  const plusMinusAndDivide: Array<[number[], number]> = [
    [[30, 5, 4], 2],
    [[20, 4, 3], 8],
    [[27, 3, 4], 5],
    [[45, 9, 5], 10],
    [[48, 6, 2, 7], 13],
    [[60, 5, 4, 3], 11],
    [[72, 8, 6, 5], 10],
  ];

  return [
    ...operationStageGroup('division', 'わりざんのしま', 'まとまりをわける', divideOnly, { '+': 0, '-': 0, '×': 0, '÷': 'infinite' }),
    ...operationStageGroup('division', 'わりざんのしま', 'ひくか わるか', minusOrDivide, { '+': 0, '-': 'infinite', '×': 0, '÷': 'infinite' }, divideOnly.length),
    ...operationStageGroup('division', 'わりざんのしま', 'くみあわせてわける', plusAndDivide, { '+': 'infinite', '-': 0, '×': 0, '÷': 'infinite' }, divideOnly.length + minusOrDivide.length),
    ...operationStageGroup(
      'division',
      'わりざんのしま',
      'くみあわせてわける',
      plusMinusAndDivide,
      { '+': 'infinite', '-': 'infinite', '×': 0, '÷': 'infinite' },
      divideOnly.length + minusOrDivide.length + plusAndDivide.length,
    ),
  ];
}

function operationStageGroup(
  islandId: 'multiplication' | 'division',
  islandTitle: string,
  setTitle: string,
  specs: Array<[number[], number]>,
  operatorLimits: NonNullable<Stage['operatorLimits']>,
  startIndex = 0,
): Stage[] {
  return specs.map(([bubbleCounts, target], index) => ({
    id: `${islandId}-${startIndex + index + 1}`,
    title: `${target}にしよう`,
    target,
    allowedValues: [1, 10, 100],
    islandId,
    islandTitle,
    setTitle,
    bubbleCounts,
    operatorLimits,
  }));
}

function createMixedStages(): Stage[] {
  return [
    ...mixedStageGroup('mixed3', [
      [[2, 3, 4], { '×': 1, '+': 1 }, 10],
      [[8, 2, 3], { '÷': 1, '+': 1 }, 7],
      [[5, 4, 3], { '+': 1, '-': 1 }, 6],
      [[3, 3, 2], { '×': 1, '-': 1 }, 7],
      [[9, 3, 2], { '÷': 1, '×': 1 }, 6],
      [[6, 2, 5], { '-': 1, '×': 1 }, 28],
      [[4, 2, 2], { '×': 1, '÷': 1 }, 4],
      [[8, 4, 2], { '+': 1, '÷': 1 }, 8],
      [[10, 2, 6], { '÷': 1, '-': 1 }, -1],
      [[4, 6, 2], { '+': 1, '×': 1 }, 16],
    ]),
    ...mixedStageGroup('mixed4', [
      [[2, 3, 4, 5], { '×': 1, '+': 1, '-': 1 }, 5],
      [[8, 2, 3, 4], { '÷': 1, '+': 1, '×': 1 }, 16],
      [[10, 4, 3, 2], { '-': 1, '÷': 1, '+': 1 }, 4],
      [[6, 3, 2, 5], { '×': 1, '÷': 1, '+': 1 }, 9],
      [[9, 3, 4, 2], { '÷': 1, '+': 1, '-': 1 }, 5],
      [[4, 4, 3, 2], { '+': 1, '×': 1, '÷': 1 }, 10],
      [[7, 2, 5, 3], { '+': 1, '-': 1, '×': 1 }, 12],
      [[12, 3, 2, 4], { '÷': 1, '×': 1, '+': 1 }, 12],
      [[5, 5, 2, 3], { '+': 1, '÷': 1, '×': 1 }, 9],
      [[14, 7, 3, 2], { '÷': 1, '+': 1, '×': 1 }, 8],
    ]),
    ...mixedStageGroup('mixed5', [
      [[2, 3, 4, 5, 6], { '×': 1, '+': 2, '-': 1 }, 11],
      [[12, 3, 2, 5, 4], { '÷': 1, '×': 1, '+': 1, '-': 1 }, 9],
      [[6, 4, 2, 3, 5], { '+': 1, '÷': 1, '×': 1, '-': 1 }, 16],
      [[9, 3, 5, 2, 4], { '÷': 1, '+': 1, '×': 1, '-': 1 }, 13],
      [[8, 2, 6, 3, 5], { '÷': 1, '+': 1, '-': 1, '×': 1 }, 23],
      [[5, 5, 4, 2, 3], { '+': 1, '-': 1, '÷': 1, '×': 1 }, 9],
      [[7, 3, 2, 4, 6], { '+': 1, '×': 1, '÷': 1, '-': 1 }, -1],
      [[10, 2, 3, 5, 4], { '÷': 1, '+': 1, '×': 1, '-': 1 }, 11],
      [[4, 4, 2, 6, 3], { '×': 1, '÷': 1, '+': 1, '-': 1 }, 11],
      [[15, 3, 2, 4, 7], { '÷': 1, '×': 1, '+': 1, '-': 1 }, 7],
    ]),
  ];
}

function mixedStageGroup(
  islandId: 'mixed3' | 'mixed4' | 'mixed5',
  specs: Array<[number[], Partial<NonNullable<Stage['operatorLimits']>>, number]>,
): Stage[] {
  const bubbleCount = Number(islandId.replace('mixed', ''));
  return specs.map(([bubbleCounts, operatorLimits, target], index) => ({
    id: `${islandId}-${index + 1}`,
    title: `${target}にしよう`,
    target,
    allowedValues: [1],
    islandId,
    islandTitle: `${bubbleCount}つのあわ`,
    setTitle: `${bubbleCount}つのあわ`,
    bubbleCounts,
    operatorLimits,
  }));
}

function createFreeMixedStages(): Stage[] {
  // Every operator may be used as often as wanted, so these are chosen to still need thought:
  // adding and taking away alone never reaches the goal, and each island goes from several
  // winning ways down to a few. (They used to repeat the bubbles and goals of the islands above.)
  return [
    ...freeMixedStageGroup('mixed3Free', [
      [[2, 3, 4], 20],
      [[2, 5, 7], 45],
      [[4, 5, 8], 52],
      [[3, 4, 9], 15],
      [[5, 6, 12], 30],
      [[2, 3, 7], 3],
      [[2, 3, 8], 2],
      [[3, 4, 6], 2],
      [[4, 6, 8], 3],
      [[6, 6, 9], 4],
    ]),
    ...freeMixedStageGroup('mixed4Free', [
      [[4, 5, 6, 9], 55],
      [[2, 5, 8, 9], 15],
      [[2, 4, 6, 8], 3],
      [[3, 4, 7, 8], 20],
      [[3, 5, 6, 8], 37],
      [[3, 4, 6, 9], 13],
      [[3, 4, 6, 8], 12],
      [[3, 6, 7, 9], 4],
      [[4, 7, 8, 9], 24],
      [[2, 5, 6, 7], 22],
    ]),
    ...freeMixedStageGroup('mixed5Free', [
      [[2, 3, 4, 5, 6], 21],
      [[2, 3, 4, 5, 9], 14],
      [[2, 3, 5, 8, 9], 26],
      [[2, 4, 5, 6, 7], 13],
      [[2, 3, 5, 7, 9], 29],
      [[2, 3, 5, 6, 9], 17],
      [[2, 3, 5, 6, 7], 45],
      [[2, 4, 5, 6, 8], 49],
      [[3, 4, 5, 6, 7], 37],
      [[2, 3, 6, 7, 8], 58],
    ]),
  ];
}

function freeMixedStageGroup(
  islandId: 'mixed3Free' | 'mixed4Free' | 'mixed5Free',
  specs: Array<[number[], number]>,
): Stage[] {
  const bubbleCount = Number(islandId.replace('mixed', '').replace('Free', ''));
  return specs.map(([bubbleCounts, target], index) => ({
    id: `${islandId}-${index + 1}`,
    title: `${target}にしよう`,
    target,
    allowedValues: [1],
    islandId,
    islandTitle: `${bubbleCount}つのあわ ∞`,
    setTitle: `${bubbleCount}つのあわ ∞`,
    bubbleCounts,
  }));
}
