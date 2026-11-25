const { chromium } = require('@playwright/test');
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:8081';
const OUTPUT_DIR = path.resolve(__dirname, '../assets/landing');
// By default the ffmpeg that Playwright downloads on a Mac, and the installed Chrome. Elsewhere:
// FFMPEG=/path/to/ffmpeg BROWSER_CHANNEL=none (Playwright's own Chromium).
const FFMPEG = process.env.FFMPEG ?? path.resolve(process.env.HOME, 'Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac');
const BROWSER_CHANNEL = process.env.BROWSER_CHANNEL === 'none' ? undefined : (process.env.BROWSER_CHANNEL ?? 'chrome');
const VIEWPORT = { width: 720, height: 720 };

// What the まるまるモード poster and video show: the last stage of the × island, 4 × 3 × 2 + 8 = 32.
// A stage opens only once the ones before it are cleared, so the recording starts from a save in
// which they are (and in which the first-visit puzzle is already done).
const MARUMARU_DEMO_SAVE = {
  version: 1,
  marumaru: Array.from({ length: 24 }, (_, index) => `multiplication-${index + 1}`),
  dentaku: [],
  longForm: [],
  hasSeenIntro: true,
};
// The puzzle shown on the poster of the puzzle game: five bubbles, each operator once.
const PUZZLE_POSTER_NUMBER = 46;

async function main() {
  const browser = await chromium.launch(BROWSER_CHANNEL ? { channel: BROWSER_CHANNEL } : {});
  if (process.argv.includes('--long-form-poster')) {
    await captureLongFormPoster(browser);
    await browser.close();
    return;
  }
  if (process.argv.includes('--puzzle-poster')) {
    await capturePuzzlePoster(browser);
    await browser.close();
    return;
  }
  if (process.argv.includes('--marumaru')) {
    await recordMarumaruMode(browser);
    await browser.close();
    return;
  }

  await recordMarumaruMode(browser);
  await recordDentakuMode(browser);
  await browser.close();
}

