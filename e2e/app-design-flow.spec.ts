import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('moves through the depth path into the existing game', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel('●● calc. logo')).toBeVisible();
  await expect(page.getByLabel('bubble-2')).toBeVisible();
  await expect(page.getByLabel('bead-normal-1')).toHaveCount(8);
  await expect(page.getByTestId('current-total-value')).toHaveText('8');
  await expect(page.getByTestId('expression-display-text')).toHaveText('8 +');
  await page.screenshot({ path: 'test-results/app-launch.png' });

  await page.getByTestId('launch-play').click();
  await expect(page.getByTestId('current-total-value')).toHaveText('10');
  await expect(page.getByTestId('launch-tada')).toBeVisible();
  await expect(page.getByTestId('world-select')).toHaveCount(0);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await expect(page.locator('[data-testid^="depth-background-bubble-"]')).toHaveCount(12);
  await expect(page.locator('[data-testid^="depth-fish-"]')).toHaveCount(5);
  await expect(page.getByTestId('depth-shade')).toBeVisible();
  await expect(page.getByLabel('mixed-3', { exact: true })).toBeVisible();
  await expect(page.getByLabel('mixed-4', { exact: true })).toBeVisible();
  await expect(page.getByLabel('×', { exact: true })).toBeVisible();
  await expect(page.getByLabel('÷', { exact: true })).toBeVisible();
  await page.getByLabel('mixed-5', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByLabel('mixed-5', { exact: true })).toBeVisible();
  await page.getByLabel('mixed-5-free', { exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByLabel('mixed-3-free', { exact: true })).toBeVisible();
  await expect(page.getByLabel('mixed-4-free', { exact: true })).toBeVisible();
  await expect(page.getByLabel('mixed-5-free', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/app-worlds.png' });

  await page.getByLabel('+', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-ones')).toBeVisible();
  await expect(page.locator('[data-testid^="depth-background-bubble-"]')).toHaveCount(12);
  await expect(page.locator('[data-testid^="depth-fish-"]')).toHaveCount(5);
  await expect(page.getByTestId('depth-shade')).toBeVisible();
  await expect(page.getByTestId('stage-addition-10-six-four')).toBeDisabled();
  await page.screenshot({ path: 'test-results/app-stages.png' });

  await page.getByTestId('stage-addition-10-twos').click();
  await expect(page.getByTestId('operator-+')).toBeVisible();
  await page.waitForTimeout(2600);
  await expect(page.getByTestId('pending-bubble-hint')).toHaveCount(0);
  await page.screenshot({ path: 'test-results/app-game.png' });
});

test('stage routes can scroll to later mixed problems', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('launch-play').click();
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('mixed-3', { exact: true }).click();

  await expect(page.getByTestId('stage-mixed3-1')).toBeVisible();
  await page.getByTestId('stage-mixed3-10').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('stage-mixed3-10')).toBeVisible();
});

test('back button position is consistent between stage select and game', async ({ page }) => {
  await page.goto('/');

  await page.getByTestId('launch-play').click();
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('+', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-ones')).toBeVisible();

  const stageBackBox = await page.getByLabel('Back', { exact: true }).boundingBox();
  expect(stageBackBox).not.toBeNull();

  await page.getByTestId('stage-addition-10-twos').click();
  await expect(page.getByTestId('operator-+')).toBeVisible();

  const gameBackBox = await page.getByLabel('Back', { exact: true }).boundingBox();
  expect(gameBackBox).not.toBeNull();
  expect(Math.abs((gameBackBox?.x ?? 0) - (stageBackBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((gameBackBox?.y ?? 0) - (stageBackBox?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((gameBackBox?.width ?? 0) - (stageBackBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((gameBackBox?.height ?? 0) - (stageBackBox?.height ?? 0))).toBeLessThanOrEqual(1);
});

test('launch bubbles can be touched directly', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('bubble-2').click();
  await expect(page.getByTestId('current-total-value')).toHaveText('10');
  await expect(page.getByTestId('launch-tada')).toBeVisible();
  await expect(page.getByTestId('world-select')).toHaveCount(0);
  await expect(page.getByTestId('world-select')).toBeVisible();
});

test('pending bubbles show an idle tap hint', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel('bubble-2')).toBeVisible();
  await expect(page.getByTestId('pending-bubble-hint')).toBeVisible({ timeout: 4000 });
});

test('background bubbles float behind the field and can be popped', async ({ page }) => {
  await page.goto('/');

  const backgroundBubbles = page.locator('[data-testid^="background-bubble-"]');
  await expect(backgroundBubbles).toHaveCount(12);
  await backgroundBubbles.first().click({ force: true });
  await expect(page.getByLabel('bubble-2')).toBeVisible();
});
