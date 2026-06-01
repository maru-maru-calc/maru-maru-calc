import { getNextPlaceValue } from './beads';
import { BeadSign, BeadSnapshot, MergeCluster, PlaceValue } from './types';

const MERGE_COUNT = 10;

export function getTotalValue(beads: Array<Pick<BeadSnapshot, 'value'> & Partial<Pick<BeadSnapshot, 'count' | 'sign'>>>) {
  return beads.reduce((sum, bead) => sum + bead.value * (bead.count ?? 1) * (bead.sign ?? 1), 0);
}

export function canMergeValue(value: PlaceValue) {
  return getNextPlaceValue(value) !== undefined;
}

export function hasMergeableCount(beads: BeadSnapshot[]) {
  const countsByValueAndSign = new Map<string, number>();

  for (const bead of beads) {
    if (bead.role !== 'normal' || !canMergeValue(bead.value)) {
      continue;
    }

    const key = getValueSignKey(bead.value, bead.sign);
    countsByValueAndSign.set(key, (countsByValueAndSign.get(key) ?? 0) + bead.count);
  }

  return [...countsByValueAndSign.values()].some((count) => count >= MERGE_COUNT);
}

export function findMergeCluster(beads: BeadSnapshot[], clusterRadius = 72): MergeCluster | undefined {
  const candidates = beads.filter((bead) => bead.role === 'normal' && canMergeValue(bead.value));
  const valueSigns = getValueSigns(candidates);

  for (const { value, sign } of valueSigns) {
    const sameValueBeads = candidates.filter((bead) => bead.value === value && bead.sign === sign);
    const visitedIds = new Set<string>();

    for (const startBead of sameValueBeads) {
      if (visitedIds.has(startBead.id)) {
        continue;
      }

      const connectedBeads = findConnectedBeads(startBead, sameValueBeads, clusterRadius);
      connectedBeads.forEach((bead) => visitedIds.add(bead.id));

      const connectedCount = connectedBeads.reduce((sum, bead) => sum + bead.count, 0);

      if (connectedCount >= MERGE_COUNT) {
        const mergeBeads = pickMergeBeads(connectedBeads);

        return {
          value,
          sign,
          beadIds: mergeBeads.map((nearBead) => nearBead.id),
          center: getCenter(mergeBeads),
        };
      }
    }
  }

  return undefined;
}

function getValueSigns(beads: BeadSnapshot[]) {
  const keys = [...new Set(beads.map((bead) => getValueSignKey(bead.value, bead.sign)))];
  return keys.map((key) => {
    const [value, sign] = key.split(':');
    return {
      value: Number(value) as PlaceValue,
      sign: Number(sign) as BeadSign,
    };
  });
}

function getValueSignKey(value: PlaceValue, sign: BeadSign) {
  return `${value}:${sign}`;
}

function pickMergeBeads(beads: BeadSnapshot[]) {
  const center = getCenter(beads);
  const sortedBeads = beads
    .map((bead) => ({
      bead,
      distance: getDistance(bead, center),
    }))
    .sort((left, right) => left.distance - right.distance)
    .map((candidate) => candidate.bead);

  const mergeBeads: BeadSnapshot[] = [];
  let count = 0;
  for (const bead of sortedBeads) {
    mergeBeads.push(bead);
    count += bead.count;
    if (count >= MERGE_COUNT) {
      break;
    }
  }

  return mergeBeads;
}

function findConnectedBeads(startBead: BeadSnapshot, beads: BeadSnapshot[], clusterRadius: number) {
  const connectedBeads: BeadSnapshot[] = [];
  const queuedBeads = [startBead];
  const visitedIds = new Set<string>();

  while (queuedBeads.length > 0) {
    const bead = queuedBeads.shift();
    if (!bead || visitedIds.has(bead.id)) {
      continue;
    }

    visitedIds.add(bead.id);
    connectedBeads.push(bead);

    for (const candidate of beads) {
      if (!visitedIds.has(candidate.id) && getDistance(bead, candidate) <= clusterRadius) {
        queuedBeads.push(candidate);
      }
    }
  }

  return connectedBeads;
}

function getDistance(left: Pick<BeadSnapshot, 'x' | 'y'>, right: Pick<BeadSnapshot, 'x' | 'y'>) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCenter(beads: BeadSnapshot[]) {
  const total = beads.reduce(
    (center, bead) => ({
      x: center.x + bead.x,
      y: center.y + bead.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / beads.length,
    y: total.y / beads.length,
  };
}
