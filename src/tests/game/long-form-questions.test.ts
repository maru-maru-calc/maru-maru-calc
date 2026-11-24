import { describe, expect, it } from 'vitest';

import { LONG_FORM_STAGES } from '@/components/select/long-form-stages';
import { createLongFormQuestions, LONG_FORM_QUESTIONS_PER_STAGE } from '@/game/long-form-questions';

const stageOf = (id: string) => LONG_FORM_STAGES.find((stage) => stage.id === id)!;
const sample = (id: string, runs = 200) => Array.from({ length: runs }, (_, index) => createLongFormQuestions(stageOf(id), 1000 + index * 7919));

describe('long-form questions', () => {
  it('asks five different questions in every stage', () => {
    for (const stage of LONG_FORM_STAGES) {
      for (let seed = 1; seed <= 60; seed += 1) {
        const questions = createLongFormQuestions(stage, seed * 104729);
        expect(questions).toHaveLength(LONG_FORM_QUESTIONS_PER_STAGE);
        expect(new Set(questions.map((question) => question.prompt)).size).toBe(LONG_FORM_QUESTIONS_PER_STAGE);
        for (const question of questions) {
          expect(question.operands).toHaveLength(2);
          expect(Number.isInteger(question.answer)).toBe(true);
          expect(question.answer).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('starts multiplication with two digits × one digit, and keeps the older stages under their ids', () => {
    const multiplication = LONG_FORM_STAGES.filter((stage) => stage.worldId === 'multiplication');

    expect(multiplication.map((stage) => stage.id)).toEqual([
      'long-form-multiplication-single-1',
      'long-form-multiplication-single-2',
      'long-form-multiplication-1',
      'long-form-multiplication-2',
      'long-form-multiplication-3',
      'long-form-multiplication-4',
    ]);
    expect(multiplication.map((stage) => stage.label)).toEqual(['#1', '#2', '#3', '#4', '#5', '#6']);
    expect(new Set(LONG_FORM_STAGES.map((stage) => stage.id)).size).toBe(LONG_FORM_STAGES.length);
  });

  it('keeps "ones × the digit" below ten in the first stage and at ten or more in the second', () => {
    for (const questions of sample('long-form-multiplication-single-1')) {
      for (const { operands: [left, right] } of questions) {
        expect(left).toBeGreaterThanOrEqual(11);
        expect(left).toBeLessThanOrEqual(99);
        expect(right).toBeGreaterThanOrEqual(2);
        expect(right).toBeLessThanOrEqual(9);
        expect((left % 10) * right).toBeLessThanOrEqual(9);
        expect(left % 10).toBeGreaterThanOrEqual(1);
      }
    }
    for (const questions of sample('long-form-multiplication-single-2')) {
      for (const { operands: [left, right] } of questions) {
        expect(left).toBeGreaterThanOrEqual(12);
        expect(left).toBeLessThanOrEqual(99);
        expect(right).toBeGreaterThanOrEqual(2);
        expect(right).toBeLessThanOrEqual(9);
        expect((left % 10) * right).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('lets the tens grow over the five questions of a one-digit stage', () => {
    for (const id of ['long-form-multiplication-single-1', 'long-form-multiplication-single-2']) {
      const runs = sample(id, 400);
      const averageTens = (questionIndex: number) => runs.reduce((sum, questions) => sum + Math.floor(questions[questionIndex].operands[0] / 10), 0) / runs.length;
      expect(averageTens(4)).toBeGreaterThan(averageTens(0) + 2);
    }
  });

  it('leaves the two-digit × two-digit stages as they were', () => {
    const ranges: Array<[string, [number, number], [number, number]]> = [
      ['long-form-multiplication-1', [13, 23], [11, 12]],
      ['long-form-multiplication-2', [22, 39], [13, 19]],
      ['long-form-multiplication-3', [25, 49], [18, 29]],
    ];
    for (const [id, leftRange, rightRange] of ranges) {
      for (const questions of sample(id)) {
        for (const { operands: [left, right] } of questions) {
          expect(left).toBeGreaterThanOrEqual(leftRange[0]);
          expect(left).toBeLessThanOrEqual(leftRange[1]);
          expect(right).toBeGreaterThanOrEqual(rightRange[0]);
          expect(right).toBeLessThanOrEqual(rightRange[1]);
        }
      }
    }
  });

  it('asks one question of each kind in the last multiplication stage', () => {
    for (const questions of sample('long-form-multiplication-4')) {
      const [first, second, third, fourth, fifth] = questions.map((question) => question.operands);
      expect(first[1]).toBeLessThanOrEqual(9);
      expect((first[0] % 10) * first[1]).toBeLessThanOrEqual(9);
      expect(second[1]).toBeLessThanOrEqual(9);
      expect((second[0] % 10) * second[1]).toBeGreaterThanOrEqual(10);
      expect(third[1]).toBeGreaterThanOrEqual(11);
      expect(third[1]).toBeLessThanOrEqual(12);
      expect(fourth[1]).toBeGreaterThanOrEqual(13);
      expect(fourth[1]).toBeLessThanOrEqual(19);
      expect(fifth[1]).toBeGreaterThanOrEqual(18);
    }
  });
});
