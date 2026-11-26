// The picture that says a puzzle was solved, to show to whoever sent it: the puzzle's number and
// its goal, a tick, and the goal as maru lying in the bowl, as the board leaves them. Not the way
// to the goal: the one who gets it can still try. It goes with the address of the same puzzle.
import { getPuzzleLine, getPuzzlePage, getSolvedCardFileName } from '@/components/puzzle/puzzle-card';
import { getBeadKind } from '@/game/beads';
import { getMadePuzzleQuery, writeMadePuzzle } from '@/game/made-puzzle';
import { getAmountMaru, getResultCardBowlCircle, RESULT_CARD_BOWL } from '@/game/result-card';
import type { Stage } from '@/game/types';
import type { PictureShare, SharedPuzzle } from '@/platform/game-host';
import { drawBowl, drawMaru, drawWater, preparePictureShare } from '@/platform/share-picture';
import { drawTitle } from '@/platform/share-puzzle';

const ACCENT = '#0284C7';
// The tick, in the middle between the title and the bowl.
const TICK = { centerX: 540, centerY: 610, radius: 122 };
// A few of the bubbles that burst over the board when a puzzle is solved, standing still: [x, y, radius, colour].
const CONFETTI: Array<[number, number, number, string]> = [
  [330, 500, 16, 'rgba(236, 72, 153, 0.76)'],
  [258, 640, 11, 'rgba(34, 197, 94, 0.78)'],
  [352, 752, 14, 'rgba(234, 179, 8, 0.76)'],
  [420, 420, 9, 'rgba(6, 182, 212, 0.84)'],
  [668, 430, 13, 'rgba(234, 179, 8, 0.76)'],
  [756, 512, 10, 'rgba(34, 197, 94, 0.78)'],
  [826, 632, 16, 'rgba(14, 165, 233, 0.88)'],
  [738, 748, 12, 'rgba(236, 72, 153, 0.76)'],
  [560, 800, 9, 'rgba(6, 182, 212, 0.84)'],
  [196, 548, 8, 'rgba(14, 165, 233, 0.88)'],
];

export function prepareSolvedShare(puzzle: SharedPuzzle, stage: Stage): Promise<PictureShare | undefined> {
  const isMade = 'made' in puzzle;
  const fileName = isMade ? `maru-solved-${writeMadePuzzle(puzzle.made)}.png` : getSolvedCardFileName(puzzle.number);
  const page = isMade ? `puzzle?${getMadePuzzleQuery(puzzle.made)}` : getPuzzlePage(puzzle.number);
  // Shown to somebody: the picture is the point, so the device's own share leads.
  return preparePictureShare(fileName, { page, line: getPuzzleLine(isMade ? undefined : puzzle.number, stage, true), lead: 'device' }, (context) => {
    // Only small bubbles drift here: big ones would lie over the title.
    drawWater(context, [
      [70, 96, 44],
      [1010, 150, 30],
      [990, 1290, 60],
    ]);
    drawBowl(context, getResultCardBowlCircle(), RESULT_CARD_BOWL.thickness);
    for (const maru of getAmountMaru(stage.target)) {
      drawMaru(context, maru.x, maru.y, maru.radius, getBeadKind(maru.value));
    }
    drawTitle(context, { mark: isMade ? 'pencil' : puzzle.number, goal: stage.target }, { centerX: 540, baseline: 330, scale: 1.3 });

    for (const [x, y, radius, color] of CONFETTI) {
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fillStyle = color;
      context.fill();
    }
    // The tick: white on a round blue ground, the same blue as the number.
    const { centerX, centerY, radius } = TICK;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fillStyle = ACCENT;
    context.fill();
    context.beginPath();
    context.moveTo(centerX - radius * 0.44, centerY + radius * 0.04);
    context.lineTo(centerX - radius * 0.12, centerY + radius * 0.36);
    context.lineTo(centerX + radius * 0.46, centerY - radius * 0.3);
    context.lineWidth = radius * 0.24;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.strokeStyle = '#FFFFFF';
    context.stroke();
  });
}
