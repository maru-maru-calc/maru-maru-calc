import { BeadKind, PlaceValue } from './types';

export const BEAD_KINDS: Record<PlaceValue, BeadKind> = {
  1: {
    value: 1,
    label: 'いち',
    radius: 14,
    color: '#F7D56B',
    rimColor: '#C8992F',
    shineColor: '#FFF2B4',
  },
  10: {
    value: 10,
    label: 'じゅう',
    radius: 20,
    color: '#72C7B8',
    rimColor: '#348F83',
    shineColor: '#C7F2EA',
  },
  100: {
    value: 100,
    label: 'ひゃく',
    radius: 28,
    color: '#EE8E78',
    rimColor: '#BC5240',
    shineColor: '#FFD1C5',
  },
  1000: {
    value: 1000,
    label: 'せん',
    radius: 36,
    color: '#8E8BD8',
    rimColor: '#5551A5',
    shineColor: '#DAD8FF',
  },
};

export const PLACE_VALUES: PlaceValue[] = [1, 10, 100, 1000];

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
  return undefined;
}
