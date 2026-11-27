import { expect, Page, test } from '@playwright/test';

import { countWays } from '../src/game/made-puzzle';
import { PUZZLE_GAME_STAGES } from '../src/game/puzzle-game';
import { PUZZLE_STAGES, PUZZLE_START_GROUPS } from '../src/game/puzzle-stages';

test.use({ viewport: { width: 390, height: 844 } });

const SAVE_KEY = 'marumaru-calc:puzzle-progress';

test('solving the start puzzle offers the puzzles in order and the one-minute game', async ({ page }) => {
  await openPuzzleGame(page);
  // The start puzzle is number zero: its header reads like every other puzzle's.
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
  await expect(page.getByTestId('puzzle-choice')).toHaveCount(0);
  // The start puzzle is a different one every visit: there is no address for it to send.
  await expect(page.getByTestId('share-puzzle')).toHaveCount(0);

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
  // The puzzles of the one-minute game have no numbers: a clock stands where the number would be.
  await expect(page.getByTestId('stage-goal-clock')).toBeVisible();
  await expect(page.getByTestId('stage-goal-number')).toHaveCount(0);
  await expect(page.getByTestId('share-puzzle')).toHaveCount(0);
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
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
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

test('the board cannot be left scrolled sideways by a script or by focus', async ({ page }) => {
  // The decorative bubbles drift past the screen's edge, so the board's box holds more than it
  // shows. Scrolling it used to shift the whole board, and it stayed shifted.
  await openPuzzle(page, 1);
  const before = await page.getByTestId('operator-+').boundingBox();

  const scrolled = await page.evaluate(async () => {
    const ancestors: HTMLElement[] = [];
    for (let element = document.querySelector('[data-testid="operator-+"]')?.parentElement; element; element = element.parentElement) {
      ancestors.push(element);
    }
    ancestors.forEach((element) => {
      element.scrollLeft = 40;
      element.scrollTop = 40;
    });
    document.querySelector('[data-testid^="background-bubble-"]')?.scrollIntoView({ block: 'center', inline: 'center' });
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return ancestors.filter((element) => element.scrollLeft !== 0 || element.scrollTop !== 0).length;
  });

  expect(scrolled).toBe(0);
  expect(await page.getByTestId('operator-+').boundingBox()).toEqual(before);
});

test('a tap on an operator reaches it while a decorative bubble is passing over it', async ({ page }) => {
  // The big bubble on the right takes about a minute to drift up to the operators, so the clock is wound forward.
  await page.clock.install();
  await openPuzzle(page, 1);
  await page.locator('[data-testid^="pending-bubble-"]').first().click();
  await expect(page.getByTestId('operator-÷')).toBeEnabled();

  const bubbleOverDivide = () =>
    page.evaluate(() => {
      const bubble = (document.querySelector('[data-testid="background-bubble-large-right"]') as HTMLElement).getBoundingClientRect();
      const operator = (document.querySelector('[data-testid="operator-÷"]') as HTMLElement).getBoundingClientRect();
      const distance = Math.hypot(operator.x + operator.width / 2 - (bubble.x + bubble.width / 2), operator.y + operator.height / 2 - (bubble.y + bubble.height / 2));
      return distance < bubble.width / 2 - 6 ? bubble.y : null;
    });
  for (let step = 0; step < 480 && (await bubbleOverDivide()) === null; step += 1) {
    await page.clock.fastForward(250);
  }
  const bubbleTop = await bubbleOverDivide();
  expect(bubbleTop).not.toBeNull();

  // A real click: it fails if anything but the operator would receive it.
  await page.getByTestId('operator-÷').click({ timeout: 5000 });

  // The waiting bubbles now read as divisors, so ÷ was taken...
  await expect(page.getByLabel(/^divide-/).first()).toBeVisible();
  // ...and the decorative bubble drifts on. Popped, it would have started again from under the screen.
  const bubbleTopNow = await page.getByTestId('background-bubble-large-right').evaluate((element) => element.getBoundingClientRect().y);
  expect(bubbleTopNow).toBeLessThan((bubbleTop as number) + 100);
});

test('held sideways, the board is at full size: the goal, the operators and the line are beside the bowl', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  // Six bubbles: the most the board ever has to hold.
  await openPuzzle(page, 77);

  // Nothing is shrunk: the board is laid out at the size it is shown.
  expect(await boardScale(page)).toBeCloseTo(1, 3);
  await expect(page.getByTestId('board-side-panel')).toBeVisible();

  const box = async (testId: string) => {
    const found = await page.getByTestId(testId).boundingBox();
    expect(found, testId).not.toBeNull();
    return found as { x: number; y: number; width: number; height: number };
  };
  const panel = await box('board-side-panel');
  const plus = await box('operator-+');
  const minus = await box('operator--');
  const times = await box('operator-×');
  const divide = await box('operator-÷');
  // Two rows of two, each button big enough for a thumb.
  expect(minus.y).toBe(plus.y);
  expect(divide.y).toBe(times.y);
  expect(times.x).toBe(plus.x);
  expect(times.y).toBeGreaterThan(plus.y + plus.height);
  for (const operator of [plus, minus, times, divide]) {
    expect(operator.width).toBeGreaterThanOrEqual(48);
    expect(operator.height).toBeGreaterThanOrEqual(48);
  }

  // The goal, the operators, the line and "back" are in the panel; the bubbles and "undo" are beside it, and all of it is on the screen.
  const inPanel = [await box('stage-goal-title'), plus, minus, times, divide, await box('expression-display'), (await page.getByLabel('Back', { exact: true }).boundingBox()) as { x: number; y: number; width: number; height: number }];
  for (const part of inPanel) {
    expect(part.x).toBeGreaterThanOrEqual(panel.x);
    expect(part.x + part.width).toBeLessThanOrEqual(panel.x + panel.width);
    expect(part.y).toBeGreaterThanOrEqual(0);
    expect(part.y + part.height).toBeLessThanOrEqual(390);
  }
  const besidePanel = [
    ...(await page.locator('[data-testid^="pending-bubble-"]').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON() as { x: number; y: number; width: number; height: number }))),
    await box('undo-move'),
    await box('share-puzzle'),
  ];
  expect(besidePanel).toHaveLength(8);
  for (const part of besidePanel) {
    expect(part.x).toBeGreaterThanOrEqual(panel.x + panel.width);
    expect(part.x + part.width).toBeLessThanOrEqual(844);
    expect(part.y).toBeGreaterThanOrEqual(0);
    expect(part.y + part.height).toBeLessThanOrEqual(390);
  }

  // It plays to the end like this.
  await tapWay(page, PUZZLE_STAGES[76].solution.split(' '), 300);
  await expect(page.getByLabel('next stage', { exact: true }).first()).toBeVisible({ timeout: 30_000 });

  // Turned upright, the operators are a row above the bowl again.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId('board-side-panel')).toHaveCount(0);
  expect((await box('operator-÷')).y).toBe((await box('operator-+')).y);
  expect(await boardScale(page)).toBeCloseTo(1, 3);
});

