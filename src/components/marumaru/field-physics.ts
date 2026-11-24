// What happens between maru on the field: forces, collisions, and finding pairs and groups that react.
import * as Matter from 'matter-js';

import {
  ANNIHILATION_ATTRACTION_FORCE,
  ANNIHILATION_ATTRACTION_RADIUS,
  ATTRACTION_FORCE,
  ATTRACTION_RADIUS,
  BASIN_BODY_THICKNESS,
  BASIN_ENTITY_GUARD_MARGIN,
  COLLISION_CATEGORY_BY_VALUE,
  COLLISION_CATEGORY_WORLD,
  PRODUCT_BUBBLE_BURST_DELAY_MS,
  SEPARATION_FORCE,
  SEPARATION_RADIUS,
  UNIT_MERGE_MAX_CLUSTER_SPEED,
  UNIT_MERGE_MIN_SETTLED_Y_RATIO,
} from '@/components/marumaru/constants';
import {
  clamp,
  clampEntityX,
  clampEntityY,
  getBasinCurveMetrics,
  getBasinFrameSegments,
  getBasinSurfaceY,
  getEntityRadius,
  getEntityUnitCount,
  getPointDistance,
} from '@/components/marumaru/field-layout';
import type { BeadEntity, MergeAnimation, OperationSource, PendingBubble } from '@/components/marumaru/types';
import { getNextPlaceValue } from '@/game/beads';
import { getPendingOperationExpressionValue } from '@/game/expression';
import { BeadSign, BeadSnapshot, MergeCluster, PlaceValue } from '@/game/types';

export function toSnapshots(entities: BeadEntity[], bounds?: { width: number; height: number }): BeadSnapshot[] {
  return entities.map((entity) => {
    const x = bounds ? clampEntityX(entity, bounds.width) : entity.body.position.x;
    return {
      id: entity.id,
      value: entity.value,
      count: entity.count,
      sign: entity.sign,
      role: entity.role,
      x,
      y: bounds ? clampEntityY(entity, bounds.width, bounds.height, x) : entity.body.position.y,
    };
  });
}

export function canBurstBead(bead: BeadSnapshot) {
  return isBurstableWrappedGroup(bead);
}

export function isBurstableWrappedGroup(bead: Pick<BeadSnapshot, 'value' | 'count' | 'role'>) {
  return bead.value === 1 && bead.count > 1;
}

export function findAutoBurstFieldBubble(entities: BeadEntity[], fieldWidth: number, fieldHeight: number) {
  return entities
    .filter((entity) => {
      if (!isBurstableWrappedGroup(entity) || entity.role === 'multiplicand') {
        return false;
      }

      const radius = getEntityRadius(entity.value, entity.count);
      const bottomY = getBasinSurfaceY(fieldWidth, fieldHeight, entity.body.position.x) - radius - BASIN_ENTITY_GUARD_MARGIN;
      const velocity = entity.body.velocity;
      const speed = Math.hypot(velocity.x, velocity.y);
      return entity.body.position.y >= bottomY - 32 && speed < 1.15;
    })
    .sort((left, right) => right.body.position.y - left.body.position.y || right.count - left.count)[0];
}

export function isWrappableEntity(entity: Pick<BeadEntity, 'role'>) {
  return entity.role === 'normal' || entity.role === 'product' || entity.role === 'division' || entity.role === 'multiplicand';
}

export function getEntityCenter(entities: BeadEntity[]) {
  const total = entities.reduce(
    (center, entity) => ({
      x: center.x + entity.body.position.x,
      y: center.y + entity.body.position.y,
    }),
    { x: 0, y: 0 },
  );

  return {
    x: total.x / entities.length,
    y: total.y / entities.length,
  };
}

export function removeBodies(engine: Matter.Engine, entities: Pick<BeadEntity, 'body'>[]) {
  for (const entity of entities) {
    Matter.Composite.remove(engine.world, entity.body);
  }
}

function getMultiplicationSource(entities: BeadEntity[], sign: BeadSign = 1): OperationSource {
  const candidates = entities.filter((entity) => isWrappableEntity(entity) && entity.sign === sign);
  return {
    entities: candidates,
    count: candidates.reduce((sum, entity) => sum + getEntityUnitCount(entity), 0),
    sign,
  };
}

