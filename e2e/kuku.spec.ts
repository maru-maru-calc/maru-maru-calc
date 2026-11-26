import { expect, Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('kuku world opens a dan stage and retries the same question after a wrong answer', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('dentaku mode', { exact: true }).click();
  await expect(page.getByTestId('dentaku-world-select')).toBeVisible();
  await page.getByLabel('9×9', { exact: true }).click();
  await expect(page.getByTestId('kuku-stage-dentaku-kuku-dan-2')).toBeVisible();

  await page.getByTestId('kuku-stage-dentaku-kuku-dan-2').click();
  await expect(page.getByTestId('kuku-question-title')).toHaveText('2 × 1 = ?');

  await page.getByTestId('kuku-key-2').click();
  await expect(page.getByTestId('kuku-question-title')).toHaveText('2 × 1 = 2');
  await page.getByTestId('kuku-key-submit').click();
  await expect(page.getByTestId('kuku-question-title')).toHaveText('2 × 2 = ?', { timeout: 10000 });

  await page.getByTestId('kuku-key-5').click();
  await page.getByTestId('kuku-key-submit').click();
  await expect(page.getByTestId('kuku-question-title')).toHaveText('2 × 2 = ?', { timeout: 1200 });

  await page.getByTestId('kuku-key-4').click();
  await page.getByTestId('kuku-key-submit').click();
  await expect(page.getByTestId('kuku-question-title')).toHaveText('2 × 3 = ?', { timeout: 10000 });
});

test('after two wrong answers the maru act the question out, without giving the number', async ({ page }) => {
  await page.goto('/game');
  await clearLaunch(page);
  await page.getByLabel('dentaku mode', { exact: true }).click();
  await page.getByLabel('9×9', { exact: true }).click();
  await page.getByTestId('kuku-stage-dentaku-kuku-dan-2').click();
  const title = page.getByTestId('kuku-question-title');
  const waitingBubbles = page.locator('[data-testid^="pending-bubble-"]');
  await expect(title).toHaveText('2 × 1 = ?');
  await enterDentakuAnswer(page, 2);
  await expect(title).toHaveText('2 × 2 = ?', { timeout: 10000 });

  // One wrong answer: asked again, nothing else happens.
  await enterDentakuAnswer(page, 5);
  await expect(title).toHaveText('2 × 2 = ?');
  await page.waitForTimeout(1500);
  await expect(waitingBubbles).toHaveCount(2);
  await expect(page.getByTestId('current-total-value')).toHaveText('0');

  // A second one: the answer pad steps aside and the two bubbles of 2 are worked out as maru.
  await enterDentakuAnswer(page, 9);
  await expect(waitingBubbles).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByTestId('current-total-value')).toHaveText('4', { timeout: 15000 });

  // The maru stay in full view to be counted: the pad (which lies over the bowl) keeps away, and
  // the number is not written anywhere.
  await expect(page.getByTestId('look-at-maru-field')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('kuku-key-submit')).toHaveCount(0);
  await expect(title).toHaveText('2 × 2 = ?');
  await expect(page.getByTestId('expression-display-text')).not.toContainText('4');
  await expect(page.getByLabel('next stage')).toHaveCount(0);

  // A tap brings the pad back, and the same question is asked again.
  await page.getByTestId('look-at-maru-field').click();
  await expect(page.getByTestId('kuku-key-submit')).toBeVisible();
  await expect(title).toHaveText('2 × 2 = ?');

  await enterDentakuAnswer(page, 4);
  await expect(title).toHaveText('2 × 3 = ?', { timeout: 10000 });
});

