// Shapes used by the select screens: stage states, the worlds, and the specs of backdrop bubbles and sea creatures.
import { Stage } from '@/game/types';

export type StageStatus = 'done' | 'open' | 'locked';
export type WorldId = Stage['islandId'];
export type DepthBubbleSpec = {
  id: string;
  xRatio: number;
  size: number;
  speed: number;
  delay: number;
  drift: number;
};
export type DepthFishSpec = {
  id: string;
  depth: number;
  yRatio: number;
  size: number;
  speed: number;
  delay: number;
  direction: 1 | -1;
  tint: string;
  kind: 'fish' | 'clownfish' | 'blueTang' | 'puffer' | 'seahorse' | 'squid' | 'ray' | 'turtle' | 'tuna' | 'shark' | 'whale' | 'flatfish' | 'jelly' | 'angler';
};

export type MapNodeLayout = {
  x: number;
  y: number;
};
