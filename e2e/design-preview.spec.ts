import { expect, test } from '@playwright/test';
import path from 'node:path';

test('launch preview shows one pending bubble and eight field maru on the basin curve', async ({ page }) => {
  const previewPath = path.resolve(process.cwd(), 'docs/design-preview.html');

  await page.goto(`file://${previewPath}`);

  const launchPhone = page.getByLabel('Launch screen mockup');
  await expect(launchPhone).toBeVisible();

  await expect(launchPhone.locator('.pending-bubble')).toHaveCount(1);
  await expect(launchPhone.locator('.launch-expression')).toHaveText('8 +');
  await expect(launchPhone.locator('.launch-play-button')).toBeVisible();
  await expect(launchPhone.locator('.game-back-button')).toHaveCount(0);
  await expect(launchPhone.locator('.launch-step-dots')).toHaveCount(0);
  await expect(launchPhone.locator('.launch-field-maru')).toHaveCount(8);

  const geometry = await launchPhone.evaluate((phone) => {
    const phoneRect = phone.getBoundingClientRect();
    const field = phone.querySelector('.current-field');
    const expression = phone.querySelector('.launch-expression');
    const playButton = phone.querySelector('.launch-play-button');
    if (!field) {
      throw new Error('missing launch current-field');
    }
    if (!expression || !playButton) {
      throw new Error('missing launch bottom controls');
    }
    const fieldRect = field.getBoundingClientRect();
    const expressionRect = expression.getBoundingClientRect();
    const playButtonRect = playButton.getBoundingClientRect();
    const maruRects = Array.from(phone.querySelectorAll('.launch-field-maru')).map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        bottom: rect.bottom - fieldRect.top,
        centerX: rect.left + rect.width / 2 - fieldRect.left,
        centerY: rect.top + rect.height / 2 - fieldRect.top,
        height: rect.height,
        left: rect.left - fieldRect.left,
        right: rect.right - fieldRect.left,
        top: rect.top - fieldRect.top,
        width: rect.width,
      };
    });

    return {
      expressionTop: expressionRect.top - fieldRect.top,
      fieldHeight: fieldRect.height,
      fieldWidth: fieldRect.width,
      maruRects,
      playButtonTop: playButtonRect.top - fieldRect.top,
      phoneHeight: phoneRect.height,
      phoneWidth: phoneRect.width,
    };
  });

  expect(geometry.maruRects).toHaveLength(8);

  for (const rect of geometry.maruRects) {
    expect(rect.width).toBeGreaterThan(24);
    expect(rect.height).toBeGreaterThan(24);
    expect(rect.left).toBeGreaterThanOrEqual(0);
    expect(rect.right).toBeLessThanOrEqual(geometry.fieldWidth);
    expect(rect.top).toBeGreaterThanOrEqual(0);
    expect(rect.bottom).toBeLessThanOrEqual(geometry.fieldHeight);
    expect(rect.bottom).toBeLessThan(geometry.expressionTop);
    expect(rect.bottom).toBeLessThan(geometry.playButtonTop);
  }

  const sortedByX = [...geometry.maruRects].sort((a, b) => a.centerX - b.centerX);
  const centerYs = sortedByX.map((rect) => rect.centerY);
  const lowestY = Math.max(...centerYs);

  expect(centerYs[0]).toBeLessThan(lowestY);
  expect(centerYs[1]).toBeLessThanOrEqual(lowestY);
  expect(centerYs[2]).toBeGreaterThanOrEqual(centerYs[1]);
  expect(centerYs[3]).toBeGreaterThanOrEqual(centerYs[2] - 8);
  expect(centerYs[4]).toBeGreaterThanOrEqual(centerYs[3] - 8);
  expect(centerYs[5]).toBeLessThan(centerYs[4]);
  expect(centerYs[6]).toBeLessThan(centerYs[5]);
  expect(centerYs[7]).toBeLessThan(centerYs[6]);

  await launchPhone.screenshot({ path: 'test-results/launch-preview.png' });
});

