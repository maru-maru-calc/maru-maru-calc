/**
 * Whether what the player typed answers one step of a long-form (筆算) problem.
 *
 * A column that adds up to 10 or more can be answered in two ways: with the whole sum ("14"),
 * or the way it is written on paper, with only the digit that goes under the column ("4") while
 * the 1 is carried. `acceptsWrittenDigit` marks the steps where the second way applies.
 */
export function matchesLongFormStepAnswer(input: string, expectedAnswer: number, acceptsWrittenDigit: boolean) {
  if (!/^\d+$/.test(input)) {
    return false;
  }

  const value = Number(input);
  if (value === expectedAnswer) {
    return true;
  }

  return acceptsWrittenDigit && expectedAnswer >= 10 && input.length === 1 && value === expectedAnswer % 10;
}

/**
 * Multiplication as it is written at school: one row per digit of the multiplier, each row worked
 * from the ones. "47 × 6": six sevens are 42, write 2 and carry 4; six fours are 24, and 4 makes
 * 28. With a two-digit multiplier the second row starts one place to the left, and the two rows
 * are then added column by column.
 */
export function getLongMultiplicationWorking(left: number, right: number) {
  if (left < 10 || left > 99 || right < 2 || right > 99) {
    return undefined;
  }

  const leftTens = Math.floor(left / 10);
  const leftOnes = left % 10;
  const rightDigits = right >= 10 ? [right % 10, Math.floor(right / 10)] : [right];
  // `shift` is how many places to the left the row starts: 0 for the ones digit, 1 for the tens.
  const rows = rightDigits.map((digit, shift) => {
    const onesProduct = leftOnes * digit;
    const carry = Math.floor(onesProduct / 10);
    return { digit, shift, onesProduct, carry, tensResult: leftTens * digit + carry, value: left * digit };
  });
  const digitSteps = rows.flatMap((row, rowIndex) => [
    { rowIndex, part: 'ones' as const, expectedAnswer: row.onesProduct },
    { rowIndex, part: 'tens' as const, expectedAnswer: row.tensResult },
  ]);
  const answerWidth = Math.max(String(left * right).length, ...rows.map((row) => String(row.value).length + row.shift), 3);
  const additionSteps = rows.length > 1
    ? buildLongFormColumnAdditionSteps(rows.map((row) => row.value * 10 ** row.shift), answerWidth)
    : [];

  return {
    answerWidth,
    rows,
    digitSteps,
    additionSteps,
  };
}

/** Adding `values` column by column from the right: the sum of each column with what was carried into it. */
export function buildLongFormColumnAdditionSteps(values: number[], width: number) {
  const steps: { column: number; expectedAnswer: number; carryIn: number }[] = [];
  let carry = 0;

  for (let column = width - 1; column >= 0; column -= 1) {
    const place = 10 ** (width - 1 - column);
    const expectedAnswer = values.reduce((sum, value) => sum + Math.floor(value / place) % 10, carry);
    steps.push({ column, expectedAnswer, carryIn: carry });
    carry = Math.floor(expectedAnswer / 10);
  }

  while (steps.length > 1 && steps[steps.length - 1].expectedAnswer === 0 && steps[steps.length - 1].carryIn === 0) {
    steps.pop();
  }

  return steps;
}
