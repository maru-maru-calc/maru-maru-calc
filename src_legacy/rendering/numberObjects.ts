import { normalizeNumber, digitValues } from '@/domain/math/normalize';
import { NumberObject } from '@/domain/math/types';

export function createRenderNumberObjects(value: number, groupId: string): NumberObject[] {
  const normalized = normalizeNumber(value);
  const objects: NumberObject[] = [];

  for (const digitValue of digitValues) {
    for (let index = 0; index < normalized.counts[digitValue]; index += 1) {
      objects.push({
        id: `${groupId}-${digitValue}-${index}`,
        value: digitValue,
        groupId,
      });
    }
  }

  return objects;
}
