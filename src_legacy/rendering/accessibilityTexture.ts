import { DigitValue } from '@/domain/math/types';

export type AccessibilityTexture = 'plain' | 'stripes' | 'dots';

export function getAccessibilityTexture(value: DigitValue): AccessibilityTexture {
  if (value === 10) {
    return 'stripes';
  }

  if (value === 100) {
    return 'dots';
  }

  return 'plain';
}