test('a missed times-table question comes back after the others, and the replay can be skipped', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('dentaku mode', { exact: true }).click();
  await page.getByLabel('9×9', { exact: true }).click();
  await page.getByTestId('kuku-stage-dentaku-kuku-dan-2').click();
  await expect(page.getByTestId('kuku-question-title')).toHaveText('2 × 1 = ?');
  await expect(page.getByTestId('kuku-question-progress')).toHaveText('1/9');

  await enterDentakuAnswer(page, 9);
  await expect(page.getByTestId('kuku-question-title')).toHaveText('2 × 1 = ?', { timeout: 1200 });
  await enterDentakuAnswer(page, 2);
  await page.getByLabel('skip the replay').click();
  await expect(page.getByTestId('current-total-value')).toHaveText('2');

  // The stage is one question longer now.
  for (let multiplier = 2; multiplier <= 9; multiplier += 1) {
    await expect(page.getByTestId('kuku-question-title')).toHaveText(`2 × ${multiplier} = ?`, { timeout: 10000 });
    await expect(page.getByTestId('kuku-question-progress')).toHaveText(`${multiplier}/10`);
    await enterDentakuAnswer(page, 2 * multiplier);
    await page.getByLabel('skip the replay').click();
  }
  await expect(page.getByTestId('kuku-question-title')).toHaveText('2 × 1 = ?', { timeout: 10000 });
  await expect(page.getByTestId('kuku-question-progress')).toHaveText('10/10');

  // Answered at the first try this time, so the stage ends and the same table follows out of order.
  await enterDentakuAnswer(page, 2);
  await page.getByLabel('skip the replay').click();
  await expect(page.getByTestId('kuku-question-progress')).toHaveText('1/9', { timeout: 10000 });
  await expect(page.getByTestId('kuku-question-title')).toHaveText(/^2 × \d = \?$/);
});

test('a times-table fact missed on one visit comes back in the mixed stage on the next, until it is known', async ({ page, context }) => {
  const rememberedMisses = (visit: Page) =>
    visit.evaluate(() => (JSON.parse(window.localStorage.getItem('marumaru-calc:progress') ?? '{}').kukuWeak ?? []) as string[]);
  const openKukuStage = async (visit: Page, stageId: string) => {
    await visit.getByLabel('dentaku mode', { exact: true }).click();
    await visit.getByLabel('9×9', { exact: true }).click();
    await visit.getByTestId(`kuku-stage-${stageId}`).click();
  };

  await page.goto('/game');
  await clearLaunch(page);
  await openKukuStage(page, 'dentaku-kuku-dan-7');
  const title = page.getByTestId('kuku-question-title');

  // 7 × 1 right, 7 × 2 missed once.
  await expect(title).toHaveText('7 × 1 = ?');
  await enterDentakuAnswer(page, 7);
  await page.getByLabel('skip the replay').click();
  await expect(title).toHaveText('7 × 2 = ?', { timeout: 10000 });
  await enterDentakuAnswer(page, 15);
  await expect(title).toHaveText('7 × 2 = ?', { timeout: 1200 });
  await enterDentakuAnswer(page, 14);
  await page.getByLabel('skip the replay').click();
  await expect(title).toHaveText('7 × 3 = ?', { timeout: 10000 });
  await expect.poll(() => rememberedMisses(page)).toEqual(['7x2']);
  await page.close();

  // Another day: the app is opened afresh, and the mixed stage is played.
  const nextDay = await context.newPage();
  await nextDay.goto('/game');
  await expect(nextDay.getByTestId('mode-select')).toBeVisible();
  await openKukuStage(nextDay, 'dentaku-kuku-random-all');

  const asked: string[] = [];
  for (let question = 1; question <= 9; question += 1) {
    await expect(nextDay.getByTestId('kuku-question-progress')).toHaveText(`${question}/9`, { timeout: 10000 });
    const prompt = await nextDay.getByTestId('kuku-question-title').innerText();
    asked.push(prompt);
    await enterDentakuAnswer(nextDay, evaluateDentakuPrompt(prompt));
    await nextDay.getByLabel('skip the replay').click();
    if (prompt === '7 × 2 = ?') {
      // Right at the first try, out of order: it is let go.
      await expect.poll(() => rememberedMisses(nextDay)).toEqual([]);
    }
  }
  expect(asked).toContain('7 × 2 = ?');
  expect(new Set(asked).size).toBe(9);
});

test('later dentaku stages use bigger numbers, and a skipped replay ends on the answer', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('dentaku mode', { exact: true }).click();
  await page.getByLabel('+', { exact: true }).click();
  await page.getByTestId('kuku-stage-dentaku-addition-set-5').scrollIntoViewIfNeeded();
  await page.getByTestId('kuku-stage-dentaku-addition-set-5').click();

  // #5: two digits plus one digit, into the next ten.
  const prompt = await page.getByTestId('kuku-question-title').innerText();
  const match = prompt.match(/^(\d{2}) \+ (\d) = \?$/);
  if (!match) {
    throw new Error(`Unexpected prompt for addition #5: ${prompt}`);
  }
  const left = Number(match[1]);
  const right = Number(match[2]);
  expect((left % 10) + right).toBeGreaterThanOrEqual(10);

  await expect(page.getByLabel('skip the replay')).toHaveCount(0);
  await enterDentakuAnswer(page, left + right);
  await page.getByLabel('skip the replay').click();
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 2000 });
  await expect(page.getByTestId('current-total-value')).toHaveText(String(left + right));
  await expect(page.getByTestId('expression-display-text')).toHaveText(`${left} + ${right} = ${left + right}`);
  await expect(page.locator('[data-testid^="pending-bubble-"]')).toHaveCount(0);
  await expect(page.getByLabel('skip the replay')).toHaveCount(0);
});

