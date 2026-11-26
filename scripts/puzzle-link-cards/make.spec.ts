// Makes the card that a link to each numbered puzzle shows where links are posted:
// public/ogp/puzzle-<number>.jpg, and cards.json beside this file, which says what each picture
// was made from. Run it with `npm run make:puzzle-cards` whenever the puzzles or the drawing
// change (src/tests/game/puzzle-link-card.test.ts fails until it has been), and commit what it
// writes: the site is served as files, so the pictures have to be there before it is built.
import fs from 'node:fs';
import path from 'node:path';

import { test } from '@playwright/test';

import { drawPuzzleLinkCard, getPuzzleLinkCardFile, PUZZLE_LINK_CARD_DRAWING, PUZZLE_LINK_CARD_HEIGHT, PUZZLE_LINK_CARD_WIDTH } from '../../src/components/puzzle/puzzle-link-card';
import { PUZZLE_GAME_STAGES } from '../../src/game/puzzle-game';

// `npm run` starts it in the project's folder.
const projectDir = process.cwd();
const cardsDir = path.join(projectDir, 'public', 'ogp');

test('draw the link card of every puzzle', async ({ page }) => {
  fs.mkdirSync(cardsDir, { recursive: true });
  // Pictures of puzzles there no longer are would be served for ever.
  for (const file of fs.readdirSync(cardsDir)) {
    if (/^puzzle-[0-9]+\.(?:jpg|png)$/.test(file)) {
      fs.unlinkSync(path.join(cardsDir, file));
    }
  }

  await page.setViewportSize({ width: PUZZLE_LINK_CARD_WIDTH, height: PUZZLE_LINK_CARD_HEIGHT });
  const puzzles = [];
  for (const [index, stage] of PUZZLE_GAME_STAGES.entries()) {
    const number = index + 1;
    await page.setContent(`<body style="margin:0;overflow:hidden">${drawPuzzleLinkCard(number, stage)}</body>`);
    // JPEG: a hundred of them as PNG would add 15 MB to the project; like this it is about 6.
    await page.screenshot({ path: path.join(cardsDir, getPuzzleLinkCardFile(number)), type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: PUZZLE_LINK_CARD_WIDTH, height: PUZZLE_LINK_CARD_HEIGHT } });
    puzzles.push({ number, id: stage.id, goal: stage.target, bubbles: stage.bubbleCounts });
  }

  // One puzzle to a line: a change of the puzzles shows as the lines that changed.
  const lines = puzzles.map((puzzle) => `    ${JSON.stringify(puzzle)}`).join(',\n');
  fs.writeFileSync(path.join(projectDir, 'scripts', 'puzzle-link-cards', 'cards.json'), `{\n  "drawing": ${PUZZLE_LINK_CARD_DRAWING},\n  "puzzles": [\n${lines}\n  ]\n}\n`);
});
