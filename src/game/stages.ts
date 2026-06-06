import { Stage } from './types';

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
    stageSetTitles: ['10のとう', '20のおか', 'おおきなかずのひろば'],
  },
  {
    id: 'subtraction',
    title: 'ひきざんのしま',
    description: 'なくなるまるをみながら、ちがいをみつける',
    stageSetTitles: ['10にもどすみち', '20にもどすみち', 'おおきなひきざん'],
  },
  {
    id: 'multiplication',
    title: 'かけざんのしま',
    description: 'まとまりをふやして、かけざんをためす',
    stageSetTitles: ['かけるだけ', 'たしてひいてかける'],
  },
  {
    id: 'division',
    title: 'わりざんのしま',
    description: 'まとまりをわけて、わりざんをためす',
    stageSetTitles: ['わるだけ', 'たしてひいてわる'],
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
    title: '3つのあわ free',
    description: '3つのあわを、きごうの回数制限なしでとく',
    stageSetTitles: ['3つのあわ free'],
  },
  {
    id: 'mixed4Free',
    title: '4つのあわ free',
    description: '4つのあわを、きごうの回数制限なしでとく',
    stageSetTitles: ['4つのあわ free'],
  },
  {
    id: 'mixed5Free',
    title: '5つのあわ free',
    description: '5つのあわを、きごうの回数制限なしでとく',
    stageSetTitles: ['5つのあわ free'],
  },
];

