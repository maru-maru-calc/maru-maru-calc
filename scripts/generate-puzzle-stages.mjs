// Chooses the puzzles of the puzzle game and writes them to src/game/puzzle-stages.ts.
//
//   node scripts/generate-puzzle-stages.mjs
//
// Every puzzle has exactly one way to its goal under the game's rules: the bubbles are used once
// each, the calculation runs from left to right, × and ÷ need an amount above zero, and ÷ has to
// come out even. Two ways that differ only in which of the first two bubbles goes in first, when
// they are joined by + or ×, are the same way. The choice is made with a fixed seed, so running
// this again gives the same list; src/tests/game/puzzle-stages.test.ts checks the list against the
// game's own rules.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const OPERATORS = ['+', '-', '×', '÷'];
const FREE = 99;

/** Every goal from 1 to 99 that `values` can reach, each with its ways (as text) and how high and low the amount went. */
function solve(values, limits) {
  const found = new Map();
  const used = values.map(() => false);
  const left = { ...limits };
  const visit = (total, depth, way, peak, low) => {
    if (depth === values.length) {
      if (Number.isInteger(total) && total >= 1 && total <= 99) {
        if (!found.has(total)) {
          found.set(total, new Map());
        }
        found.get(total).set(way, { peak, low });
      }
      return;
    }
    values.forEach((value, index) => {
      if (used[index]) {
        return;
      }
      used[index] = true;
      if (depth === 0) {
        visit(value, 1, String(value), value, value);
      } else {
        for (const operator of OPERATORS) {
          if (left[operator] <= 0 || ((operator === '×' || operator === '÷') && total <= 0) || (operator === '÷' && total % value !== 0)) {
            continue;
          }
          const next = operator === '+' ? total + value : operator === '-' ? total - value : operator === '×' ? total * value : total / value;
          const first = depth === 1 ? Number(way) : undefined;
          const isSwappedStart = depth === 1 && (operator === '+' || operator === '×') && value < first;
          left[operator] -= 1;
          visit(next, depth + 1, isSwappedStart ? `${value} ${operator} ${first}` : `${way} ${operator} ${value}`, Math.max(peak, next), Math.min(low, next));
          left[operator] += 1;
        }
      }
      used[index] = false;
    });
  };
  visit(0, 0, '', 0, 0);
  return found;
}

function* differentNumbers(lowest, highest, count, start = lowest, chosen = []) {
  if (chosen.length === count) {
    yield chosen;
    return;
  }
  for (let value = start; value <= highest; value += 1) {
    yield* differentNumbers(lowest, highest, count, value + 1, [...chosen, value]);
  }
}

function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const operatorsOf = (way) => way.split(' ').filter((token) => OPERATORS.includes(token));

/**
 * A rough order of difficulty inside a tier. Having to go above the goal and come back down is
 * what makes a way hard to see; a division that is not the first step needs a number built for it;
 * big amounts are slower to work with.
 */
function difficultyOf({ way, goal, peak }) {
  const operators = operatorsOf(way);
  const divisionAt = operators.indexOf('÷');
  return (peak > goal ? 2 : 0) + (divisionAt > 0 ? 1 : 0) + (operators.includes('-') ? 0.5 : 0) + peak / 50;
}

/** Every one-way puzzle of a tier that stays between 1 and 99 all the way and passes `accepts`. */
function candidatesOf({ count, lowest, highest, limits, accepts }) {
  const candidates = [];
  for (const numbers of differentNumbers(lowest, highest, count)) {
    for (const [goal, ways] of solve(numbers, limits)) {
      if (ways.size !== 1) {
        continue;
      }
      const [[way, { peak, low }]] = [...ways];
      const candidate = { numbers, goal, way, peak, low };
      if (peak <= 99 && low >= 1 && accepts(candidate)) {
        candidates.push({ ...candidate, difficulty: difficultyOf(candidate) });
      }
    }
  }
  return candidates.sort((left, right) => left.difficulty - right.difficulty || left.goal - right.goal || left.way.localeCompare(right.way));
}

/** `howMany` of the candidates, spread from the easiest to the hardest, without the same numbers or goal close together. */
function pick(candidates, howMany, random, recent) {
  const picked = [];
  for (let slot = 0; slot < howMany; slot += 1) {
    const from = Math.floor((candidates.length * slot) / howMany);
    const to = Math.max(from + 1, Math.floor((candidates.length * (slot + 1)) / howMany));
    const bucket = candidates.slice(from, to);
    const start = Math.floor(random() * bucket.length);
    const inOrder = Array.from({ length: bucket.length }, (_, offset) => bucket[(start + offset) % bucket.length]);
    const lately = recent.slice(-6);
    const sharedNumbers = (earlier, candidate) => earlier.numbers.filter((value) => candidate.numbers.includes(value)).length;
    const shapeOf = (way) => way.replace(/\d+/g, 'n');
    // Best: a goal and numbers not seen lately (with four bubbles or more, at least two new numbers),
    // and a way shaped differently from the two before it.
    const isFresh = (candidate) =>
      !lately.some((earlier) => earlier.goal === candidate.goal || sharedNumbers(earlier, candidate) >= Math.max(candidate.numbers.length - 1, 3))
      && !recent.slice(-2).some((earlier) => shapeOf(earlier.way) === shapeOf(candidate.way));
    // With few numbers to choose from that is not always there; then at least other numbers and another goal.
    const isDifferent = (candidate) => !lately.some((earlier) => earlier.goal === candidate.goal || sharedNumbers(earlier, candidate) === candidate.numbers.length);
    const isShapedDifferently = (candidate) => recent.length === 0 || shapeOf(recent[recent.length - 1].way) !== shapeOf(candidate.way);
    // Sorted by difficulty, a stretch of candidates can all be of one shape. Then the nearest
    // candidate of another shape is taken, from just outside this stretch.
    const nearest = [...candidates].sort((left, right) => Math.abs(candidates.indexOf(left) - (from + start)) - Math.abs(candidates.indexOf(right) - (from + start)));
    const choice = inOrder.find(isFresh)
      ?? inOrder.find((candidate) => isDifferent(candidate) && isShapedDifferently(candidate))
      ?? nearest.find((candidate) => isDifferent(candidate) && isShapedDifferently(candidate) && !picked.includes(candidate))
      ?? inOrder.find(isDifferent)
      ?? bucket[start];
    picked.push(choice);
    recent.push(choice);
  }
  return picked;
}

