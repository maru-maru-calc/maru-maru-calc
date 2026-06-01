import { GroupPosition } from '@/domain/game/types';

export type GroupBridgeLayout = {
  left: number;
  top: number;
  width: number;
  angleDeg: number;
};

export function getGroupBridgeLayout(
  selectedGroupIds: string[],
  groupPositions: Record<string, GroupPosition>,
  layout: { width: number; height: number },
): GroupBridgeLayout | undefined {
  if (selectedGroupIds.length !== 2 || layout.width <= 0 || layout.height <= 0) {
    return undefined;
  }

  const [leftGroupId, rightGroupId] = selectedGroupIds;
  const leftPosition = groupPositions[leftGroupId];
  const rightPosition = groupPositions[rightGroupId];
  if (!leftPosition || !rightPosition) {
    return undefined;
  }

  const leftPoint = toPixelPoint(leftPosition, layout);
  const rightPoint = toPixelPoint(rightPosition, layout);
  const deltaX = rightPoint.x - leftPoint.x;
  const deltaY = rightPoint.y - leftPoint.y;
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  if (distance <= 1) {
    return undefined;
  }

  return {
    left: (leftPoint.x + rightPoint.x) / 2 - distance / 2,
    top: (leftPoint.y + rightPoint.y) / 2 - 7,
    width: distance,
    angleDeg: (Math.atan2(deltaY, deltaX) * 180) / Math.PI,
  };
}

function toPixelPoint(position: GroupPosition, layout: { width: number; height: number }) {
  return {
    x: position.x * layout.width,
    y: position.y * layout.height,
  };
}
