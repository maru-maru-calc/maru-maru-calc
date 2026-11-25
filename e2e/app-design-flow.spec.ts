import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

declare global {
  interface Window {
    __mediaPlayCalls: number;
    __mediaPauseCalls: number;
    __testAudioElements: HTMLAudioElement[];
    __testAudioSeekLog: number[];
  }
}

// This file runs in Japanese, so controls are found by their Japanese screen reader names
// (src/i18n/a11y-label.ts). The other spec files run in the default locale and use the English names.
test.use({ locale: 'ja-JP', viewport: { width: 390, height: 844 } });

test('landing page shows the puzzle game and leads to it', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('landing-puzzle-section').scrollIntoViewIfNeeded();

  await expect(page.getByTestId('mode-video-puzzle-image')).toBeVisible();
  // The learning app's own poster is one of its own stages (the islands that mixed the operators are gone).
  await expect(page.getByTestId('mode-video-marumaru-image')).toBeVisible();

  await page.getByTestId('landing-puzzle-button').click();
  await expect(page).toHaveURL(/\/puzzle$/);
  await expect(page.locator('[data-testid^="pending-bubble-"]').first()).toBeVisible();
  await expect(page.getByTestId('stage-goal-number')).toHaveText('#0');
});

test('landing page presents the core copy and opens the app', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('landing-page')).toBeVisible();
  await expect(page.getByText('すうじ').first()).toBeVisible();
  await expect(page.getByText('さわろう').first()).toBeVisible();
  await expect(page.getByText('"まる"がまるまる「まるまるでんたく」')).toBeVisible();
  await page.getByTestId('landing-features-ambient').scrollIntoViewIfNeeded();
  await expect(page.getByText('答えの前に発見を')).toBeVisible();
  await expect(page.getByText('さわって気づく')).toBeVisible();
  await expect(page.getByText('まるをさわって、動かして。数を見た目で感じよう。')).toBeVisible();
  await expect(page.getByText('まちがえてわかる')).toBeVisible();
  await expect(page.getByText('わざとまちがえてみよう。どうなるか見てみよう。')).toBeVisible();
  await expect(page.getByText('音と動きが、次にしたいことを教えてくれるよ。')).toBeVisible();
  await expect(page.getByText('おとなも子どもも、同じ変化をいっしょに見つけよう。')).toBeVisible();
  await expect(page.getByText('４つのきごう')).toBeVisible();
  await expect(page.getByText('ボウルに一緒に落ちた"まる"が10こを超えると、まとまって少し大きい"まる"になるよ。どんな種類の"まる"があるかな？')).toBeVisible();
  await expect(page.getByText('黒い"まる"は、同じ大きさの"まる"とぶつかると一緒に消えちゃうよ。残った"まる"は何個かな？')).toBeVisible();
  await expect(page.getByText('"まる"をまとめた"あわ"が3つになったね。"あわ"が弾けたあとの"まる"は何個になったかな？')).toBeVisible();
  await expect(page.getByText('"まる"を同じ数で分けた"あわ"が、一つだけ残ったね。"まる"は何個になったかな？')).toBeVisible();
  await expect(page.getByText('３つのモード')).toBeVisible();
  await expect(page.getByText('筆算モード')).toBeVisible();
  await expect(page.getByText('順番にとく')).toBeVisible();
  await expect(page.getByText('魚は何種類いるかな？')).toBeVisible();
  await expect(page.getByText('人魚にさわると歌をうたってくれるよ。')).toBeVisible();
  await expect(page.getByTestId('landing-features-ambient')).toBeVisible();
  await expect(page.getByTestId('landing-flow-ambient')).toBeVisible();
  await expect(page.getByTestId('landing-final-ambient')).toBeVisible();
  await expect(page.getByText('© 2026 nozomitaguchi')).toBeVisible();
  await expect(page.getByTestId('landing-app-preview')).toBeVisible();
  await expect(page.getByTestId('landing-gameplay-video')).toBeVisible();

  await page.getByTestId('operation-video-add').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('operation-video-add')).toBeVisible();
  await expect(page.getByTestId('operation-video-subtract')).toBeVisible();
  await expect(page.getByTestId('operation-video-multiply')).toBeVisible();
  await expect(page.getByTestId('operation-video-divide')).toBeVisible();
  await expect(page.getByTestId('mode-video-long-form')).toBeVisible();

  await page.getByTestId('landing-play-button').click();
  await expect(page).toHaveURL(/\/game$/);
  await expect(page.getByLabel('まるまる電卓', { exact: true })).toBeVisible();
});