export function getOperationSource(entities: BeadEntity[], expressionTokens: string[]): OperationSource {
  const expressionValue = getPendingOperationExpressionValue(expressionTokens);
  const targetSign: BeadSign = expressionValue !== undefined && expressionValue < 0 ? -1 : 1;
  const matchingEntities = entities.filter((entity) => isWrappableEntity(entity) && entity.sign === targetSign);
  const matchingTotal = matchingEntities.reduce((sum, entity) => sum + getEntityUnitCount(entity), 0);
  if (expressionValue !== undefined && Math.abs(expressionValue) > 0 && matchingEntities.length > 0) {
    return {
      entities: matchingEntities,
      count: Math.abs(expressionValue),
      sign: targetSign,
    };
  }

  if (matchingEntities.length > 0) {
    return {
      entities: matchingEntities,
      count: matchingTotal,
      sign: targetSign,
    };
  }

  const wrappableEntities = entities.filter((entity) => isWrappableEntity(entity));
  const wrappedGroup = wrappableEntities.find((entity) => entity.role === 'multiplicand');
  const fallbackSign = wrappedGroup?.sign ?? wrappableEntities[0]?.sign ?? targetSign;
  return getMultiplicationSource(entities, fallbackSign);
}

export function findDecompositionPair(beads: BeadSnapshot[]) {
  for (const higher of beads) {
    for (const lower of beads) {
      if (higher.id === lower.id || higher.sign === lower.sign || lower.count !== 1) {
        continue;
      }

      if (getNextPlaceValue(lower.value) !== higher.value) {
        continue;
      }

      const samePlaceCancellationTarget = beads.some(
        (candidate) => candidate.id !== lower.id && candidate.value === lower.value && candidate.count === lower.count && candidate.sign === -lower.sign,
      );
      if (samePlaceCancellationTarget) {
        continue;
      }

      const distance = getPointDistance(higher, lower);
      const threshold = getEntityRadius(higher.value, higher.count) + getEntityRadius(lower.value, lower.count) + 14;
      if (distance <= threshold) {
        return {
          higherBeadId: higher.id,
          lowerValue: lower.value,
        };
      }
    }
  }

  return undefined;
}

export function findProductBubbleCollision(entities: BeadEntity[], now: number) {
  const productGroups = entities.filter(
    (entity) =>
      isBurstableWrappedGroup(entity) &&
      entity.role !== 'multiplicand' &&
      (entity.role !== 'product' || now - entity.createdAt >= PRODUCT_BUBBLE_BURST_DELAY_MS),
  );

  for (const productGroup of productGroups) {
    for (const collider of entities) {
      if (collider.id === productGroup.id) {
        continue;
      }

      const distance = getPointDistance(productGroup.body.position, collider.body.position);
      const threshold = getEntityRadius(productGroup.value, productGroup.count) + getEntityRadius(collider.value, collider.count) + 4;
      if (distance <= threshold) {
        return {
          productGroupId: productGroup.id,
        };
      }
    }
  }

  return undefined;
}

export function findAnnihilationPair(beads: BeadSnapshot[]) {
  const positives = beads.filter((bead) => bead.sign > 0);
  const negatives = beads.filter((bead) => bead.sign < 0);
  const candidates: Array<{ beadIds: string[]; center: { x: number; y: number }; value: PlaceValue; distance: number }> = [];

  for (const positive of positives) {
    for (const negative of negatives) {
      if (positive.value !== negative.value || positive.count !== negative.count) {
        continue;
      }

      const distance = getPointDistance(positive, negative);
      const threshold = Math.max(104, getEntityRadius(positive.value, positive.count) + getEntityRadius(negative.value, negative.count) + 28);
      if (distance <= threshold) {
        candidates.push({
          beadIds: [positive.id, negative.id],
          center: {
            x: (positive.x + negative.x) / 2,
            y: (positive.y + negative.y) / 2,
          },
          value: positive.value,
          distance,
        });
      }
    }
  }

  const pair = candidates.sort((left, right) => left.value - right.value || left.distance - right.distance)[0];
  return pair ? { beadIds: pair.beadIds, center: pair.center } : undefined;
}

