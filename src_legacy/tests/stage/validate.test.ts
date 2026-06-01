import { describe, expect, it } from 'vitest';

import { initialStages } from '@/data/stages';
import { Stage } from '@/domain/stage/types';
import { validateStage, validateStages } from '@/domain/stage/validate';

describe('validateStage', () => {
  it('accepts all bundled MVP stages', () => {
    expect(initialStages.map((stage) => validateStage(stage))).toEqual(initialStages.map(() => ({ ok: true })));
  });

  it('rejects a solution that does not match the target', () => {
    const invalidStage: Stage = {
      ...initialStages[0],
      targetValue: 6,
    };

    expect(validateStage(invalidStage)).toEqual({
      ok: false,
      errors: ['solution must leave exactly one group matching the target'],
    });
  });

  it('rejects a solution that uses an unavailable value', () => {
    const invalidStage: Stage = {
      ...initialStages[0],
      solution: {
        steps: [{ operator: 'add', leftValue: 2, rightValue: 4, resultValue: 6 }],
      },
    };

    expect(validateStage(invalidStage)).toEqual({
      ok: false,
      errors: ['step 1 right value is not available', 'solution must leave exactly one group matching the target'],
    });
  });

  it('rejects stages outside the MVP world', () => {
    const invalidStage = {
      ...initialStages[0],
      worldId: 'subtraction-valley',
    } as unknown as Stage;

    const result = validateStage(invalidStage);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('MVP stages must be in addition-island');
    }
  });
});

describe('validateStages', () => {
  it('accepts the bundled stage collection', () => {
    expect(validateStages(initialStages)).toEqual({ ok: true });
  });

  it('rejects duplicated ids and non-contiguous stage order', () => {
    const brokenStages = [
      initialStages[0],
      {
        ...initialStages[1],
        id: initialStages[0].id,
        order: 4,
      },
    ];

    const result = validateStages(brokenStages);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('duplicate stage id: stage-1');
      expect(result.errors).toContain('stage order must be contiguous from 1: missing 2');
    }
  });

  it('rejects practice stages before MVP stages', () => {
    const brokenStages = [
      {
        ...initialStages[0],
        kind: 'practice' as const,
      },
      {
        ...initialStages[1],
        kind: 'mvp' as const,
      },
    ];

    const result = validateStages(brokenStages);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain('practice stages must come after MVP stages');
    }
  });
});