test('landing page switches copy for non-Japanese browser languages', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'en-US', viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByText('Touch numbers').first()).toBeVisible();
  await expect(page.getByText('A hands-on math playground with little “maru” circles')).toBeVisible();

  await context.close();
});

test('landing page copy can be forced with a query parameter', async ({ page }) => {
  await page.goto('/?lang=en');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByText('Touch numbers').first()).toBeVisible();

  await page.goto('/?lang=ja');

  await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
  await expect(page.getByText('すうじ').first()).toBeVisible();
});

test('landing page switches copy for Chinese, Korean, and German browser languages', async ({ browser }) => {
  const cases = [
    { locale: 'zh-CN', text: '触摸数字' },
    { locale: 'zh-TW', text: '觸摸數字' },
    { locale: 'ko-KR', text: '숫자를 만져 보자' },
    { locale: 'de-DE', text: 'Zahlen anfassen' },
  ];

  for (const testCase of cases) {
    const context = await browser.newContext({ locale: testCase.locale, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.goto('/');

    await expect(page.locator('html')).toHaveAttribute('lang', 'ja');
    await expect(page.getByText(testCase.text).first()).toBeVisible();

    await context.close();
  }
});

test('desktop landing play button opens the framed play page in a new tab', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'ja-JP', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto('/');

  const popupPromise = page.waitForEvent('popup');
  await page.getByTestId('landing-play-button').click();
  const appPage = await popupPromise;
  await expect(appPage).toHaveURL(/\/play$/);
  await appPage.close();
  await context.close();
});

test('desktop play page presents the app inside a phone frame', async ({ browser }) => {
  const context = await browser.newContext({ locale: 'ja-JP', viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  await page.goto('/play');

  await expect(page.getByTestId('play-page')).toBeVisible();
  await expect(page.getByTestId('play-frame')).toBeVisible();
  await expect(page.getByTestId('play-background-fish-clownfish')).toBeVisible();
  await expect(page.getByTestId('play-background-fish-blue-tang')).toBeVisible();
  await expect(page.getByTestId('play-background-fish-puffer')).toBeVisible();
  await expect(page.getByText('© 2026 nozomitaguchi')).toBeVisible();
  await expect(page.frameLocator('[data-testid="play-frame"]').getByLabel('まるまる電卓', { exact: true })).toBeVisible();

  await context.close();
});

test('mobile play page redirects to the app itself', async ({ page }) => {
  await page.goto('/play');

  await expect(page).toHaveURL(/\/game$/);
  await expect(page.getByLabel('まるまる電卓', { exact: true })).toBeVisible();
});

test('web logos link back to the landing page', async ({ browser }) => {
  const mobileContext = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('/game');
  await expect(mobilePage.getByLabel('まるまる電卓', { exact: true })).toBeVisible();
  await expect(mobilePage).toHaveURL(/\/game$/);
  await mobileContext.close();

  const landingContext = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } });
  const landingPage = await landingContext.newPage();
  await landingPage.goto('/');
  await landingPage.getByLabel('まるまる電卓 トップページ').click();
  await expect(landingPage).toHaveURL(/\/$/);
  await landingContext.close();

  const desktopContext = await browser.newContext({ locale: 'ja-JP', viewport: { width: 1280, height: 900 } });
  await desktopContext.addInitScript(() => {
    window.__mediaPauseCalls = 0;
    const originalPause = window.HTMLMediaElement.prototype.pause;
    window.HTMLMediaElement.prototype.pause = function patchedPause() {
      window.__mediaPauseCalls += 1;
      return originalPause.call(this);
    };
  });
  const desktopPage = await desktopContext.newPage();
  await desktopPage.goto('/play');
  const frameHandle = await desktopPage.locator('[data-testid="play-frame"]').elementHandle();
  const appFrame = await frameHandle?.contentFrame();
  if (!appFrame) {
    throw new Error('play iframe was not available');
  }
  await desktopPage.getByLabel('まるまる電卓 トップページ').click();
  await desktopPage.waitForTimeout(25);
  await expect.poll(() => appFrame.evaluate(() => window.__mediaPauseCalls)).toBeGreaterThan(0);
  await expect(desktopPage).toHaveURL(/\/$/);
  await desktopContext.close();
});

