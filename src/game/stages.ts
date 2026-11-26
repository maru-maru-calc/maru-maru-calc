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
];

export const STAGES: Stage[] = [
  ...createAdditionStages(),
  ...createSubtractionStages(),
  ...createMultiplicationStages(),
  ...createDivisionStages(),
];

export function getStage(index: number) {
  return STAGES[Math.max(0, Math.min(index, STAGES.length - 1))];
}

export function getStageIndexById(stageId: string) {
  return Math.max(0, STAGES.findIndex((stage) => stage.id === stageId));
}

function createAdditionStages(): Stage[] {
  // Every stage here is "pop them all and it comes out right": there is nothing to choose, so a
  // stage is worth having only for what is new in it. One or two stages for each step:
  // two small numbers, many small numbers, three numbers, making ten, past ten, ten and more,
  // two tens, then tens and hundreds. (There were 25, most of them a step repeated.)
  //
  // The ids are the ones these stages always had, so that cleared stages stay cleared.
  const specs: Array<[string, string, number[], number, PlaceValue[]?]> = [
    ['addition-10-ones', 'ちいさなあわせ', [2, 3], 5],
    ['addition-10-twos', 'ちいさなあわせ', [2, 2, 2, 2, 2], 10],
    ['addition-10-five-five', 'ちいさなあわせ', [5, 3], 8],
    ['addition-10-six-four', 'ちいさなあわせ', [4, 2, 3], 9],
    ['addition-10-eight-two', '10とそのまわり', [8, 2], 10],
    ['addition-10-three-two-five', '10とそのまわり', [3, 2, 5], 10],
    ['addition-10-seven-three', '10とそのまわり', [7, 4], 11],
    ['addition-10-nine-one', '10とそのまわり', [9, 1, 5], 15],
    ['addition-20-pairs', '10とそのまわり', [6, 4, 7, 3], 20],
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
