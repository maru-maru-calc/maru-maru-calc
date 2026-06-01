import { describe, expect, it } from 'vitest';

import { getGroupBridgeLayout } from '@/rendering/groupBridge';

describe('getGroupBridgeLayout', () => {
  it('returns no bridge unless exactly two groups are selected', () => {
    expect(
      getGroupBridgeLayout(['left'], { left: { x: 0.2, y: 0.3 } }, { width: 300, height: 240 }),
    ).toBeUndefined();
  });

  it('builds a horizontal bridge between selected groups', () => {
    expect(
      getGroupBridgeLayout(
        ['left', 'right'],
        {
          left: { x: 0.25, y: 0.5 },
          right: { x: 0.75, y: 0.5 },
        },
        { width: 400, height: 300 },
      ),
    ).toMatchObject({
      left: 100,
      top: 143,
      width: 200,
      angleDeg: 0,
    });
  });

  it('rotates the bridge toward the second selected group', () => {
    const bridge = getGroupBridgeLayout(
      ['left', 'right'],
      {
        left: { x: 0.4, y: 0.4 },
        right: { x: 0.5, y: 0.6 },
      },
      { width: 300, height: 300 },
    );

    expect(bridge?.angleDeg).toBeGreaterThan(45);
    expect(bridge?.angleDeg).toBeLessThan(75);
  });
});
