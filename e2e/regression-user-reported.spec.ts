import { expect, Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('user-reported regressions', () => {
  test('going back from an uncleared next stage does not add a clear mark', async ({ page }) => {
    await page.goto('/');

    await clearLaunch(page);
    await openIsland(page, '+');
    await page.getByTestId('stage-addition-10-twos').click();
    await clearAdditionTwos(page);
    await page.getByLabel('next stage').click();

    await expect(page.getByTestId('operator-+')).toBeVisible();
    await page.getByLabel('Back', { exact: true }).click();

    await expect(page.getByTestId('stage-addition-10-twos').getByText('★')).toBeVisible();
    await expect(page.getByTestId('stage-addition-10-five-five').getByText('★')).toHaveCount(0);
  });

  test('stage unlock progress is counted per world, not globally', async ({ page }) => {
    await page.goto('/');

    await clearLaunch(page);
    await openIsland(page, '+');
    await page.getByTestId('stage-addition-10-twos').click();
    await clearAdditionTwos(page);
    await page.getByLabel('Back', { exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();

    await openIslandFromWorld(page, '-');

    await expect(page.getByTestId('stage-subtraction-1')).toBeEnabled();
    await expect(page.getByTestId('stage-subtraction-2')).toBeEnabled();
    await expect(page.getByTestId('stage-subtraction-3')).toBeEnabled();
    await expect(page.getByTestId('stage-subtraction-4')).toBeDisabled();
  });

  test('wrapped bubbles that settle on the basin burst even while unused bubbles remain', async ({ page }) => {
    await page.goto('/');

    await clearLaunch(page);
    await openIsland(page, 'mixed-5-free');
    await page.getByTestId('stage-mixed5Free-1').click();

    await page.getByLabel('bubble-6').click();
    await page.getByTestId('operator-÷').click();
    await page.getByLabel('divide-3').click();

    await expect(page.getByTestId('expression-display-text')).toContainText('6 ÷ 3 = 2');
    await expect(page.locator('[data-testid^="pending-bubble-"]')).not.toHaveCount(0);
    await expect(page.locator('[data-testid^="bead-division-2-"]')).toHaveCount(0, { timeout: 3500 });
  });

  test('multiplication preview bubble does not auto-burst while multiply is selected', async ({ page }) => {
    await page.goto('/');

    await clearLaunch(page);
    await openIsland(page, 'mixed-5-free');
    await page.getByTestId('stage-mixed5Free-1').click();

    await page.getByLabel('bubble-6').click();
    await page.getByTestId('operator-÷').click();
    await page.getByLabel('divide-3').click();
    await page.getByTestId('operator-×').click();
    await page.getByLabel('multiply-4').click();
    await page.getByTestId('operator-×').click();

    await expect(page.getByTestId('expression-display-text')).toContainText('6 ÷ 3 × 4 ×');
    await expect(page.locator('[data-testid^="bead-multiplicand-8-"]')).toBeVisible();
    await page.waitForTimeout(1800);
    await expect(page.locator('[data-testid^="bead-multiplicand-8-"]')).toBeVisible();
  });

  test('large value bubbles release place-value beads and subtraction resolves same-place cancellation', async ({ page }) => {
    await page.goto('/');

    await clearLaunch(page);
    await openIslandFromWorld(page, '-');
    await page.getByTestId('stage-subtraction-3').click();

    await page.getByLabel('bubble-12').click();
    await expect(page.locator('[data-testid^="bead-normal-1-"]')).toHaveCount(3);

    await page.getByTestId('operator--').click();
    await page.getByLabel('bubble-5').click();
    await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 7000 });
  });

  test('stage-select and game back buttons keep the same position and size', async ({ page }) => {
    await page.goto('/');

    await clearLaunch(page);
    await openIslandFromWorld(page, '+');
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

  test('launch-clear and game-clear next buttons keep the same position and size', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('bubble-5').click();
    await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
    const launchNextBox = await page.getByLabel('next stage').boundingBox();
    expect(launchNextBox).not.toBeNull();

    await page.getByLabel('next stage').click();
    await expect(page.getByTestId('world-select')).toBeVisible();
    await openIslandFromWorld(page, '+');
    await page.getByTestId('stage-addition-10-twos').click();
    await clearAdditionTwos(page);

    const gameNextBox = await page.getByLabel('next stage').boundingBox();
    expect(gameNextBox).not.toBeNull();
    expect(Math.abs((gameNextBox?.x ?? 0) - (launchNextBox?.x ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((gameNextBox?.y ?? 0) - (launchNextBox?.y ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((gameNextBox?.width ?? 0) - (launchNextBox?.width ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((gameNextBox?.height ?? 0) - (launchNextBox?.height ?? 0))).toBeLessThanOrEqual(1);
  });

  test('retry icon uses the same image icon pipeline as back and next', async ({ page }) => {
    await page.goto('/');

    await clearLaunch(page);
    await openIslandFromWorld(page, '+');
    await page.getByTestId('stage-addition-10-twos').click();

    await expect(page.getByTestId('nav-icon-back')).toBeVisible();
    await expect(page.getByTestId('nav-icon-retry')).toBeVisible();
    await expect(page.getByTestId('nav-icon-retry').locator('img')).toHaveCount(1);
  });

  test('goal beads align close to the target number baseline in the header', async ({ page }) => {
    await page.goto('/');

    await clearLaunch(page);
    await openIslandFromWorld(page, '+');
    await page.getByTestId('stage-addition-10-twos').click();
    await expectHeaderGoalOrderAndVerticalPosition(page);

    await page.getByLabel('Back', { exact: true }).click();
    await page.getByLabel('Back', { exact: true }).click();
    await openIslandFromWorld(page, 'mixed-3');
    await page.getByTestId('stage-mixed3-2').click();
    await expectHeaderGoalOrderAndVerticalPosition(page);
  });
});

async function clearLaunch(page: Page) {
  await page.getByLabel('bubble-5').click();
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('world-select')).toBeVisible();
}

async function openIsland(page: Page, label: string) {
  await expect(page.getByTestId('world-select')).toBeVisible();
  await openIslandFromWorld(page, label);
}

async function openIslandFromWorld(page: Page, label: string) {
  await page.getByLabel(label, { exact: true }).click();
}

async function clearAdditionTwos(page: Page) {
  for (let index = 0; index < 5; index += 1) {
    await page.getByLabel('bubble-2').first().click();
  }
  await expect(page.getByTestId('current-total-value')).toHaveText('10');
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
}

async function expectHeaderGoalOrderAndVerticalPosition(page: Page) {
  const targetBox = await page.getByTestId('stage-goal-target').boundingBox();
  const equalsBox = await page.getByTestId('stage-goal-equals').boundingBox();
  const goalPartsBox = await page.getByTestId('stage-goal-parts').boundingBox();
  const stageNumberBox = await page.getByTestId('stage-goal-number').boundingBox();
  expect(targetBox).not.toBeNull();
  expect(equalsBox).not.toBeNull();
  expect(goalPartsBox).not.toBeNull();
  expect(stageNumberBox).not.toBeNull();

  expect((goalPartsBox?.x ?? 0) + (goalPartsBox?.width ?? 0)).toBeLessThanOrEqual(equalsBox?.x ?? 0);
  expect((equalsBox?.x ?? 0) + (equalsBox?.width ?? 0)).toBeLessThanOrEqual(targetBox?.x ?? 0);
  expect((targetBox?.x ?? 0) + (targetBox?.width ?? 0)).toBeLessThanOrEqual(stageNumberBox?.x ?? 0);

  const goalBottom = (goalPartsBox?.y ?? 0) + (goalPartsBox?.height ?? 0);
  const targetBottom = (targetBox?.y ?? 0) + (targetBox?.height ?? 0);
  expect(goalBottom).toBeLessThanOrEqual(targetBottom);
  expect(targetBottom - goalBottom).toBeLessThanOrEqual(6);
}
