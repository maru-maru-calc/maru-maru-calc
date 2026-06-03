export type PlaceValue = 1 | 10 | 100 | 1000 | 10000 | 100000;
export type BeadSign = 1 | -1;
export type BeadRole = 'normal' | 'multiplicand' | 'product' | 'division';

export type BeadKind = {
  value: PlaceValue;
  label: string;
  radius: number;
  color: string;
  rimColor: string;
  shineColor: string;
};

export type Stage = {
  id: string;
  title: string;
  target: number;
  allowedValues: PlaceValue[];
  islandId: 'addition' | 'subtraction';
  islandTitle: string;
  setTitle: string;
  bubbleCounts: number[];
};

export type BeadSnapshot = {
  id: string;
  value: PlaceValue;
  count: number;
  sign: BeadSign;
  role: BeadRole;
  x: number;
  y: number;
};

export type MergeCluster = {
  value: PlaceValue;
  sign: BeadSign;
  beadIds: string[];
  center: {
    x: number;
    y: number;
  };
};