test('game preview matches launch layout with only the title changed', async ({ page }) => {
  const previewPath = path.resolve(process.cwd(), 'docs/design-preview.html');

  await page.goto(`file://${previewPath}`);

  const gamePhone = page.getByLabel('Game current direction mockup');
  await expect(gamePhone).toBeVisible();
  await expect(gamePhone.locator('.launch-title')).toHaveText('●● = 10');
  await expect(gamePhone.locator('.launch-title')).toHaveCSS('white-space', 'nowrap');
  await expect(gamePhone.locator('.game-stage')).toHaveCount(0);
  await expect(gamePhone.locator('.game-back-button')).toBeVisible();
  await expect(gamePhone.locator('.pending-bubble')).toHaveCount(1);
  await expect(gamePhone.locator('.launch-expression')).toHaveText('8 +');
  await expect(gamePhone.locator('.launch-play-button')).toBeVisible();
  await expect(gamePhone.locator('.launch-field-maru')).toHaveCount(8);
  await expect(gamePhone.locator('.launch-step-dots')).toHaveCount(0);
  await expect(gamePhone.locator('.launch-play-button')).toHaveCSS('border-radius', '18px');
  const titleAlignment = await page.evaluate(() => {
    const launchPhone = document.querySelector('[aria-label="Launch screen mockup"]');
    const gamePhone = document.querySelector('[aria-label="Game current direction mockup"]');
    const launchTitle = launchPhone?.querySelector('.launch-title');
    const gameTitle = gamePhone?.querySelector('.launch-title');
    if (!launchPhone || !gamePhone || !launchTitle || !gameTitle) {
      throw new Error('missing launch or game title');
    }
    const launchPhoneRect = launchPhone.getBoundingClientRect();
    const gamePhoneRect = gamePhone.getBoundingClientRect();
    const launchRect = launchTitle.getBoundingClientRect();
    const gameRect = gameTitle.getBoundingClientRect();
    const launchRelative = {
      center: launchRect.left + launchRect.width / 2 - launchPhoneRect.left,
      left: launchRect.left - launchPhoneRect.left,
      right: launchRect.right - launchPhoneRect.left,
    };
    const gameRelative = {
      center: gameRect.left + gameRect.width / 2 - gamePhoneRect.left,
      left: gameRect.left - gamePhoneRect.left,
      right: gameRect.right - gamePhoneRect.left,
    };
    return {
      centerDelta: Math.abs(launchRelative.center - gameRelative.center),
      leftDelta: Math.abs(launchRelative.left - gameRelative.left),
      rightDelta: Math.abs(launchRelative.right - gameRelative.right),
    };
  });
  expect(titleAlignment.centerDelta).toBeLessThan(1);
  expect(titleAlignment.leftDelta).toBeLessThan(1);
  expect(titleAlignment.rightDelta).toBeLessThan(1);
  const backOverlap = await gamePhone.evaluate((phone) => {
    const back = phone.querySelector('.game-back-button');
    const title = phone.querySelector('.launch-title');
    const titleText = title?.firstChild;
    if (!back || !title || !titleText) {
      throw new Error('missing game back button or title');
    }
    const backRect = back.getBoundingClientRect();
    const titleRange = document.createRange();
    titleRange.selectNodeContents(titleText);
    const titleRect = titleRange.getBoundingClientRect();
    return !(
      backRect.right <= titleRect.left ||
      backRect.left >= titleRect.right ||
      backRect.bottom <= titleRect.top ||
      backRect.top >= titleRect.bottom
    );
  });
  expect(backOverlap).toBe(false);
  await gamePhone.screenshot({ path: 'test-results/game-preview.png' });
});

