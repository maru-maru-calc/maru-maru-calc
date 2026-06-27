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

test('dentaku non-kuku next button opens the next problem instead of returning to stage select', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await page.getByLabel('dentaku mode', { exact: true }).click();
  await expect(page.getByTestId('dentaku-world-select')).toBeVisible();
  await page.getByLabel('+', { exact: true }).click();
  await expect(page.getByTestId('kuku-stage-dentaku-addition-1')).toBeVisible();

  await page.getByTestId('kuku-stage-dentaku-addition-1').click();
  const firstPrompt = await page.getByTestId('kuku-question-title').innerText();
  await expect(page.getByTestId('long-form-panel')).toHaveCount(0);
  await answerCurrentDentakuQuestion(page);
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 10000 });
  await page.getByLabel('next stage').click();

  await expect(page.getByTestId('kuku-keypad')).toBeVisible();
  await expect(page.getByTestId('kuku-question-title')).not.toHaveText(firstPrompt);
  await expect(page.getByTestId('kuku-stage-dentaku-addition-2')).not.toBeVisible();
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

test('long form multiplication advances through partial products and addition', async ({ page }) => {
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
  const rightTens = Math.floor(right / 10);
  const rightOnes = right % 10;
  const partialInputs = [
    leftOnes * rightOnes,
    leftTens * rightOnes,
    leftOnes * rightTens,
    leftTens * rightTens,
  ];
  const partials = [
    partialInputs[0],
    leftTens * 10 * rightOnes,
    leftOnes * rightTens * 10,
    leftTens * 10 * rightTens * 10,
  ];

  for (const partialInput of partialInputs) {
    await enterDentakuAnswer(page, partialInput);
  }

  const answer = left * right;
  const width = Math.max(String(answer).length, ...partials.map((partial) => String(partial).length), 3);
  for (const step of getColumnAdditionSteps(partials, width)) {
    await enterDentakuAnswer(page, step);
  }

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
  await page.getByTestId('kuku-stage-dentaku-subtraction-1').click();

  await page.getByTestId('kuku-key-0').click();
  await expect(page.getByTestId('kuku-question-title')).toContainText('= 0');
  await page.getByTestId('kuku-key-5').click();
  await expect(page.getByTestId('kuku-question-title')).toContainText('= 0');
});

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
