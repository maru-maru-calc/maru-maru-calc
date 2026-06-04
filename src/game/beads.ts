import { BeadKind, PlaceValue } from './types';

export const BEAD_KINDS: Record<PlaceValue, BeadKind> = {
  1: {
    value: 1,
    label: 'いち',
    radius: 14,
    color: '#FDE68A',
    rimColor: '#CFA83A',
    shineColor: '#FFF7C7',
  },
  10: {
    value: 10,
    label: 'じゅう',
    radius: 20,
    color: '#8DEBD8',
    rimColor: '#24AFA3',
    shineColor: '#D9FFF6',
  },
  100: {
    value: 100,
    label: 'ひゃく',
    radius: 28,
    color: '#7DD3FC',
    rimColor: '#0284C7',
    shineColor: '#DFF7FF',
  },
  1000: {
    value: 1000,
    label: 'せん',
    radius: 36,
    color: '#A9D8FF',
    rimColor: '#317FB5',
    shineColor: '#E7F6FF',
  },
  10000: {
    value: 10000,
    label: 'いちまん',
    radius: 42,
    color: '#B8C7FF',
    rimColor: '#5B78C6',
    shineColor: '#EDF1FF',
  },
  100000: {
    value: 100000,
    label: 'じゅうまん',
    radius: 48,
    color: '#D2C6FF',
    rimColor: '#7B6BB8',
    shineColor: '#F2EEFF',
  },
};

export const PLACE_VALUES: PlaceValue[] = [1, 10, 100, 1000, 10000, 100000];

export function getBeadKind(value: PlaceValue) {
  return BEAD_KINDS[value];
}

export function getNextPlaceValue(value: PlaceValue): PlaceValue | undefined {
  if (value === 1) {
    return 10;
  }
  if (value === 10) {
    return 100;
  }
  if (value === 100) {
    return 1000;
  }
  if (value === 1000) {
    return 10000;
  }
  if (value === 10000) {
    return 100000;
  }
  return undefined;
}
