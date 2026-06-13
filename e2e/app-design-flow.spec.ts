import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('moves through the depth path into the existing game', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByLabel('maru logo')).toBeVisible();
  await expect(page.getByLabel('bubble-2')).toBeVisible();
  await expect(page.getByLabel('bead-normal-1')).toHaveCount(8);
  await expect(page.getByTestId('current-total-value')).toHaveText('8');
  await expect(page.getByTestId('expression-display-text')).toHaveText('8 +');
  await page.screenshot({ path: 'test-results/app-launch.png' });

  await clearLaunch(page);
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

  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('mixed-3', { exact: true }).click();

  await expect(page.getByTestId('stage-mixed3-1')).toBeVisible();
  await page.getByTestId('stage-mixed3-10').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('stage-mixed3-10')).toBeVisible();
});

test('going back from an uncleared next stage does not mark it complete', async ({ page }) => {
  await page.goto('/');

  await page.getByLabel('bubble-2').click();
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('+', { exact: true }).click();
  await page.getByTestId('stage-addition-10-twos').click();

  for (let index = 0; index < 5; index += 1) {
    await page.getByLabel('bubble-2').first().click();
  }

  await expect(page.getByTestId('current-total-value')).toHaveText('10');
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('operator-+')).toBeVisible();

  await page.getByLabel('Back', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-twos').getByText('★')).toBeVisible();
  await expect(page.getByTestId('stage-addition-10-five-five').getByText('★')).toHaveCount(0);
});

