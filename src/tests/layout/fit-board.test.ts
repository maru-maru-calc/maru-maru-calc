import { describe, expect, it } from 'vitest';

import { BOARD_MIN_HEIGHT, BOARD_MIN_WIDTH, fitBoardToScreen } from '@/layout/fit-board';

describe('fitting the board to the screen', () => {
  it('leaves a screen that is big enough as it is', () => {
    expect(fitBoardToScreen(390, 844)).toEqual({ width: 390, height: 844, scale: 1 });
    expect(fitBoardToScreen(1280, 720)).toEqual({ width: 1280, height: 720, scale: 1 });
    expect(fitBoardToScreen(BOARD_MIN_WIDTH, BOARD_MIN_HEIGHT)).toEqual({ width: BOARD_MIN_WIDTH, height: BOARD_MIN_HEIGHT, scale: 1 });
  });

  it('lays the board out taller for a phone held sideways, and shrinks it to fit', () => {
    const fit = fitBoardToScreen(844, 390);
    expect(fit.height).toBe(BOARD_MIN_HEIGHT);
    expect(fit.scale).toBe(390 / 640);
    // Shrunk, it covers the screen exactly.
    expect(Math.round(fit.width * fit.scale)).toBe(844);
    expect(Math.round(fit.height * fit.scale)).toBe(390);
  });

  it('does the same for a screen that is too narrow, and takes the tighter of the two', () => {
    expect(fitBoardToScreen(240, 800)).toEqual({ width: 320, height: 800 / 0.75, scale: 0.75 });
    const both = fitBoardToScreen(300, 300);
    expect(both.scale).toBe(300 / 640);
    expect(both.width >= BOARD_MIN_WIDTH && both.height >= BOARD_MIN_HEIGHT).toBe(true);
  });

  it('never makes anything bigger, and survives a screen without a size', () => {
    expect(fitBoardToScreen(4000, 3000).scale).toBe(1);
    expect(fitBoardToScreen(0, 0)).toEqual({ width: 0, height: 0, scale: 1 });
    expect(fitBoardToScreen(Number.NaN, 500).scale).toBe(1);
  });
});
