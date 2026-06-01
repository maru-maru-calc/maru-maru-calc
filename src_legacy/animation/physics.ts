import { GroupMotionState } from '@/domain/game/types';

export type SpringMotionConfig = {
  damping: number;
  stiffness: number;
  mass?: number;
};

const positionSpringByState: Record<GroupMotionState, SpringMotionConfig> = {
  idle: { damping: 18, stiffness: 105, mass: 1 },
  selected: { damping: 16, stiffness: 120, mass: 1 },
  hinted: { damping: 14, stiffness: 118, mass: 1 },
  dragging: { damping: 20, stiffness: 170, mass: 0.9 },
  dropTarget: { damping: 13, stiffness: 145, mass: 0.96 },
  blockedDropTarget: { damping: 16, stiffness: 130, mass: 1 },
  merging: { damping: 15, stiffness: 135, mass: 1.08 },
  settled: { damping: 14, stiffness: 125, mass: 1 },
};

const scaleSpringByState: Record<GroupMotionState, SpringMotionConfig> = {
  idle: { damping: 18, stiffness: 150 },
  selected: { damping: 18, stiffness: 150 },
  hinted: { damping: 15, stiffness: 165 },
  dragging: { damping: 18, stiffness: 180 },
  dropTarget: { damping: 14, stiffness: 170 },
  blockedDropTarget: { damping: 18, stiffness: 150 },
  merging: { damping: 17, stiffness: 160 },
  settled: { damping: 10, stiffness: 190 },
};

export function getPositionSpringConfig(motionState: GroupMotionState): SpringMotionConfig {
  return positionSpringByState[motionState];
}

export function getScaleSpringConfig(motionState: GroupMotionState): SpringMotionConfig {
  return scaleSpringByState[motionState];
}

export function getMotionScale(motionState: GroupMotionState) {
  if (motionState === 'dragging') {
    return 1.06;
  }

  if (motionState === 'dropTarget') {
    return 1.05;
  }

  if (motionState === 'hinted') {
    return 1.04;
  }

  if (motionState === 'selected' || motionState === 'merging' || motionState === 'blockedDropTarget') {
    return 1.03;
  }

  return 1;
}