function shuffled(values, random) {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

const kindsOf = (way) => new Set(operatorsOf(way)).size;
const ALL_FREE = { '+': FREE, '-': FREE, '×': FREE, '÷': FREE };
const ONCE_EACH = { '+': 1, '-': 1, '×': 1, '÷': 1 };

// The game itself: more bubbles tier by tier. From five bubbles on, the operators are rationed;
// with a free choice there is almost never just one way (44 puzzles in all for five bubbles).
const TIERS = [
  { name: 'three bubbles', howMany: 15, count: 3, lowest: 2, highest: 9, limits: ALL_FREE, accepts: ({ way }) => kindsOf(way) === 2 },
  { name: 'four bubbles', howMany: 30, count: 4, lowest: 2, highest: 12, limits: ALL_FREE, accepts: ({ way }) => kindsOf(way) >= 3 },
  { name: 'five bubbles, each operator once', howMany: 30, count: 5, lowest: 2, highest: 12, limits: ONCE_EACH, accepts: () => true },
  { name: 'six bubbles, + twice', howMany: 13, count: 6, lowest: 2, highest: 12, limits: { ...ONCE_EACH, '+': 2 }, accepts: () => true },
  { name: 'six bubbles, - twice', howMany: 12, count: 6, lowest: 2, highest: 12, limits: { ...ONCE_EACH, '-': 2 }, accepts: () => true },
];

// The start screen: one easy puzzle whose solving shows a rule. Three groups, one rule each.
const START_GROUPS = [
  // Every bubble goes in, and the amounts add up.
  { name: 'all the bubbles', howMany: 8, count: 2, lowest: 2, highest: 9, limits: { '+': FREE, '-': 0, '×': 0, '÷': 0 }, accepts: () => true },
  // Which bubble goes in first matters.
  { name: 'the order matters', howMany: 8, count: 2, lowest: 2, highest: 9, limits: { '+': FREE, '-': FREE, '×': 0, '÷': 0 }, accepts: ({ way }) => way.includes('-') },
  // The calculation runs from left to right: 2 + 3 × 4 is 20 here, not 14.
  { name: 'left to right', howMany: 8, count: 3, lowest: 2, highest: 6, limits: { '+': FREE, '-': 0, '×': FREE, '÷': 0 }, accepts: ({ way }) => /^\d+ \+ \d+ × \d+$/.test(way) },
];

const random = createRandom(20261125);
const describe = (tier, candidate) => ({
  bubbles: shuffled(candidate.numbers, random),
  goal: candidate.goal,
  limits: tier.limits,
  solution: candidate.way,
});

const report = [];
const stages = [];
const recentStages = [];
for (const tier of TIERS) {
  const candidates = candidatesOf(tier);
  report.push(`${tier.name}: ${tier.howMany} of ${candidates.length}`);
  stages.push(...pick(candidates, tier.howMany, random, recentStages).map((candidate) => describe(tier, candidate)));
}
const startGroups = START_GROUPS.map((group) => {
  const candidates = candidatesOf(group);
  report.push(`start, ${group.name}: ${group.howMany} of ${candidates.length}`);
  return pick(candidates, group.howMany, random, []).map((candidate) => describe(group, candidate));
});

const limitsText = (limits) => `{ ${OPERATORS.map((operator) => `'${operator}': ${limits[operator] >= FREE ? "'infinite'" : limits[operator]}`).join(', ')} }`;
const stageText = (stage) => `  { bubbles: [${stage.bubbles.join(', ')}], goal: ${stage.goal}, limits: ${limitsText(stage.limits)}, solution: '${stage.solution}' },`;
const output = `// Written by scripts/generate-puzzle-stages.mjs. Do not edit by hand: change the script and run it again.
import type { OperatorUsageLimits } from '@/game/types';

export type PuzzleStage = {
  /** The bubbles, in the order they are laid out. */
  bubbles: number[];
  goal: number;
  /** How often each operator may be used. */
  limits: OperatorUsageLimits;
  /** The one way to the goal. With + or × between the first two bubbles, either of them may go in first. */
  solution: string;
};

/** The puzzles of the game, in order: three bubbles, four, five (each operator once), six. */
export const PUZZLE_STAGES: PuzzleStage[] = [
${stages.map(stageText).join('\n')}
];

/**
 * The puzzles of the start screen, which stands in for an explanation: solving one shows a rule.
 * Group 0: every bubble goes in. Group 1: the order matters. Group 2: left to right.
 */
export const PUZZLE_START_GROUPS: PuzzleStage[][] = [
${startGroups.map((group) => `  [\n${group.map((stage) => '  ' + stageText(stage)).join('\n')}\n  ],`).join('\n')}
];
`;
writeFileSync(fileURLToPath(new URL('../src/game/puzzle-stages.ts', import.meta.url)), output);
console.log(report.join('\n'));
console.log(`${stages.length} puzzles and ${startGroups.flat().length} start puzzles written`);
