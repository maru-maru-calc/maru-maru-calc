export type PlaceValue = 1 | 10 | 100 | 1000;
export type BeadSign = 1 | -1;
export type BeadRole = 'normal' | 'multiplicand' | 'product';

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
