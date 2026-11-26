// The picture of a one-minute result: the clock, the count, and the count again as maru in the bowl.
import { getBeadKind } from '@/game/beads';
import { getCount, getResultCardBowlCircle, getResultCardFileName, getResultCardMaru, RESULT_CARD_BOWL, RESULT_CARD_WIDTH } from '@/game/result-card';
import type { PictureShare } from '@/platform/game-host';
import { CARD_FONT, CARD_INK, drawAddress, drawBowl, drawClock, drawMaru, drawWater, preparePictureShare } from '@/platform/share-picture';

export function prepareResultShare(solved: number): Promise<PictureShare | undefined> {
  return preparePictureShare(getResultCardFileName(solved), undefined, (context, shownAddress) => {
    drawWater(context);
    drawBowl(context, getResultCardBowlCircle(), RESULT_CARD_BOWL.thickness);
    for (const maru of getResultCardMaru(solved)) {
      drawMaru(context, maru.x, maru.y, maru.radius, getBeadKind(maru.value));
    }

    // The clock and the count, side by side in the middle.
    const clock = 150;
    const gap = 44;
    const text = String(getCount(solved));
    context.font = `900 250px ${CARD_FONT}`;
    context.textBaseline = 'alphabetic';
    const textWidth = context.measureText(text).width;
    const left = (RESULT_CARD_WIDTH - (clock + gap + textWidth)) / 2;
    const middleY = 200;
    drawClock(context, left + clock / 2, middleY, clock);
    context.fillStyle = CARD_INK;
    context.textAlign = 'left';
    // Digits stand on the line and are about 0.72 of the size tall: this puts their middle on the clock's.
    context.fillText(text, left + clock + gap, middleY + 250 * 0.36);

    drawAddress(context, shownAddress, 'right');
  });
}
