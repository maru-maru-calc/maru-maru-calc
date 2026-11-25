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

test('a creature swims behind the buttons, and can still be pressed', async ({ page }) => {
  await openModeSelect(page);

  // The picture is under the buttons and what takes the press is over them: two elements, which
  // have to stay on the same spot.
  const places = await page.evaluate(() => {
    const place = (testId: string) => {
      const element = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
      return { left: element.style.left, top: element.style.top, width: element.offsetWidth, height: element.offsetHeight, layer: Number(getComputedStyle(element.parentElement as HTMLElement).zIndex) };
    };
    const scroll = document.querySelector('[data-testid="mode-select-scroll"]') as HTMLElement;
    return { picture: place('depth-creature-art-shallow-clownfish'), target: place('depth-fish-shallow-clownfish'), buttons: Number(getComputedStyle(scroll).zIndex) };
  });
  expect(places.picture.layer).toBeLessThan(places.buttons);
  expect(places.target.layer).toBeGreaterThan(places.buttons);
  expect(places.picture.width).toBe(places.target.width);
  expect(places.picture.height).toBe(places.target.height);

  // Pressed, it darts away, and the picture goes with it.
  const calm = await page.getByTestId('depth-creature-art-shallow-clownfish').evaluate((element) => (element as HTMLElement).style.transform);
  await page.getByTestId('depth-fish-shallow-clownfish').dispatchEvent('click');
  await expect
    .poll(() => page.getByTestId('depth-creature-art-shallow-clownfish').evaluate((element) => (element as HTMLElement).style.transform))
    .not.toBe(calm);
});

async function openModeSelect(page: Page) {
  await page.goto('/game');
  await page.getByLabel('bubble-5').click();
  await expect(page.getByLabel('next stage')).toBeVisible({ timeout: 4000 });
  await page.getByLabel('next stage').click();
  await expect(page.getByTestId('mode-select')).toBeVisible();
}

/** The element shows the picture with this file name, and the picture has loaded. */
async function expectPicture(holder: Locator, name: string) {
  const image = holder.locator('img');
  await expect(image).toHaveAttribute('src', new RegExp(`/creatures/${name}\\.[^/]*svg`));
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
}
