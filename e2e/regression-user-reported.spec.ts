import { expect, Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('user-reported regressions', () => {
  test('going back from an uncleared next stage does not add a clear mark', async ({ page }) => {
    await page.goto('/game');

    await clearLaunch(page);
    await openIsland(page, '+');
    await page.getByTestId('stage-addition-10-twos').click();
    await clearAdditionTwos(page);
    await page.getByLabel('next stage').click();

    await expect(page.getByTestId('operator-+')).toBeVisible();
    await page.getByLabel('Back', { exact: true }).click();

    await expect(page.getByTestId('stage-addition-10-twos').getByTestId('stage-done-starfish')).toBeVisible();
    await expect(page.getByTestId('stage-addition-10-five-five').getByTestId('stage-done-starfish')).toHaveCount(0);
  });

  test('stage unlock progress is counted per world, not globally', async ({ page }) => {
    await page.goto('/game');

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
    await page.goto('/game');

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
    await page.goto('/game');

    await clearLaunch(page);
    await openIsland(page, 'mixed-5-free');
    await page.getByTestId('stage-mixed5Free-1').click();

    await page.getByLabel('bubble-2').click();
    await page.getByTestId('operator-×').click();

    await expect(page.getByTestId('expression-display-text')).toContainText('2 ×');
    await expect(page.getByLabel('multiply-3')).toBeVisible();
    await page.waitForTimeout(1800);
    await expect(page.getByLabel('multiply-3')).toBeVisible();
  });

  test('large value bubbles release place-value beads and subtraction resolves same-place cancellation', async ({ page }) => {
    await page.goto('/game');

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
    await page.goto('/game');

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
    await page.goto('/game');

    await page.getByLabel('bubble-5').click();
    await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
    const launchNextBox = await page.getByLabel('next stage').boundingBox();
    expect(launchNextBox).not.toBeNull();

    await page.getByLabel('next stage').click();
    await expect(page.getByTestId('mode-select')).toBeVisible();
    await page.getByLabel('marumaru mode', { exact: true }).click();
    await expect(page.getByTestId('world-select')).toBeVisible();
    await openIslandFromWorld(page, '+');
    await page.getByTestId('stage-addition-10-twos').click();
    await clearAdditionTwos(page);

    const gameNextBox = await page.getByLabel('next stage').boundingBox();
    expect(gameNextBox).not.toBeNull();
    expect(Math.abs((gameNextBox?.x ?? 0) - (launchNextBox?.x ?? 0))).toBeLessThanOrEqual(1);
    expect(Math.abs((gameNextBox?.y ?? 0) - (launchNextBox?.y ?? 0))).toBeLessThanOrEqual(12);
  expect(Math.abs((gameNextBox?.width ?? 0) - (launchNextBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((gameNextBox?.height ?? 0) - (launchNextBox?.height ?? 0))).toBeLessThanOrEqual(1);
});

  test('launch and game operator buttons keep the same position and size', async ({ page }) => {
    await page.goto('/game');

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
    await openIslandFromWorld(page, '+');
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

  test('launch and game expression boxes keep the same position and size', async ({ page }) => {
    await page.goto('/game');

    const launchExpressionBox = await page.getByTestId('expression-display').boundingBox();
    expect(launchExpressionBox).not.toBeNull();

    await clearLaunch(page);
    await expect(page.getByTestId('world-select')).toBeVisible();
    await openIslandFromWorld(page, '+');
    await expect(page.getByTestId('stage-addition-10-twos')).toBeVisible();
    await page.getByTestId('stage-addition-10-twos').click();
    await expect(page.getByTestId('expression-display')).toBeVisible();

    const gameExpressionBox = await page.getByTestId('expression-display').boundingBox();
    expect(gameExpressionBox).not.toBeNull();

    assertBoxMatch(launchExpressionBox, gameExpressionBox);
  });

  test('retry icon uses the same image icon pipeline as back and next', async ({ page }) => {
    await page.goto('/game');

    await clearLaunch(page);
    await openIslandFromWorld(page, '+');
    await page.getByTestId('stage-addition-10-twos').click();

    await expect(page.getByTestId('nav-icon-back')).toBeVisible();
    await expect(page.getByTestId('nav-icon-retry')).toBeVisible();
    await expect(page.getByTestId('nav-icon-retry')).toContainText('↻');
  });

  test('goal beads align close to the target number baseline in the header', async ({ page }) => {
    await page.goto('/game');

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
  await expect(page.getByTestId('mode-select')).toBeVisible();
  await page.getByLabel('marumaru mode', { exact: true }).click();
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

async function expectHeaderGoalOrderAndVerticalPosition(page: Page) {
  const targetBox = await page.getByTestId('stage-goal-target').boundingBox();
  const equalsBox = await page.getByTestId('stage-goal-equals').boundingBox();
  const goalPartsBox = await page.getByTestId('stage-goal-parts').boundingBox();
  const goalBeadBox = await page.getByTestId('stage-goal-bead').first().boundingBox();
  const stageNumberBox = await page.getByTestId('stage-goal-number').boundingBox();
  expect(targetBox).not.toBeNull();
  expect(equalsBox).not.toBeNull();
  expect(goalPartsBox).not.toBeNull();
  expect(goalBeadBox).not.toBeNull();
  expect(stageNumberBox).not.toBeNull();

  expect((stageNumberBox?.x ?? 0) + (stageNumberBox?.width ?? 0)).toBeLessThanOrEqual(goalPartsBox?.x ?? 0);
  expect((goalPartsBox?.x ?? 0) + (goalPartsBox?.width ?? 0)).toBeLessThanOrEqual(equalsBox?.x ?? 0);
  expect((equalsBox?.x ?? 0) + (equalsBox?.width ?? 0)).toBeLessThanOrEqual(targetBox?.x ?? 0);

  const goalBottom = (goalBeadBox?.y ?? 0) + (goalBeadBox?.height ?? 0);
  const targetBottom = (targetBox?.y ?? 0) + (targetBox?.height ?? 0);
  expect(Math.abs(targetBottom - goalBottom)).toBeLessThanOrEqual(4);

  const titleBox = await page.getByTestId('stage-goal-title').boundingBox();
  expect(titleBox).not.toBeNull();

  const stageNumberCenter = (stageNumberBox?.y ?? 0) + (stageNumberBox?.height ?? 0) / 2;
  const equalsCenter = (equalsBox?.y ?? 0) + (equalsBox?.height ?? 0) / 2;
  const visualCenter = ((goalBeadBox?.y ?? 0) + targetBottom) / 2;
  expect(Math.abs(stageNumberCenter - visualCenter)).toBeLessThanOrEqual(5);
  expect(Math.abs(equalsCenter - visualCenter)).toBeLessThanOrEqual(4);
}
