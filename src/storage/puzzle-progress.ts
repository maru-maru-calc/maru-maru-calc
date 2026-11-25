import { createEmptyPuzzleProgress, parsePuzzleProgress, serializePuzzleProgress } from './puzzle-progress-codec';
import type { PuzzleProgress } from './puzzle-progress-codec';

/**
 * Where the puzzle game keeps its progress. On the web that is the browser's own storage
 * (platform/browser-host.ts); inside YouTube it is YouTube's own save (youtube/youtube-host.ts),
 * which allows no other way. The puzzle game's progress is kept apart from the learning app's.
 */
export type PuzzleSaveSlot = {
  read: () => Promise<string | null>;
  write: (text: string) => Promise<void>;
};

/**
 * Never rejects: when the slot is unavailable, the game starts with empty progress. With
 * `timeoutMs` it also stops waiting for a slow slot; without, it waits as long as the slot takes.
 */
export async function loadPuzzleProgress(slot: PuzzleSaveSlot, timeoutMs?: number): Promise<PuzzleProgress> {
  try {
    const raw = await (timeoutMs === undefined
      ? slot.read()
      : Promise.race([
          slot.read(),
          new Promise<null>((resolve) => {
            setTimeout(() => resolve(null), timeoutMs);
          }),
        ]));
    return parsePuzzleProgress(raw);
  } catch {
    return createEmptyPuzzleProgress();
  }
}

export function savePuzzleProgress(progress: PuzzleProgress, slot: PuzzleSaveSlot) {
  try {
    void slot.write(serializePuzzleProgress(progress)).catch(() => {});
  } catch {
    // The slot can be unavailable; progress then lasts only for this visit.
  }
}
