// What the puzzle game remembers between visits, and how it is written down.

export type PuzzleProgress = {
  version: 1;
  /** Ids of the puzzles solved so far. */
  solved: string[];
  /** How many start-screen puzzles have been solved; the first three visits each show a different rule. */
  startVisits: number;
};

export function createEmptyPuzzleProgress(): PuzzleProgress {
  return { version: 1, solved: [], startVisits: 0 };
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
    const { solved, startVisits } = stored as { solved?: unknown; startVisits?: unknown };
    return {
      version: 1,
      solved: Array.isArray(solved) ? [...new Set(solved.filter((id): id is string => typeof id === 'string'))] : [],
      startVisits: typeof startVisits === 'number' && Number.isFinite(startVisits) && startVisits > 0 ? Math.floor(startVisits) : 0,
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
