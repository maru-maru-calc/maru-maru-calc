// Where things go and how big they are: the tray, maru sizes and colours, bubbles and what is drawn inside them.
import {
  BASIN_BODY_THICKNESS,
  BASIN_ENTITY_GUARD_MARGIN,
  BASIN_FRAME_THICKNESS,
  BASIN_POINT_COUNT,
  BUBBLE_ROW_Y,
  PENDING_BUBBLE_ROW_FILL_LIMIT,
  PENDING_BUBBLE_SECOND_ROW_OFFSET,
  FIELD_ENTITY_INSET,
  MULTIPLIER_BUBBLE_X_STEP,
  MULTIPLIER_BUBBLE_Y_STEP,
} from '@/components/marumaru/constants';
import type {
  BackgroundBubbleSpec,
  BeadEntity,
  ContainedBeadPart,
  GoalPart,
  MultiplierBubblePart,
  PendingBubble,
} from '@/components/marumaru/types';
import { getBeadKind } from '@/game/beads';
import { BeadSign, BeadSnapshot, PlaceValue } from '@/game/types';

export function clampEntityX(entity: Pick<BeadEntity, 'value' | 'count' | 'body'>, fieldWidth: number) {
  const radius = getEntityRadius(entity.value, entity.count);
  return clamp(entity.body.position.x, radius + FIELD_ENTITY_INSET, fieldWidth - radius - FIELD_ENTITY_INSET);
}

export function clampEntityY(entity: Pick<BeadEntity, 'value' | 'count' | 'body'>, fieldWidth: number, fieldHeight: number, x: number) {
  const radius = getEntityRadius(entity.value, entity.count);
  const basinSurfaceY = getBasinSurfaceY(fieldWidth, fieldHeight, x);
  const maxY = Math.min(fieldHeight - radius - FIELD_ENTITY_INSET, basinSurfaceY - radius - BASIN_ENTITY_GUARD_MARGIN);
  return clamp(entity.body.position.y, radius + FIELD_ENTITY_INSET, maxY);
}

export function getSignedPalette(kind: ReturnType<typeof getBeadKind>, sign: BeadSign) {
  if (sign > 0) {
    return kind;
  }

  return {
    color: '#4B5B77',
    rimColor: '#253B56',
    shineColor: '#B9D8F2',
  };
}

