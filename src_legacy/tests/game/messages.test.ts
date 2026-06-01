import { describe, expect, it } from 'vitest';

import { getGameMessage } from '@/domain/game/messages';

describe('getGameMessage', () => {
  it('returns normal game messages by default', () => {
    expect(getGameMessage('start')).toBe('2つの数を選んで、＋であわせよう');
    expect(getGameMessage('resultReady')).toBe('できた数を次に使えます');
  });

  it('returns hiragana game messages when requested', () => {
    expect(getGameMessage('targetMade', 'hiragana')).toBe('もくひょうのかずができました。さわってみよう');
  });
});
