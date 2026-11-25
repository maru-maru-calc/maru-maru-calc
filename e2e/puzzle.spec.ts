import { expect, Page, test } from '@playwright/test';

import { PUZZLE_GAME_STAGES } from '../src/game/puzzle-game';
import { PUZZLE_STAGES, PUZZLE_START_GROUPS } from '../src/game/puzzle-stages';

test.use({ viewport: { width: 390, height: 844 } });

const SAVE_KEY = 'marumaru-calc:puzzle-progress';

test('solving the start puzzle offers the puzzles in order and the one-minute game', async ({ page }) => {
  await openPuzzleGame(page);
  await expect(page.getByTestId('puzzle-choice')).toHaveCount(0);

  await solveStartPuzzle(page);

  await expect(page.getByTestId('choose-puzzles-number')).toHaveText('#1');
  await expect(page.getByTestId('choose-quick-best')).toHaveText('–');

  await page.getByTestId('choose-puzzles').click();
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#1');
  await expect(page.getByTestId('quick-time-left')).toHaveCount(0);
});

test('the choice shows the next unsolved puzzle and the best one-minute result', async ({ page }) => {
  await openPuzzleGame(page, { version: 1, solved: PUZZLE_GAME_STAGES.slice(0, 12).map((stage) => stage.id), startVisits: 9, quickScores: [30, 20, 10] });
  await solveStartPuzzle(page);

  await expect(page.getByTestId('choose-puzzles-number')).toHaveText('#13');
  await expect(page.getByTestId('choose-quick-best')).toHaveText('30');
});

test('in the one-minute game a solved puzzle counts and a new one follows; a wrong result brings the same one back', async ({ page }) => {
  await openPuzzleGame(page);
  await solveStartPuzzle(page);
  await page.getByTestId('choose-quick').click();
  await expect(page.getByTestId('corner-badge')).toHaveText('0');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(3);

  const first = await readBoard(page);
  const way = findWay(first.bubbles, first.goal);
  expect(way).toBeDefined();

  // The same bubbles with the first operator changed: not the goal (there is one way only).
  const wrong = [...(way ?? [])];
  wrong[1] = wrong[1] === '+' ? '-' : '+';
  await tapWay(page, wrong, 120);
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(3);
  expect(await readBoard(page)).toEqual(first);
  await expect(page.getByTestId('corner-badge')).toHaveText('0');

  await tapWay(page, way ?? [], 120);
  await expect(page.getByTestId('corner-badge')).toHaveText('1');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(3);
  expect(await readBoard(page)).not.toEqual(first);
  // Going back in the middle records nothing.
  await page.getByLabel('Back', { exact: true }).click();
  await expect(page.getByTestId('quick-time-left')).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').quickScores ?? [], SAVE_KEY)).toEqual([]);
});

test('the list opens any puzzle, solved or not, and marks the solved ones', async ({ page }) => {
  await openPuzzleGame(page, { version: 1, solved: PUZZLE_GAME_STAGES.slice(0, 3).map((stage) => stage.id), startVisits: 9, quickScores: [] });
  await solveStartPuzzle(page);
  await page.getByTestId('choose-puzzles').click();
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#4');

  // Back from a puzzle is the list of all of them.
  await page.getByLabel('Back', { exact: true }).click();
  await expect(page.locator('[data-testid^="pick-puzzle-"]')).toHaveCount(100);
  await expect(page.getByTestId('pick-puzzle-3')).toHaveAttribute('aria-label', 'puzzle 3, solved');
  await expect(page.getByTestId('pick-puzzle-4')).toHaveAttribute('aria-label', 'puzzle 4');

  // A puzzle far ahead can be opened without solving the ones before it.
  await page.getByTestId('pick-puzzle-60').click();
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#60');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(5);

  await page.getByLabel('Back', { exact: true }).click();
  await page.getByTestId('puzzle-list-back').click();
  await expect(page.locator('[data-testid^="pending-bubble-"]').first()).toBeVisible();
  await expect(page.getByTestId('stage-goal-number')).toHaveCount(0);
});

test('maru falling out of a bubble never cover the bubbles still waiting', async ({ page }) => {
  // Six bubbles in two rows: the maru of the upper row fall past the lower one.
  const number = 77;
  await openPuzzleGame(page, { version: 1, solved: PUZZLE_GAME_STAGES.slice(0, number - 1).map((stage) => stage.id), startVisits: 9, quickScores: [] });
  await solveStartPuzzle(page);
  await page.getByTestId('choose-puzzles').click();
  await expect(page.getByTestId('stage-goal-number')).toHaveText(`#${number}`);
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(6);

  const way = PUZZLE_STAGES[number - 1].solution.split(' ');
  const covered: string[] = [];
  await bubble(page, way[0]).click();
  covered.push(...(await watchWaitingBubbles(page)));
  for (let index = 1; index < way.length - 2; index += 2) {
    await page.getByTestId(`operator-${way[index]}`).click();
    await bubble(page, way[index + 1]).click();
    covered.push(...(await watchWaitingBubbles(page)));
  }

  expect(covered).toEqual([]);
});

