// Where the cells of the puzzle list go on a board of a given size (see puzzle-list.tsx).
import { HEADER_ACTION_BUTTON_SIZE } from '@/components/marumaru/constants';
import { getFieldSize } from '@/components/marumaru/field-layout';
import { SIDE_PANEL_WIDTH } from '@/layout/fit-board';
import type { BoardViewport } from '@/layout/fit-board';

const CELL = 56;
const GAP = 10;
// "Back" is this far from the left edge, on the board too.
const BACK_INSET = 24;
export const BACK_TO_LIST = 16;

/**
 * How the list is laid out on a board of this size. Upright: five to a row, in the middle, under
 * "back". Wider than tall: beside "back", ten to a row where they fit (with smaller cells on a
 * small phone), else five.
 */
export function getPuzzleListLayout(viewport: BoardViewport) {
  if (viewport.arrangement !== 'sideBySide') {
    return { columns: 5, cell: CELL, gap: GAP, sideInset: undefined };
  }
  // Where the board's own "back" is: the panel and the bowl sit in the middle of a very wide screen.
  const field = getFieldSize(viewport);
  const sideInset = Math.max(0, (viewport.width - SIDE_PANEL_WIDTH - field.width) / 2) + BACK_INSET;
  const room = viewport.width - (sideInset + HEADER_ACTION_BUTTON_SIZE + BACK_TO_LIST) - sideInset;
  const tenToARow = [
    { cell: CELL, gap: GAP },
    { cell: 48, gap: 8 },
  ].find(({ cell, gap }) => cell * 10 + gap * 9 <= room);
  return tenToARow ? { columns: 10, ...tenToARow, sideInset } : { columns: 5, cell: CELL, gap: GAP, sideInset };
}
