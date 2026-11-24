export type AppScreen =
  | 'launch'
  | 'mode'
  | 'world'
  | 'stage'
  | 'game'
  | 'dentakuWorld'
  | 'dentakuStage'
  | 'dentakuGame'
  | 'longFormWorld'
  | 'longFormStage'
  | 'longFormGame';

export type NavState = {
  screen: AppScreen;
  worldId: string;
  dentakuWorldId: string;
  longFormWorldId: string;
  stageIndex: number;
  dentakuStageId: string;
  longFormStageId: string;
};

export type NavOptions = {
  worldIds: readonly string[];
  dentakuWorldIds: readonly string[];
  longFormWorldIds: readonly string[];
  stageCount: number;
  dentakuStageIds: readonly string[];
  longFormStageIds: readonly string[];
};

const APP_SCREENS: readonly AppScreen[] = [
  'launch',
  'mode',
  'world',
  'stage',
  'game',
  'dentakuWorld',
  'dentakuStage',
  'dentakuGame',
  'longFormWorld',
  'longFormStage',
  'longFormGame',
];

const PARENT_SCREENS: Partial<Record<AppScreen, AppScreen>> = {
  world: 'mode',
  stage: 'world',
  game: 'stage',
  dentakuWorld: 'mode',
  dentakuStage: 'dentakuWorld',
  dentakuGame: 'dentakuStage',
  longFormWorld: 'mode',
  longFormStage: 'longFormWorld',
  longFormGame: 'longFormStage',
};

/** The screen the in-app back button leads to, or undefined at the top of the app. */
export function getParentScreen(screen: AppScreen): AppScreen | undefined {
  return PARENT_SCREENS[screen];
}

export function createInitialNavState(options: NavOptions): NavState {
  return {
    screen: 'launch',
    worldId: options.worldIds[0] ?? '',
    dentakuWorldId: options.dentakuWorldIds[0] ?? '',
    longFormWorldId: options.longFormWorldIds[0] ?? '',
    stageIndex: 0,
    dentakuStageId: options.dentakuStageIds[0] ?? '',
    longFormStageId: options.longFormStageIds[0] ?? '',
  };
}

/**
 * Rebuilds a navigation state from untrusted data (a browser history entry).
 * Returns undefined when the value is not a navigation state at all; unknown
 * fields fall back to their defaults so an old entry can never crash the app.
 */
export function normalizeNavState(value: unknown, options: NavOptions): NavState | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }

  const candidate = value as Record<string, unknown>;
  if (typeof candidate.screen !== 'string' || !APP_SCREENS.includes(candidate.screen as AppScreen)) {
    return undefined;
  }

  const initial = createInitialNavState(options);
  const stageIndex = candidate.stageIndex;

  return {
    screen: candidate.screen as AppScreen,
    worldId: pickKnownId(candidate.worldId, options.worldIds, initial.worldId),
    dentakuWorldId: pickKnownId(candidate.dentakuWorldId, options.dentakuWorldIds, initial.dentakuWorldId),
    longFormWorldId: pickKnownId(candidate.longFormWorldId, options.longFormWorldIds, initial.longFormWorldId),
    stageIndex:
      typeof stageIndex === 'number' && Number.isInteger(stageIndex) && stageIndex >= 0 && stageIndex < options.stageCount
        ? stageIndex
        : initial.stageIndex,
    dentakuStageId: pickKnownId(candidate.dentakuStageId, options.dentakuStageIds, initial.dentakuStageId),
    longFormStageId: pickKnownId(candidate.longFormStageId, options.longFormStageIds, initial.longFormStageId),
  };
}

function pickKnownId(value: unknown, knownIds: readonly string[], fallback: string) {
  return typeof value === 'string' && knownIds.includes(value) ? value : fallback;
}
