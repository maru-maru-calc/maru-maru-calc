export type KukuStageKind = 'dan' | 'randomDan' | 'randomAll';

export type KukuStage = {
  id: string;
  title: string;
  setTitle: string;
  kind: KukuStageKind;
  dan?: number;
};

export type KukuQuestion = {
  id: string;
  left: number;
  right: number;
  answer: number;
};

export const KUKU_ISLAND = {
  id: 'kuku',
  title: '9 × 9',
  description: '1 × 1 - 9 × 9',
  stageSetTitles: ['1 - 9', 'RANDOM'],
} as const;

export const KUKU_STAGES: KukuStage[] = [
  ...Array.from({ length: 9 }, (_, index) => {
    const dan = index + 1;
    return {
      id: `kuku-dan-${dan}`,
      title: `${dan} × 1-9`,
      setTitle: '1 - 9',
      kind: 'dan' as const,
      dan,
    };
  }),
  {
    id: 'kuku-random-dan',
    title: '? × 1-9',
    setTitle: 'RANDOM',
    kind: 'randomDan',
  },
  {
    id: 'kuku-random-all',
    title: '? × ?',
    setTitle: 'RANDOM',
    kind: 'randomAll',
  },
];

export function createKukuQuestions(stage: KukuStage, seed = Date.now()): KukuQuestion[] {
  if (stage.kind === 'dan') {
    const dan = stage.dan ?? 1;
    return createDanQuestions(dan);
  }

  if (stage.kind === 'randomDan') {
    const random = createSeededRandom(seed);
    const dan = Math.floor(random() * 9) + 1;
    return shuffleQuestions(createDanQuestions(dan), random);
  }

  const random = createSeededRandom(seed);
  const allQuestions = Array.from({ length: 9 }, (_, index) => createDanQuestions(index + 1)).flat();
  return shuffleQuestions(allQuestions, random).slice(0, 9);
}

function createDanQuestions(dan: number): KukuQuestion[] {
  return Array.from({ length: 9 }, (_, index) => {
    const right = index + 1;
    return {
      id: `${dan}x${right}`,
      left: dan,
      right,
      answer: dan * right,
    };
  });
}

function shuffleQuestions(questions: KukuQuestion[], random: () => number): KukuQuestion[] {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function createSeededRandom(seed: number) {
  let state = Math.trunc(seed) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}