test('a wide window with room to spare shows the board bigger, and a dragged maru still follows the pointer', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openPuzzle(page, 1);
  // As if the window were 480 high.
  expect(await boardScale(page)).toBeCloseTo(1.5, 3);
  const plus = await page.getByTestId('operator-+').boundingBox();
  expect(plus?.height).toBeCloseTo(56 * 1.5, 1);

  await page.locator('[data-testid^="pending-bubble-"]').first().click();
  await page.waitForTimeout(2500);
  // The topmost maru of the pile: there is free water above it.
  const [startX, startY] = await page.evaluate(() => {
    const top = Array.from(document.querySelectorAll('[data-testid^="bead-"]'))
      .map((element) => [element, element.getBoundingClientRect()] as const)
      .sort((left, right) => left[1].y - right[1].y)[0];
    top[0].setAttribute('data-held', '1');
    return [top[1].x + top[1].width / 2, top[1].y + top[1].height / 2];
  });
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 15, startY - 45, { steps: 6 });
  await page.mouse.move(startX + 30, startY - 90, { steps: 6 });
  await page.waitForTimeout(250);
  const held = await page.evaluate(() => {
    const box = (document.querySelector('[data-held]') as HTMLElement).getBoundingClientRect();
    return [box.x + box.width / 2, box.y + box.height / 2];
  });
  await page.mouse.up();
  expect(Math.abs(held[0] - (startX + 30))).toBeLessThan(5);
  expect(Math.abs(held[1] - (startY - 90))).toBeLessThan(5);
});

test('a press on a maru takes hold of that maru, not of a neighbour whose ring lies over it', async ({ page }) => {
  // Nine loose maru in a pile. Each can be pressed from well outside its rim (a ring 88 across
  // around a maru 28 across), so every maru lies inside the rings of its neighbours. A press on
  // the middle of one used to take hold of whichever neighbour was drawn last.
  const number = PUZZLE_STAGES.findIndex((stage) => stage.bubbles.includes(9)) + 1;
  expect(number).toBeGreaterThan(0);
  await openPuzzle(page, number);
  await bubble(page, 9).click();
  await page.waitForTimeout(2500);

  const ids = await page.locator('[data-testid^="bead-"]').evaluateAll((elements) => elements.map((element) => element.getAttribute('data-testid') as string));
  expect(ids).toHaveLength(9);
  const middleOf = async (id: string) => {
    const box = (await page.getByTestId(id).boundingBox()) as { x: number; y: number; width: number; height: number };
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };

  for (const id of ids) {
    const before = await middleOf(id);
    await page.mouse.move(before.x, before.y);
    await page.mouse.down();
    await page.mouse.move(before.x, before.y - 30, { steps: 5 });
    await page.mouse.move(before.x, before.y - 60, { steps: 5 });
    await page.waitForTimeout(200);
    const held = await middleOf(id);
    await page.mouse.up();
    // The maru that was pressed is the one that went up with the pointer.
    expect(Math.abs(held.x - before.x), id).toBeLessThan(5);
    expect(Math.abs(held.y - (before.y - 60)), id).toBeLessThan(5);
    // Let it fall back and the pile settle before the next one.
    await page.waitForTimeout(1200);
  }
});

test('held sideways, the list is ten to a row with "back" beside it', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openPuzzle(page, 3);
  const backOnBoard = await page.getByLabel('Back', { exact: true }).boundingBox();
  await page.getByLabel('Back', { exact: true }).click();
  await expect(page.getByTestId('puzzle-list')).toBeVisible();

  const cell = async (number: number) => (await page.getByTestId(`pick-puzzle-${number}`).boundingBox()) as { x: number; y: number; width: number; height: number };
  const first = await cell(1);
  const tenth = await cell(10);
  const eleventh = await cell(11);
  expect(tenth.y).toBe(first.y);
  expect(eleventh.y).toBeGreaterThan(first.y);
  expect(eleventh.x).toBe(first.x);
  expect(tenth.x + tenth.width).toBeLessThanOrEqual(844);
  expect(first.width).toBeGreaterThanOrEqual(48);

  // "Back" is where it was on the board, to the left of the list.
  const back = await page.getByTestId('puzzle-list-back').boundingBox();
  expect(back).toEqual(backOnBoard);
  expect((back?.x ?? 0) + (back?.width ?? 0)).toBeLessThan(first.x);

  await page.getByTestId('pick-puzzle-20').click();
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#20');
});

test('held sideways, the choice is over the bowl and the one-minute result fits the screen', async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 844, height: 390 });
  await openPuzzleGame(page, { version: 1, solved: [], startVisits: 9, quickScores: [9, 7, 7, 4, 2] });
  await page.clock.resume();
  await solveStartPuzzle(page);

  const panel = await page.getByTestId('board-side-panel').boundingBox();
  const choice = await page.getByTestId('choose-puzzles').boundingBox();
  expect(choice?.x).toBeGreaterThan((panel?.x ?? 0) + (panel?.width ?? 0));

  await page.getByTestId('choose-quick').click();
  await expect(page.getByTestId('quick-time-left')).toBeVisible();
  await page.clock.fastForward(62_000);
  await expect(page.getByTestId('quick-result')).toBeVisible();

  for (const testId of ['quick-result-count', 'quick-result-best', 'quick-result-back', 'quick-result-again', 'quick-result-share']) {
    const part = await page.getByTestId(testId).boundingBox();
    expect(part, testId).not.toBeNull();
    expect(part?.y, testId).toBeGreaterThanOrEqual(0);
    expect((part?.y ?? 0) + (part?.height ?? 0), testId).toBeLessThanOrEqual(390);
  }
  await expect(page.getByTestId('quick-result-best').locator('> div')).toHaveCount(5);
});

