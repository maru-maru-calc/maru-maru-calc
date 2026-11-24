import { describe, expect, it } from 'vitest';

import { getLongMultiplicationWorking, matchesLongFormStepAnswer } from '@/game/long-form';

describe('long-form step answers', () => {
  it('accepts the whole column sum', () => {
    expect(matchesLongFormStepAnswer('14', 14, true)).toBe(true);
    expect(matchesLongFormStepAnswer('7', 7, true)).toBe(true);
    expect(matchesLongFormStepAnswer('0', 0, false)).toBe(true);
  });

  it('accepts only the written digit when the column carries', () => {
    expect(matchesLongFormStepAnswer('4', 14, true)).toBe(true);
    expect(matchesLongFormStepAnswer('0', 10, true)).toBe(true);
    expect(matchesLongFormStepAnswer('3', 23, true)).toBe(true);
  });

  it('still rejects a wrong digit', () => {
    expect(matchesLongFormStepAnswer('5', 14, true)).toBe(false);
    expect(matchesLongFormStepAnswer('1', 14, true)).toBe(false);
    expect(matchesLongFormStepAnswer('24', 14, true)).toBe(false);
    expect(matchesLongFormStepAnswer('04', 14, true)).toBe(false);
  });

  it('needs the whole number on steps that are not a carrying column', () => {
    expect(matchesLongFormStepAnswer('6', 56, false)).toBe(false);
    expect(matchesLongFormStepAnswer('56', 56, false)).toBe(true);
    expect(matchesLongFormStepAnswer('2', 12, false)).toBe(false);
  });

  it('rejects empty or non-numeric input', () => {
    expect(matchesLongFormStepAnswer('', 0, true)).toBe(false);
    expect(matchesLongFormStepAnswer('a', 4, true)).toBe(false);
  });
});

describe('long multiplication as written at school', () => {
  const stepsOf = (left: number, right: number) => {
    const working = getLongMultiplicationWorking(left, right)!;
    return { digits: working.digitSteps.map((step) => step.expectedAnswer), sums: working.additionSteps.map((step) => step.expectedAnswer), working };
  };

  it('works a one-digit multiplier in one row: ones first, then tens with what was carried', () => {
    // Six sevens are 42: write 2, carry 4. Six fours are 24, and 4 makes 28.
    const { digits, sums, working } = stepsOf(47, 6);
    expect(digits).toEqual([42, 28]);
    expect(sums).toEqual([]);
    expect(working.rows).toMatchObject([{ digit: 6, shift: 0, carry: 4, value: 282 }]);
    expect(working.answerWidth).toBe(3);

    // Nothing to carry.
    expect(stepsOf(23, 3).digits).toEqual([9, 6]);
  });

  it('works a two-digit multiplier in two rows, the second one place to the left, and adds them', () => {
    const { digits, sums, working } = stepsOf(47, 36);
    expect(digits).toEqual([42, 28, 21, 14]);
    expect(working.rows.map((row) => [row.value, row.shift])).toEqual([[282, 0], [141, 1]]);
    // 282 + 1410, column by column from the right.
    expect(sums).toEqual([2, 9, 6, 1]);
    expect(working.answerWidth).toBe(4);
  });

  it('always ends on the product, for every pair the stages can ask', () => {
    for (let left = 10; left <= 99; left += 1) {
      for (let right = 2; right <= 99; right += 1) {
        const working = getLongMultiplicationWorking(left, right)!;
        const rowsTotal = working.rows.reduce((sum, row) => sum + row.value * 10 ** row.shift, 0);
        expect(rowsTotal).toBe(left * right);
        for (const row of working.rows) {
          // The row is its ones digit with "tens × digit + carry" in front of it.
          expect(row.tensResult * 10 + (row.onesProduct % 10)).toBe(row.value);
        }
        if (working.additionSteps.length > 0) {
          const written = working.additionSteps.map((step) => step.expectedAnswer % 10).reverse();
          const lastSum = working.additionSteps[working.additionSteps.length - 1].expectedAnswer;
          expect(Number(String(lastSum) + written.slice(1).join(''))).toBe(left * right);
        }
      }
    }
  });

  it('has no working for numbers outside two digits × one or two digits', () => {
    expect(getLongMultiplicationWorking(7, 6)).toBeUndefined();
    expect(getLongMultiplicationWorking(123, 4)).toBeUndefined();
    expect(getLongMultiplicationWorking(47, 1)).toBeUndefined();
  });
});
