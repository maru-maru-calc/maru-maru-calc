// The times-table facts a child has missed and has not yet shown to know: "7x8", "6x7".
//
// They are remembered between visits, so that the mixed stage ("∞") can bring them back on another
// day instead of drawing nine facts at random from all 81.

/** How many of the nine questions of a mixed round may be remembered misses. The rest stays a surprise. */
export const WEAK_FACTS_PER_ROUND = 5;

const KUKU_FACT_ID = /^[1-9]x[1-9]$/;

export function isKukuFactId(value: unknown): value is string {
  return typeof value === 'string' && KUKU_FACT_ID.test(value);
}

/** The name of "a × b" as a fact, or nothing when the question is not a times-table fact. */
export function getKukuFactId(operands: number[], operators: string[]): string | null {
  if (operands.length !== 2 || operators.length !== 1 || operators[0] !== '×') {
    return null;
  }
  const factId = `${operands[0]}x${operands[1]}`;
  return isKukuFactId(factId) ? factId : null;
}

/**
 * The remembered misses after one more answer.
 *
 * A miss is remembered. A fact is let go once it is answered right at the first try, but only
 * where that shows something (`showsKnowing`): in a table asked in order, "7 × 8" can be had by
 * adding 7 to the answer before, without knowing it.
 *
 * Returns the same array when nothing changes.
 */
export function noteKukuAnswer(weakFacts: string[], factId: string, answer: 'missed' | 'rightAtFirstTry', showsKnowing: boolean): string[] {
  const isRemembered = weakFacts.includes(factId);
  if (answer === 'missed') {
    return isRemembered ? weakFacts : [...weakFacts, factId];
  }
  return isRemembered && showsKnowing ? weakFacts.filter((remembered) => remembered !== factId) : weakFacts;
}

/**
 * The nine facts of a mixed round: up to five remembered misses, filled up from all the others,
 * in a mixed order.
 */
export function pickMixedKukuRound(weakFacts: string[], random: () => number): string[] {
  const remembered = shuffle([...new Set(weakFacts.filter(isKukuFactId))], random).slice(0, WEAK_FACTS_PER_ROUND);
  const others = shuffle(ALL_KUKU_FACTS.filter((factId) => !remembered.includes(factId)), random).slice(0, 9 - remembered.length);
  return shuffle([...remembered, ...others], random);
}

const ALL_KUKU_FACTS = Array.from({ length: 81 }, (_, index) => `${Math.floor(index / 9) + 1}x${(index % 9) + 1}`);

function shuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}