test('the one-minute result can be handed to the device\'s "share" as a picture', async ({ page }) => {
  // A browser that can share files, as a phone's can: what it is handed is kept for the test to look at.
  await page.addInitScript(() => {
    const shared: Array<{ name: string; type: string; size: number; text: string | undefined; file: File }> = [];
    Object.assign(window, { sharedByTest: shared });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: (data?: ShareData) => (data?.files?.length ?? 0) > 0 });
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        const file = data.files?.[0] as File;
        shared.push({ name: file.name, type: file.type, size: file.size, text: data.text, file });
        return Promise.resolve();
      },
    });
  });
  await page.clock.install();
  await openPuzzleGame(page);
  await page.clock.resume();
  await solveStartPuzzle(page);
  await page.getByTestId('choose-quick').click();
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(3);

  // One puzzle solved, then the minute runs out.
  const board = await readBoard(page);
  await tapWay(page, findWay(board.bubbles, board.goal) ?? [], 120);
  await expect(page.getByTestId('corner-badge')).toHaveText('1');
  await page.clock.fastForward(62_000);
  await expect(page.getByTestId('quick-result-count')).toHaveText('1');

  // The third button, drawn like the others: no word on it.
  const share = page.getByTestId('quick-result-share');
  await expect(share).toBeVisible();
  await expect(share).toHaveText('');
  expect((await share.boundingBox())?.width).toBe((await page.getByTestId('quick-result-again').boundingBox())?.width);

  // A press opens the ways of sending. A result is shown to somebody, so the picture is the point:
  // the device's own share, the one way the picture goes along, leads. It is the one filled
  // button, right under the picture, as wide as the row of five places below it; the address to
  // copy and the picture to keep come last.
  await share.click();
  await expect(page.getByTestId('share-panel')).toBeVisible();
  const boxOf = async (testId: string) => (await page.getByTestId(testId).boundingBox()) as { x: number; y: number; width: number; height: number };
  const device = await boxOf('share-device');
  const picture = await boxOf('share-picture');
  const places = [await boxOf('share-x'), await boxOf('share-line'), await boxOf('share-facebook'), await boxOf('share-bluesky'), await boxOf('share-hatena')];
  const copy = await boxOf('share-copy');
  expect(device.y).toBeGreaterThanOrEqual(picture.y + picture.height);
  expect(device.y + device.height).toBeLessThanOrEqual(places[0].y);
  for (const place of places) {
    expect(place.y).toBe(places[0].y);
    expect(place.width).toBe(56);
  }
  expect(places[0].y + places[0].height).toBeLessThanOrEqual(copy.y);
  expect(Math.round(device.x)).toBe(Math.round(places[0].x));
  expect(Math.round(device.x + device.width)).toBe(Math.round(places[4].x + places[4].width));
  expect(await page.getByTestId('share-device').evaluate((button) => getComputedStyle(button).backgroundColor)).toBe('rgb(2, 132, 199)');
  await expect(page.getByTestId('share-device')).toHaveText('');
  await page.getByTestId('share-device').click();
  const shared = await page.evaluate(async () => {
    const all = (window as unknown as { sharedByTest: Array<{ name: string; type: string; size: number; text: string | undefined; file: File }> }).sharedByTest;
    const picture = await createImageBitmap(all[0].file);
    // The corner is water, and the picture is not all water: something was drawn on it.
    const canvas = document.createElement('canvas');
    canvas.width = picture.width;
    canvas.height = picture.height;
    const context = canvas.getContext('2d') as CanvasRenderingContext2D;
    context.drawImage(picture, 0, 0);
    const pixels = context.getImageData(0, 0, picture.width, picture.height).data;
    const colors = new Set<string>();
    for (let index = 0; index < pixels.length; index += 4 * 97) {
      colors.add(`${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`);
    }
    return { count: all.length, name: all[0].name, type: all[0].type, size: all[0].size, text: all[0].text, width: picture.width, height: picture.height, corner: Array.from(pixels.slice(0, 3)).join(), colors: colors.size };
  });
  // Upright: it is sent from a phone and looked at on a phone.
  expect(shared).toMatchObject({ count: 1, name: 'maru-1min-1.png', type: 'image/png', width: 1080, height: 1350, corner: '198,232,244' });
  expect(shared.size).toBeGreaterThan(5000);
  expect(shared.colors).toBeGreaterThan(20);
  // The address of the game goes with it: this page's own, nothing a visit added.
  const here = new URL(page.url());
  expect(shared.text).toBe(here.origin + here.pathname);
  expect(shared.text).toMatch(/\/puzzle$/);
});

test('where the browser cannot share pictures, the result is saved as a file', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: undefined });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: undefined });
  });
  await page.clock.install();
  await openPuzzleGame(page);
  await page.clock.resume();
  await solveStartPuzzle(page);
  await page.getByTestId('choose-quick').click();
  await expect(page.getByTestId('quick-time-left')).toBeVisible();
  await page.clock.fastForward(62_000);
  await expect(page.getByTestId('quick-result')).toBeVisible();

  await page.getByTestId('quick-result-share').click();
  // No share of the device's own to offer: the picture can be kept as a file.
  await expect(page.getByTestId('share-panel')).toBeVisible();
  await expect(page.getByTestId('share-device')).toHaveCount(0);
  const download = page.waitForEvent('download');
  await page.getByTestId('share-save').click();
  expect((await download).suggestedFilename()).toBe('maru-1min-0.png');
  // Closed, the result is still there, and "again" still works.
  await page.getByTestId('share-close').click();
  await expect(page.getByTestId('share-panel')).toHaveCount(0);
  await page.getByTestId('quick-result-again').click();
  await expect(page.getByTestId('quick-time-left')).toBeVisible();
});

