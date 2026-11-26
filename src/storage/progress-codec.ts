import { withRegroupedDentakuStages } from '@/game/dentaku';
import { isKukuFactId } from '@/game/kuku-weak-facts';

export type StoredProgress = {
  /** Cleared stage ids of まるまるモード. */
  marumaru: string[];
  /** Cleared stage ids of でんたくモード. */
  dentaku: string[];
  /** Cleared stage ids of 筆算モード. */
  longForm: string[];
  /** Times-table facts that were missed and not yet shown to be known, like "7x8". */
  kukuWeak: string[];
  /** True once the launch demo has been finished at least once. */
  hasSeenIntro: boolean;
};

export const PROGRESS_STORAGE_VERSION = 1;

export function createEmptyProgress(): StoredProgress {
  return { marumaru: [], dentaku: [], longForm: [], kukuWeak: [], hasSeenIntro: false };
}

export function serializeProgress(progress: StoredProgress): string {
  return JSON.stringify({
    version: PROGRESS_STORAGE_VERSION,
    marumaru: uniqueStrings(progress.marumaru),
    dentaku: uniqueStrings(progress.dentaku),
    longForm: uniqueStrings(progress.longForm),
    kukuWeak: uniqueStrings(progress.kukuWeak).filter(isKukuFactId),
    hasSeenIntro: progress.hasSeenIntro,
  });
}

/** Parses stored progress. Anything unreadable becomes empty progress instead of an error. */
export function parseStoredProgress(raw: string | null | undefined): StoredProgress {
  if (!raw) {
    return createEmptyProgress();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return createEmptyProgress();
  }

  if (!parsed || typeof parsed !== 'object') {
    return createEmptyProgress();
  }

  const candidate = parsed as Record<string, unknown>;
  return {
    marumaru: uniqueStrings(candidate.marumaru),
    dentaku: withRegroupedDentakuStages(uniqueStrings(candidate.dentaku)),
    longForm: uniqueStrings(candidate.longForm),
    // Absent in progress saved before the facts were remembered.
    kukuWeak: uniqueStrings(candidate.kukuWeak).filter(isKukuFactId),
    hasSeenIntro: candidate.hasSeenIntro === true,
  };
}

function uniqueStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return [...new Set(value.filter((item): item is string => typeof item === 'string'))];
}