test('a calculator stage asks five different questions of one kind, and the next stage follows', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('dentaku mode', { exact: true }).click();
  await expect(page.getByTestId('dentaku-world-select')).toBeVisible();
  await page.getByLabel('+', { exact: true }).click();
  // Twenty stages and the endless one, where there used to be a hundred of one question each.
  await expect(page.locator('[data-testid^="kuku-stage-dentaku-addition-"]')).toHaveCount(21);

  await page.getByTestId('kuku-stage-dentaku-addition-set-1').click();
  await expect(page.getByTestId('long-form-panel')).toHaveCount(0);
  const title = page.getByTestId('kuku-question-title');
  const progress = page.getByTestId('kuku-question-progress');

  const asked: string[] = [];
  for (let question = 1; question <= 5; question += 1) {
    await expect(progress).toHaveText(`${question}/5`, { timeout: 10000 });
    const prompt = await title.innerText();
    // #1: up to 5 + 5.
    expect(prompt).toMatch(/^[1-5] \+ [1-5] = \?$/);
    asked.push(prompt);
    await answerCurrentDentakuQuestion(page);
    await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 10000 });
    if (question < 5) {
      // Not cleared until all five are done.
      expect(await clearedDentakuStages(page)).not.toContain('dentaku-addition-set-1');
    }
    await page.getByLabel('next stage').click();
  }
  expect(new Set(asked).size).toBe(5);

  // The next stage has started: a bigger number, still within ten.
  await expect(progress).toHaveText('1/5');
  await expect(page.getByTestId('kuku-keypad')).toBeVisible();
  const [left, right] = (await title.innerText()).match(/\d+/g)!.map(Number);
  expect(Math.max(left, right)).toBeGreaterThanOrEqual(6);
  expect(left + right).toBeLessThanOrEqual(10);
  expect(await clearedDentakuStages(page)).toContain('dentaku-addition-set-1');
});

test('five one-question stages cleared before the change count as the stage that replaced them', async ({ page }) => {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('marumaru-calc:progress')) {
      window.localStorage.setItem(
        'marumaru-calc:progress',
        JSON.stringify({
          version: 1,
          marumaru: [],
          // #1 to #5 and #6 to #9 of the old hundred: today's #1 whole, today's #2 not yet.
          dentaku: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((number) => `dentaku-addition-${number}`),
          longForm: [],
          hasSeenIntro: true,
        }),
      );
    }
  });
  await page.goto('/game');
  await page.getByLabel('dentaku mode', { exact: true }).click();
  await page.getByLabel('+', { exact: true }).click();
  await expect(page.getByTestId('kuku-stage-dentaku-addition-set-1')).toBeVisible();

  const cleared = await clearedDentakuStages(page);
  expect(cleared).toContain('dentaku-addition-set-1');
  expect(cleared).not.toContain('dentaku-addition-set-2');
  // What was saved before is still there.
  expect(cleared).toContain('dentaku-addition-9');
});

test('long form mode opens binary stages with a long-form panel', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('long form mode', { exact: true }).click();
  await expect(page.getByTestId('dentaku-world-select')).toBeVisible();
  await page.getByLabel('+', { exact: true }).click();
  await expect(page.getByTestId('kuku-stage-long-form-addition-4')).toBeVisible();

  await page.getByTestId('kuku-stage-long-form-addition-4').click();
  await expect(page.getByTestId('long-form-panel')).toBeVisible();
  await expect(page.getByTestId('kuku-question-title')).toHaveText('#4 1/5');
  const prompt = await page.getByTestId('long-form-question-prompt').innerText();
  await expect(page.getByTestId('long-form-question-prompt')).toHaveText(/\d{2} \+ \d{2} = \?/);

  const match = prompt.match(/(\d{2}) \+ (\d{2}) = \?/);
  if (!match) {
    throw new Error(`Unexpected long-form prompt: ${prompt}`);
  }
  const onesSum = Number(match[1][1]) + Number(match[2][1]);
  await enterDentakuAnswer(page, onesSum);
  await page.getByTestId('kuku-key-2').click();
  await page.getByTestId('kuku-key-5').click();
  await expect(page.getByTestId('long-form-question-prompt')).toHaveText(/\d{2} \+ \d{2} = 2/);
});