test('a puzzle can be sent as a picture, and the address that goes with it opens that puzzle', async ({ page, browser }) => {
  await page.addInitScript(() => {
    const shared: Array<{ name: string; text: string | undefined; file: File }> = [];
    Object.assign(window, { sharedByTest: shared });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: (data?: ShareData) => (data?.files?.length ?? 0) > 0 });
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        const file = data.files?.[0] as File;
        shared.push({ name: file.name, text: data.text, file });
        return Promise.resolve();
      },
    });
  });
  await openPuzzle(page, 46);

  // The button is in the corner opposite "undo", the same button: no word on it.
  const share = page.getByTestId('share-puzzle');
  await expect(share).toBeVisible();
  await expect(share).toHaveText('');
  const shareBox = (await share.boundingBox()) as { x: number; y: number; width: number; height: number };
  const undoBox = (await page.getByTestId('undo-move').boundingBox()) as { x: number; y: number; width: number; height: number };
  expect(shareBox.y).toBe(undoBox.y);
  expect(shareBox.width).toBe(undoBox.width);
  expect(Math.round(shareBox.x)).toBe(Math.round(390 - (undoBox.x + undoBox.width)));

  await share.click();
  // A puzzle is sent to be solved by as many as will: the three places most players use are the
  // big buttons under the picture, and the rest are small under them, the device's own share among them.
  const boxOf = async (testId: string) => (await page.getByTestId(testId).boundingBox()) as { x: number; y: number; width: number; height: number };
  const picture = await boxOf('share-picture');
  const big = [await boxOf('share-x'), await boxOf('share-line'), await boxOf('share-facebook')];
  const small = [await boxOf('share-bluesky'), await boxOf('share-hatena'), await boxOf('share-copy'), await boxOf('share-save'), await boxOf('share-device')];
  expect(big[0].y).toBeGreaterThanOrEqual(picture.y + picture.height);
  for (const tile of big) {
    expect(tile.y).toBe(big[0].y);
    expect(tile.width).toBe(104);
    expect(tile.height).toBe(64);
  }
  for (const tile of small) {
    expect(tile.y).toBe(small[0].y);
    expect(tile.y).toBeGreaterThanOrEqual(big[0].y + big[0].height);
    expect(tile.width).toBe(56);
  }
  // The two rows are as wide as each other.
  expect(Math.round(big[0].x)).toBe(Math.round(small[0].x));
  expect(Math.round(big[2].x + big[2].width)).toBe(Math.round(small[4].x + small[4].width));
  await page.getByTestId('share-device').click();
  await page.getByTestId('share-close').click();
  const readShared = () =>
    page.evaluate(async () => {
      const all = (window as unknown as { sharedByTest: Array<{ name: string; text: string | undefined; file: File }> }).sharedByTest;
      const last = all[all.length - 1];
      const picture = await createImageBitmap(last.file);
      return { count: all.length, name: last.name, type: last.file.type, text: last.text, width: picture.width, height: picture.height };
    });
  const shared = await readShared();
  expect(shared).toMatchObject({ count: 1, name: 'maru-puzzle-46.png', type: 'image/png', width: 1080, height: 1350 });
  // What goes with it: the puzzle in one line (its number, its bubbles, its goal) with the game's
  // name as a tag, and under it the address of the puzzle's own page.
  const here = new URL(page.url());
  const site = `${here.origin}${here.pathname.replace(/puzzle$/, '')}`;
  expect(shared.text).toBe(`#46  ${PUZZLE_STAGES[45].bubbles.join(' · ')} → ${PUZZLE_STAGES[45].goal} ?  #MaruMaruCalc\n${site}p/46`);
  // Sending it is not a move: the puzzle is as it was.
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(PUZZLE_STAGES[45].bubbles.length);

  // Someone who has never played opens that address: puzzle 46 is there at once, without the start puzzle.
  const friendContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const friend = await friendContext.newPage();
  await friend.goto((shared.text as string).split('\n')[1]);
  await expect(friend.getByTestId('stage-goal-number')).toHaveText('#46');
  await expect(friend.getByTestId('stage-goal-target')).toHaveText(String(PUZZLE_STAGES[45].goal));
  expect((await readBoard(friend)).bubbles).toEqual([...PUZZLE_STAGES[45].bubbles].sort((left, right) => left - right));
  await expect(friend.getByTestId('puzzle-choice')).toHaveCount(0);

  // It is the real puzzle: solved, it is kept as solved, and the next one follows.
  await tapWay(friend, PUZZLE_STAGES[45].solution.split(' '), 300);
  await friend.getByLabel('next stage', { exact: true }).first().click({ timeout: 30_000 });
  await expect(friend.getByTestId('stage-goal-number')).toHaveText('#47');
  expect(await friend.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').solved ?? [], SAVE_KEY)).toHaveLength(1);
  // "Back" leads to the list, and from there to the start, as for anyone.
  await friend.getByLabel('Back', { exact: true }).click();
  await expect(friend.getByLabel('puzzle 46, solved')).toBeVisible();
  await friend.getByTestId('puzzle-list-back').click();
  await expect(friend.getByTestId('stage-goal-number')).toHaveText('#0');
  await friendContext.close();

  // On the next puzzle the picture is of that one.
  await tapWay(page, PUZZLE_STAGES[45].solution.split(' '), 300);
  await page.getByLabel('next stage', { exact: true }).first().click({ timeout: 30_000 });
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#47');
  await page.getByTestId('share-puzzle').click();
  await page.getByTestId('share-device').click();
  expect(await readShared()).toMatchObject({ count: 2, name: 'maru-puzzle-47.png', text: `#47  ${PUZZLE_STAGES[46].bubbles.join(' · ')} → ${PUZZLE_STAGES[46].goal} ?  #MaruMaruCalc\n${site}p/47` });
});

test('the tag after the message is in the language of the browser that posts it', async ({ browser }) => {
  // The other tests run in a browser set to English and get "#MaruMaruCalc"; one set to Japanese gets the Japanese name.
  const context = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const opened: string[] = [];
    Object.assign(window, { openedByTest: opened });
    window.open = (address?: string | URL) => {
      opened.push(String(address));
      return null;
    };
  });
  await page.goto('/p/46');
  await page.getByTestId('share-puzzle').click();
  await page.getByTestId('share-x').click();
  const opened = new URL((await page.evaluate(() => (window as unknown as { openedByTest: string[] }).openedByTest))[0]);
  expect(opened.searchParams.get('text')).toBe(`#46  ${PUZZLE_STAGES[45].bubbles.join(' · ')} → ${PUZZLE_STAGES[45].goal} ?  #まるまる電卓`);
  expect(opened.searchParams.get('url')).toMatch(/\/p\/46$/);
  await context.close();
});

test('every numbered puzzle has a page of its own, and the older way of writing its address still opens it', async ({ page }) => {
  await page.addInitScript(() => {
    const shared: string[] = [];
    Object.assign(window, { sharedByTest: shared });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: (data: ShareData) => (shared.push(String(data.text)), Promise.resolve()) });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  // The page of a puzzle opens that puzzle at once, without the start puzzle.
  await page.goto('/p/46');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#46');
  await expect(page.getByTestId('stage-goal-target')).toHaveText(String(PUZZLE_STAGES[45].goal));
  expect((await readBoard(page)).bubbles).toEqual([...PUZZLE_STAGES[45].bubbles].sort((left, right) => left - right));
  await expect(page.getByTestId('puzzle-choice')).toHaveCount(0);

  // Sent from there, it is this same page; nothing of the address is doubled.
  const site = new URL(page.url()).href.replace(/p\/46$/, '');
  await page.getByTestId('share-puzzle').click();
  await page.getByTestId('share-device').click();
  await page.getByTestId('share-close').click();
  const readLast = async () => (await page.evaluate(() => (window as unknown as { sharedByTest: string[] }).sharedByTest)).pop();
  expect((await readLast())?.split('\n')[1]).toBe(`${site}p/46`);

  // Played on from there, the next puzzle is sent with its own page, though the address bar still says 46.
  await tapWay(page, PUZZLE_STAGES[45].solution.split(' '), 300);
  await page.getByLabel('next stage', { exact: true }).first().click({ timeout: 30_000 });
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#47');
  await page.getByTestId('share-puzzle').click();
  await page.getByTestId('share-device').click();
  expect((await readLast())?.split('\n')[1]).toBe(`${site}p/47`);

  // The first and the last puzzle have pages; a number there is no puzzle for opens the start, as any visit does.
  await page.goto('/p/1');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#1');
  await page.goto('/p/100');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#100');
  for (const address of ['/p/0', '/p/101', '/p/abc']) {
    await page.goto(address);
    await expect(page.getByTestId('stage-goal-number'), address).toHaveText('#0');
  }

  // Addresses written the older way are still about: they open their puzzle as before.
  await page.goto('/puzzle?p=46');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#46');
  await page.getByTestId('share-puzzle').click();
  await page.getByTestId('share-device').click();
  expect((await readLast())?.split('\n')[1]).toBe(`${site}p/46`);
});

