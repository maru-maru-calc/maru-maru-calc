import { describe, expect, it } from 'vitest';

import { BUBBLE_ROW_Y, BUBBLE_ROW_Y_BESIDE_PANEL } from '@/components/marumaru/constants';
import { createPendingBubbles, getEntityRadius, getFieldSize } from '@/components/marumaru/field-layout';
import { getPuzzleListLayout } from '@/components/puzzle/list-layout';
import {
  BOARD_MIN_HEIGHT,
  BOARD_MIN_WIDTH,
  fitBoardToScreen,
  SIDE_BY_SIDE_MIN_HEIGHT,
  SIDE_BY_SIDE_MIN_WIDTH,
  SIDE_PANEL_WIDTH,
} from '@/layout/fit-board';

describe('fitting the board to the screen', () => {
  it('leaves an upright screen that is big enough as it is', () => {
    expect(fitBoardToScreen(390, 844)).toEqual({ width: 390, height: 844, scale: 1, arrangement: 'stacked' });
    expect(fitBoardToScreen(BOARD_MIN_WIDTH, BOARD_MIN_HEIGHT)).toEqual({ width: BOARD_MIN_WIDTH, height: BOARD_MIN_HEIGHT, scale: 1, arrangement: 'stacked' });
    expect(fitBoardToScreen(700, 700).arrangement).toBe('stacked');
  });

  it('puts the panel beside the bowl on a screen that is wider than tall, at full size on a phone held sideways', () => {
    expect(fitBoardToScreen(844, 390)).toEqual({ width: 844, height: 390, scale: 1, arrangement: 'sideBySide' });
    expect(fitBoardToScreen(667, 375)).toEqual({ width: 667, height: 375, scale: 1, arrangement: 'sideBySide' });
    expect(fitBoardToScreen(932, 430)).toEqual({ width: 932, height: 430, scale: 1, arrangement: 'sideBySide' });
    expect(fitBoardToScreen(SIDE_BY_SIDE_MIN_WIDTH, SIDE_BY_SIDE_MIN_HEIGHT).scale).toBe(1);
  });

  it('shrinks a wide screen that is smaller still, and never more than the upright board would be', () => {
    const fit = fitBoardToScreen(568, 320);
    expect(fit.arrangement).toBe('sideBySide');
    expect(fit.scale).toBe(320 / SIDE_BY_SIDE_MIN_HEIGHT);
    // Shrunk, it covers the screen exactly.
    expect(Math.round(fit.width * fit.scale)).toBe(568);
    expect(Math.round(fit.height * fit.scale)).toBe(320);

    for (const [width, height] of [[568, 320], [844, 390], [500, 480], [301, 300], [2000, 200], [640, 360]]) {
      const uprightScale = Math.min(1, width / BOARD_MIN_WIDTH, height / BOARD_MIN_HEIGHT);
      expect(fitBoardToScreen(width, height).scale >= uprightScale).toBe(true);
    }
  });

  it('lays an upright screen that is too small out bigger, and takes the tighter of the two', () => {
    expect(fitBoardToScreen(240, 800)).toEqual({ width: 320, height: 800 / 0.75, scale: 0.75, arrangement: 'stacked' });
    const both = fitBoardToScreen(300, 300);
    expect(both.scale).toBe(300 / 640);
    expect(both.width >= BOARD_MIN_WIDTH && both.height >= BOARD_MIN_HEIGHT).toBe(true);
  });

  it('shows the board bigger on a wide screen with room to spare, as if the screen were 768 × 480', () => {
    expect(fitBoardToScreen(1280, 720)).toEqual({ width: 1280 / 1.5, height: 480, scale: 1.5, arrangement: 'sideBySide' });
    expect(fitBoardToScreen(1920, 1080).scale).toBe(2.25);
    // A tablet held sideways: the width is the tighter of the two.
    const tablet = fitBoardToScreen(1024, 768);
    expect(tablet.scale).toBe(1024 / 768);
    expect(Math.round(tablet.height)).toBe(576);
    // Nothing jumps where it starts: just above a phone's size the board is still at full size.
    expect(fitBoardToScreen(900, 420).scale).toBe(1);
    expect(fitBoardToScreen(769, 481).scale).toBeCloseTo(1, 2);
  });

  it('never makes an upright board bigger, and survives a screen without a size', () => {
    expect(fitBoardToScreen(3000, 4000).scale).toBe(1);
    expect(fitBoardToScreen(768, 1024).scale).toBe(1);
    expect(fitBoardToScreen(0, 0)).toEqual({ width: 0, height: 0, scale: 1, arrangement: 'stacked' });
    expect(fitBoardToScreen(Number.NaN, 500).scale).toBe(1);
  });
});