test('long form subtraction advances by ones then tens', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('long form mode', { exact: true }).click();
  await expect(page.getByTestId('dentaku-world-select')).toBeVisible();
  await page.getByLabel('-', { exact: true }).click();
  await expect(page.getByTestId('kuku-stage-long-form-subtraction-4')).toBeVisible();

  await page.getByTestId('kuku-stage-long-form-subtraction-4').click();
  await expect(page.getByTestId('long-form-panel')).toBeVisible();
  const prompt = await page.getByTestId('long-form-question-prompt').innerText();
  const match = prompt.match(/(\d{2}) - (\d{2}) = \?/);
  if (!match) {
    throw new Error(`Unexpected long-form subtraction prompt: ${prompt}`);
  }

  const left = Number(match[1]);
  const right = Number(match[2]);
  const needsBorrow = left % 10 < right % 10;
  const onesAnswer = (needsBorrow ? left % 10 + 10 : left % 10) - (right % 10);
  const tensAnswer = Math.floor(left / 10) - (needsBorrow ? 1 : 0) - Math.floor(right / 10);

  await enterDentakuAnswer(page, onesAnswer);
  await expect(page.getByTestId('long-form-question-prompt')).toHaveText(/\d{2} - \d{2} = \?/);
  await enterDentakuAnswer(page, tensAnswer);
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 10000 });
  await expect(page.getByTestId('expression-display-text')).toHaveText(`${left} - ${right} = ${left - right}`);

  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('long-form-panel')).toBeVisible();
  await expect(page.getByTestId('kuku-question-title')).toHaveText('#4 2/5');
  await expect(page.getByTestId('long-form-question-prompt')).toHaveText(/\d{2} - \d{2} = \?/);
  await expect(page.getByTestId('dentaku-world-select')).toHaveCount(0);
});

test('long form multiplication works row by row as written at school, then adds the rows', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('long form mode', { exact: true }).click();
  await expect(page.getByTestId('dentaku-world-select')).toBeVisible();
  await page.getByLabel('×', { exact: true }).click();
  await expect(page.getByTestId('kuku-stage-long-form-multiplication-1')).toBeVisible();

  await page.getByTestId('kuku-stage-long-form-multiplication-1').click();
  await expect(page.getByTestId('long-form-panel')).toBeVisible();
  const prompt = await page.getByTestId('long-form-question-prompt').innerText();
  const match = prompt.match(/(\d{2}) × (\d{2}) = \?/);
  if (!match) {
    throw new Error(`Unexpected long-form multiplication prompt: ${prompt}`);
  }

  const left = Number(match[1]);
  const right = Number(match[2]);
  const leftTens = Math.floor(left / 10);
  const leftOnes = left % 10;

  // One row per digit of the multiplier: "ones × digit", then "tens × digit" plus what was carried.
  for (const digit of [right % 10, Math.floor(right / 10)]) {
    const onesProduct = leftOnes * digit;
    await enterDentakuAnswer(page, onesProduct);
    await enterDentakuAnswer(page, leftTens * digit + Math.floor(onesProduct / 10));
  }

  // Then the two rows are added; the second one stands one place to the left.
  const rows = [left * (right % 10), left * Math.floor(right / 10) * 10];
  const answer = left * right;
  const width = Math.max(String(answer).length, ...rows.map((row) => String(row).length), 3);
  for (const step of getColumnAdditionSteps(rows, width)) {
    await enterDentakuAnswer(page, step);
  }

  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('expression-display-text')).toHaveText(`${left} × ${right} = ${answer}`);
});

test('long form multiplication starts with two digits times one digit', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('long form mode', { exact: true }).click();
  await page.getByLabel('×', { exact: true }).click();
  await page.getByTestId('kuku-stage-long-form-multiplication-single-2').click();
  await expect(page.getByTestId('long-form-panel')).toBeVisible();
  const prompt = await page.getByTestId('long-form-question-prompt').innerText();
  const match = prompt.match(/^(\d{2}) × (\d) = \?$/);
  if (!match) {
    throw new Error(`Unexpected long-form multiplication prompt: ${prompt}`);
  }

  const left = Number(match[1]);
  const right = Number(match[2]);
  const ones = (left % 10) * right;
  expect(ones).toBeGreaterThanOrEqual(10);

  // One row: "ones × digit" (write its ones digit, carry the rest), then "tens × digit" plus the carry.
  await enterDentakuAnswer(page, ones);
  await expect(page.getByTestId('long-form-panel')).toContainText(String(Math.floor(ones / 10)));
  await enterDentakuAnswer(page, Math.floor(left / 10) * right + Math.floor(ones / 10));
  const answer = left * right;

  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('expression-display-text')).toHaveText(`${left} × ${right} = ${answer}`);
});

