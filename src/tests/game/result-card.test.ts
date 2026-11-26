import { describe, expect, it } from 'vitest';

import {
  getResultCardBowlCircle,
  getResultCardFileName,
  getResultCardMaru,
  RESULT_CARD_BOWL,
  RESULT_CARD_HEIGHT,
  RESULT_CARD_WIDTH,
} from '@/game/result-card';

describe('the picture of a one-minute result', () => {
  it('shows the count as maru: a ten-maru for every ten, then the ones', () => {
    expect(getResultCardMaru(0)).toEqual([]);
    expect(getResultCardMaru(12).map((maru) => maru.value)).toEqual([10, 1, 1]);
    expect(getResultCardMaru(30).map((maru) => maru.value)).toEqual([10, 10, 10]);
    for (const count of [1, 7, 9, 10, 19, 25, 48, 99]) {
      expect(getResultCardMaru(count).reduce((sum, maru) => sum + maru.value, 0)).toBe(count);
    }
    // A ten-maru is the bigger one, as on the board.
    const [ten, one] = getResultCardMaru(11);
    expect(ten.radius > one.radius).toBe(true);
  });

  it('lays them in the bowl: each touches it, none lies on another, all are on the picture', () => {
    const bowl = getResultCardBowlCircle();
    const inner = bowl.radius - RESULT_CARD_BOWL.thickness / 2;
    for (const count of [1, 5, 9, 12, 29, 48, 59, 99]) {
      const all = getResultCardMaru(count);
      all.forEach((maru, index) => {
        const fromCenter = Math.hypot(maru.x - bowl.centerX, maru.y - bowl.centerY);
        expect(Math.abs(fromCenter + maru.radius - inner) < 0.001).toBe(true);
        // Inside the arc that is drawn, not past its ends.
        expect(Math.abs(maru.x - bowl.centerX) + maru.radius <= RESULT_CARD_BOWL.halfWidth).toBe(true);
        expect(maru.x - maru.radius >= 0 && maru.x + maru.radius <= RESULT_CARD_WIDTH && maru.y + maru.radius <= RESULT_CARD_HEIGHT).toBe(true);
        const next = all[index + 1];
        if (next) {
          expect(Math.hypot(next.x - maru.x, next.y - maru.y) >= maru.radius + next.radius).toBe(true);
          expect(next.x > maru.x).toBe(true);
        }
      });
      // They lie around the lowest point of the bowl.
      const middle = (all[0].x - all[0].radius + all[all.length - 1].x + all[all.length - 1].radius) / 2;
      expect(Math.abs(middle - bowl.centerX) < 40).toBe(true);
    }
  });

  it('draws them at full size for any count a minute can hold, and smaller only when the bowl is full', () => {
    expect(getResultCardMaru(20).every((maru) => maru.radius === (maru.value === 10 ? 50 : 35))).toBe(true);
    expect(getResultCardMaru(19).every((maru) => maru.radius === (maru.value === 10 ? 50 : 35))).toBe(true);
    expect(getResultCardMaru(99).every((maru) => maru.radius < (maru.value === 10 ? 50 : 35))).toBe(true);
  });

  it('is upright', () => {
    expect(RESULT_CARD_HEIGHT > RESULT_CARD_WIDTH).toBe(true);
  });

  it('survives a count that is not a whole number or not a count at all', () => {
    expect(getResultCardMaru(-3)).toEqual([]);
    expect(getResultCardMaru(2.9).length).toBe(2);
    expect(getResultCardMaru(Number.NaN)).toEqual([]);
  });

  it('names the file after the count', () => {
    expect(getResultCardFileName(12)).toBe('maru-1min-12.png');
    expect(getResultCardFileName(0)).toBe('maru-1min-0.png');
    expect(getResultCardFileName(Number.NaN)).toBe('maru-1min-0.png');
  });
});
