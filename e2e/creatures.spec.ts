import { expect, Locator, Page, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 } });

// The sea creatures, the divers and the mermaid are pictures from assets/creatures. A picture that
// failed to load leaves an empty box that nobody notices in the other tests, so it is checked here.

test('the sea creatures and the divers are drawn from their pictures', async ({ page }) => {
  await openModeSelect(page);

  await expectPicture(page.getByTestId('depth-creature-art-shallow-clownfish'), 'clownfish');
  await expectPicture(page.getByTestId('depth-creature-art-shallow-blue-tang'), 'blue-tang');
  await expectPicture(page.getByTestId('depth-creature-art-shallow-puffer'), 'puffer');
  await expectPicture(page.getByTestId('depth-creature-art-shallow-turtle'), 'turtle');
  await expectPicture(page.getByTestId('depth-creature-art-middle-tuna'), 'tuna');
  await expectPicture(page.getByTestId('mode-diver-boy'), 'diver-boy');
  await expectPicture(page.getByTestId('mode-diver-girl'), 'diver-girl');
});

test('the mermaid opens her mouth while she sings', async ({ page }) => {
  await openModeSelect(page);
  await page.getByLabel('marumaru mode', { exact: true }).click();
  await expect(page.getByTestId('world-select')).toBeVisible();

  // Her label says what a press will do, so it tells whether she is singing now.
  const mermaid = page.getByTestId('singing-mermaid');
  await expect(mermaid).toHaveAttribute('aria-label', 'turn on mermaid song');
  await expectPicture(mermaid, 'mermaid');

  await mermaid.click();
  await expect(mermaid).toHaveAttribute('aria-label', 'turn off mermaid song');
  await expectPicture(mermaid, 'mermaid-singing');

  await mermaid.click();
  await expect(mermaid).toHaveAttribute('aria-label', 'turn on mermaid song');
  await expectPicture(mermaid, 'mermaid');
});

test('a creature keeps the shape of its picture', async ({ page }) => {
  await openModeSelect(page);

  // The turtle's picture is 128 x 92. Drawn wider or taller than that it would be squashed.
  const box = await page.getByTestId('depth-creature-art-shallow-turtle').evaluate((frame) => ({
    width: (frame as HTMLElement).offsetWidth,
    height: (frame as HTMLElement).offsetHeight,
  }));
  expect(box.width / box.height).toBeCloseTo(128 / 92, 1);
});

test('a creature swims behind the buttons, and darts away when the water is tapped where it is', async ({ page }) => {
  // Where the creatures are depends on the time of day; the clock is wound forward until one is in open water.
  await page.clock.install();
  await openModeSelect(page);

  // The picture is under the buttons. Its counterpart for screen readers is over them, on the same
  // spot, but lets every press through.
  const places = await page.evaluate(() => {
    const place = (testId: string) => {
      const element = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
      const layer = element.parentElement as HTMLElement;
      return { width: element.offsetWidth, height: element.offsetHeight, layer: Number(getComputedStyle(layer).zIndex), takesPresses: getComputedStyle(element).pointerEvents !== 'none' };
    };
    const scroll = document.querySelector('[data-testid="mode-select-scroll"]') as HTMLElement;
    return { picture: place('depth-creature-art-shallow-clownfish'), named: place('depth-fish-shallow-clownfish'), buttons: Number(getComputedStyle(scroll).zIndex) };
  });
  expect(places.picture.layer).toBeLessThan(places.buttons);
  expect(places.named.layer).toBeGreaterThan(places.buttons);
  expect(places.named.takesPresses).toBe(false);
  expect(places.picture.width).toBe(places.named.width);
  expect(places.picture.height).toBe(places.named.height);

  // A creature that is on the screen with nothing but water over its middle.
  const findCreatureOverWater = () =>
    page.evaluate(() => {
      for (const picture of Array.from(document.querySelectorAll<HTMLElement>('[data-testid^="depth-creature-art-"]'))) {
        const box = picture.getBoundingClientRect();
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        const over = document.elementFromPoint(x, y);
        if (x > 30 && y > 30 && x < window.innerWidth - 30 && y < window.innerHeight - 30 && over && !over.closest('[role], [aria-label], [tabindex]')) {
          return { testId: picture.dataset.testid as string, x, y, transform: picture.style.transform };
        }
      }
      return null;
    });
  for (let step = 0; step < 600 && (await findCreatureOverWater()) === null; step += 1) {
    await page.clock.fastForward(500);
  }
  const creature = await findCreatureOverWater();
  expect(creature).not.toBeNull();

  await page.mouse.click(creature!.x, creature!.y);

  await expect.poll(() => page.getByTestId(creature!.testId).evaluate((element) => (element as HTMLElement).style.transform)).not.toBe(creature!.transform);
  // The tap was the creature's: the screen has not moved on.
  await expect(page.getByTestId('mode-select')).toBeVisible();
});

test('a tap on a mode reaches it while a decorative bubble is passing over it', async ({ page }) => {
  await page.clock.install();
  await openModeSelect(page);

  // A point that is inside both the big bubble on the right and the mode it drifts across.
  const sharedPoint = () =>
    page.evaluate(() => {
      const circle = (element: Element) => {
        const box = element.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2, radius: box.width / 2 };
      };
      const bubble = circle(document.querySelector('[data-testid="depth-background-bubble-large-right"]') as HTMLElement);
      const mode = circle(document.querySelector('[aria-label="dentaku mode"]') as HTMLElement);
      const distance = Math.hypot(bubble.x - mode.x, bubble.y - mode.y);
      if (distance > bubble.radius + mode.radius - 24) {
        return null;
      }
      // On the line between the two middles, 12 points inside the mode's edge.
      const along = (mode.radius - 12) / distance;
      const point = { x: mode.x + (bubble.x - mode.x) * along, y: mode.y + (bubble.y - mode.y) * along };
      return Math.hypot(point.x - bubble.x, point.y - bubble.y) < bubble.radius - 6 && point.x < window.innerWidth - 2 ? point : null;
    });
  for (let step = 0; step < 480 && (await sharedPoint()) === null; step += 1) {
    await page.clock.fastForward(250);
  }
  const point = await sharedPoint();
  expect(point).not.toBeNull();

  await page.mouse.click(point!.x, point!.y);

  await expect(page.getByTestId('dentaku-world-select')).toBeVisible();
});

async function openModeSelect(page: Page) {
  await page.goto('/game');
  await page.getByLabel('bubble-5').click();
  await expect(page.getByLabel('next stage')).toBeVisible();
  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('mode-select')).toBeVisible();
}

/** The element shows the picture with this file name, and the picture has loaded. */
async function expectPicture(holder: Locator, name: string) {
  const image = holder.locator('img');
  await expect(image).toHaveAttribute('src', new RegExp(`/creatures/${name}\\.[^/]*svg`));
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}
