import { describe, expect, it } from 'vitest';

import { createRenderNumberObjects } from '@/rendering/numberObjects';

describe('createRenderNumberObjects', () => {
  it('creates normalized objects for display without creating a number group', () => {
    expect(createRenderNumberObjects(31, 'preview').map((object) => object.value)).toEqual([10, 10, 10, 1]);
  });

  it('creates no objects for zero', () => {
    expect(createRenderNumberObjects(0, 'zero')).toEqual([]);
  });
});