test('world and stage previews use nonverbal depth paths', async ({ page }) => {
  const previewPath = path.resolve(process.cwd(), 'docs/design-preview.html');

  await page.goto(`file://${previewPath}`);

  const worldPhone = page.getByLabel('World selection depth mockup');
  const stagePhone = page.getByLabel('Stage selection depth mockup');

  await expect(worldPhone).toBeVisible();
  await expect(stagePhone).toBeVisible();

  await expect(worldPhone.locator('.world-node')).toHaveCount(4);
  await expect(stagePhone.locator('.stage-node')).toHaveCount(5);
  await expect(worldPhone.locator('.depth-meter')).toBeVisible();
  await expect(stagePhone.locator('.depth-meter')).toBeVisible();
  await expect(worldPhone.locator('.depth-badge')).toHaveCount(0);
  await expect(stagePhone.locator('.depth-badge')).toHaveCount(0);
  await expect(worldPhone.locator('.completion-star')).toHaveCount(1);
  await expect(stagePhone.locator('.completion-star')).toHaveCount(1);
  await expect(stagePhone.locator('.depth-back-button')).toBeVisible();
  await expect(stagePhone.locator('.depth-stage-number')).toHaveCount(0);
  await expect(stagePhone.locator('.stage-number-badge')).toHaveCount(5);
  await expect(stagePhone.locator('.stage-number-badge')).toHaveText([
    '#1',
    '#2',
    '#3',
    '#4',
    '#5',
  ]);
  await expect(stagePhone.locator('.depth-branch')).toHaveCount(4);
  await expect(stagePhone.locator('.stage-node').nth(0)).toContainText('#1');
  await expect(stagePhone.locator('.stage-node').nth(0)).toContainText('10');
  await expect(stagePhone.locator('.stage-node').nth(1)).toContainText('#2');
  await expect(stagePhone.locator('.stage-node').nth(1)).toContainText('10');
  await expect(stagePhone.locator('.stage-node').nth(2)).toContainText('#3');
  await expect(stagePhone.locator('.stage-node').nth(2)).toContainText('20');

  const completedStageStyle = await stagePhone.locator('.stage-node.done').evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
    };
  });
  expect(completedStageStyle.backgroundColor).toBe('rgba(255, 255, 255, 0.36)');
  expect(completedStageStyle.borderColor).toBe('rgba(125, 211, 252, 0.7)');

  const frameTitles = await page.locator('.frame-title').allTextContents();
  expect(frameTitles.slice(0, 4)).toEqual([
    'Launch / start screen',
    'WorldSelect / depth routes',
    'StageSelect / depth path',
    'Game / current direction',
  ]);

  const visibleText = await page.evaluate(() => {
    const world = document.querySelector('[aria-label="World selection depth mockup"]');
    const stage = document.querySelector('[aria-label="Stage selection depth mockup"]');
    return `${world?.textContent ?? ''} ${stage?.textContent ?? ''}`;
  });

  expect(visibleText).not.toMatch(/[ぁ-んァ-ン一-龯]/);
  await worldPhone.screenshot({ path: 'test-results/world-preview.png' });
  await stagePhone.screenshot({ path: 'test-results/stage-preview.png' });
});

test('design board does not show the consultation memo', async ({ page }) => {
  const previewPath = path.resolve(process.cwd(), 'docs/design-preview.html');

  await page.goto(`file://${previewPath}`);

  await expect(page.getByText('相談メモ')).toHaveCount(0);
  await expect(page.getByText('借りるテイスト')).toHaveCount(0);
  await expect(page.getByText('借りないもの')).toHaveCount(0);
});

test('transition patterns cover navigation, locked, clear, unlock, and retry states', async ({ page }) => {
  const previewPath = path.resolve(process.cwd(), 'docs/design-preview.html');

  await page.goto(`file://${previewPath}`);

  const transitionSection = page.getByRole('region', { name: 'Interaction / transition patterns' });
  await expect(transitionSection).toBeVisible();
  await expect(transitionSection.locator('.flow-phone')).toHaveCount(6);

  await expect(page.getByLabel('World node tap transition pattern').locator('.tap-ripple')).toBeVisible();
  await expect(page.getByLabel('Open stage node tap transition pattern').locator('.tap-ripple')).toBeVisible();
  await expect(page.getByLabel('Locked stage feedback pattern').locator('.blocked-ripple')).toBeVisible();

  const clearPattern = page.getByLabel('Game clear transition pattern');
  await expect(clearPattern.locator('.result-star')).toHaveText('★');
  await expect(clearPattern.locator('.result-equation')).toHaveText('8 + 2 = 10');
  await expect(clearPattern.locator('.result-action')).toHaveCount(3);
  await expect(clearPattern.getByLabel('Stage select').locator('.branch-icon i')).toHaveCount(3);

  const unlockPattern = page.getByLabel('Stage branch unlock transition pattern');
  await expect(unlockPattern.locator('.completion-star')).toHaveCount(1);
  await expect(unlockPattern.locator('.unlock-glow')).toHaveCount(2);
  await expect(unlockPattern.locator('.stage-number-badge')).toHaveText(['#1', '#2', '#3']);

  const retryPattern = page.getByLabel('Game retry transition pattern');
  await expect(retryPattern.locator('.failure-mark')).toHaveText('8 ≠ 10');
  await expect(retryPattern.locator('.result-action')).toHaveCount(2);
  await expect(retryPattern.getByLabel('Stage select').locator('.branch-icon i')).toHaveCount(3);

  const inAppText = await transitionSection.locator('.flow-phone').allTextContents();
  expect(inAppText.join(' ')).not.toMatch(/[ぁ-んァ-ン一-龯]/);

  await transitionSection.screenshot({ path: 'test-results/transition-patterns.png' });
});