export function hasPendingSamePlaceCancellation(beads: BeadSnapshot[]) {
  return beads.some((left, leftIndex) =>
    beads.some(
      (right, rightIndex) =>
        leftIndex !== rightIndex &&
        left.sign !== right.sign &&
        left.value === right.value &&
        left.count === right.count,
    ),
  );
}

export function isUnitMergeSettled(cluster: MergeCluster, entities: BeadEntity[], fieldHeight: number) {
  const clusterIds = new Set(cluster.beadIds);
  const clusterEntities = entities.filter((entity) => clusterIds.has(entity.id));
  if (clusterEntities.length === 0) {
    return false;
  }

  const averageY = clusterEntities.reduce((sum, entity) => sum + entity.body.position.y, 0) / clusterEntities.length;
  if (averageY < fieldHeight * UNIT_MERGE_MIN_SETTLED_Y_RATIO) {
    return false;
  }

  const maxSpeed = clusterEntities.reduce((speed, entity) => {
    const velocity = entity.body.velocity;
    return Math.max(speed, Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y));
  }, 0);

  return maxSpeed <= UNIT_MERGE_MAX_CLUSTER_SPEED;
}

export function keepBodiesInsideField(fieldWidth: number, fieldHeight: number, entities: BeadEntity[]) {
  for (const entity of entities) {
    const currentX = entity.body.position.x;
    const currentY = entity.body.position.y;
    const nextX = clampEntityX(entity, fieldWidth);
    const nextY = clampEntityY(entity, fieldWidth, fieldHeight, nextX);
    if (nextX !== currentX || nextY !== currentY) {
      const pullX = (nextX - currentX) * 0.34;
      const pullY = (nextY - currentY) * 0.34;
      Matter.Body.setPosition(entity.body, { x: nextX, y: nextY });
      Matter.Body.setVelocity(entity.body, {
        x: nextX === currentX ? entity.body.velocity.x : pullX,
        y: nextY === currentY ? entity.body.velocity.y : pullY,
      });
    }
  }
}

export function isStageReadyForResult(pendingBubbles: PendingBubble[]) {
  return pendingBubbles.length === 0;
}

export function findAlmostMergeBeadIds(beads: BeadSnapshot[]) {
  const highlightedIds = new Set<string>();
  const candidates = beads.filter((bead) => bead.role === 'normal' && bead.value === 1 && bead.count === 1);
  const visitedIds = new Set<string>();

  for (const startBead of candidates) {
    if (visitedIds.has(startBead.id)) {
      continue;
    }

    const connected = findConnectedAlmostMergeBeads(startBead, candidates);
    connected.forEach((bead) => visitedIds.add(bead.id));
    if (connected.length >= 7 && connected.length < 10) {
      connected.forEach((bead) => highlightedIds.add(bead.id));
    }
  }

  return highlightedIds;
}

function findConnectedAlmostMergeBeads(startBead: BeadSnapshot, beads: BeadSnapshot[]) {
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
      if (candidate.sign !== bead.sign || visitedIds.has(candidate.id)) {
        continue;
      }
      if (getPointDistance(bead, candidate) <= 82) {
        queuedBeads.push(candidate);
      }
    }
  }

  return connectedBeads;
}

export function getMergeAnimationTarget(beadId: string, animation: MergeAnimation, progress: number) {
  if (animation.value !== 1 || progress >= 0.72) {
    return animation.center;
  }

  const beadIndex = Math.max(0, animation.beadIds.indexOf(beadId));
  const beadCount = Math.max(animation.beadIds.length, 1);
  const angle = -Math.PI / 2 + (Math.PI * 2 * beadIndex) / beadCount;
  const ringRadius = 24;

  return {
    x: animation.center.x + Math.cos(angle) * ringRadius,
    y: animation.center.y + Math.sin(angle) * ringRadius,
  };
}

export function getBeadCollisionFilter(value: PlaceValue) {
  const category = COLLISION_CATEGORY_BY_VALUE[value];
  return {
    category,
    mask: COLLISION_CATEGORY_WORLD | category,
  };
}

