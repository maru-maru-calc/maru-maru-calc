import { Stage } from './types';

export const STAGES: Stage[] = [
  {
    id: 'make-10',
    title: '10をつくろう',
    target: 10,
    allowedValues: [1],
  },
  {
    id: 'make-20',
    title: '20をつくろう',
    target: 20,
    allowedValues: [1],
  },
  {
    id: 'make-50',
    title: '50をつくろう',
    target: 50,
    allowedValues: [1, 10],
  },
  {
    id: 'make-100',
    title: '100をつくろう',
    target: 100,
    allowedValues: [1, 10],
  },
  {
    id: 'make-120',
    title: '120をつくろう',
    target: 120,
    allowedValues: [1, 10, 100],
  },
];

export function getStage(index: number) {
  return STAGES[Math.max(0, Math.min(index, STAGES.length - 1))];
}