test('solved, a puzzle can be shown to someone: the corner button then sends that it is solved, without the way', async ({ page }) => {
  await page.addInitScript(() => {
    const shared: Array<{ name: string; text: string | undefined; file: File }> = [];
    Object.assign(window, { sharedByTest: shared });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: (data?: ShareData) => (data?.files?.length ?? 0) > 0 });
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        const file = data.files?.[0] as File;
        shared.push({ name: file.name, text: data.text, file });
        return Promise.resolve();
      },
    });
  });
  const readShared = () =>
    page.evaluate(async () => {
      const all = (window as unknown as { sharedByTest: Array<{ name: string; text: string | undefined; file: File }> }).sharedByTest;
      const last = all[all.length - 1];
      const picture = await createImageBitmap(last.file);
      return { count: all.length, name: last.name, type: last.file.type, text: last.text, width: picture.width, height: picture.height };
    });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/p/46');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#46');
  const site = new URL(page.url()).href.replace(/p\/46$/, '');

  // Unsolved, the corner button sends the puzzle to be solved; there is nothing yet to say about solving it.
  const before = (await page.getByTestId('share-puzzle').boundingBox()) as { x: number; y: number; width: number; height: number };
  await expect(page.getByTestId('share-solved')).toHaveCount(0);

  await tapWay(page, PUZZLE_STAGES[45].solution.split(' '), 300);
  // Solved: the same button in the same corner, now white with a starfish on its corner (one of those that drift up over a solved board), and no word.
  const solved = page.getByTestId('share-solved');
  await expect(solved).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTestId('share-puzzle')).toHaveCount(0);
  expect(await solved.boundingBox()).toEqual(before);
  await expect(page.getByTestId('share-solved-mark')).toBeVisible();
  // No sign from outside the game marks it: no tick.
  await expect(solved.getByTestId('nav-icon-check')).toHaveCount(0);
  await expect(solved).toHaveText('');
  await expect(page.getByLabel('share that it is solved', { exact: true })).toHaveCount(1);
  expect(await solved.evaluate((button) => getComputedStyle(button).backgroundColor)).toBe('rgba(255, 255, 255, 0.96)');

  // It is shown to somebody, so the picture is the point: the device's own share leads the ways of sending.
  await solved.click();
  await expect(page.getByTestId('share-panel')).toBeVisible();
  const device = (await page.getByTestId('share-device').boundingBox()) as { y: number; height: number; width: number };
  const firstPlace = (await page.getByTestId('share-x').boundingBox()) as { y: number; width: number };
  expect(device.y + device.height).toBeLessThanOrEqual(firstPlace.y);
  expect(device.width).toBeGreaterThan(3 * firstPlace.width);
  await page.getByTestId('share-device').click();
  await page.getByTestId('share-close').click();
  // One upright picture named after the puzzle; with it the puzzle in one line ending in "!", and
  // the address of the puzzle's page, so that whoever is shown it can try. Neither says how it was solved.
  const shared = await readShared();
  expect(shared).toEqual({
    count: 1,
    name: 'maru-solved-46.png',
    type: 'image/png',
    text: `#46  ${PUZZLE_STAGES[45].bubbles.join(' · ')} → ${PUZZLE_STAGES[45].goal} !  #MaruMaruCalc\n${site}p/46`,
    width: 1080,
    height: 1350,
  });
  expect(shared.text).not.toMatch(/[+×÷]| - /);

  // On to the next puzzle: the button is the plain one again, for sending that puzzle.
  await page.getByLabel('next stage', { exact: true }).first().click({ timeout: 30_000 });
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#47');
  await expect(page.getByTestId('share-puzzle')).toBeVisible();
  await expect(page.getByTestId('share-solved')).toHaveCount(0);

  // A puzzle a player made, solved by someone who came by its address: the same, with no number.
  await page.goto('/puzzle?m=2.3.4-14');
  await expect(page.getByTestId('share-puzzle')).toBeVisible();
  await tapWay(page, ['3', '+', '4', '×', '2'], 300);
  await expect(page.getByTestId('puzzle-choice')).toBeVisible({ timeout: 30_000 });
  // The choices of what to do next do not lie over the button.
  await page.getByTestId('share-solved').click();
  await page.getByTestId('share-device').click();
  await page.getByTestId('share-close').click();
  expect(await readShared()).toEqual({
    count: 1,
    name: 'maru-solved-2.3.4-14.png',
    type: 'image/png',
    text: `2 · 3 · 4 → 14 !  #MaruMaruCalc\n${site}puzzle?m=2.3.4-14`,
    width: 1080,
    height: 1350,
  });
  // The choices are still there to go on with.
  await expect(page.getByTestId('choose-make')).toBeVisible();
});

test('on a phone the share button goes straight to the phone\'s own share, with no sheet of the game\'s in between', async ({ browser }) => {
  // A device worked by touch that can pass a picture on: its share sheet takes the picture, the
  // message and the address together, and every place a player might post to is in it.
  const context = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    const shared: Array<{ name: string; text: string | undefined }> = [];
    Object.assign(window, { sharedByTest: shared });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: (data?: ShareData) => (data?.files?.length ?? 0) > 0 });
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        shared.push({ name: (data.files?.[0] as File).name, text: data.text });
        return Promise.resolve();
      },
    });
  });
  const readShared = () => page.evaluate(() => (window as unknown as { sharedByTest: Array<{ name: string; text: string | undefined }> }).sharedByTest);
  await page.goto('/p/46');
  const site = new URL(page.url()).href.replace(/p\/46$/, '');
  const line = `#46  ${PUZZLE_STAGES[45].bubbles.join(' · ')} → ${PUZZLE_STAGES[45].goal}`;

  await page.getByTestId('share-puzzle').tap();
  await expect.poll(readShared).toEqual([{ name: 'maru-puzzle-46.png', text: `${line} ?  #MaruMaruCalc\n${site}p/46` }]);
  await expect(page.getByTestId('share-panel')).toHaveCount(0);

  // Solved, the same: one press, and the phone's share has the picture that says so.
  await tapWay(page, PUZZLE_STAGES[45].solution.split(' '), 300);
  await expect(page.getByTestId('share-solved')).toBeVisible({ timeout: 30_000 });
  await page.getByTestId('share-solved').tap();
  await expect.poll(readShared).toHaveLength(2);
  expect((await readShared())[1]).toEqual({ name: 'maru-solved-46.png', text: `${line} !  #MaruMaruCalc\n${site}p/46` });
  await expect(page.getByTestId('share-panel')).toHaveCount(0);
  await context.close();

  // A phone whose browser cannot pass a picture on has no such share to go to: there the game shows its own ways of sending.
  const without = await browser.newContext({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  const other = await without.newPage();
  await other.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: undefined });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: undefined });
  });
  await other.goto('/p/46');
  await other.getByTestId('share-puzzle').tap();
  await expect(other.getByTestId('share-panel')).toBeVisible();
  await expect(other.getByTestId('share-x')).toBeVisible();
  await expect(other.getByTestId('share-device')).toHaveCount(0);
  await without.close();
});

