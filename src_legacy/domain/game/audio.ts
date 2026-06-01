import { CarryAnimationEvent, GameStatus } from '@/domain/game/types';
import { GameMessageKey } from '@/domain/game/messages';

export type SoundEffectId = 'select' | 'place' | 'merge' | 'carry' | 'invalid' | 'clear' | 'reset';

export type SoundSettings = {
  soundEnabled: boolean;
  effectsEnabled: boolean;
};

export function canPlaySoundEffect(settings: SoundSettings) {
  return settings.soundEnabled && settings.effectsEnabled;
}

export function getSoundEffectForMessage(messageKey?: GameMessageKey): SoundEffectId | undefined {
  switch (messageKey) {
    case 'selectAnother':
    case 'readyToAdd':
    case 'pressPlusAgain':
    case 'selectTwo':
      return 'select';
    case 'placed':
    case 'draggingClear':
      return 'place';
    case 'merging':
    case 'merged':
    case 'resultReady':
      return 'merge';
    case 'carryBuilding':
    case 'carryMade':
      return 'carry';
    case 'targetMade':
      return 'clear';
    case 'reset':
    case 'undone':
      return 'reset';
    case 'selectTwoBeforeAdd':
    case 'selectOperatorBeforeDrop':
    case 'retrySelection':
    case 'outOfRange':
      return 'invalid';
    default:
      return undefined;
  }
}

export function getSoundEffectForMergeResult(status: GameStatus, carryEvents: CarryAnimationEvent[]) {
  if (status === 'clear') {
    return 'clear';
  }

  return carryEvents.length > 0 ? 'carry' : 'merge';
}
