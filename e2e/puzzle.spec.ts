import { expect, Page, test } from '@playwright/test';

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

  await share.click();
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
  expect(shared).toMatchObject({ count: 1, name: 'maru-1min-1.png', type: 'image/png', width: 1200, height: 630, corner: '198,232,244' });
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

  const download = page.waitForEvent('download');
  await page.getByTestId('quick-result-share').click();
  expect((await download).suggestedFilename()).toBe('maru-1min-0.png');
  // The result is still there, and "again" still works.
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
  const readShared = () =>
    page.evaluate(async () => {
      const all = (window as unknown as { sharedByTest: Array<{ name: string; text: string | undefined; file: File }> }).sharedByTest;
      const last = all[all.length - 1];
      const picture = await createImageBitmap(last.file);
      return { count: all.length, name: last.name, type: last.file.type, text: last.text, width: picture.width, height: picture.height };
    });
  const shared = await readShared();
  expect(shared).toMatchObject({ count: 1, name: 'maru-puzzle-46.png', type: 'image/png', width: 1200, height: 630 });
  const here = new URL(page.url());
  expect(shared.text).toBe(`${here.origin}${here.pathname}?p=46`);
  // Sending it is not a move: the puzzle is as it was.
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(PUZZLE_STAGES[45].bubbles.length);

  // Someone who has never played opens that address: puzzle 46 is there at once, without the start puzzle.
  const friendContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const friend = await friendContext.newPage();
  await friend.goto(shared.text as string);
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
  expect(await readShared()).toMatchObject({ count: 2, name: 'maru-puzzle-47.png', text: `${here.origin}${here.pathname}?p=47` });
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