test('landing page clicks do not start background music', async ({ page }) => {
  await page.addInitScript(() => {
    window.__mediaPlayCalls = 0;
    const originalPlay = window.HTMLMediaElement.prototype.play;
    window.HTMLMediaElement.prototype.play = function patchedPlay() {
      if (this.tagName !== 'VIDEO') {
        window.__mediaPlayCalls += 1;
      }
      return originalPlay.call(this);
    };
  });

  await page.goto('/');
  await page.getByText('すうじ').first().click();
  await page.getByTestId('landing-app-preview').click();

  await expect.poll(() => page.evaluate(() => window.__mediaPlayCalls)).toBe(0);
});

test('mermaid song toggle keeps the background music position', async ({ page }) => {
  await page.addInitScript(() => {
    window.__testAudioElements = [];
    window.__testAudioSeekLog = [];
    const NativeAudio = window.Audio;
    const mediaTimes = new WeakMap<HTMLMediaElement, number>();

    Object.defineProperty(window.HTMLMediaElement.prototype, 'currentTime', {
      configurable: true,
      get() {
        return mediaTimes.get(this) ?? 0;
      },
      set(value: number) {
        mediaTimes.set(this, value);
        window.__testAudioSeekLog.push(value);
      },
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      get() {
        return 180;
      },
    });
    Object.defineProperty(window.HTMLMediaElement.prototype, 'ended', {
      configurable: true,
      get() {
        return false;
      },
    });
    window.HTMLMediaElement.prototype.play = function patchedPlay() {
      return Promise.resolve();
    };
    window.HTMLMediaElement.prototype.pause = function patchedPause() {};
    window.Audio = function PatchedAudio(src?: string) {
      const audio = new NativeAudio(src);
      window.__testAudioElements.push(audio);
      return audio;
    } as unknown as typeof Audio;
  });

  await page.goto('/game');
  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.evaluate(() => {
    const normalBgm = window.__testAudioElements.find((audio) => audio.src.includes('/bgm.') && !audio.src.includes('bgm-vocal'));
    const vocalBgm = window.__testAudioElements.find((audio) => audio.src.includes('bgm-vocal'));
    if (!normalBgm || !vocalBgm) {
      throw new Error('BGM audio elements were not created');
    }
    normalBgm.currentTime = 42;
    vocalBgm.currentTime = 0;
    window.__testAudioSeekLog = [];
  });

  await page.getByLabel('にんぎょのうたをながす').click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const vocalBgm = window.__testAudioElements.find((audio) => audio.src.includes('bgm-vocal'));
        return vocalBgm?.currentTime ?? 0;
      }),
    )
    .toBeGreaterThan(41);

  // The app re-syncs the new track shortly after a switch. Let that finish first; otherwise it
  // overwrites the position set below and the next switch starts from the wrong place.
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const normalBgm = window.__testAudioElements.find((audio) => audio.src.includes('/bgm.') && !audio.src.includes('bgm-vocal'));
    const vocalBgm = window.__testAudioElements.find((audio) => audio.src.includes('bgm-vocal'));
    if (!normalBgm || !vocalBgm) {
      throw new Error('BGM audio elements were not created');
    }
    normalBgm.currentTime = 0;
    vocalBgm.currentTime = 63;
    window.__testAudioSeekLog = [];
  });

  await page.getByLabel('にんぎょのうたをとめる').click();

  await expect
    .poll(() =>
      page.evaluate(() => {
        const normalBgm = window.__testAudioElements.find((audio) => audio.src.includes('/bgm.') && !audio.src.includes('bgm-vocal'));
        return normalBgm?.currentTime ?? 0;
      }),
    )
    .toBeGreaterThan(62);
});

