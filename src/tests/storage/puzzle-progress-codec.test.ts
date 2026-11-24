import { describe, expect, it } from 'vitest';

import { addSolvedPuzzle, createEmptyPuzzleProgress, parsePuzzleProgress, serializePuzzleProgress } from '@/storage/puzzle-progress-codec';

describe('puzzle progress', () => {
  it('comes back as it was written', () => {
    const progress = { version: 1 as const, solved: ['puzzle-a', 'puzzle-b'], startVisits: 4 };

    expect(parsePuzzleProgress(serializePuzzleProgress(progress))).toEqual(progress);
  });

  it('starts empty when nothing, or nothing readable, is stored', () => {
    for (const raw of [null, undefined, '', 'not json', '[]', '42', 'null']) {
      expect(parsePuzzleProgress(raw)).toEqual(createEmptyPuzzleProgress());
    }
  });

  it('keeps what it can read of a damaged or older save', () => {
    expect(parsePuzzleProgress('{"solved":["a",3,"a",null,"b"],"startVisits":"many"}')).toEqual({ version: 1, solved: ['a', 'b'], startVisits: 0 });
    expect(parsePuzzleProgress('{"startVisits":2.9}')).toEqual({ version: 1, solved: [], startVisits: 2 });
    expect(parsePuzzleProgress('{"solved":"all","startVisits":-3}')).toEqual(createEmptyPuzzleProgress());
  });

  it('adds a solved puzzle once', () => {
    const once = addSolvedPuzzle(createEmptyPuzzleProgress(), 'puzzle-a');

    expect(once.solved).toEqual(['puzzle-a']);
    expect(addSolvedPuzzle(once, 'puzzle-a')).toBe(once);
    expect(addSolvedPuzzle(once, 'puzzle-b').solved).toEqual(['puzzle-a', 'puzzle-b']);
  });
});
