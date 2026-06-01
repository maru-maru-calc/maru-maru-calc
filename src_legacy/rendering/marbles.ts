import { DigitValue } from '@/domain/math/types';

type MarbleSpec = {
  color: string;
  size: number;
  label: string;
  radiusScale: number;
};

export const marbleSpecs: Record<DigitValue, MarbleSpec> = {
  1: {
    color: '#2f80d8',
    size: 32,
    label: '1',
    radiusScale: 1,
  },
  10: {
    color: '#f09a38',
    size: 44,
    label: '10',
    radiusScale: 1.35,
  },
  100: {
    color: '#8e63c7',
    size: 56,
    label: '100',
    radiusScale: 1.7,
  },
};

export type MarbleRenderSpec = MarbleSpec & {
  radius: number;
};

export function getMarbleRenderSpec(value: DigitValue, screenWidth?: number, scale = 1): MarbleRenderSpec {
  const spec = marbleSpecs[value];
  if (!screenWidth) {
    const radius = Math.round((spec.size / 2) * scale);
    return {
      ...spec,
      radius,
      size: radius * 2,
    };
  }

  const baseRadius = clamp(screenWidth * 0.045, 16, 22);
  const radius = Math.round(baseRadius * spec.radiusScale * scale);

  return {
    ...spec,
    radius,
    size: radius * 2,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