// The board itself. These were reported and fixed on the islands that mixed all four operators;
// those islands are the puzzle game now, so the checks live here.

test('a puzzle with free operators shows no counts, and opens all four after the first bubble', async ({ page }) => {
  await openPuzzle(page, 1);
  for (const operator of ['+', '-', '×', '÷']) {
    await expect(page.getByTestId(`operator-${operator}`)).toBeDisabled();
  }
  await expect(page.locator('[data-testid$="-usage"]')).toHaveCount(0);

  await bubble(page, PUZZLE_STAGES[0].bubbles[0]).click();
  for (const operator of ['+', '-', '×', '÷']) {
    await expect(page.getByTestId(`operator-${operator}`)).toBeEnabled();
  }
});

test('a puzzle with rationed operators shows how often each is left, and spends them', async ({ page }) => {
  // #46: five bubbles, each operator once. Its way starts "10 - 6 ÷ 2".
  const way = PUZZLE_STAGES[45].solution.split(' ');
  expect(PUZZLE_STAGES[45].limits).toEqual({ '+': 1, '-': 1, '×': 1, '÷': 1 });
  await openPuzzle(page, 46);
  for (const operator of ['+', '-', '×', '÷']) {
    await expect(page.getByTestId(`operator-${operator}-usage`)).toHaveText('1');
  }

  await bubble(page, way[0]).click();
  await page.getByTestId(`operator-${way[1]}`).click();
  await bubble(page, way[2]).click();

  await expect(page.getByTestId(`operator-${way[1]}`)).toBeDisabled();
  await expect(page.getByTestId(`operator-${way[1]}-usage`)).toHaveCount(0);
  await expect(page.getByTestId(`operator-${way[3]}-usage`)).toHaveText('1');
});

test('wrapped bubbles that settle on the basin burst even while unused bubbles remain', async ({ page }) => {
  // #16 starts "12 ÷ 2" with two bubbles left over.
  const way = PUZZLE_STAGES[15].solution.split(' ');
  expect(way.slice(0, 3)).toEqual(['12', '÷', '2']);
  await openPuzzle(page, 16);

  await bubble(page, 12).click();
  await page.getByTestId('operator-÷').click();
  await bubble(page, 2).click();

  await expect(page.getByTestId('expression-display-text')).toContainText('12 ÷ 2 = 6');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(2);
  await expect(page.locator('[data-testid^="bead-division-6-"]')).toHaveCount(0, { timeout: 3500 });
});

test('moves tapped while the maru are still settling all happen, in order', async ({ page }) => {
  // #77: "8 + 10 ÷ 9 + 7 × 6 - 11". Tapped without waiting, the ÷ and the × each have to wait
  // for the maru before them, with more taps coming in behind. A waiting move used to be
  // replaced by the next tap and then never happened.
  const way = PUZZLE_STAGES[76].solution.split(' ');
  await openPuzzle(page, 77);

  await bubble(page, way[0]).click();
  for (let index = 1; index < way.length; index += 2) {
    await page.getByTestId(`operator-${way[index]}`).click();
    await bubble(page, way[index + 1]).click();
  }

  await expect(page.getByTestId('current-total-value')).toHaveText(String(PUZZLE_STAGES[76].goal), { timeout: 30_000 });
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 20_000 });
});

test('the last move can be taken back, one move at a time', async ({ page }) => {
  // #16: "12 ÷ 2 - 4 × 9".
  await openPuzzle(page, 16);
  await expect(page.getByLabel('undo')).toBeDisabled();

  await bubble(page, 12).click();
  await page.getByTestId('operator-÷').click();
  await bubble(page, 2).click();
  await expect(page.getByTestId('current-total-value')).toHaveText('6', { timeout: 10_000 });
  await page.getByTestId('operator--').click();
  await bubble(page, 4).click();
  await expect(page.getByTestId('current-total-value')).toHaveText('2', { timeout: 10_000 });

  await page.getByLabel('undo').click();
  await expect(page.getByTestId('current-total-value')).toHaveText('6');
  await expect(page.getByTestId('expression-display-text')).toHaveText('12 ÷ 2 = 6');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(2);
  await expect(bubble(page, 4)).toBeVisible();

  await page.getByLabel('undo').click();
  await expect(page.getByTestId('current-total-value')).toHaveText('12');
  await page.getByLabel('undo').click();
  await expect(page.getByTestId('current-total-value')).toHaveText('0');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(4);
  await expect(page.getByLabel('undo')).toBeDisabled();
});

