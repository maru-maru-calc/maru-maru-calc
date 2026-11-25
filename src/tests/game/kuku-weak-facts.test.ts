import { describe, expect, it } from 'vitest';

import { createDentakuQuestions, DENTAKU_STAGES } from '@/game/dentaku';
import { getKukuFactId, isKukuFactId, noteKukuAnswer, pickMixedKukuRound, WEAK_FACTS_PER_ROUND } from '@/game/kuku-weak-facts';

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('remembered times-table misses', () => {
  it('names a fact by its two numbers, and only a times-table fact', () => {
    expect(getKukuFactId([7, 8], ['×'])).toBe('7x8');
    expect(getKukuFactId([8, 7], ['×'])).toBe('8x7');
    expect(getKukuFactId([7, 8], ['+'])).toBeNull();
    expect(getKukuFactId([12, 3], ['×'])).toBeNull();
    expect(getKukuFactId([2, 3, 4], ['×', '×'])).toBeNull();
    expect(isKukuFactId('9x9')).toBe(true);
    expect(isKukuFactId('0x9')).toBe(false);
    expect(isKukuFactId('10x2')).toBe(false);
    expect(isKukuFactId(78)).toBe(false);
  });

  it('remembers a miss once', () => {
    const afterOne = noteKukuAnswer([], '7x8', 'missed', true);
    expect(afterOne).toEqual(['7x8']);
    expect(noteKukuAnswer(afterOne, '7x8', 'missed', false)).toBe(afterOne);
    expect(noteKukuAnswer(afterOne, '6x7', 'missed', false)).toEqual(['7x8', '6x7']);
  });

  it('lets a fact go when it is answered right at the first try out of order', () => {
    expect(noteKukuAnswer(['7x8', '6x7'], '7x8', 'rightAtFirstTry', true)).toEqual(['6x7']);
  });

  it('keeps it when the right answer came in a table asked in order', () => {
    const remembered = ['7x8'];
    expect(noteKukuAnswer(remembered, '7x8', 'rightAtFirstTry', false)).toBe(remembered);
  });

  it('changes nothing for a fact that was never missed', () => {
    const remembered = ['7x8'];
    expect(noteKukuAnswer(remembered, '2x2', 'rightAtFirstTry', true)).toBe(remembered);
  });
});

describe('the mixed times-table round', () => {
  it('is nine different facts from all 81 when nothing is remembered', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed += 1) {
      const round = pickMixedKukuRound([], seeded(seed * 7919));
      expect(round).toHaveLength(9);
      expect(new Set(round).size).toBe(9);
      expect(round.every(isKukuFactId)).toBe(true);
      round.forEach((factId) => seen.add(factId));
    }
    expect(seen.size).toBe(81);
  });

  it('brings every remembered miss back when there are few', () => {
    const weak = ['7x8', '6x7', '8x4'];
    for (let seed = 1; seed <= 100; seed += 1) {
      const round = pickMixedKukuRound(weak, seeded(seed * 104729));
      expect(round).toHaveLength(9);
      expect(new Set(round).size).toBe(9);
      expect(weak.every((factId) => round.includes(factId))).toBe(true);
    }
  });

  it('brings back five at a time when there are many, and all of them over a few rounds', () => {
    const weak = ['7x8', '6x7', '8x4', '9x6', '3x7', '4x7', '8x8', '6x9', '7x7', '9x4', '6x6', '8x3'];
    const broughtBack = new Set<string>();
    for (let seed = 1; seed <= 100; seed += 1) {
      const round = pickMixedKukuRound(weak, seeded(seed * 104729));
      const remembered = round.filter((factId) => weak.includes(factId));
      // Five are chosen; one of the four others may happen to be a remembered one too.
      expect(remembered.length).toBeGreaterThanOrEqual(WEAK_FACTS_PER_ROUND);
      expect(new Set(round).size).toBe(9);
      remembered.forEach((factId) => broughtBack.add(factId));
    }
    expect(broughtBack.size).toBe(weak.length);
  });

  it('does not put the remembered ones first', () => {
    const weak = ['7x8', '6x7', '8x4'];
    const firstPlaces = new Set<number>();
    for (let seed = 1; seed <= 200; seed += 1) {
      firstPlaces.add(pickMixedKukuRound(weak, seeded(seed * 104729)).indexOf('7x8'));
    }
    expect(firstPlaces.size).toBe(9);
  });

  it('ignores anything that is not a fact, and a fact given twice', () => {
    const round = pickMixedKukuRound(['7x8', '7x8', 'nonsense', '12x3'], seeded(5));
    expect(round).toHaveLength(9);
    expect(round.filter((factId) => factId === '7x8')).toHaveLength(1);
    expect(round.every(isKukuFactId)).toBe(true);
  });

  it('is what the "∞" stage asks', () => {
    const stage = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-kuku-random-all');
    const questions = createDentakuQuestions(stage!, 42, ['7x8', '6x7']);

    expect(questions).toHaveLength(9);
    expect(questions.map((question) => question.prompt)).toContain('7 × 8 = ?');
    expect(questions.map((question) => question.prompt)).toContain('6 × 7 = ?');
    expect(questions.find((question) => question.prompt === '7 × 8 = ?')).toMatchObject({ id: '7x8', operands: [7, 8], operators: ['×'], answer: 56 });
  });

  it('leaves the single tables as they were', () => {
    const inOrder = DENTAKU_STAGES.find((candidate) => candidate.id === 'dentaku-kuku-dan-3');
    expect(createDentakuQuestions(inOrder!, 1, ['7x8']).map((question) => question.prompt)).toEqual(createDentakuQuestions(inOrder!, 1).map((question) => question.prompt));
  });
});