test('back button position is consistent between stage select and game', async ({ page }) => {
  await page.goto('/');

  await clearLaunch(page);
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

test('launch and game operator buttons are aligned', async ({ page }) => {
  await page.goto('/');

  const launchOperatorPlusBox = await page.getByTestId('operator-+').boundingBox();
  const launchOperatorMinusBox = await page.getByTestId('operator--').boundingBox();
  const launchOperatorMultiplyBox = await page.getByTestId('operator-×').boundingBox();
  const launchOperatorDivideBox = await page.getByTestId('operator-÷').boundingBox();
  expect(launchOperatorPlusBox).not.toBeNull();
  expect(launchOperatorMinusBox).not.toBeNull();
  expect(launchOperatorMultiplyBox).not.toBeNull();
  expect(launchOperatorDivideBox).not.toBeNull();

  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('+', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-twos')).toBeVisible();
  await page.getByTestId('stage-addition-10-twos').click();
  await expect(page.getByTestId('operator-+')).toBeVisible();

  const gameOperatorPlusBox = await page.getByTestId('operator-+').boundingBox();
  const gameOperatorMinusBox = await page.getByTestId('operator--').boundingBox();
  const gameOperatorMultiplyBox = await page.getByTestId('operator-×').boundingBox();
  const gameOperatorDivideBox = await page.getByTestId('operator-÷').boundingBox();
  expect(gameOperatorPlusBox).not.toBeNull();
  expect(gameOperatorMinusBox).not.toBeNull();
  expect(gameOperatorMultiplyBox).not.toBeNull();
  expect(gameOperatorDivideBox).not.toBeNull();

  assertBoxMatch(launchOperatorPlusBox, gameOperatorPlusBox);
  assertBoxMatch(launchOperatorMinusBox, gameOperatorMinusBox);
  assertBoxMatch(launchOperatorMultiplyBox, gameOperatorMultiplyBox);
  assertBoxMatch(launchOperatorDivideBox, gameOperatorDivideBox);
});

test('launch and game operator corners and expression metrics are identical', async ({ page }) => {
  await page.goto('/');

  const launchOperatorBoxes = await Promise.all([
    getMeasuredBox(page.getByTestId('operator-+')),
    getMeasuredBox(page.getByTestId('operator--')),
    getMeasuredBox(page.getByTestId('operator-×')),
    getMeasuredBox(page.getByTestId('operator-÷')),
  ]);
  const launchExpressionBox = await getMeasuredBox(page.getByTestId('expression-display'));
  expect(launchExpressionBox).not.toBeNull();

  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('+', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-twos')).toBeVisible();
  await page.getByTestId('stage-addition-10-twos').click();
  await expect(page.getByTestId('operator-+')).toBeVisible();

  const gameOperatorBoxes = await Promise.all([
    getMeasuredBox(page.getByTestId('operator-+')),
    getMeasuredBox(page.getByTestId('operator--')),
    getMeasuredBox(page.getByTestId('operator-×')),
    getMeasuredBox(page.getByTestId('operator-÷')),
  ]);
  const gameExpressionBox = await getMeasuredBox(page.getByTestId('expression-display'));
  expect(gameExpressionBox).not.toBeNull();

  launchOperatorBoxes.forEach((launchBox, index) => {
    const gameBox = gameOperatorBoxes[index];
    assertMeasuredMatch(launchBox, gameBox);
  });
  assertMeasuredMatch(launchExpressionBox, gameExpressionBox, 0.5);
  assertStyleMatch(launchExpressionBox, gameExpressionBox);
});

test('launch and game expression boxes are aligned', async ({ page }) => {
  await page.goto('/');

  const launchExpressionBox = await page.getByTestId('expression-display').boundingBox();
  expect(launchExpressionBox).not.toBeNull();

  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('+', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-twos')).toBeVisible();
  await page.getByTestId('stage-addition-10-twos').click();
  await expect(page.getByTestId('expression-display')).toBeVisible();

  const gameExpressionBox = await page.getByTestId('expression-display').boundingBox();
  expect(gameExpressionBox).not.toBeNull();

  assertBoxMatch(launchExpressionBox, gameExpressionBox);
});

type MeasuredBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  borderWidth: number;
};

async function getMeasuredBox(locator: ReturnType<Page['locator']>): Promise<MeasuredBox> {
  const box = await locator.boundingBox();
  const style = await locator.evaluate((node) => {
    const computed = window.getComputedStyle(node);
    return {
      borderRadius: computed.borderRadius,
      borderWidth: computed.borderWidth,
    };
  });

  expect(box).not.toBeNull();
  return {
    ...(box as { x: number; y: number; width: number; height: number }),
    borderRadius: Number.parseFloat(style.borderRadius) || 0,
    borderWidth: Number.parseFloat(style.borderWidth) || 0,
  };
}

function assertMeasuredMatch(
  launchBox: MeasuredBox,
  gameBox: MeasuredBox,
  tolerance = 1,
) {
  expect(Math.abs(launchBox.x - gameBox.x)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(launchBox.y - gameBox.y)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(launchBox.width - gameBox.width)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(launchBox.height - gameBox.height)).toBeLessThanOrEqual(tolerance);
}

function assertStyleMatch(
  launchBox: MeasuredBox,
  gameBox: MeasuredBox,
  tolerance = 0.5,
) {
  expect(Math.abs(launchBox.borderRadius - gameBox.borderRadius)).toBeLessThanOrEqual(tolerance);
  expect(Math.abs(launchBox.borderWidth - gameBox.borderWidth)).toBeLessThanOrEqual(tolerance);
}

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

async function clearLaunch(page: Page) {
  await page.getByLabel('bubble-5').click();
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('world-select')).toBeVisible();
}

function assertBoxMatch(actual: { x: number; y: number; width: number; height: number } | null, expected: { x: number; y: number; width: number; height: number } | null) {
  expect(actual).not.toBeNull();
  expect(expected).not.toBeNull();

  const actualBox = actual as { x: number; y: number; width: number; height: number };
  const expectedBox = expected as { x: number; y: number; width: number; height: number };

  expect(Math.abs(actualBox.x - expectedBox.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(actualBox.y - expectedBox.y)).toBeLessThanOrEqual(1);
  expect(Math.abs(actualBox.width - expectedBox.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(actualBox.height - expectedBox.height)).toBeLessThanOrEqual(1);
}