export const STAGES: Stage[] = [
  {
    id: 'addition-10-ones',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  },
  {
    id: 'addition-10-twos',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [2, 2, 2, 2, 2],
  },
  {
    id: 'addition-10-five-five',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [5, 5],
  },
  {
    id: 'addition-10-six-four',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [6, 4],
  },
  {
    id: 'addition-10-four-six',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [4, 6],
  },
  {
    id: 'addition-10-seven-three',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [7, 3],
  },
  {
    id: 'addition-10-three-seven',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [3, 7],
  },
  {
    id: 'addition-10-eight-two',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [8, 2],
  },
  {
    id: 'addition-10-two-eight',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [2, 8],
  },
  {
    id: 'addition-10-nine-one',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [9, 1],
  },
  {
    id: 'addition-10-one-nine',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [1, 9],
  },
  {
    id: 'addition-10-three-two-five',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [3, 2, 5],
  },
  {
    id: 'addition-10-two-three-five',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [2, 3, 5],
  },
  {
    id: 'addition-10-four-one-five',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [4, 1, 5],
  },
  {
    id: 'addition-10-one-four-five',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [1, 4, 5],
  },
  {
    id: 'addition-10-six-two-two',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [6, 2, 2],
  },
  {
    id: 'addition-10-two-two-six',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [2, 2, 6],
  },
  {
    id: 'addition-10-seven-one-two',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [7, 1, 2],
  },
  {
    id: 'addition-10-one-two-seven',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [1, 2, 7],
  },
  {
    id: 'addition-10-four-three-two-one',
    title: '10にまとめよう',
    target: 10,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '10のとう',
    bubbleCounts: [4, 3, 2, 1],
  },
  {
    id: 'addition-20-pairs',
    title: '20にまとめよう',
    target: 20,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '20のおか',
    bubbleCounts: [6, 4, 7, 3],
  },
  {
    id: 'addition-20-fives',
    title: '20にまとめよう',
    target: 20,
    allowedValues: [1],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: '20のおか',
    bubbleCounts: [5, 5, 5, 5],
  },
  {
    id: 'addition-50-times',
    title: '50にまとめよう',
    target: 50,
    allowedValues: [1, 10],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: 'おおきなかずのひろば',
    bubbleCounts: [6, 4, 5],
  },
  {
    id: 'addition-100-times',
    title: '100にまとめよう',
    target: 100,
    allowedValues: [1, 10],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: 'おおきなかずのひろば',
    bubbleCounts: [6, 4, 10],
  },
  {
    id: 'addition-120-times',
    title: '120にまとめよう',
    target: 120,
    allowedValues: [1, 10, 100],
    islandId: 'addition',
    islandTitle: 'たしざんのしま',
    setTitle: 'おおきなかずのひろば',
    bubbleCounts: [6, 4, 3, 4],
  },
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

function createSubtractionStages(): Stage[] {
  const specs: Array<[string, number[], number]> = [
    ['10にもどすみち', [12, 2], 10],
    ['10にもどすみち', [15, 5], 10],
    ['10にもどすみち', [30, 10], 20],
    ['10にもどすみち', [18, 8], 10],
    ['10にもどすみち', [14, 4], 10],
    ['10にもどすみち', [16, 6], 10],
    ['10にもどすみち', [19, 9], 10],
    ['10にもどすみち', [17, 2, 5], 10],
    ['10にもどすみち', [20, 4, 6], 10],
    ['10にもどすみち', [21, 1, 10], 10],
    ['20にもどすみち', [30, 10], 20],
    ['20にもどすみち', [25, 5], 20],
    ['20にもどすみち', [28, 8], 20],
    ['20にもどすみち', [35, 15], 20],
    ['20にもどすみち', [32, 7, 5], 20],
    ['20にもどすみち', [40, 10, 10], 20],
    ['20にもどすみち', [27, 2, 5], 20],
    ['20にもどすみち', [45, 20, 5], 20],
    ['おおきなひきざん', [60, 10], 50],
    ['おおきなひきざん', [75, 25], 50],
    ['おおきなひきざん', [100, 50], 50],
    ['おおきなひきざん', [120, 20], 100],
    ['おおきなひきざん', [150, 30, 20], 100],
    ['おおきなひきざん', [200, 50, 50], 100],
    ['おおきなひきざん', [180, 40, 40], 100],
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
  const multiplyOnly: Array<[number[], number]> = [
    [[2, 3], 6],
    [[3, 4], 12],
    [[4, 5], 20],
    [[5, 2], 10],
    [[6, 3], 18],
    [[7, 2], 14],
    [[8, 2], 16],
    [[3, 3], 9],
    [[4, 4], 16],
    [[5, 5], 25],
    [[2, 3, 4], 24],
    [[3, 2, 5], 30],
  ];
  const plusMinusAndMultiply: Array<[number[], number]> = [
    [[2, 3, 4], 10],
    [[3, 4, 5], 17],
    [[4, 5, 6], 14],
    [[5, 2, 8], 18],
    [[6, 3, 4], 22],
    [[7, 2, 5], 9],
    [[8, 2, 3], 13],
    [[3, 3, 7], 16],
    [[4, 4, 2], 14],
    [[5, 5, 10], 15],
    [[2, 3, 4, 5], 29],
    [[3, 2, 5, 4], 26],
    [[4, 3, 2, 8], 22],
  ];

  return [
    ...operationStageGroup('multiplication', 'かけざんのしま', 'かけるだけ', multiplyOnly, { '+': 0, '-': 0, '×': 'infinite', '÷': 0 }),
    ...operationStageGroup('multiplication', 'かけざんのしま', 'たしてひいてかける', plusMinusAndMultiply, {
      '+': 'infinite',
      '-': 'infinite',
      '×': 'infinite',
      '÷': 0,
    }, multiplyOnly.length),
  ];
}

function createDivisionStages(): Stage[] {
  const divideOnly: Array<[number[], number]> = [
    [[6, 2], 3],
    [[8, 2], 4],
    [[9, 3], 3],
    [[10, 2], 5],
    [[12, 3], 4],
    [[14, 2], 7],
    [[15, 3], 5],
    [[16, 4], 4],
    [[18, 3], 6],
    [[20, 4], 5],
    [[24, 3, 2], 4],
    [[30, 5, 2], 3],
  ];
  const plusMinusAndDivide: Array<[number[], number]> = [
    [[12, 3, 5], 9],
    [[20, 4, 3], 8],
    [[18, 3, 2], 4],
    [[16, 4, 7], 11],
    [[24, 6, 5], 9],
    [[30, 5, 4], 2],
    [[36, 6, 8], 14],
    [[28, 4, 6], 1],
    [[40, 5, 3], 11],
    [[45, 9, 5], 10],
    [[48, 6, 2, 7], 13],
    [[60, 5, 4, 3], 11],
    [[72, 8, 6, 5], 10],
  ];

  return [
    ...operationStageGroup('division', 'わりざんのしま', 'わるだけ', divideOnly, { '+': 0, '-': 0, '×': 0, '÷': 'infinite' }),
    ...operationStageGroup('division', 'わりざんのしま', 'たしてひいてわる', plusMinusAndDivide, {
      '+': 'infinite',
      '-': 'infinite',
      '×': 0,
      '÷': 'infinite',
    }, divideOnly.length),
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
      [[6, 2, 5], { '-': 1, '×': 1 }, 20],
      [[4, 2, 2], { '×': 1, '÷': 1 }, 4],
      [[7, 5, 3], { '+': 1, '÷': 1 }, 4],
      [[10, 2, 6], { '÷': 1, '-': 1 }, -1],
      [[4, 6, 2], { '+': 1, '×': 1 }, 20],
    ]),
    ...mixedStageGroup('mixed4', [
      [[2, 3, 4, 5], { '×': 1, '+': 1, '-': 1 }, 5],
      [[8, 2, 3, 4], { '÷': 1, '+': 1, '×': 1 }, 28],
      [[10, 4, 3, 2], { '-': 1, '÷': 1, '+': 1 }, 4],
      [[6, 3, 2, 5], { '×': 1, '÷': 1, '+': 1 }, 14],
      [[9, 3, 4, 2], { '÷': 1, '+': 1, '-': 1 }, 5],
      [[4, 4, 3, 2], { '+': 1, '×': 1, '÷': 1 }, 12],
      [[7, 2, 5, 3], { '+': 1, '-': 1, '×': 1 }, 12],
      [[12, 3, 2, 4], { '÷': 1, '×': 1, '+': 1 }, 12],
      [[5, 5, 2, 3], { '+': 1, '÷': 1, '×': 1 }, 15],
      [[14, 7, 3, 2], { '÷': 1, '+': 1, '×': 1 }, 10],
    ]),
    ...mixedStageGroup('mixed5', [
      [[2, 3, 4, 5, 6], { '×': 1, '+': 2, '-': 1 }, 11],
      [[12, 3, 2, 5, 4], { '÷': 1, '×': 1, '+': 1, '-': 1 }, 9],
      [[6, 4, 2, 3, 5], { '+': 1, '÷': 1, '×': 1, '-': 1 }, 10],
      [[9, 3, 5, 2, 4], { '÷': 1, '+': 1, '×': 1, '-': 1 }, 12],
      [[8, 2, 6, 3, 5], { '÷': 1, '+': 1, '-': 1, '×': 1 }, 35],
      [[5, 5, 4, 2, 3], { '+': 1, '-': 1, '÷': 1, '×': 1 }, 9],
      [[7, 3, 2, 4, 6], { '+': 1, '×': 1, '÷': 1, '-': 1 }, -1],
      [[10, 2, 3, 5, 4], { '÷': 1, '+': 1, '×': 1, '-': 1 }, 36],
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
  return [
    ...freeMixedStageGroup('mixed3Free', [
      [[2, 3, 4], 10],
      [[8, 2, 3], 7],
      [[5, 4, 3], 6],
      [[3, 3, 2], 7],
      [[9, 3, 2], 6],
      [[6, 2, 5], 20],
      [[4, 2, 2], 4],
      [[7, 5, 3], 4],
      [[10, 2, 6], -1],
      [[4, 6, 2], 20],
    ]),
    ...freeMixedStageGroup('mixed4Free', [
      [[2, 3, 4, 5], 5],
      [[8, 2, 3, 4], 28],
      [[10, 4, 3, 2], 4],
      [[6, 3, 2, 5], 14],
      [[9, 3, 4, 2], 5],
      [[4, 4, 3, 2], 12],
      [[7, 2, 5, 3], 12],
      [[12, 3, 2, 4], 12],
      [[5, 5, 2, 3], 15],
      [[14, 7, 3, 2], 10],
    ]),
    ...freeMixedStageGroup('mixed5Free', [
      [[2, 3, 4, 5, 6], 11],
      [[12, 3, 2, 5, 4], 9],
      [[6, 4, 2, 3, 5], 10],
      [[9, 3, 5, 2, 4], 12],
      [[8, 2, 6, 3, 5], 35],
      [[5, 5, 4, 2, 3], 9],
      [[7, 3, 2, 4, 6], -1],
      [[10, 2, 3, 5, 4], 36],
      [[4, 4, 2, 6, 3], 11],
      [[15, 3, 2, 4, 7], 7],
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
    islandTitle: `${bubbleCount}つのあわ free`,
    setTitle: `${bubbleCount}つのあわ free`,
    bubbleCounts,
  }));
}
