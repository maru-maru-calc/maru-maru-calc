import { router } from 'expo-router';

import { AppButton } from '@/components/AppButton';
import { ProgressSummary } from '@/components/ProgressSummary';
import { ScreenShell } from '@/components/ScreenShell';
import { getCopy } from '@/data/copy';
import { findStageById, initialStages } from '@/data/stages';
import { getStageTitle } from '@/domain/stage/copy';
import { getNextRecommendedStageId, getStageProgressSummary } from '@/domain/stage/progress';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';

export default function TitleScreen() {
  const completedStageIds = useProgressStore((state) => state.completedStageIds);
  const lastPlayedStageId = useProgressStore((state) => state.lastPlayedStageId);
  const textMode = useSettingsStore((state) => state.textMode);
  const recommendedStageId = getNextRecommendedStageId(initialStages, completedStageIds, lastPlayedStageId);
  const recommendedStage = findStageById(recommendedStageId);
  const mvpStages = initialStages.filter((stage) => stage.kind === 'mvp');
  const progressSummary = getStageProgressSummary(mvpStages, completedStageIds);

  return (
    <ScreenShell title={getCopy('title', textMode)}>
      <ProgressSummary summary={progressSummary} textMode={textMode} />
      {recommendedStage ? (
        <AppButton
          label={`${getStageTitle(recommendedStage, textMode)} ${getCopy('continueFromStage', textMode)}`}
          onPress={() => router.push(`/play/${recommendedStage.id}`)}
        />
      ) : null}
      <AppButton label={getCopy('stageSelect', textMode)} onPress={() => router.push('/stages')} />
      <AppButton label={getCopy('settings', textMode)} variant="secondary" onPress={() => router.push('/settings')} />
    </ScreenShell>
  );
}
