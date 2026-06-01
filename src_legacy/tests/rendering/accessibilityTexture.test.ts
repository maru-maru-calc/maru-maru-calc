import { describe, expect, it } from 'vitest';

import { getAccessibilityTexture } from '@/rendering/accessibilityTexture';

describe('getAccessibilityTexture', () => {
  it('maps place values to stable non-color textures', () => {
    expect(getAccessibilityTexture(1)).toBe('plain');
    expect(getAccessibilityTexture(10)).toBe('stripes');
    expect(getAccessibilityTexture(100)).toBe('dots');
  });
});