export function getWorldCollisionFilter() {
  return {
    category: COLLISION_CATEGORY_WORLD,
    mask:
      COLLISION_CATEGORY_WORLD |
      COLLISION_CATEGORY_BY_VALUE[1] |
      COLLISION_CATEGORY_BY_VALUE[10] |
      COLLISION_CATEGORY_BY_VALUE[100] |
      COLLISION_CATEGORY_BY_VALUE[1000] |
      COLLISION_CATEGORY_BY_VALUE[10000] |
      COLLISION_CATEGORY_BY_VALUE[100000],
  };
}

export function createLaunchBeads(engine: Matter.Engine, fieldWidth: number, fieldHeight: number): BeadEntity[] {
  const radius = getEntityRadius(1, 1);
  const curve = getBasinCurveMetrics(fieldWidth, fieldHeight);
  const xPositions = [0.33, 0.39, 0.45, 0.5, 0.55, 0.61, 0.67, 0.73];
  const entities = xPositions.map((ratio, index) => {
    const x = fieldWidth * ratio;
    const arcX = x - curve.centerX;
    const surfaceY = curve.arcCenterY + Math.sqrt(Math.max(0, curve.radius * curve.radius - arcX * arcX));
    const y = surfaceY - radius - 5;
    const body = Matter.Bodies.circle(x, y, radius, {
      restitution: 0.08,
      friction: 0.22,
      frictionStatic: 0.02,
      frictionAir: 0.004,
      density: 0.0028,
      label: 'bead-1',
      collisionFilter: getBeadCollisionFilter(1),
    });

    return {
      id: `launch-bead-${index}`,
      value: 1 as const,
      count: 1,
      sign: 1 as const,
      role: 'normal' as const,
      createdAt: Date.now() - 1000,
      body,
    };
  });

  Matter.Composite.add(engine.world, entities.map((entity) => entity.body));
  return entities;
}

export function applyBeadForces(entities: BeadEntity[], draggingBeadId?: string) {
  const attractionCounts = getAttractionCounts(entities, draggingBeadId);
  const singlesPresent = new Set(entities.filter((entity) => entity.count === 1).map((entity) => `${entity.value}:${entity.sign}`));
  // A lone maru to take away with nothing of its own size to cancel against has to break a bigger
  // one (a ten for a one). That happens when the two touch, so they are drawn together. Without
  // this they pushed each other apart like any other unlike pair and could come to rest side by
  // side for good: the amount on the board never settled, and a × or ÷ waited for it forever.
  const needsBiggerMaru = (single: BeadEntity, other: BeadEntity) =>
    single.count === 1
    && single.sign !== other.sign
    && getNextPlaceValue(single.value) === other.value
    && !singlesPresent.has(`${single.value}:${-single.sign}`);

  for (let leftIndex = 0; leftIndex < entities.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entities.length; rightIndex += 1) {
      const left = entities[leftIndex];
      const right = entities[rightIndex];
      if (left.id === draggingBeadId || right.id === draggingBeadId) {
        continue;
      }

      const dx = right.body.position.x - left.body.position.x;
      const dy = right.body.position.y - left.body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= 1) {
        continue;
      }

      const leftSpeed = Math.sqrt(left.body.velocity.x * left.body.velocity.x + left.body.velocity.y * left.body.velocity.y);
      const rightSpeed = Math.sqrt(right.body.velocity.x * right.body.velocity.x + right.body.velocity.y * right.body.velocity.y);
      const velocityFactor = clamp(1 - (leftSpeed + rightSpeed) / 18, 0.35, 1);

      if (left.sign !== right.sign && left.value === right.value && left.count === right.count) {
        if (distance > ANNIHILATION_ATTRACTION_RADIUS) {
          continue;
        }

        const closeness = 1 - distance / ANNIHILATION_ATTRACTION_RADIUS;
        const strength = ANNIHILATION_ATTRACTION_FORCE * closeness * closeness * velocityFactor;
        const force = {
          x: (dx / distance) * strength,
          y: (dy / distance) * strength,
        };

        Matter.Body.applyForce(left.body, left.body.position, force);
        Matter.Body.applyForce(right.body, right.body.position, {
          x: -force.x,
          y: -force.y,
        });
        continue;
      }

      if (needsBiggerMaru(left, right) || needsBiggerMaru(right, left)) {
        // At least a share of the pull however far apart they are; the board is small.
        const closeness = Math.max(0.4, 1 - distance / ANNIHILATION_ATTRACTION_RADIUS);
        const strength = ANNIHILATION_ATTRACTION_FORCE * closeness * closeness * velocityFactor;
        const force = {
          x: (dx / distance) * strength,
          y: (dy / distance) * strength,
        };

        Matter.Body.applyForce(left.body, left.body.position, force);
        Matter.Body.applyForce(right.body, right.body.position, {
          x: -force.x,
          y: -force.y,
        });
        continue;
      }

      if (left.sign !== right.sign || left.value !== right.value || !getNextPlaceValue(left.value)) {
        applySeparationForce(left, right, dx, dy, distance, velocityFactor);
        continue;
      }

      if (distance > ATTRACTION_RADIUS) {
        continue;
      }

      const attractionMultiplier = getAttractionMultiplier(Math.min(attractionCounts.get(left.id) ?? left.count, attractionCounts.get(right.id) ?? right.count));
      if (attractionMultiplier <= 0) {
        continue;
      }

      const closeness = 1 - distance / ATTRACTION_RADIUS;
      const strength = ATTRACTION_FORCE * attractionMultiplier * closeness * closeness * velocityFactor;
      const force = {
        x: (dx / distance) * strength,
        y: (dy / distance) * strength,
      };

      Matter.Body.applyForce(left.body, left.body.position, force);
      Matter.Body.applyForce(right.body, right.body.position, {
        x: -force.x,
        y: -force.y,
      });
    }
  }
}