test('maru that only roll are moved where they stand, and nothing of them is drawn again', async ({ page }) => {
  // With a few dozen maru on the board, drawing each of them again on every frame made the board
  // heavy. A maru that rolls now only has its element moved (as a layer of its own).
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/p/1');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#1');
  await page.locator('[data-testid^="pending-bubble-6-"]').first().click();
  const maru = page.locator('[data-testid^="bead-"]');
  await expect(maru).toHaveCount(6);

  // Watched while they fall into the bowl and roll: every change to them, and to anything inside them.
  const seen = await page.evaluate(
    () =>
      new Promise<{ moves: number; other: string[]; places: number; styles: Array<{ left: string; top: string; layer: string }> }>((resolve) => {
        const elements = [...document.querySelectorAll('[data-testid^="bead-"]')] as HTMLElement[];
        const places = new Set<string>();
        const other: string[] = [];
        let moves = 0;
        const observer = new MutationObserver((records) => {
          for (const record of records) {
            const target = record.target as HTMLElement;
            if (record.type === 'attributes' && record.attributeName === 'style' && elements.includes(target)) {
              moves += 1;
              places.add(target.style.transform);
            } else {
              other.push(`${record.type} ${record.attributeName ?? ''} on ${target.getAttribute?.('data-testid') ?? target.nodeName}`);
            }
          }
        });
        for (const element of elements) {
          observer.observe(element, { attributes: true, childList: true, characterData: true, subtree: true });
        }
        setTimeout(() => {
          observer.disconnect();
          resolve({ moves, other, places: places.size, styles: elements.map((element) => ({ left: getComputedStyle(element).left, top: getComputedStyle(element).top, layer: getComputedStyle(element).willChange })) });
        }, 600);
      }),
  );
  // They moved, many times, each to places of its own ...
  expect(seen.moves).toBeGreaterThan(20);
  expect(seen.places).toBeGreaterThan(20);
  // ... and that is all that happened to them: nothing inside a maru was touched, none was put in or taken out.
  expect(seen.other).toEqual([]);
  // Each stands at the field's corner and is moved from there, as a layer of its own.
  for (const style of seen.styles) {
    expect(style).toEqual({ left: '0px', top: '0px', layer: 'transform' });
  }

  // They end up lying in the bowl, inside the field, where the board can go on with them.
  await page.getByTestId('operator-÷').click();
  await page.locator('[data-testid^="pending-bubble-2-"]').first().click();
  await page.getByTestId('operator-+').click();
  await page.locator('[data-testid^="pending-bubble-8-"]').first().click();
  await expect(page.getByLabel('next stage', { exact: true }).first()).toBeVisible({ timeout: 30_000 });
});

test('an address that asks for a puzzle there is not opens the start, as any visit does', async ({ page }) => {
  await page.goto('/puzzle?p=0');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
  await page.goto('/puzzle?p=101');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
  await page.goto('/puzzle?p=abc');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
  await page.goto('/puzzle?q=46');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');

  // And one there is, with other things in the address around it.
  await page.goto('/puzzle?from=somewhere&p=100');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#100');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(PUZZLE_STAGES[99].bubbles.length);
  // A "#" after it too: the router rewrites such an address while the page comes up.
  await page.goto('/puzzle?p=46&x=1#somewhere');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#46');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(PUZZLE_STAGES[45].bubbles.length);
});

test('a player can make a puzzle: the bubbles, a goal from working them out, the number of ways, and an address that opens it', async ({ page }) => {
  await page.addInitScript(() => {
    const shared: Array<{ name: string; text: string | undefined; file: File }> = [];
    Object.assign(window, { sharedByTest: shared });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: (data?: ShareData) => (data?.files?.length ?? 0) > 0 });
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value: (data: ShareData) => {
        const file = data.files?.[0] as File;
        shared.push({ name: file.name, text: data.text, file });
        return Promise.resolve();
      },
    });
  });
  await openPuzzleGame(page);
  await solveStartPuzzle(page);
  // The third choice: a pencil.
  await page.getByTestId('choose-make').click();

  // Step one: the bubbles. Three to begin with; arrows change a number, the row below adds and takes away.
  const numbers = () => page.locator('[data-testid^="maker-bubble-"]').allTextContents();
  expect(await numbers()).toEqual(['2', '3', '4']);
  await page.getByTestId('maker-more-0').click();
  await page.getByTestId('maker-more-0').click();
  await page.getByTestId('maker-less-2').click();
  expect(await numbers()).toEqual(['4', '3', '3']);
  await page.getByTestId('maker-add').click();
  expect(await numbers()).toEqual(['4', '3', '3', '3']);
  for (let count = 4; count < 6; count += 1) {
    await page.getByTestId('maker-add').click();
  }
  // Six bubbles at most, two at least, numbers from 1 to 12.
  await expect(page.getByTestId('maker-add')).toBeDisabled();
  for (let count = 6; count > 2; count -= 1) {
    await page.getByTestId('maker-remove').click();
  }
  await expect(page.getByTestId('maker-remove')).toBeDisabled();
  expect(await numbers()).toEqual(['4', '3']);
  for (let number = 3; number > 1; number -= 1) {
    await page.getByTestId('maker-less-1').click();
  }
  await expect(page.getByTestId('maker-less-1')).toBeDisabled();
  for (let number = 4; number < 12; number += 1) {
    await page.getByTestId('maker-more-0').click();
  }
  await expect(page.getByTestId('maker-more-0')).toBeDisabled();
  expect(await numbers()).toEqual(['12', '1']);
  // Nothing on this screen is a word: the only text is the numbers.
  expect((await page.getByTestId('maker-bubbles').innerText()).replace(/\s/g, '')).toBe('121');

  // Set 2, 3, 4 and go on to the board.
  for (let number = 12; number > 2; number -= 1) {
    await page.getByTestId('maker-less-0').click();
  }
  await page.getByTestId('maker-more-1').click();
  await page.getByTestId('maker-more-1').click();
  await page.getByTestId('maker-add').click();
  await page.getByTestId('maker-more-2').click();
  expect(await numbers()).toEqual(['2', '3', '4']);
  await page.getByTestId('maker-next').click();

  // Step two: the board, with a pencil for a number and "?" for a goal.
  await expect(page.getByTestId('stage-goal-pencil')).toBeVisible();
  await expect(page.getByTestId('stage-goal-target')).toHaveText('?');
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(3);
  await expect(page.getByTestId('share-puzzle')).toHaveCount(0);
  await tapWay(page, ['3', '×', '4', '+', '2'], 300);

  // Step three: the puzzle as it will be sent, with nothing written on the screen.
  await expect(page.getByTestId('made-puzzle')).toBeVisible();
  await expect(page.getByTestId('made-puzzle-picture')).toBeVisible();
  expect((await page.getByTestId('made-puzzle').innerText()).trim()).toBe('');
  await page.getByTestId('made-puzzle-share').click();
  await page.getByTestId('share-device').click();
  await page.getByTestId('share-close').click();
  const shared = await page.evaluate(async () => {
    const all = (window as unknown as { sharedByTest: Array<{ name: string; text: string | undefined; file: File }> }).sharedByTest;
    const picture = await createImageBitmap(all[0].file);
    return { count: all.length, name: all[0].name, type: all[0].file.type, text: all[0].text, width: picture.width, height: picture.height };
  });
  const here = new URL(page.url());
  // A made puzzle has no card of its own where links are shown, so the line with it is what shows it there: no number, the bubbles, the goal.
  expect(shared).toEqual({ count: 1, name: 'maru-made-2.3.4-14.png', type: 'image/png', text: `2 · 3 · 4 → 14 ?  #MaruMaruCalc\n${here.origin}${here.pathname}?m=2.3.4-14`, width: 1080, height: 1350 });

  // Worked out again another way, it is another puzzle: 2 + 3 + 4 = 9.
  await page.getByTestId('made-puzzle-again').click();
  await expect(page.getByTestId('stage-goal-target')).toHaveText('?');
  await tapWay(page, ['2', '+', '3', '+', '4'], 300);
  await expect(page.getByTestId('made-puzzle')).toBeVisible();

  // The maker can play it as anyone would, and come back.
  await page.getByTestId('made-puzzle-play').click();
  await expect(page.getByTestId('stage-goal-pencil')).toBeVisible();
  await expect(page.getByTestId('stage-goal-target')).toHaveText('9');
  await page.getByLabel('Back', { exact: true }).click();
  await expect(page.getByTestId('made-puzzle')).toBeVisible();
  // "Back" from there leads to the bubbles, as they were.
  await page.getByTestId('made-puzzle-back').click();
  expect(await numbers()).toEqual(['2', '3', '4']);
});

