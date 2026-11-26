// The picture that says a puzzle was solved, to show to whoever sent it: the puzzle's number and
// its goal, the goal as maru lying in the bowl, as the board leaves them, and over the bowl what
// the board itself does at that moment: bubbles bursting like fireworks, and starfish among them.
// No sign from outside the game says "done". Not the way to the goal either: the one who gets
// the picture can still try. It goes with the address of the same puzzle.
import { getPuzzleLine, getPuzzlePage, getSolvedCardFileName } from '@/components/puzzle/puzzle-card';
import { getBeadKind } from '@/game/beads';
import { getMadePuzzleQuery, writeMadePuzzle } from '@/game/made-puzzle';
import { getAmountMaru, getResultCardBowlCircle, RESULT_CARD_BOWL } from '@/game/result-card';
import type { Stage } from '@/game/types';
import type { PictureShare, SharedPuzzle } from '@/platform/game-host';
import { drawBowl, drawMaru, drawWater, preparePictureShare } from '@/platform/share-picture';
import { drawTitle } from '@/platform/share-puzzle';

// How many times as big as on the board the fireworks and the starfish are drawn.
const K = 2.4;
// The bubbles that burst over the board when a puzzle is solved, as the board has them (their
// colours, their white rims), caught a little after the burst: [x, y, how many, how far they fly].
const BURSTS: Array<[number, number, number, number]> = [
  [540, 640, 10, 92],
  [276, 700, 8, 72],
  [806, 668, 8, 78],
];
const BURST_COLORS = ['rgba(14, 165, 233, 0.88)', 'rgba(6, 182, 212, 0.84)', 'rgba(34, 197, 94, 0.78)', 'rgba(234, 179, 8, 0.76)', 'rgba(236, 72, 153, 0.76)'];
// How far through its flight a burst is caught: far enough out to read as a burst, not yet faded.
const BURST_PROGRESS = 0.62;
// The starfish that drift up among them, one to a burst: [x, y, size, turned by so many degrees].
const STARFISH: Array<[number, number, number, number]> = [
  [596, 566, 80, -16],
  [250, 640, 64, 2],
  [846, 600, 64, 20],
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

    BURSTS.forEach((burst, index) => drawBurst(context, burst, index));
    for (const [x, y, size, degrees] of STARFISH) {
      drawStarfish(context, x, y, size, degrees);
    }
  });
}

/** One burst of bubbles, each flying out from the middle as on the board. */
function drawBurst(context: CanvasRenderingContext2D, [centerX, centerY, count, spread]: [number, number, number, number], burstIndex: number) {
  const ease = 1 - Math.pow(1 - BURST_PROGRESS, 3);
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / count;
    const distance = spread * ease * (0.78 + (index % 5) * 0.08) * K;
    const radius = ((7 + (index % 4) * 3 + (1 - BURST_PROGRESS) * 3) / 2) * K;
    const rise = BURST_PROGRESS * (18 + (index % 6) * 5) * K * 0.5;
    const x = centerX + Math.cos(angle) * distance;
    const y = centerY + Math.sin(angle) * distance - rise;
    context.save();
    context.shadowColor = 'rgba(56, 189, 248, 0.7)';
    context.shadowBlur = 16 * K * 0.5;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fillStyle = BURST_COLORS[(burstIndex + index) % BURST_COLORS.length];
    context.fill();
    context.restore();
    context.lineWidth = 2 * K * 0.8;
    context.strokeStyle = 'rgba(255, 255, 255, 0.92)';
    context.stroke();
  }
}

/** The starfish that drift up over a solved puzzle: five rounded arms around a pale middle. */
function drawStarfish(context: CanvasRenderingContext2D, centerX: number, centerY: number, size: number, degrees: number) {
  const armWidth = size * 0.34;
  const armHeight = size * 0.5;
  const rim = Math.max(2, size * 0.035);
  context.save();
  context.translate(centerX, centerY);
  context.rotate((degrees * Math.PI) / 180);
  for (let index = 0; index < 5; index += 1) {
    context.save();
    context.rotate((index * 72 * Math.PI) / 180);
    // An arm: a rounded bar pointing up, its middle a little way out from the starfish's.
    capsule(context, -armWidth / 2, -size * 0.23 - armHeight / 2, armWidth, armHeight);
    context.fillStyle = '#EAB308';
    context.fill();
    context.lineWidth = rim;
    context.strokeStyle = 'rgba(202, 138, 4, 0.28)';
    context.stroke();
    context.restore();
  }
  context.beginPath();
  context.arc(0, 0, size * 0.21, 0, Math.PI * 2);
  context.fillStyle = '#FDE68A';
  context.fill();
  context.lineWidth = rim;
  context.strokeStyle = 'rgba(202, 138, 4, 0.34)';
  context.stroke();
  for (const dot of [-72, 0, 72]) {
    const angle = (dot * Math.PI) / 180;
    context.beginPath();
    context.arc(Math.cos(angle) * size * 0.18, Math.sin(angle) * size * 0.18, size * 0.06, 0, Math.PI * 2);
    context.fillStyle = 'rgba(180, 120, 12, 0.36)';
    context.fill();
  }
  context.restore();
}

/** A bar with round ends. */
function capsule(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const radius = Math.min(width, height) / 2;
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}
