import { expect, Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

test('pending bubbles still burst after operator selection when the tap drifts slightly', async ({ page }) => {
  await page.goto('/game');
  await openCurrentLaunch(page);
  await page.getByLabel('mixed-5-free', { exact: true }).scrollIntoViewIfNeeded();
  await page.getByLabel('mixed-5-free', { exact: true }).click();
  await page.getByTestId('stage-mixed5Free-1').click();

  await page.getByLabel('bubble-2').click();
  await page.getByTestId('operator-+').click();
  await tapWithSlightDrift(page, page.getByLabel('bubble-3'));

  await expect(page.getByTestId('expression-display-text')).toContainText('2 + 3 = 5');
});

async function openCurrentLaunch(page: Page) {
  await page.getByLabel('bubble-5').click();
  await expect(page.getByLabel('next stage')).toBeVisible();
  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('mode-select')).toBeVisible();
  await page.getByLabel('marumaru mode', { exact: true }).click();
  await expect(page.getByTestId('world-select')).toBeVisible();
}

async function tapWithSlightDrift(page: Page, locator: ReturnType<Page['locator']>) {
  const box = await locator.first().boundingBox();
  expect(box).not.toBeNull();
  const centerX = (box?.x ?? 0) + (box?.width ?? 0) / 2;
  const centerY = (box?.y ?? 0) + (box?.height ?? 0) / 2;
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(centerX + 10, centerY + 5);
  await page.mouse.up();
}
