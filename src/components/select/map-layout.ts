// Where the stage and world buttons sit on the winding map.
import { MAP_BOTTOM_SPACE_AFTER_LAST_NODE, MAP_NODE_RADIUS } from '@/components/select/constants';
import type { MapNodeLayout } from '@/components/select/types';
import { DENTAKU_WORLDS } from '@/game/dentaku';

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function getStageNodeLayout(index: number, mapWidth: number): MapNodeLayout {
  const centerX = mapWidth / 2;
  const spiral = index * 0.82 - Math.PI / 2;
  const radius = Math.min(112, 26 + index * 9, mapWidth * 0.31);
  return {
    x: centerX + Math.cos(spiral) * radius,
    y: 96 + index * 104,
  };
}

export function getSelectionMapHeight(layouts: MapNodeLayout[]) {
  const lastNodeBottom = layouts.reduce((max, layout) => Math.max(max, layout.y + MAP_NODE_RADIUS), 0);
  return lastNodeBottom + MAP_BOTTOM_SPACE_AFTER_LAST_NODE;
}

export function getWorldNodeLayouts(mapWidth: number): MapNodeLayout[] {
  const centerX = mapWidth / 2;
  return Array.from({ length: 10 }, (_, index) => {
    const spiral = index * 0.9 - Math.PI / 2;
    const radius = Math.min(118, 24 + index * 16, mapWidth * 0.32);
    return {
      x: centerX + Math.cos(spiral) * radius,
      y: 104 + index * 132,
    };
  });
}

export function getDentakuWorldNodeLayouts(mapWidth: number): MapNodeLayout[] {
  const centerX = mapWidth / 2;
  return Array.from({ length: DENTAKU_WORLDS.length }, (_, index) => {
    const spiral = index * 0.92 - Math.PI / 2;
    const radius = Math.min(112, 24 + index * 15, mapWidth * 0.31);
    return {
      x: centerX + Math.cos(spiral) * radius,
      y: 104 + index * 132,
    };
  });
}
