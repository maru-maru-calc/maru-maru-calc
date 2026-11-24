import { describe, expect, it } from 'vitest';

import { createInitialNavState, getParentScreen, normalizeNavState } from '@/game/navigation';
import type { NavOptions } from '@/game/navigation';

const options: NavOptions = {
  worldIds: ['addition', 'subtraction'],
  dentakuWorldIds: ['kuku', 'addition'],
  longFormWorldIds: ['addition', 'division'],
  stageCount: 10,
  dentakuStageIds: ['dentaku-kuku-dan-1', 'dentaku-kuku-dan-2'],
  longFormStageIds: ['long-form-addition-1', 'long-form-addition-2'],
};

describe('navigation state', () => {
  it('starts on the launch screen with the first world and stage selected', () => {
    expect(createInitialNavState(options)).toEqual({
      screen: 'launch',
      worldId: 'addition',
      dentakuWorldId: 'kuku',
      longFormWorldId: 'addition',
      stageIndex: 0,
      dentakuStageId: 'dentaku-kuku-dan-1',
      longFormStageId: 'long-form-addition-1',
    });
  });

  it('leads every screen back to the mode select through its parents', () => {
    expect(getParentScreen('game')).toBe('stage');
    expect(getParentScreen('stage')).toBe('world');
    expect(getParentScreen('world')).toBe('mode');
    expect(getParentScreen('dentakuGame')).toBe('dentakuStage');
    expect(getParentScreen('dentakuStage')).toBe('dentakuWorld');
    expect(getParentScreen('dentakuWorld')).toBe('mode');
    expect(getParentScreen('longFormGame')).toBe('longFormStage');
    expect(getParentScreen('longFormStage')).toBe('longFormWorld');
    expect(getParentScreen('longFormWorld')).toBe('mode');
  });

  it('has no parent for the top screens', () => {
    expect(getParentScreen('mode')).toBeUndefined();
    expect(getParentScreen('launch')).toBeUndefined();
  });

  it('keeps a valid stored state as it is', () => {
    const stored = {
      screen: 'game',
      worldId: 'subtraction',
      dentakuWorldId: 'addition',
      longFormWorldId: 'division',
      stageIndex: 7,
      dentakuStageId: 'dentaku-kuku-dan-2',
      longFormStageId: 'long-form-addition-2',
    };

    expect(normalizeNavState(stored, options)).toEqual(stored);
  });

  it('rejects values that are not a navigation state', () => {
    expect(normalizeNavState(undefined, options)).toBeUndefined();
    expect(normalizeNavState(null, options)).toBeUndefined();
    expect(normalizeNavState('game', options)).toBeUndefined();
    expect(normalizeNavState({ id: 'router-entry' }, options)).toBeUndefined();
    expect(normalizeNavState({ screen: 'settings' }, options)).toBeUndefined();
  });

  it('falls back to defaults for unknown ids and out-of-range stages', () => {
    expect(
      normalizeNavState(
        {
          screen: 'stage',
          worldId: 'removed-world',
          dentakuWorldId: 42,
          stageIndex: 10,
          dentakuStageId: 'removed-stage',
        },
        options,
      ),
    ).toEqual({
      screen: 'stage',
      worldId: 'addition',
      dentakuWorldId: 'kuku',
      longFormWorldId: 'addition',
      stageIndex: 0,
      dentakuStageId: 'dentaku-kuku-dan-1',
      longFormStageId: 'long-form-addition-1',
    });
    expect(normalizeNavState({ screen: 'game', stageIndex: -1 }, options)?.stageIndex).toBe(0);
    expect(normalizeNavState({ screen: 'game', stageIndex: 1.5 }, options)?.stageIndex).toBe(0);
  });
});
