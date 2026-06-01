import { Stage } from '@/domain/stage/types';

type StageTextMode = 'normal' | 'hiragana';

export function getStageTitle(stage: Stage, textMode: StageTextMode) {
  if (textMode === 'hiragana') {
    return stage.titleHiragana ?? stage.title;
  }

  return stage.title;
}

export function getStageDescription(stage: Stage, textMode: StageTextMode) {
  if (textMode === 'hiragana') {
    return stage.descriptionHiragana ?? stage.description;
  }

  return stage.description;
}
