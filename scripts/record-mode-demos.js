const { chromium } = require('@playwright/test');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081';
const OUTPUT_DIR = path.resolve(__dirname, '../assets/landing');
const FFMPEG = path.resolve(process.env.HOME, 'Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac');
const VIEWPORT = { width: 720, height: 720 };

async function main() {
  const browser = await chromium.launch({ channel: 'chrome' });
  if (process.argv.includes('--long-form-poster')) {
    await captureLongFormPoster(browser);
    await browser.close();
    return;
  }

  await recordMarumaruMode(browser);
  await recordDentakuMode(browser);
  await browser.close();
}

async function newRecordingPage(browser, outputName) {
  const rawName = outputName.replace(/\.webm$/, '.raw.webm');
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: OUTPUT_DIR,
      size: VIEWPORT,
    },
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/game`, { waitUntil: 'networkidle' });
  await hideDevChrome(page);
  return {
    context,
    page,
    outputPath: path.join(OUTPUT_DIR, outputName),
    rawPath: path.join(OUTPUT_DIR, rawName),
  };
}

async function saveRecording(context, page, rawPath, outputPath, trim) {
  const video = page.video();
  await page.close();
  await context.close();
  if (!video) {
    throw new Error('No video was recorded');
  }
  await video.saveAs(rawPath);
  await video.delete();
  trimRecording(rawPath, outputPath, trim);
  fs.unlinkSync(rawPath);
  console.log(`saved ${outputPath}`);
}

function trimRecording(inputPath, outputPath, { start, duration }) {
  const result = spawnSync(FFMPEG, [
    '-y',
    '-ss',
    String(start),
    '-i',
    inputPath,
    '-t',
    String(duration),
    '-an',
    '-vf',
    'crop=700:700:10:10,scale=720:720',
    '-c:v',
    'libvpx',
    '-b:v',
    '900k',
    outputPath,
  ], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(`ffmpeg trim failed:\n${result.stderr}`);
  }
}

async function hideDevChrome(page) {
  await page.addStyleTag({
    content: `
      #webpack-dev-server-client-overlay,
      [data-testid="expo-dev-menu"],
      [aria-label*="developer" i],
      [aria-label*="dev" i],
      div[style*="2147483647"] {
        display: none !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
    `,
  });
}

async function clearLaunch(page) {
  await page.getByLabel('bubble-5').click();
  await page.getByLabel('next stage').waitFor({ state: 'visible', timeout: 6000 });
  await page.getByLabel('next stage').click();
  await page.getByTestId('mode-select').waitFor({ state: 'visible', timeout: 6000 });
}

async function recordMarumaruMode(browser) {
  const { context, page, rawPath, outputPath } = await newRecordingPage(browser, 'mode-marumaru.webm');
  await clearLaunch(page);
  await page.getByLabel('marumaru mode').click();
  await page.getByLabel('mixed-5-free', { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await page.getByLabel('mixed-5-free', { exact: true }).click();
  await page.getByTestId('stage-mixed5Free-1').click();
  await page.getByTestId('operator-+').waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(700);

  await clickBubble(page, '6');
  await page.waitForTimeout(900);
  await page.getByTestId('operator-÷').click();
  await page.waitForTimeout(700);
  await clickByLabels(page, ['divide-3', 'bubble-3']);
  await page.waitForTimeout(1800);
  await page.getByTestId('operator-×').click();
  await page.waitForTimeout(700);
  await clickByLabels(page, ['multiply-4', 'bubble-4']);
  await page.waitForTimeout(2200);
  await page.getByTestId('operator-+').click();
  await page.waitForTimeout(700);
  await clickBubble(page, '5');
  await page.waitForTimeout(1800);
  await page.getByTestId('operator--').click();
  await page.waitForTimeout(700);
  await clickBubble(page, '2');
  await page.waitForTimeout(1800);

  await saveRecording(context, page, rawPath, outputPath, { start: 5.2, duration: 16 });
}

async function recordDentakuMode(browser) {
  const { context, page, rawPath, outputPath } = await newRecordingPage(browser, 'mode-dentaku.webm');
  await clearLaunch(page);
  await page.getByLabel('dentaku mode').click();
  await page.getByLabel('9×9', { exact: true }).click();
  await page.getByTestId('kuku-stage-dentaku-kuku-dan-3').click();
  await page.getByTestId('kuku-question-title').waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(700);

  await answer(page, '3');
  await page.waitForTimeout(2800);
  await answer(page, '6');
  await page.waitForTimeout(2800);
  await answer(page, '9');
  await page.waitForTimeout(2800);
  await answer(page, '12');
  await page.waitForTimeout(2800);

  await saveRecording(context, page, rawPath, outputPath, { start: 4.8, duration: 24 });
}

async function captureLongFormPoster(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/game`, { waitUntil: 'networkidle' });
  await hideDevChrome(page);
  await clearLaunch(page);
  await page.getByLabel('long form mode', { exact: true }).click();
  await page.getByLabel('+', { exact: true }).click();
  await page.getByTestId('kuku-stage-long-form-addition-4').click();
  await page.getByTestId('long-form-panel').waitFor({ state: 'visible', timeout: 6000 });

  const prompt = await page.getByTestId('long-form-question-prompt').innerText();
  const match = prompt.match(/(\d{2}) \+ (\d{1,2}) = \?/);
  if (!match) {
    throw new Error(`Unexpected long-form prompt: ${prompt}`);
  }

  const leftOnes = Number(match[1]) % 10;
  const rightOnes = Number(match[2]) % 10;
  await answer(page, String(leftOnes + rightOnes));
  await page.waitForTimeout(900);

  const outputPath = path.join(OUTPUT_DIR, 'mode-long-form-poster.png');
  await page.screenshot({ path: outputPath });
  await context.close();
  console.log(`saved ${outputPath}`);
}

async function clickBubble(page, count) {
  const bubble = page.getByLabel(`bubble-${count}`).first();
  await bubble.waitFor({ state: 'visible', timeout: 6000 });
  await bubble.click();
}

async function clickByLabels(page, labels) {
  for (const label of labels) {
    const candidate = page.getByLabel(label).first();
    if (await candidate.isVisible().catch(() => false)) {
      await candidate.click();
      return;
    }
  }

  throw new Error(`No visible element for labels: ${labels.join(', ')}`);
}

async function answer(page, value) {
  await page.waitForTimeout(1800);
  for (const digit of value) {
    await page.getByTestId(`kuku-key-${digit}`).click();
    await page.waitForTimeout(650);
  }
  await page.waitForTimeout(950);
  await page.getByTestId('kuku-key-submit').click();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
