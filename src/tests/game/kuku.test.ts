import { describe, expect, it } from 'vitest';

import { createKukuQuestions, KUKU_STAGES } from '@/game/kuku';

describe('kuku stages', () => {
  it('creates ordered dan questions from 1 through 9', () => {
    const stage = KUKU_STAGES.find((candidate) => candidate.id === 'kuku-dan-2');

    expect(stage).toBeDefined();
    expect(createKukuQuestions(stage!, 1).map((question) => `${question.left}x${question.right}=${question.answer}`)).toEqual([
      '2x1=2',
      '2x2=4',
      '2x3=6',
      '2x4=8',
      '2x5=10',
      '2x6=12',
      '2x7=14',
      '2x8=16',
      '2x9=18',
    ]);
  });

  it('creates a seeded random dan with all multipliers once', () => {
    const stage = KUKU_STAGES.find((candidate) => candidate.id === 'kuku-random-dan');
    const questions = createKukuQuestions(stage!, 42);
    const leftValues = new Set(questions.map((question) => question.left));
    const rightValues = questions.map((question) => question.right).sort((a, b) => a - b);

    expect(questions).toHaveLength(9);
    expect(leftValues.size).toBe(1);
    expect(rightValues).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('creates a seeded random all stage with unique questions', () => {
    const stage = KUKU_STAGES.find((candidate) => candidate.id === 'kuku-random-all');
    const questions = createKukuQuestions(stage!, 99);

    expect(questions).toHaveLength(9);
    expect(new Set(questions.map((question) => question.id)).size).toBe(9);
  });
});