async function newRecordingPage(browser, outputName, savedProgress) {
  const rawName = outputName.replace(/\.webm$/, '.raw.webm');
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: {
      dir: OUTPUT_DIR,
      size: VIEWPORT,
    },
  });
  if (savedProgress) {
    await context.addInitScript((saved) => localStorage.setItem('marumaru-calc:progress', saved), JSON.stringify(savedProgress));
  }
  const page = await context.newPage();
  // The video starts with the page; this is what the trimming is measured from.
  const startedAt = Date.now();
  await page.goto(`${BASE_URL}/game`, { waitUntil: 'networkidle' });
  await hideDevChrome(page);
  return {
    context,
    page,
    startedAt,
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
  const { context, page, startedAt, rawPath, outputPath } = await newRecordingPage(browser, 'mode-marumaru.webm', MARUMARU_DEMO_SAVE);
  await page.getByTestId('mode-select').waitFor({ state: 'visible', timeout: 6000 });
  await page.getByLabel('marumaru mode').click();
  await page.getByLabel('×', { exact: true }).click();
  await page.getByTestId('stage-multiplication-25').scrollIntoViewIfNeeded();
  await page.getByTestId('stage-multiplication-25').click();
  await page.getByLabel('bubble-8').first().waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(1200);

  // The poster is the stage as it opens.
  const posterPath = path.join(OUTPUT_DIR, 'mode-marumaru-poster.png');
  await page.screenshot({ path: posterPath });
  console.log(`saved ${posterPath}`);
  const playFrom = (Date.now() - startedAt) / 1000;

  await clickBubble(page, '4');
  await page.waitForTimeout(900);
  await page.getByTestId('operator-×').click();
  await page.waitForTimeout(700);
  await clickByLabels(page, ['multiply-3', 'bubble-3']);
  await page.waitForTimeout(2400);
  await page.getByTestId('operator-×').click();
  await page.waitForTimeout(700);
  await clickByLabels(page, ['multiply-2', 'bubble-2']);
  await page.waitForTimeout(3000);
  await page.getByTestId('operator-+').click();
  await page.waitForTimeout(700);
  await clickBubble(page, '8');
  await page.getByLabel('next stage').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(2500);

  const duration = (Date.now() - startedAt) / 1000 - playFrom + 0.3;
  await saveRecording(context, page, rawPath, outputPath, { start: Math.max(0, playFrom - 0.3), duration });
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

// The poster of the puzzle game: one of its puzzles as it opens. The way there is the game's own:
// solve the start screen's small puzzle, go on to the puzzles, back to the list, pick the number.
async function capturePuzzlePoster(browser) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/puzzle`, { waitUntil: 'networkidle' });
  await hideDevChrome(page);
  await page.locator('[data-testid^="pending-bubble-"]').first().waitFor({ state: 'visible', timeout: 10000 });

  const bubbles = await page.locator('[data-testid^="pending-bubble-"]').evaluateAll((elements) => elements.map((element) => Number(element.getAttribute('data-testid').split('-')[2])));
  const goal = Number(await page.getByTestId('stage-goal-target').innerText());
  // Which operators the start puzzle allows only shows once a bubble is in, so: put one in, look,
  // and take it back if no way starts with it.
  let way;
  for (const first of bubbles) {
    await clickBubble(page, String(first));
    await page.waitForTimeout(400);
    const allowed = [];
    for (const operator of ['+', '-', '×', '÷']) {
      if (await page.getByTestId(`operator-${operator}`).isEnabled()) {
        allowed.push(operator);
      }
    }
    const rest = [...bubbles];
    rest.splice(rest.indexOf(first), 1);
    way = findWay(first, rest, goal, allowed);
    if (way) {
      break;
    }
    await page.getByLabel('undo').click();
    await page.waitForTimeout(600);
  }
  if (!way) {
    throw new Error(`No way from ${bubbles.join(', ')} to ${goal}`);
  }
  for (let index = 1; index < way.length; index += 2) {
    await page.waitForTimeout(400);
    await page.getByTestId(`operator-${way[index]}`).click();
    await page.waitForTimeout(400);
    await clickBubble(page, String(way[index + 1]));
  }
  await page.getByTestId('choose-puzzles').click({ timeout: 20000 });
  await page.getByTestId('stage-goal-number').waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(500);
  await page.getByLabel('Back', { exact: true }).click();
  await page.getByTestId(`pick-puzzle-${PUZZLE_POSTER_NUMBER}`).scrollIntoViewIfNeeded();
  await page.getByTestId(`pick-puzzle-${PUZZLE_POSTER_NUMBER}`).click();
  await page.locator('[data-testid^="pending-bubble-"]').first().waitFor({ state: 'visible', timeout: 6000 });
  await page.waitForTimeout(1500);

  const outputPath = path.join(OUTPUT_DIR, 'mode-puzzle-poster.png');
  await page.screenshot({ path: outputPath });
  await context.close();
  console.log(`saved ${outputPath}`);
}

/** A way from `first` through every other bubble to the goal, worked from left to right with the allowed operators. */
function findWay(first, others, goal, operators) {
  const step = (total, operator, value) => {
    if (operator === '+') return total + value;
    if (operator === '-') return total - value;
    if (total <= 0) return Number.NaN;
    if (operator === '×') return total * value;
    return total % value === 0 ? total / value : Number.NaN;
  };
  const search = (total, rest, way) => {
    if (rest.length === 0) {
      return total === goal ? way : undefined;
    }
    for (let index = 0; index < rest.length; index += 1) {
      for (const operator of operators) {
        const next = step(total, operator, rest[index]);
        if (Number.isFinite(next)) {
          const found = search(next, [...rest.slice(0, index), ...rest.slice(index + 1)], [...way, operator, rest[index]]);
          if (found) {
            return found;
          }
        }
      }
    }
    return undefined;
  };
  return search(first, others, [first]);
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