describe('the size of the field', () => {
  it('is what the header, the operators and the line leave, on an upright board', () => {
    expect(getFieldSize({ width: 390, height: 844, arrangement: 'stacked' })).toEqual({ width: 390, height: 552 });
    expect(getFieldSize({ width: 320, height: 640, arrangement: 'stacked' })).toEqual({ width: 320, height: 360 });
  });

  it('has the whole height beside the panel, and is never narrower than on the smallest upright board', () => {
    expect(getFieldSize({ width: 667, height: 375, arrangement: 'sideBySide' })).toEqual({ width: 667 - SIDE_PANEL_WIDTH, height: 375 });
    for (const [width, height] of [[568, 320], [608, 360], [667, 375], [844, 390], [1280, 720], [1920, 1080], [301, 300]]) {
      const fit = fitBoardToScreen(width, height);
      const field = getFieldSize(fit);
      expect(field.width >= BOARD_MIN_WIDTH).toBe(true);
      expect(field.height >= SIDE_BY_SIDE_MIN_HEIGHT).toBe(true);
      expect(field.width + SIDE_PANEL_WIDTH <= fit.width + 0.001).toBe(true);
    }
  });

  it('is not stretched flat on a very wide screen', () => {
    const phone = getFieldSize({ width: 844, height: 390, arrangement: 'sideBySide' });
    expect(phone).toEqual({ width: 488, height: 390 });
    // A very wide desktop window, enlarged: the board is 480 tall, the bowl at most 600 wide.
    expect(getFieldSize(fitBoardToScreen(2560, 1080))).toEqual({ width: 600, height: 480 });
  });
});

describe('the bubbles waiting beside the panel', () => {
  it('are whole: the field starts at the top of the screen there, so the rows sit a little lower', () => {
    const biggest = Math.max(...[2, 5, 9, 10, 11, 20].map((count) => getEntityRadius(1, count)));
    const six = createPendingBubbles(488, [7, 11, 10, 6, 9, 8], 'fit', BUBBLE_ROW_Y_BESIDE_PANEL);
    expect(new Set(six.map((bubble) => bubble.y)).size).toBe(2);
    expect(Math.min(...six.map((bubble) => bubble.y)) - biggest >= 0).toBe(true);
    // Both rows are above the bowl's floor on the shortest board there is.
    expect(Math.max(...six.map((bubble) => bubble.y)) + biggest < 360 - 18).toBe(true);
    // Above the bowl of an upright board nothing moved.
    expect(createPendingBubbles(390, [3, 4])[0].y).toBe(BUBBLE_ROW_Y);
  });
});

describe('the puzzle list', () => {
  it('is five to a row on an upright screen', () => {
    expect(getPuzzleListLayout(fitBoardToScreen(390, 844))).toEqual({ columns: 5, cell: 56, gap: 10, sideInset: undefined });
  });

  it('is ten to a row beside "back" where ten fit, with smaller cells on a small phone', () => {
    expect(getPuzzleListLayout(fitBoardToScreen(844, 390))).toMatchObject({ columns: 10, cell: 56 });
    expect(getPuzzleListLayout(fitBoardToScreen(1280, 720))).toMatchObject({ columns: 10, cell: 56, sideInset: 24 });
    expect(getPuzzleListLayout(fitBoardToScreen(667, 375))).toMatchObject({ columns: 10, cell: 48, sideInset: 24 });
    expect(getPuzzleListLayout(fitBoardToScreen(608, 360))).toMatchObject({ columns: 5, cell: 56 });
  });

  it('always fits beside "back"', () => {
    for (const [width, height] of [[568, 320], [608, 360], [640, 360], [667, 375], [740, 360], [844, 390], [932, 430], [1024, 768], [1280, 720], [1920, 1080]]) {
      const fit = fitBoardToScreen(width, height);
      const { columns, cell, gap, sideInset } = getPuzzleListLayout(fit);
      expect(sideInset !== undefined).toBe(true);
      expect((sideInset ?? 0) + 48 + 16 + columns * cell + (columns - 1) * gap + (sideInset ?? 0) <= fit.width + 0.001).toBe(true);
      expect(cell >= 48).toBe(true);
    }
  });
});