test('the address of a made puzzle opens it for anyone; solved, it is not one of the hundred', async ({ page }) => {
  await page.goto('/puzzle?m=2.3.4-14');
  await expect(page.getByTestId('stage-goal-pencil')).toBeVisible();
  await expect(page.getByTestId('stage-goal-number')).toHaveCount(0);
  await expect(page.getByTestId('stage-goal-target')).toHaveText('14');
  expect((await readBoard(page)).bubbles).toEqual([2, 3, 4]);
  // Every operator is free: none shows a count.
  await expect(page.locator('[data-testid$="-usage"]')).toHaveCount(0);
  // It can be sent on.
  await expect(page.getByTestId('share-puzzle')).toBeVisible();

  await tapWay(page, ['3', '+', '4', '×', '2'], 300);
  // Solved: the same three choices as after the start puzzle, the pencil among them.
  await expect(page.getByTestId('puzzle-choice')).toBeVisible({ timeout: 30_000 });
  // The board behind them stays as it was solved: no bubble comes back.
  await page.waitForTimeout(1500);
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(0);
  await expect(page.getByTestId('choose-make')).toBeVisible();
  await expect(page.getByTestId('choose-puzzles-number')).toHaveText('#1');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '{}').solved ?? [], SAVE_KEY)).toEqual([]);
});

test('an address with a made puzzle that cannot be played opens the start', async ({ page }) => {
  // Nothing reaches 5 from 6 and 2.
  await page.goto('/puzzle?m=6.2-5');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
  // Too many bubbles, a number too big, a goal too big.
  await page.goto('/puzzle?m=2.3.4.5.6.7.8-35');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
  await page.goto('/puzzle?m=13.2-15');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
  await page.goto('/puzzle?m=2.3-5000');
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
});

test('while a puzzle is made, an amount that cannot be a goal starts the board over', async ({ page }) => {
  await openPuzzleGame(page);
  await solveStartPuzzle(page);
  await page.getByTestId('choose-make').click();
  await page.getByTestId('maker-remove').click();
  await page.getByTestId('maker-next').click();
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(2);

  // 2 - 3 = -1: below what a goal may be.
  await tapWay(page, ['2', '-', '3'], 300);
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(2, { timeout: 5000 });
  await expect(page.getByTestId('made-puzzle')).toHaveCount(0);
  await expect(page.getByTestId('stage-goal-target')).toHaveText('?');

  // 2 × 3 = 6 is one.
  await tapWay(page, ['2', '×', '3'], 300);
  await expect(page.getByTestId('made-puzzle')).toBeVisible();
});

test('held sideways, the screens for making a puzzle fit', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await openPuzzleGame(page);
  await solveStartPuzzle(page);
  // Three choices over the bowl, beside the panel.
  const panel = await page.getByTestId('board-side-panel').boundingBox();
  for (const testId of ['choose-puzzles', 'choose-quick', 'choose-make']) {
    const choice = await page.getByTestId(testId).boundingBox();
    expect(choice?.x, testId).toBeGreaterThan((panel?.x ?? 0) + (panel?.width ?? 0));
    expect((choice?.x ?? 0) + (choice?.width ?? 0), testId).toBeLessThanOrEqual(844);
  }
  await page.getByTestId('choose-make').click();
  for (let count = 3; count < 6; count += 1) {
    await page.getByTestId('maker-add').click();
  }
  const onScreen = async (testIds: string[]) => {
    for (const testId of testIds) {
      const part = await page.getByTestId(testId).boundingBox();
      expect(part, testId).not.toBeNull();
      expect(part?.x, testId).toBeGreaterThanOrEqual(0);
      expect(part?.y, testId).toBeGreaterThanOrEqual(0);
      expect((part?.x ?? 0) + (part?.width ?? 0), testId).toBeLessThanOrEqual(844);
      expect((part?.y ?? 0) + (part?.height ?? 0), testId).toBeLessThanOrEqual(390);
    }
  };
  await onScreen(['maker-back', 'maker-next', 'maker-more-0', 'maker-less-5', 'maker-bubble-5', 'maker-add', 'maker-remove', 'maker-random']);

  for (let count = 6; count > 2; count -= 1) {
    await page.getByTestId('maker-remove').click();
  }
  await page.getByTestId('maker-next').click();
  await tapWay(page, ['2', '+', '3'], 300);
  await expect(page.getByTestId('made-puzzle-picture')).toBeVisible();
  await expect(page.getByTestId('made-puzzle-share')).toBeVisible();
  await onScreen(['made-puzzle-picture', 'made-puzzle-back', 'made-puzzle-again', 'made-puzzle-random', 'made-puzzle-play', 'made-puzzle-share']);
  // The ways of sending fit a phone held sideways too.
  await page.getByTestId('made-puzzle-share').click();
  await onScreen(['share-panel', 'share-picture', 'share-x', 'share-line', 'share-facebook', 'share-bluesky', 'share-hatena', 'share-copy', 'share-save', 'share-close']);
});