export function getPointDistance(left: Pick<BeadSnapshot, 'x' | 'y'>, right: Pick<BeadSnapshot, 'x' | 'y'>) {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getEntityRadius(value: PlaceValue, count: number) {
  if (value === 1 && count > 1) {
    return 34 + Math.min(count, 10) * 3;
  }

  return getBeadKind(value).radius;
}

export function getEntityUnitCount(entity: Pick<BeadEntity, 'value' | 'count'>) {
  return entity.value * entity.count;
}

export function getPlaceValueBeads(totalCount: number) {
  const beads: PlaceValue[] = [];
  const placeValues: PlaceValue[] = [100000, 10000, 1000, 100, 10, 1];
  let remaining = totalCount;

  for (const value of placeValues) {
    const copies = Math.floor(remaining / value);
    remaining %= value;
    for (let index = 0; index < copies; index += 1) {
      beads.push(value);
    }
  }

  return beads;
}

export function getGoalParts(target: number): GoalPart[] {
  const sign: BeadSign = target < 0 ? -1 : 1;
  const total = Math.abs(target);
  const parts: GoalPart[] = [];
  const placeValues: PlaceValue[] = [100000, 10000, 1000, 100, 10];
  let remaining = total;

  for (const value of placeValues) {
    const copies = Math.floor(remaining / value);
    remaining %= value;
    for (let index = 0; index < copies; index += 1) {
      parts.push({ value, count: 1, sign });
    }
  }

  if (remaining > 0) {
    parts.push({ value: 1, count: remaining, sign });
  }

  return parts;
}

export function getBeadLayerZIndex(value: PlaceValue) {
  if (value === 1) {
    return 6;
  }
  if (value === 10) {
    return 5;
  }
  if (value === 100) {
    return 4;
  }
  if (value === 1000) {
    return 3;
  }
  if (value === 10000) {
    return 2;
  }
  return 1;
}

export function getBeadLayerOpacity(value: PlaceValue) {
  if (value === 1) {
    return 0.72;
  }
  if (value === 10) {
    return 0.8;
  }
  if (value === 100) {
    return 0.86;
  }
  if (value === 1000) {
    return 0.82;
  }
  if (value === 10000) {
    return 0.8;
  }
  return 0.78;
}

export function getTranslucentBeadColor(value: PlaceValue, color: string) {
  const opacityByValue: Record<PlaceValue, number> = {
    1: 0.34,
    10: 0.48,
    100: 0.58,
    1000: 0.52,
    10000: 0.5,
    100000: 0.48,
  };
  return hexToRgba(color, opacityByValue[value]);
}

function hexToRgba(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
}

export function getMultiplierClusterRadius(count: number) {
  const bubbles = getMultiplierBubbleParts(count);
  const rows = getMultiplierBubbleRows(bubbles);
  const widestRow = rows.reduce((max, row) => Math.max(max, getOverlappedRowWidth(row)), 0);
  const tallestBubble = bubbles.reduce((max, bubble) => Math.max(max, bubble.radius * 2), 0);
  const contentHeight = rows.length === 1 ? tallestBubble : tallestBubble * (1 + MULTIPLIER_BUBBLE_Y_STEP);
  return Math.max(34, Math.min(86, Math.max(widestRow / 2 + 8, contentHeight / 2 + 8)));
}

/**
 * Where the bubbles wait. `rows` is 'one' for a single row whatever their number, as the learning app
 * has always laid them out, or 'fit' to use a second row when one would be too crowded.
 */
export function createPendingBubbles(fieldWidth: number, counts: number[], rows: 'one' | 'fit' = 'one'): PendingBubble[] {
  const placeRow = (rowCounts: number[], firstIndex: number, y: number): PendingBubble[] => {
    const gap = fieldWidth / (rowCounts.length + 1);
    return rowCounts.map((count, place) => ({
      id: `bubble-${firstIndex + place}-${count}`,
      count,
      x: gap * (place + 1),
      y,
    }));
  };

  // One row, as long as the bubbles do not cover each other much. Five or six bubbles, or four big
  // ones, would lie so far over each other that some could not be tapped; they go in two rows.
  const widthInOneRow = counts.reduce((sum, count) => sum + getEntityRadius(1, count) * 2, 0);
  if (rows === 'one' || (counts.length < 5 && widthInOneRow <= fieldWidth * PENDING_BUBBLE_ROW_FILL_LIMIT)) {
    return placeRow(counts, 0, BUBBLE_ROW_Y);
  }

  const upperCount = Math.ceil(counts.length / 2);
  return [
    ...placeRow(counts.slice(0, upperCount), 0, BUBBLE_ROW_Y),
    ...placeRow(counts.slice(upperCount), upperCount, BUBBLE_ROW_Y + PENDING_BUBBLE_SECOND_ROW_OFFSET),
  ];
}

export function getBackgroundBubbleSpecs(fieldWidth: number): BackgroundBubbleSpec[] {
  const wideOffset = fieldWidth > 520 ? 0.04 : 0;
  return [
    { id: 'large-right', xRatio: 0.94 - wideOffset, size: 116, speed: 15, delay: 0, drift: 9 },
    { id: 'small-left', xRatio: 0.12 + wideOffset, size: 60, speed: 21, delay: 900, drift: 7 },
    { id: 'tiny-right', xRatio: 0.78, size: 30, speed: 18, delay: 1600, drift: 5 },
    { id: 'medium-right', xRatio: 0.84, size: 54, speed: 12, delay: 4100, drift: 8 },
    { id: 'soft-low-left', xRatio: 0.05 + wideOffset, size: 92, speed: 10, delay: 1700, drift: 7 },
    { id: 'soft-center-right', xRatio: 0.66, size: 36, speed: 14, delay: 6100, drift: 9 },
  ];
}

export function getContainedBeadParts(count: number): ContainedBeadPart[] {
  const parts: ContainedBeadPart[] = [];
  const placeValues: PlaceValue[] = [100000, 10000, 1000, 100, 10, 1];
  let remaining = count;

  for (const value of placeValues) {
    const copies = Math.floor(remaining / value);
    remaining %= value;
    const radius = getBeadKind(value).radius;
    for (let index = 0; index < copies; index += 1) {
      parts.push({ value, radius });
    }
  }

  return parts.length > 0 ? parts : [{ value: 1, radius: getBeadKind(1).radius }];
}

export function getContainedBeadPositions(beads: ContainedBeadPart[], bubbleRadius: number) {
  if (beads.length === 0) {
    return [];
  }
  if (beads.length === 1) {
    const bead = beads[0];
    return [{ bead, x: bubbleRadius - bead.radius, y: bubbleRadius - bead.radius }];
  }

  const center = bubbleRadius;
  const largestRadius = beads.reduce((max, bead) => Math.max(max, bead.radius), 0);
  const orbitRadius = Math.max(8, bubbleRadius - largestRadius - 15);

  return beads.map((bead, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / beads.length;
    const rowOffset = beads.length <= 4 ? 0.78 : index % 2 === 0 ? 0.92 : 0.58;
    return {
      bead,
      x: center + Math.cos(angle) * orbitRadius * rowOffset - bead.radius,
      y: center + Math.sin(angle) * orbitRadius * rowOffset - bead.radius,
    };
  });
}

export function getMultiplierBubbleParts(count: number): MultiplierBubblePart[] {
  const parts: MultiplierBubblePart[] = [];
  const placeValues: PlaceValue[] = [100000, 10000, 1000, 100, 10, 1];
  let remaining = count;

  for (const value of placeValues) {
    const copies = Math.floor(remaining / value);
    remaining %= value;
    const beadRadius = getBeadKind(value).radius;
    const bubbleRadius = beadRadius + 14;
    for (let index = 0; index < copies; index += 1) {
      parts.push({ value, radius: bubbleRadius });
    }
  }

  return parts.length > 0 ? parts : [{ value: 1, radius: getBeadKind(1).radius + 14 }];
}

export function getSimpleBubbleStackPositions(bubbles: MultiplierBubblePart[], radius: number, operator: '×' | '÷' = '×') {
  if (bubbles.length === 1) {
    const bubble = bubbles[0];
    return [{ bubble, x: radius - bubble.radius, y: radius - bubble.radius, tilt: 0 }];
  }

  const rows = getMultiplierBubbleRows(bubbles);
  const rowLayouts = rows.map((row, rowIndex) => {
    const width = getOverlappedRowWidth(row);
    const tallest = row.reduce((max, bubble) => Math.max(max, bubble.radius * 2), 0);
    return { row, rowIndex, width, tallest };
  });
  const contentHeight = rowLayouts.reduce(
    (sum, row, index) => sum + row.tallest * (index === 0 ? 1 : MULTIPLIER_BUBBLE_Y_STEP),
    0,
  );
  let y = radius - contentHeight / 2;

  return rowLayouts.flatMap((layout) => {
    let x = radius - layout.width / 2;
    const rowY = y;
    y += layout.tallest * MULTIPLIER_BUBBLE_Y_STEP;
    return layout.row.map((bubble, index) => {
      const position = {
        bubble,
        x,
        y: rowY + layout.tallest / 2 - bubble.radius,
        tilt: (index - (layout.row.length - 1) / 2) * 3 + (layout.rowIndex === 0 ? -2 : 2),
      };
      x += bubble.radius * MULTIPLIER_BUBBLE_X_STEP;
      return position;
    });
  });
}

function getMultiplierBubbleRows(bubbles: MultiplierBubblePart[]) {
  const rowCount = bubbles.length <= 4 ? 1 : 2;
  const rows = Array.from({ length: rowCount }, () => [] as MultiplierBubblePart[]);
  bubbles.forEach((bubble, index) => {
    rows[index % rowCount].push(bubble);
  });
  return rows;
}

function getOverlappedRowWidth(row: MultiplierBubblePart[]) {
  return row.reduce((sum, bubble, index) => {
    if (index === 0) {
      return bubble.radius * 2;
    }
    return sum + bubble.radius * MULTIPLIER_BUBBLE_X_STEP;
  }, 0);
}

export function getBasinFrameSegments(fieldWidth: number, fieldHeight: number) {
  const points = getBasinPoints(fieldWidth, fieldHeight);

  return points.slice(0, -1).map((point, index) => {
    const nextPoint = points[index + 1];
    const dx = nextPoint.x - point.x;
    const dy = nextPoint.y - point.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const centerX = point.x + dx / 2;
    const centerY = point.y + dy / 2;
    const topSurfaceOffsetX = Math.sin(angle) * (BASIN_BODY_THICKNESS / 2);
    const topSurfaceOffsetY = -Math.cos(angle) * (BASIN_BODY_THICKNESS / 2);
    const visualCenterX = centerX + topSurfaceOffsetX;
    const visualCenterY = centerY + topSurfaceOffsetY;

    return {
      id: `basin-${index}`,
      x: visualCenterX - length / 2,
      y: visualCenterY - BASIN_FRAME_THICKNESS / 2,
      centerX,
      centerY,
      length,
      angle,
    };
  });
}

function getBasinPoints(fieldWidth: number, fieldHeight: number) {
  const curve = getBasinCurveMetrics(fieldWidth, fieldHeight);
  const pointCount = BASIN_POINT_COUNT;

  return Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const arcX = -curve.halfWidth + curve.halfWidth * 2 * progress;
    const x = curve.centerX + arcX;
    const y = curve.arcCenterY + Math.sqrt(Math.max(0, curve.radius * curve.radius - arcX * arcX));

    return { x, y };
  });
}

export function getBasinSurfaceY(fieldWidth: number, fieldHeight: number, x: number) {
  const curve = getBasinCurveMetrics(fieldWidth, fieldHeight);
  const arcX = clamp(x - curve.centerX, -curve.halfWidth, curve.halfWidth);
  const bodyCenterY = curve.arcCenterY + Math.sqrt(Math.max(0, curve.radius * curve.radius - arcX * arcX));
  return bodyCenterY - BASIN_BODY_THICKNESS / 2;
}

export function getBasinCurveMetrics(fieldWidth: number, fieldHeight: number) {
  const inset = 14;
  const bottomY = fieldHeight - 18 - BASIN_BODY_THICKNESS / 2;
  const halfWidth = Math.max(80, fieldWidth / 2 - inset);
  const depth = Math.min(fieldHeight * 0.52, Math.max(168, halfWidth * 0.62));
  const radius = (halfWidth * halfWidth + depth * depth) / (2 * depth);
  return {
    width: fieldWidth,
    centerX: fieldWidth / 2,
    bottomY,
    depth,
    halfWidth,
    radius,
    arcCenterY: bottomY - radius,
    sideY: bottomY - depth,
    inset,
  };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
