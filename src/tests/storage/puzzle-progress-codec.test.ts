import { describe, expect, it } from 'vitest';

import { addQuickScore, addSolvedPuzzle, createEmptyPuzzleProgress, parsePuzzleProgress, serializePuzzleProgress } from '@/storage/puzzle-progress-codec';

describe('puzzle progress', () => {
  it('comes back as it was written', () => {
    const progress = { version: 1 as const, solved: ['puzzle-a', 'puzzle-b'], startVisits: 4, quickScores: [9, 7, 7] };

    expect(parsePuzzleProgress(serializePuzzleProgress(progress))).toEqual(progress);
  });

  it('starts empty when nothing, or nothing readable, is stored', () => {
    for (const raw of [null, undefined, '', 'not json', '[]', '42', 'null']) {
      expect(parsePuzzleProgress(raw)).toEqual(createEmptyPuzzleProgress());
    }
  });

  it('keeps what it can read of a damaged or older save', () => {
    expect(parsePuzzleProgress('{"solved":["a",3,"a",null,"b"],"startVisits":"many"}')).toEqual({ version: 1, solved: ['a', 'b'], startVisits: 0, quickScores: [] });
    expect(parsePuzzleProgress('{"startVisits":2.9}')).toEqual({ version: 1, solved: [], startVisits: 2, quickScores: [] });
    expect(parsePuzzleProgress('{"solved":"all","startVisits":-3}')).toEqual(createEmptyPuzzleProgress());
  });

  it('adds a solved puzzle once', () => {
    const once = addSolvedPuzzle(createEmptyPuzzleProgress(), 'puzzle-a');

    expect(once.solved).toEqual(['puzzle-a']);
    expect(addSolvedPuzzle(once, 'puzzle-a')).toBe(once);
    expect(addSolvedPuzzle(once, 'puzzle-b').solved).toEqual(['puzzle-a', 'puzzle-b']);
  });

  it('reads a save from before the one-minute game, and cleans up a damaged list of results', () => {
    expect(parsePuzzleProgress('{"version":1,"solved":["a"],"startVisits":3}').quickScores).toEqual([]);
    expect(parsePuzzleProgress('{"quickScores":[3,"x",8,-1,2.5,8,1,0,4,6]}').quickScores).toEqual([8, 8, 6, 4, 3]);
  });

  it('keeps the five best one-minute results, best first, and says where a new one stands', () => {
    let progress = createEmptyPuzzleProgress();
    const ranks: Array<number | undefined> = [];
    for (const score of [4, 7, 5, 7, 2, 6, 1, 9]) {
      const added = addQuickScore(progress, score);
      progress = added.progress;
      ranks.push(added.rank);
    }

    expect(progress.quickScores).toEqual([9, 7, 7, 6, 5]);
    // 4 first; 7 best; 5 second; the second 7 below the first; 2 last; 6 third; 1 not among five; 9 best.
    expect(ranks).toEqual([0, 0, 1, 1, 4, 2, undefined, 0]);
    // A result that does not make the list leaves the progress as it was.
    expect(addQuickScore(progress, 3).progress).toBe(progress);
    expect(addQuickScore(progress, 0).rank).toBeUndefined();
  });
});
