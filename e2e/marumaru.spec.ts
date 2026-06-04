import { expect, test } from '@playwright/test';

test('wraps the whole evaluated expression before multiplication', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('stage-addition-10-twos').click();

  await page.getByLabel('bubble-2').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 +');

  await page.getByTestId('operator-÷').click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 ÷');

  await page.getByLabel('divide-2').first().click();
  await expect(page.getByTestId('division-split-overlay')).toBeVisible();
  await expect(page.getByTestId('division-split-survivor')).toBeVisible();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 ÷ 2 = 1');
  await expect(page.getByTestId('current-total-value')).toContainText('1');

  await page.getByTestId('operator-+').click();
  await page.getByLabel('bubble-2').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 ÷ 2 + 2 = 3');
  await expect(page.getByTestId('current-total-value')).toContainText('3');

  await page.getByTestId('operator-×').click();
  await expect(page.getByTestId('expression-display-text')).toContainText('(2 ÷ 2 + 2) ×');
  await expect(page.locator('[data-testid^="bead-multiplicand-3-"]')).toBeVisible();

  await page.getByLabel('multiply-2').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('(2 ÷ 2 + 2) × 2 = 6');
  await expect(page.getByTestId('current-total-value')).toContainText('6');
  await expect(page.locator('[data-testid^="bead-product-3-"]')).toHaveCount(2);
});

test('uses a negative multiplier after selecting minus then multiplication', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('stage-addition-10-twos').click();

  await page.getByLabel('bubble-2').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 +');

  await page.getByTestId('operator--').click();
  await page.getByTestId('operator-×').click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 ×');

  await page.getByLabel('multiply-2').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 × -2 = -4');
  await expect(page.getByTestId('current-total-value')).toContainText('-4');
});

test('uses a negative divisor after selecting minus then division', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('stage-addition-10-twos').click();

  await page.getByLabel('bubble-2').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 +');

  await page.getByTestId('operator--').click();
  await page.getByTestId('operator-÷').click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 ÷');

  await page.getByLabel('divide-2').first().click();
  await expect(page.getByTestId('division-split-overlay')).toBeVisible();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 ÷ -2 = -1');
  await expect(page.getByTestId('current-total-value')).toContainText('-1');
});

test('pressing multiplication again clears a negative multiplier sign', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('stage-addition-10-ones').click();

  await page.getByLabel('bubble-1').first().click();
  await page.getByTestId('operator--').click();
  await page.getByTestId('operator-×').click();
  await page.getByLabel('multiply-1').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('1 × -1 = -1');
  await expect(page.getByTestId('current-total-value')).toContainText('-1');

  await page.getByTestId('operator-×').click();
  await expect(page.getByTestId('expression-display-text')).toContainText('×');

  await page.getByLabel('multiply-1').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('× 1 = -1');
  await expect(page.getByTestId('current-total-value')).toContainText('-1');
});
