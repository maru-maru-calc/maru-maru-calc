import { expect, Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('operator limits match launch and addition island rules', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();
  await expect(page.locator('[data-testid$="-usage"]')).toHaveCount(0);

  await openIsland(page, '+');
  await page.getByTestId('stage-addition-10-twos').click();

  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();
  await expect(page.locator('[data-testid$="-usage"]')).toHaveCount(0);

  await page.getByLabel('bubble-2').first().click();
  await expect(page.getByTestId('expression-display-text')).toContainText('2 +');
  await expect(page.getByTestId('operator-+')).toBeEnabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();
});

test('subtraction island allows both addition and subtraction', async ({ page }) => {
  await page.goto('/');

  await openIsland(page, '-');
  await page.getByTestId('stage-subtraction-1').click();

  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();
  await expect(page.locator('[data-testid$="-usage"]')).toHaveCount(0);

  await tapFirstPendingBubble(page);
  await expect(page.getByTestId('operator-+')).toBeEnabled();
  await expect(page.getByTestId('operator--')).toBeEnabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();
});

test('mixed stages start from plus and expose finite usage badges', async ({ page }) => {
  await page.goto('/');

  await openIsland(page, 'mixed-3');
  await page.getByTestId('stage-mixed3-1').click();

  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator-+-usage')).toHaveText('1');
  await expect(page.getByTestId('operator-×-usage')).toHaveText('1');

  await tapFirstPendingBubble(page);
  await expect(page.getByTestId('expression-display-text')).toContainText('2 +');
  await expect(page.getByTestId('operator-+')).toBeEnabled();
  await expect(page.getByTestId('operator-×')).toBeEnabled();
});

test('finite operator usage is spent after an operation', async ({ page }) => {
  await page.goto('/');

  await openIsland(page, 'mixed-3');
  await page.getByTestId('stage-mixed3-1').click();

  await expect(page.getByTestId('operator-+-usage')).toHaveText('1');
  await expect(page.getByTestId('operator-×-usage')).toHaveText('1');

  await page.getByLabel('bubble-2').first().click();
  await page.getByTestId('operator-×').click();
  await page.getByLabel('multiply-3').first().click();

  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-×-usage')).toHaveCount(0);
});

test('free mixed worlds allow all four operators without usage badges', async ({ page }) => {
  await page.goto('/');

  await openIsland(page, 'mixed-3-free');
  await page.getByTestId('stage-mixed3Free-1').click();

  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();
  await expect(page.locator('[data-testid$="-usage"]')).toHaveCount(0);

  await tapFirstPendingBubble(page);
  await expect(page.getByTestId('operator-+')).toBeEnabled();
  await expect(page.getByTestId('operator--')).toBeEnabled();
  await expect(page.getByTestId('operator-×')).toBeEnabled();
  await expect(page.getByTestId('operator-÷')).toBeEnabled();
});

test('multiplication world starts with multiplication only and has about twenty five stages', async ({ page }) => {
  await page.goto('/');

  await openIsland(page, '×');
  await page.getByTestId('stage-multiplication-1').click();
  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();
  await expect(page.locator('[data-testid$="-usage"]')).toHaveCount(0);

  await tapFirstPendingBubble(page);
  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeEnabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();

  await page.getByLabel('Back', { exact: true }).click();
  await page.getByTestId('stage-multiplication-25').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('stage-multiplication-25')).toBeVisible();
});

test('division world starts with division only and has about twenty five stages', async ({ page }) => {
  await page.goto('/');

  await openIsland(page, '÷');
  await page.getByTestId('stage-division-1').click();
  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeDisabled();
  await expect(page.locator('[data-testid$="-usage"]')).toHaveCount(0);

  await tapFirstPendingBubble(page);
  await expect(page.getByTestId('operator-+')).toBeDisabled();
  await expect(page.getByTestId('operator--')).toBeDisabled();
  await expect(page.getByTestId('operator-×')).toBeDisabled();
  await expect(page.getByTestId('operator-÷')).toBeEnabled();

  await page.getByLabel('Back', { exact: true }).click();
  await page.getByTestId('stage-division-25').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('stage-division-25')).toBeVisible();
});

test('subtraction world has about twenty five stages', async ({ page }) => {
  await page.goto('/');

  await openIsland(page, '-');
  await expect(page.getByTestId('stage-subtraction-1')).toBeVisible();
  await page.getByTestId('stage-subtraction-25').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('stage-subtraction-25')).toBeVisible();
});

test('subtraction with tens does not drift from the expression result', async ({ page }) => {
  await page.goto('/');

  await openIsland(page, '-');
  await page.getByTestId('stage-subtraction-3').click();

  await page.getByLabel('bubble-30').click();
  await page.getByTestId('operator--').click();
  await page.getByLabel('bubble-10').first().click();

  await expect(page.getByTestId('expression-display-text')).toContainText('30 - 10 = 20');
  await expect(page.getByTestId('current-total-value')).toHaveText('20');
  await expect(page.getByLabel('clear equation')).toContainText('30 - 10 = 20');
});

async function openIsland(page: Page, label: string) {
  await page.getByTestId('launch-play').click();
  await expect(page.getByTestId('launch-tada')).toBeVisible();
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel(label, { exact: true }).click();
}

async function tapFirstPendingBubble(page: Page) {
  await page.locator('[data-testid^="pending-bubble-"]').first().click();
}
