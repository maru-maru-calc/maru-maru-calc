import { describe, expect, it } from 'vitest';

import { parseJsonObject } from '@/persistence/json';

describe('parseJsonObject', () => {
  it('returns objects from valid JSON', () => {
    expect(parseJsonObject('{"soundEnabled":false}')).toEqual({ soundEnabled: false });
  });

  it('ignores malformed JSON and non-object JSON values', () => {
    expect(parseJsonObject('{bad json')).toBeUndefined();
    expect(parseJsonObject('null')).toBeUndefined();
    expect(parseJsonObject('[1,2,3]')).toBeUndefined();
    expect(parseJsonObject('"settings"')).toBeUndefined();
  });
});
