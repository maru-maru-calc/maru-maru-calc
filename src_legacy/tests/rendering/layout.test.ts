import { describe, expect, it } from 'vitest';

import { NumberObject } from '@/domain/math/types';
import { layoutNumberObjects } from '@/rendering/layout';

function object(id: string, value: NumberObject['value']): NumberObject {
  return {
    id,
    value,
    groupId: 'group',
  };
}

describe('layoutNumberObjects', () => {
  it('renders larger place values behind smaller place values', () => {
    const layout = layoutNumberObjects([object('one', 1), object('ten', 10), object('hundred', 100)]);

    const hundred = layout.find((item) => item.object.id === 'hundred');
    const ten = layout.find((item) => item.object.id === 'ten');
    const one = layout.find((item) => item.object.id === 'one');

    expect(hundred?.zIndex).toBeLessThan(ten?.zIndex ?? 0);
    expect(ten?.zIndex).toBeLessThan(one?.zIndex ?? 0);
  });

  it('places same-digit objects in a horizontal arc', () => {
    const layout = layoutNumberObjects([
      object('one-1', 1),
      object('one-2', 1),
      object('one-3', 1),
      object('one-4', 1),
      object('one-5', 1),
    ]);

    const xPositions = layout.map((item) => item.x);
    const yPositions = layout.map((item) => item.y);

    expect(xPositions).toEqual([...xPositions].sort((left, right) => left - right));
    expect(yPositions[0]).toBeGreaterThan(yPositions[2]);
    expect(yPositions[4]).toBeGreaterThan(yPositions[2]);
  });

  it('keeps tactile offsets stable for the same object ids', () => {
    const objects = [object('one-1', 1), object('one-2', 1), object('one-3', 1)];

    expect(layoutNumberObjects(objects)).toEqual(layoutNumberObjects(objects));
    expect(layoutNumberObjects(objects).map((item) => item.rotationDeg)).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
  });
});