test('multiplication preview bubble does not auto-burst while multiply is selected', async ({ page }) => {
  // #1: bubbles 2, 8 and 6, every operator free.
  await openPuzzle(page, 1);

  await page.getByLabel('bubble-2').click();
  await page.getByTestId('operator-×').click();

  await expect(page.getByTestId('expression-display-text')).toContainText('2 ×');
  await expect(page.getByLabel('multiply-8')).toBeVisible();
  await page.waitForTimeout(1800);
  await expect(page.getByLabel('multiply-8')).toBeVisible();
});

/** Opens the numbered puzzle `number` (1 is the first), with every puzzle before it solved. */
async function openPuzzle(page: Page, number: number) {
  await openPuzzleGame(page, { version: 1, solved: PUZZLE_GAME_STAGES.slice(0, number - 1).map((stage) => stage.id), startVisits: 9, quickScores: [] });
  await solveStartPuzzle(page);
  await page.getByTestId('choose-puzzles').click();
  await expect(page.getByTestId('stage-goal-number')).toHaveText(`#${number}`);
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(PUZZLE_STAGES[number - 1].bubbles.length);
}

async function openPuzzleGame(page: Page, saved?: object) {
  if (saved) {
    await page.addInitScript(
      ([key, value]) => {
        if (!sessionStorage.getItem('puzzle-seeded')) {
          localStorage.setItem(key, value);
          sessionStorage.setItem('puzzle-seeded', '1');
        }
      },
      [SAVE_KEY, JSON.stringify(saved)],
    );
  }
  await page.goto('/puzzle');
  await expect(page.locator('[data-testid^="pending-bubble-"]').first()).toBeVisible();
}

function bubble(page: Page, count: string | number) {
  return page.locator(`[data-testid^="pending-bubble-${count}-"]`).first();
}

async function readBoard(page: Page) {
  const bubbles = await page.locator('[data-testid^="pending-bubble-"]').evaluateAll((elements) => elements.map((element) => Number(element.getAttribute('data-testid')?.split('-')[2])).sort((left, right) => left - right));
  const goal = Number(await page.getByTestId('stage-goal-target').textContent());
  return { bubbles, goal };
}

async function tapWay(page: Page, way: Array<string | number>, gapMs: number) {
  await bubble(page, way[0]).click();
  for (let index = 1; index < way.length; index += 2) {
    await page.waitForTimeout(gapMs);
    await page.getByTestId(`operator-${way[index]}`).click();
    await page.waitForTimeout(gapMs);
    await bubble(page, way[index + 1]).click();
  }
}

async function solveStartPuzzle(page: Page) {
  const board = await readBoard(page);
  const puzzle = PUZZLE_START_GROUPS.flat().find((candidate) => candidate.goal === board.goal && [...candidate.bubbles].sort((left, right) => left - right).join() === board.bubbles.join());
  expect(puzzle).toBeDefined();
  await tapWay(page, puzzle?.solution.split(' ') ?? [], 300);
  await expect(page.getByTestId('puzzle-choice')).toBeVisible({ timeout: 30_000 });
}

/** A way from three bubbles to the goal, worked from left to right. */
function findWay(bubbles: number[], goal: number): Array<string | number> | undefined {
  const operators = ['+', '-', '×', '÷'];
  const step = (total: number, operator: string, value: number) => {
    if (operator === '+') return total + value;
    if (operator === '-') return total - value;
    if (total <= 0) return Number.NaN;
    if (operator === '×') return total * value;
    return total % value === 0 ? total / value : Number.NaN;
  };
  for (const [first, second, third] of [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]].map((order) => order.map((index) => bubbles[index]))) {
    for (const left of operators) {
      for (const right of operators) {
        if (step(step(first, left, second), right, third) === goal) {
          return [first, left, second, right, third];
        }
      }
    }
  }
  return undefined;
}

/** For 1.2 seconds, on every frame: which waiting bubbles have something else at their centre. */
function watchWaitingBubbles(page: Page) {
  return page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const covered = new Set<string>();
        const startedAt = performance.now();
        const look = () => {
          document.querySelectorAll('[data-testid^="pending-bubble-"]').forEach((element) => {
            const box = element.getBoundingClientRect();
            const top = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
            if (!top || !element.contains(top)) {
              covered.add(`bubble ${element.getAttribute('data-testid')?.split('-')[2]} by ${top?.closest('[data-testid]')?.getAttribute('data-testid') ?? top?.tagName}`);
            }
          });
          if (performance.now() - startedAt < 1200) {
            requestAnimationFrame(look);
          } else {
            resolve([...covered]);
          }
        };
        requestAnimationFrame(look);
      }),
  );
}