test('moves through the depth path into the existing game', async ({ page }) => {
  await page.goto('/game');

  await expect(page.getByLabel('まるまる電卓', { exact: true })).toBeVisible();
  await expect(page.getByLabel('あわ 5')).toBeVisible();
  await expect(page.getByLabel('まる 1')).toHaveCount(8);
  await expect(page.getByTestId('current-total-value')).toHaveText('8');
  await expect(page.getByTestId('expression-display-text')).toHaveText('8 +');
  await page.screenshot({ path: 'test-results/app-launch.png' });

  await page.getByLabel('あわ 5').click();
  await expect(page.getByTestId('current-total-value')).toHaveText('13');
  await expect(page.getByLabel('つぎへ')).toBeVisible();
  await expect(page.getByTestId('world-select')).toHaveCount(0);
  await page.getByLabel('つぎへ').click();
  await expect(page.getByTestId('mode-select')).toBeVisible();
  await page.getByLabel('まるまるモード', { exact: true }).click();
  await expect(page.getByTestId('world-select')).toBeVisible();
  await expect(page.locator('[data-testid^="depth-background-bubble-"]')).toHaveCount(6);
  await expect(page.locator('[data-testid^="depth-fish-"]')).toHaveCount(5);
  await expect(page.getByTestId('depth-shade')).toBeVisible();
  // One island for each operator, and nothing else: the islands that mixed them are the puzzle game now.
  await expect(page.getByLabel('たしざん', { exact: true })).toBeVisible();
  await expect(page.getByLabel('ひきざん', { exact: true })).toBeVisible();
  await expect(page.getByLabel('かけざん', { exact: true })).toBeVisible();
  await expect(page.getByLabel('わりざん', { exact: true })).toBeVisible();
  await expect(page.getByLabel(/つのあわ/)).toHaveCount(0);
  await page.screenshot({ path: 'test-results/app-worlds.png' });

  await page.getByLabel('たしざん', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-ones')).toBeVisible();
  await expect(page.locator('[data-testid^="depth-background-bubble-"]')).toHaveCount(6);
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

test('stage routes can scroll to the later problems of an island', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('たしざん', { exact: true }).click();

  await expect(page.getByTestId('stage-addition-10-ones')).toBeVisible();
  await page.getByTestId('stage-addition-120-times').scrollIntoViewIfNeeded();
  await expect(page.getByTestId('stage-addition-120-times')).toBeVisible();
});

test('going back from an uncleared next stage does not mark it complete', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('たしざん', { exact: true }).click();
  await page.getByTestId('stage-addition-10-twos').click();

  for (let index = 0; index < 5; index += 1) {
    await page.getByLabel('あわ 2').first().click();
  }

  await expect(page.getByTestId('current-total-value')).toHaveText('10');
  await expect(page.getByLabel('つぎへ')).toBeVisible({ timeout: 4000 });
  await page.getByLabel('つぎへ').click();
  await expect(page.getByTestId('operator-+')).toBeVisible();

  await page.getByLabel('もどる', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-twos').getByTestId('stage-done-starfish')).toBeVisible();
  await expect(page.getByTestId('stage-addition-10-five-five').getByTestId('stage-done-starfish')).toHaveCount(0);
});

test('back button position is consistent between stage select and game', async ({ page }) => {
  await page.goto('/game');

  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('たしざん', { exact: true }).click();
  await expect(page.getByTestId('stage-addition-10-ones')).toBeVisible();

  const stageBackBox = await page.getByLabel('もどる', { exact: true }).boundingBox();
  expect(stageBackBox).not.toBeNull();

  await page.getByTestId('stage-addition-10-twos').click();
  await expect(page.getByTestId('operator-+')).toBeVisible();

  const gameBackBox = await page.getByLabel('もどる', { exact: true }).boundingBox();
  expect(gameBackBox).not.toBeNull();
  expect(Math.abs((gameBackBox?.x ?? 0) - (stageBackBox?.x ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((gameBackBox?.y ?? 0) - (stageBackBox?.y ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((gameBackBox?.width ?? 0) - (stageBackBox?.width ?? 0))).toBeLessThanOrEqual(1);
  expect(Math.abs((gameBackBox?.height ?? 0) - (stageBackBox?.height ?? 0))).toBeLessThanOrEqual(1);
});

test('launch and game operator buttons are aligned', async ({ page }) => {
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
  await page.getByLabel('たしざん', { exact: true }).click();
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
  await page.goto('/game');

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
  await page.getByLabel('たしざん', { exact: true }).click();
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
  await page.goto('/game');

  const launchExpressionBox = await page.getByTestId('expression-display').boundingBox();
  expect(launchExpressionBox).not.toBeNull();

  await clearLaunch(page);
  await expect(page.getByTestId('world-select')).toBeVisible();
  await page.getByLabel('たしざん', { exact: true }).click();
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
  await page.goto('/game');

  await page.getByLabel('あわ 5').click();
  await expect(page.getByTestId('current-total-value')).toHaveText('13');
  await expect(page.getByTestId('world-select')).toHaveCount(0);
  await expect(page.getByLabel('つぎへ')).toBeVisible();
});

test('pending bubbles show an idle tap hint', async ({ page }) => {
  await page.goto('/game');

  await expect(page.getByLabel('あわ 5')).toBeVisible();
  await expect(page.getByTestId('pending-bubble-hint')).toBeVisible({ timeout: 4000 });
});

test('a decorative bubble pops when the water under it is tapped', async ({ page }) => {
  // Where the bubbles are depends on the time; the clock is wound forward until one is in open water.
  await page.clock.install();
  await page.goto('/game');

  const backgroundBubbles = page.locator('[data-testid^="background-bubble-"]');
  await expect(backgroundBubbles).toHaveCount(6);

  // One that is on the screen, with nothing but water under its middle.
  const findBubbleOverWater = () =>
    page.evaluate(() => {
      for (const bubble of Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="background-bubble-"]'))) {
        const box = bubble.getBoundingClientRect();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        const under = document.elementFromPoint(x, y);
        if (x > 0 && y > 0 && x < window.innerWidth && y < window.innerHeight && under && !under.closest('[role], [aria-label], [tabindex]')) {
          return { testId: bubble.dataset.testid as string, x, y, top: box.y };
        }
      }
      return null;
    });
  for (let step = 0; step < 480 && (await findBubbleOverWater()) === null; step += 1) {
    await page.clock.fastForward(250);
  }
  const bubble = (await findBubbleOverWater())!;
  expect(bubble).not.toBeNull();

  await page.mouse.click(bubble.x, bubble.y);

  // Popped, it starts again from under the screen.
  await expect.poll(() => page.getByTestId(bubble.testId).evaluate((element) => element.getBoundingClientRect().y)).toBeGreaterThan(bubble.top + 100);
  await expect(page.getByLabel('あわ 5')).toBeVisible();
});

test('a decorative bubble never takes a tap itself', async ({ page }) => {
  await page.goto('/game');
  await expect(page.locator('[data-testid^="background-bubble-"]')).toHaveCount(6);

  // Whatever is under a bubble is what a tap there reaches: the bubble is never it.
  const takers = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="background-bubble-"]')).filter((bubble) => {
      const box = bubble.getBoundingClientRect();
      return document.elementsFromPoint(box.x + box.width / 2, box.y + box.height / 2).includes(bubble);
    }).length,
  );
  expect(takers).toBe(0);
});

async function clearLaunch(page: Page) {
  await page.getByLabel('あわ 5').click();
  await expect(page.getByLabel('つぎへ')).toBeVisible({ timeout: 4000 });
  await page.getByLabel('つぎへ').click();
  await expect(page.getByTestId('mode-select')).toBeVisible();
  await page.getByLabel('まるまるモード', { exact: true }).click();
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
