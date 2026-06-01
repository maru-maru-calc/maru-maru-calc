import { NumberObject } from '@/domain/math/types';
import { getMarbleRenderSpec } from '@/rendering/marbles';

export type LaidOutNumberObject = {
  object: NumberObject;
  x: number;
  y: number;
  rotationDeg: number;
  zIndex: number;
};

const GROUP_AREA = {
  width: 126,
  height: 96,
};

const DIGIT_LAYERS = {
  100: { baseY: 18, zIndex: 1 },
  10: { baseY: 34, zIndex: 2 },
  1: { baseY: 52, zIndex: 3 },
} as const;

export function layoutNumberObjects(objects: NumberObject[], screenWidth?: number): LaidOutNumberObject[] {
  const byDigit = {
    100: objects.filter((object) => object.value === 100),
    10: objects.filter((object) => object.value === 10),
    1: objects.filter((object) => object.value === 1),
  };

  return [100, 10, 1].flatMap((digitValue) => {
    const digitObjects = byDigit[digitValue as keyof typeof byDigit];
    const layer = DIGIT_LAYERS[digitValue as keyof typeof DIGIT_LAYERS];
    const positions = getArcPositions(digitObjects.length, layer.baseY);

    return digitObjects.map((object, index) => ({
      object,
      x: positions[index].x + getStableOffset(object.id, 'x', 2.4),
      y: positions[index].y + getStableOffset(object.id, 'y', 1.8) - getMarbleRenderSpec(object.value, screenWidth).size / 2,
      rotationDeg: getStableOffset(object.id, 'r', 7),
      zIndex: layer.zIndex * 100 + index,
    }));
  });
}

function getArcPositions(count: number, baseY: number) {
  if (count === 0) {
    return [];
  }

  const slotWidth = GROUP_AREA.width / Math.max(count, 3);
  const startX = GROUP_AREA.width / 2 - (slotWidth * (count - 1)) / 2;

  return Array.from({ length: count }).map((_, index) => {
    const centerOffset = index - (count - 1) / 2;
    const arcY = Math.abs(centerOffset) * 3.2;

    return {
      x: startX + slotWidth * index,
      y: baseY + arcY,
    };
  });
}

function getStableOffset(id: string, salt: string, amplitude: number) {
  const hash = `${id}:${salt}`.split('').reduce((value, character) => {
    return (value * 31 + character.charCodeAt(0)) % 997;
  }, 17);

  return ((hash / 996) * 2 - 1) * amplitude;
}
