import { MergeAnimation } from '@/domain/game/types';

export type MergeAnimationPhaseName = 'gather' | 'tremble' | 'spin' | 'flash' | 'land';

export type MergeAnimationPhase = {
  name: MergeAnimationPhaseName;
  startMs: number;
  durationMs: number;
};

export type MergeAnimationPlan = {
  hasCarry: boolean;
  durationMs: number;
  phases: MergeAnimationPhase[];
};

const SIMPLE_MERGE_PHASES: MergeAnimationPhase[] = [
  { name: 'gather', startMs: 0, durationMs: 260 },
  { name: 'tremble', startMs: 180, durationMs: 120 },
  { name: 'flash', startMs: 300, durationMs: 130 },
  { name: 'land', startMs: 430, durationMs: 210 },
];

const CARRY_MERGE_PHASES: MergeAnimationPhase[] = [
  { name: 'gather', startMs: 0, durationMs: 280 },
  { name: 'tremble', startMs: 210, durationMs: 150 },
  { name: 'spin', startMs: 340, durationMs: 210 },
  { name: 'flash', startMs: 520, durationMs: 150 },
  { name: 'land', startMs: 650, durationMs: 240 },
];

export function createMergeAnimationPlan(merge?: MergeAnimation): MergeAnimationPlan {
  const hasCarry = (merge?.carrySteps.length ?? 0) > 0;
  const phases = hasCarry ? CARRY_MERGE_PHASES : SIMPLE_MERGE_PHASES;
  const durationMs = phases.reduce((max, phase) => Math.max(max, phase.startMs + phase.durationMs), 0);

  return {
    hasCarry,
    durationMs,
    phases,
  };
}

export function getMergeAnimationDuration(merge?: MergeAnimation) {
  return createMergeAnimationPlan(merge).durationMs;
}
