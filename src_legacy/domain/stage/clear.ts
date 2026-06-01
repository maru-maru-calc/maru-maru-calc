import { NumberGroup } from '@/domain/math/types';

export function isStageClear(numberGroups: NumberGroup[], targetValue: number) {
  return numberGroups.length === 1 && numberGroups[0]?.value === targetValue;
}
