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
  await answerCurrentDentakuQuestion(page);
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 10000 });
  await page.getByLabel('next stage').click();

  await expect(page.getByTestId('kuku-keypad')).toBeVisible();
  await expect(page.getByTestId('kuku-question-title')).not.toHaveText(firstPrompt);
  await expect(page.getByTestId('kuku-stage-dentaku-addition-2')).not.toBeVisible();
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