test('long form division advances through quotient and subtraction steps', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('long form mode', { exact: true }).click();
  await expect(page.getByTestId('dentaku-world-select')).toBeVisible();
  await page.getByLabel('÷', { exact: true }).click();
  await expect(page.getByTestId('kuku-stage-long-form-division-1')).toBeVisible();

  await page.getByTestId('kuku-stage-long-form-division-1').click();
  await expect(page.getByTestId('long-form-panel')).toBeVisible();
  const prompt = await page.getByTestId('long-form-question-prompt').innerText();
  const match = prompt.match(/(\d{2}) ÷ (\d) = \?/);
  if (!match) {
    throw new Error(`Unexpected long-form division prompt: ${prompt}`);
  }

  const dividend = Number(match[1]);
  const divisor = Number(match[2]);
  const quotient = dividend / divisor;
  const dividendTens = Math.floor(dividend / 10);
  const dividendOnes = dividend % 10;
  const quotientTens = Math.floor(quotient / 10);
  const quotientOnes = quotient % 10;
  const firstProduct = divisor * quotientTens;
  const firstRemainder = dividendTens - firstProduct;
  const loweredValue = firstRemainder * 10 + dividendOnes;
  const secondProduct = divisor * quotientOnes;
  const finalRemainder = loweredValue - secondProduct;

  for (const step of [quotientTens, firstProduct, firstRemainder, quotientOnes, secondProduct, finalRemainder]) {
    await enterDentakuAnswer(page, step);
  }

  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 15000 });
  await expect(page.getByTestId('expression-display-text')).toHaveText(`${dividend} ÷ ${divisor} = ${quotient}`);
});

test('dentaku accepts zero input', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('dentaku mode', { exact: true }).click();
  await page.getByLabel('-', { exact: true }).click();
  await page.getByTestId('kuku-stage-dentaku-subtraction-set-1').click();

  await page.getByTestId('kuku-key-0').click();
  await expect(page.getByTestId('kuku-question-title')).toContainText('= 0');
  await page.getByTestId('kuku-key-5').click();
  await expect(page.getByTestId('kuku-question-title')).toContainText('= 0');
});

async function clearedDentakuStages(page: Page) {
  return page.evaluate(() => (JSON.parse(window.localStorage.getItem('marumaru-calc:progress') ?? '{}').dentaku ?? []) as string[]);
}

async function clearLaunch(page: Page) {
  await page.getByLabel('bubble-5').click();
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('mode-select')).toBeVisible();
}

async function answerCurrentDentakuQuestion(page: Page) {
  const prompt = await page.getByTestId('kuku-question-title').innerText();
  const answer = evaluateDentakuPrompt(prompt);

  await enterDentakuAnswer(page, answer);
}

async function enterDentakuAnswer(page: Page, answer: number) {
  for (const digit of String(answer)) {
    await page.getByTestId(`kuku-key-${digit}`).click();
  }
  await page.getByTestId('kuku-key-submit').click();
}

function evaluateDentakuPrompt(prompt: string) {
  const expression = prompt.split('=')[0].trim().replace(/×/g, '*').replace(/÷/g, '/');
  // The generated dentaku prompts contain only numbers, arithmetic symbols, spaces, and parentheses.
  return Function(`"use strict"; return (${expression});`)() as number;
}

function getColumnAdditionSteps(values: number[], width: number) {
  const steps: number[] = [];
  let carry = 0;

  for (let column = width - 1; column >= 0; column -= 1) {
    const place = 10 ** (width - 1 - column);
    const expectedAnswer = values.reduce((sum, value) => sum + Math.floor(value / place) % 10, carry);
    steps.push(expectedAnswer);
    carry = Math.floor(expectedAnswer / 10);
  }

  while (steps.length > 1 && steps[steps.length - 1] === 0) {
    steps.pop();
  }

  return steps;
}