function getAttractionCounts(entities: BeadEntity[], draggingBeadId?: string) {
  const counts = new Map<string, number>();

  for (const entity of entities) {
    if (entity.id === draggingBeadId || !getNextPlaceValue(entity.value)) {
      continue;
    }

    let nearbyCount = entity.count;
    for (const candidate of entities) {
      if (
        candidate.id === entity.id ||
        candidate.id === draggingBeadId ||
        candidate.value !== entity.value ||
        candidate.sign !== entity.sign ||
        !getNextPlaceValue(candidate.value)
      ) {
        continue;
      }

      const dx = candidate.body.position.x - entity.body.position.x;
      const dy = candidate.body.position.y - entity.body.position.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= ATTRACTION_RADIUS) {
        nearbyCount += candidate.count;
      }
    }
    counts.set(entity.id, nearbyCount);
  }

  return counts;
}

function getAttractionMultiplier(nearbyCount: number) {
  if (nearbyCount >= 10) {
    return 1.05;
  }
  if (nearbyCount >= 7) {
    return 0.48;
  }
  if (nearbyCount >= 4) {
    return 0.12;
  }
  return 0;
}

function applySeparationForce(left: BeadEntity, right: BeadEntity, dx: number, dy: number, distance: number, velocityFactor: number) {
  const radiusSum = getEntityRadius(left.value, left.count) + getEntityRadius(right.value, right.count);
  const threshold = Math.min(SEPARATION_RADIUS, radiusSum * 1.08);
  if (distance >= threshold) {
    return;
  }

  const closeness = 1 - distance / threshold;
  const strength = SEPARATION_FORCE * closeness * closeness * velocityFactor;
  const force = {
    x: (dx / distance) * strength,
    y: (dy / distance) * strength,
  };

  Matter.Body.applyForce(left.body, left.body.position, {
    x: -force.x,
    y: -force.y,
  });
  Matter.Body.applyForce(right.body, right.body.position, force);
}

export function createBasinBodies(fieldWidth: number, fieldHeight: number) {
  return getBasinFrameSegments(fieldWidth, fieldHeight).map((segment) =>
    Matter.Bodies.rectangle(segment.centerX, segment.centerY, segment.length + 8, BASIN_BODY_THICKNESS, {
      isStatic: true,
      angle: segment.angle,
      friction: 0.14,
      frictionStatic: 0.01,
      restitution: 0.02,
      collisionFilter: getWorldCollisionFilter(),
    }),
  );
}
