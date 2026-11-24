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