test('the ways of sending: five places that post the link, the link to copy, the picture to keep', async ({ page }) => {
  await page.addInitScript(() => {
    const opened: string[] = [];
    const copied: string[] = [];
    Object.assign(window, { openedByTest: opened, copiedByTest: copied });
    window.open = (address?: string | URL) => {
      opened.push(String(address));
      return null;
    };
    Object.defineProperty(Navigator.prototype, 'clipboard', { configurable: true, value: { writeText: (text: string) => (copied.push(text), Promise.resolve()) } });
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: undefined });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: undefined });
  });
  await page.goto('/puzzle?p=46');
  await page.getByTestId('share-puzzle').click();
  const panel = page.getByTestId('share-panel');
  await expect(panel).toBeVisible();
  await expect(page.getByTestId('share-picture')).toBeVisible();
  // This browser cannot pass a picture on, so the button for that is not offered.
  await expect(page.getByTestId('share-device')).toHaveCount(0);

  // It lies over the whole screen at the screen's own size, all of it in view.
  for (const testId of ['share-panel', 'share-picture', 'share-x', 'share-line', 'share-facebook', 'share-bluesky', 'share-hatena', 'share-copy', 'share-save', 'share-close']) {
    const part = (await page.getByTestId(testId).boundingBox()) as { x: number; y: number; width: number; height: number };
    expect(part.x, testId).toBeGreaterThanOrEqual(0);
    expect(part.y, testId).toBeGreaterThanOrEqual(0);
    expect(part.x + part.width, testId).toBeLessThanOrEqual(390);
    expect(part.y + part.height, testId).toBeLessThanOrEqual(844);
  }
  // The picture is shown upright, as it is sent.
  const picture = (await page.getByTestId('share-picture').boundingBox()) as { width: number; height: number };
  expect(picture.height / picture.width).toBeCloseTo(1350 / 1080, 1);

  // Each place gets the address of this puzzle's page. X, LINE and Bluesky take a message with
  // it, and get the puzzle in one line; Facebook and Hatena Bookmark take the address alone.
  const here = new URL(page.url());
  const puzzlePage = `${here.origin}${here.pathname.replace(/puzzle$/, '')}p/46`;
  const address = encodeURIComponent(puzzlePage);
  const message = encodeURIComponent(`#46  ${PUZZLE_STAGES[45].bubbles.join(' · ')} → ${PUZZLE_STAGES[45].goal} ?  #MaruMaruCalc`);
  for (const place of ['x', 'line', 'facebook', 'bluesky', 'hatena']) {
    await page.getByTestId(`share-${place}`).click();
  }
  expect(await page.evaluate(() => (window as unknown as { openedByTest: string[] }).openedByTest)).toEqual([
    `https://twitter.com/intent/tweet?text=${message}&url=${address}`,
    `https://social-plugins.line.me/lineit/share?url=${address}&text=${message}`,
    `https://www.facebook.com/sharer/sharer.php?u=${address}`,
    `https://bsky.app/intent/compose?text=${message}%0A${address}`,
    `https://b.hatena.ne.jp/add?mode=confirm&url=${address}`,
  ]);
  // Each place is shown by its own mark, whole and in its own proportions; the sheet has no word on it.
  expect((await panel.innerText()).trim()).toBe('');
  const marks = await panel.locator('[data-testid^="share-"] img').evaluateAll((images) =>
    images.filter((image) => !(image as HTMLImageElement).src.startsWith('blob:')).map((image) => ({ loaded: (image as HTMLImageElement).naturalWidth > 0, source: (image as HTMLImageElement).src.split('/').pop()?.split('.')[0] })),
  );
  expect(marks.map((mark) => mark.loaded)).toEqual([true, true, true, true, true]);

  // The link is copied as it is, and the button says so with a tick.
  await expect(page.getByTestId('nav-icon-check')).toHaveCount(0);
  await page.getByTestId('share-copy').click();
  await expect(page.getByTestId('nav-icon-check')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { copiedByTest: string[] }).copiedByTest)).toEqual([puzzlePage]);

  // A press beside the sheet closes it; none of this was a move on the board.
  await page.getByTestId('share-panel-backdrop').click({ position: { x: 5, y: 5 } });
  await expect(panel).toHaveCount(0);
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(PUZZLE_STAGES[45].bubbles.length);
});

test('the die makes a whole puzzle of as many bubbles as were chosen, one that can be solved', async ({ page }) => {
  await page.addInitScript(() => {
    const shared: string[] = [];
    Object.assign(window, { sharedByTest: shared });
    Object.defineProperty(Navigator.prototype, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(Navigator.prototype, 'share', { configurable: true, value: (data: ShareData) => (shared.push(String(data.text)), Promise.resolve()) });
  });
  await openPuzzleGame(page);
  await solveStartPuzzle(page);
  await page.getByTestId('choose-make').click();
  await page.getByTestId('maker-add').click();
  await page.getByTestId('maker-add').click();
  await expect(page.locator('[data-testid^="maker-bubble-"]')).toHaveCount(5);

  // One press: the finished puzzle, without the board in between.
  await page.getByTestId('maker-random').click();
  await expect(page.getByTestId('made-puzzle-picture')).toBeVisible();
  const readPuzzle = async () => {
    await page.getByTestId('made-puzzle-share').click();
    await page.getByTestId('share-device').click();
    await page.getByTestId('share-close').click();
    const texts = await page.evaluate(() => (window as unknown as { sharedByTest: string[] }).sharedByTest);
    const [, bubbleText, goalText] = /[?]m=([0-9.]+)-([0-9]+)$/.exec(texts[texts.length - 1]) as RegExpExecArray;
    return { bubbles: bubbleText.split('.').map(Number), goal: Number(goalText) };
  };
  const first = await readPuzzle();
  expect(first.bubbles).toHaveLength(5);
  expect(new Set(first.bubbles).size).toBe(5);
  expect(countWays(first)).toBeGreaterThan(0);

  // The die again, from here: another puzzle of five.
  const seen = new Set([JSON.stringify(first)]);
  for (let roll = 0; roll < 3; roll += 1) {
    await page.getByTestId('made-puzzle-random').click();
    await expect(page.getByTestId('made-puzzle-picture')).toBeVisible();
    const next = await readPuzzle();
    expect(next.bubbles).toHaveLength(5);
    expect(countWays(next)).toBeGreaterThan(0);
    seen.add(JSON.stringify(next));
  }
  expect(seen.size).toBeGreaterThan(1);

  // It plays like any made puzzle, and "back" from its bubbles keeps the count.
  await page.getByTestId('made-puzzle-play').click();
  await expect(page.getByTestId('stage-goal-pencil')).toBeVisible();
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(5);
});

/** How much bigger or smaller than it is laid out the board is shown. */
function boardScale(page: Page) {
  return page.getByTestId('fit-to-screen').evaluate((element) => element.getBoundingClientRect().height / (element as HTMLElement).offsetHeight);
}

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
