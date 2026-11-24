// What the puzzle game remembers between visits, and how it is written down.

export type PuzzleProgress = {
  version: 1;
  /** Ids of the puzzles solved so far. */
  solved: string[];
  /** How many start-screen puzzles have been solved; the first three visits each show a different rule. */
  startVisits: number;
  /** The player's best counts in the one-minute game, best first, at most five. */
  quickScores: number[];
};

export const MAX_QUICK_SCORES = 5;

export function createEmptyPuzzleProgress(): PuzzleProgress {
  return { version: 1, solved: [], startVisits: 0, quickScores: [] };
}

/** Reads saved progress. Anything missing, damaged or of an unknown shape gives the part that can still be read, or empty progress. */
export function parsePuzzleProgress(raw: string | null | undefined): PuzzleProgress {
  if (!raw) {
    return createEmptyPuzzleProgress();
  }
  try {
    const stored: unknown = JSON.parse(raw);
    if (typeof stored !== 'object' || stored === null) {
      return createEmptyPuzzleProgress();
    }
    const { solved, startVisits, quickScores } = stored as { solved?: unknown; startVisits?: unknown; quickScores?: unknown };
    return {
      version: 1,
      solved: Array.isArray(solved) ? [...new Set(solved.filter((id): id is string => typeof id === 'string'))] : [],
      startVisits: typeof startVisits === 'number' && Number.isFinite(startVisits) && startVisits > 0 ? Math.floor(startVisits) : 0,
      quickScores: Array.isArray(quickScores) ? sortScores(quickScores.filter((score): score is number => typeof score === 'number' && Number.isInteger(score) && score >= 0)) : [],
    };
  } catch {
    return createEmptyPuzzleProgress();
  }
}

export function serializePuzzleProgress(progress: PuzzleProgress): string {
  return JSON.stringify(progress);
}

/** `progress` with one more puzzle solved; the same object when it already was. */
export function addSolvedPuzzle(progress: PuzzleProgress, puzzleId: string): PuzzleProgress {
  return progress.solved.includes(puzzleId) ? progress : { ...progress, solved: [...progress.solved, puzzleId] };
}

function sortScores(scores: number[]): number[] {
  return [...scores].sort((left, right) => right - left).slice(0, MAX_QUICK_SCORES);
}

/**
 * `progress` with one more one-minute result. `rank` is where it stands among the best (0 is the
 * best so far), or undefined when it did not make the list.
 */
export function addQuickScore(progress: PuzzleProgress, score: number): { progress: PuzzleProgress; rank: number | undefined } {
  const quickScores = sortScores([...progress.quickScores, score]);
  // A tie with an earlier result takes the place below it.
  const rank = quickScores.lastIndexOf(score);
  const madeTheList = quickScores.length > progress.quickScores.length || quickScores.some((value, index) => value !== progress.quickScores[index]);
  return { progress: madeTheList ? { ...progress, quickScores } : progress, rank: madeTheList ? rank : undefined };
}
